# Mobile Reconnection State Restore

## Problem

모바일에서 클라이언트 연결이 일시적으로 끊겼다가 재연결될 때, 이전 상태로 복원되지 않고 로비로 튕기는 문제.

### Root Causes

1. **2인 게임**: 한 명 끊기면 `handleDisconnect`에서 즉시 `endGame()` + `RemovePlayer()` → 재연결 시 방 없음
2. **대기실**: 끊기면 즉시 `hub.LeaveRoom()` → 방에서 제거됨
3. **결과 화면**: `SyncPayload()`가 게임 중(engine 존재)에만 동작, 결과 상태 sync 없음
4. **클라이언트**: `room:state`에 `getPhase() !== 'room'` 가드 → 재연결 시 무시됨

## Solution

### 1. Server: handleDisconnect — 모든 단계에 유예기간

**`server/handler/ws.go` handleDisconnect 변경:**

```go
func (wh *WSHandler) handleDisconnect(p *player.Player) {
    p.SetConn(nil)
    rm := wh.hub.PlayerRoom(p.ID)
    if rm == nil {
        wh.hub.RemovePlayerFull(p.ID)
        return
    }

    data, _ := message.New("player:disconnected", message.PlayerEventPayload{PlayerID: p.ID})
    rm.Broadcast(data)

    switch rm.Status() {
    case "playing":
        // 모든 플레이어 수에 동일한 60초 유예기간 적용 (2인 즉시 종료 제거)
        rm.HandleDisconnect(p.ID, func() {
            shouldEnd := rm.PlayerCount() <= 2 && rm.Status() == "playing"
            if shouldEnd {
                wh.endGame(rm)
            }
            rm.RemovePlayer(p.ID, func() { wh.hub.RemoveRoom(rm.Code) })
            remData, _ := message.New("player:removed", message.PlayerEventPayload{PlayerID: p.ID})
            rm.Broadcast(remData)
            if !shouldEnd && rm.PlayerCount() >= 2 {
                rm.BroadcastState()
                wh.broadcastTurn(rm)
            }
        })
    case "finished":
        // 결과 화면: 30초 유예 (HandleDisconnectWaiting 사용)
        rm.HandleDisconnectWaiting(p.ID, func() {
            rm.RemovePlayer(p.ID, func() { wh.hub.RemoveRoom(rm.Code) })
            remData, _ := message.New("player:removed", message.PlayerEventPayload{PlayerID: p.ID})
            rm.Broadcast(remData)
        })
    default: // "waiting"
        // 대기실: 30초 유예 (즉시 제거 → 타이머)
        rm.HandleDisconnectWaiting(p.ID, func() {
            wh.hub.LeaveRoom(p.ID)
            leftData, _ := message.New("player:left", message.PlayerEventPayload{PlayerID: p.ID})
            rm.Broadcast(leftData)
            rm.BroadcastState()
        })
    }
}
```

### 2. Server: Room — waiting용 disconnect 타이머 추가

**`server/room/room.go`:**

```go
const waitingDisconnectTimeout = 30 * time.Second

func (r *Room) HandleDisconnectWaiting(playerID string, onTimeout func()) {
    r.mu.Lock()
    defer r.mu.Unlock()
    if timer, ok := r.disconn[playerID]; ok {
        timer.Stop()
    }
    r.disconn[playerID] = time.AfterFunc(waitingDisconnectTimeout, onTimeout)
}
```

`HandleReconnect`는 이미 모든 상태에서 동작 (disconn 맵에서 타이머 제거).

### 3. Server: SyncPayload 확장 — 모든 단계 지원

**`server/room/room.go`:**

Room struct에 `lastRankings`, `lastScores` 필드 추가:
```go
type Room struct {
    // ... 기존 필드 ...
    lastRankings []message.RankEntry           // EndGame() 시 저장
    lastScores   map[string]map[string]int     // EndGame() 시 저장
}
```

`EndGame()`에 rankings를 인자로 전달 (caller인 ws.go의 endGame이 이미 Rankings()를 호출하므로 중복 호출 방지):
```go
func (r *Room) EndGame(rankings []message.RankEntry) {
    r.mu.Lock()
    defer r.mu.Unlock()
    r.status = "finished"
    r.rematch = make(map[string]bool)
    r.lastRankings = rankings
    if r.engine != nil {
        r.lastScores = r.engine.Scores()
    }
}
```

`ws.go` endGame에서 호출 변경:
```go
func (wh *WSHandler) endGame(rm *room.Room) {
    rankings, ok := rm.GameRankings()
    // ... nickname 매핑 ...
    rm.Broadcast(data)
    rm.EndGame(rankings)  // rankings 전달
    // ...
}
```

`SyncPayload` 확장 — lock 내부에서 rematch votes를 직접 수집 (deadlock 방지):
```go
func (r *Room) SyncPayload() []byte {
    r.mu.RLock()
    defer r.mu.RUnlock()

    switch r.status {
    case "playing":
        if r.engine == nil { return nil }
        var preview map[string]int
        if r.engine.RollCount() > 0 {
            preview = r.engine.Preview(r.engine.CurrentPlayer())
        }
        data, _ := message.New("game:sync", message.GameSyncPayload{
            Dice: r.engine.Dice(), Held: r.engine.Held(),
            RollCount: r.engine.RollCount(), Scores: r.engine.Scores(),
            CurrentPlayer: r.engine.CurrentPlayer(), Round: r.engine.Round(),
            Preview: preview,
        })
        return data
    case "finished":
        // rematch votes를 lock 내부에서 직접 수집 (RematchVotes()는 별도 lock → deadlock)
        votes := make([]string, 0, len(r.rematch))
        for pid := range r.rematch {
            votes = append(votes, pid)
        }
        data, _ := message.New("result:sync", message.ResultSyncPayload{
            Rankings:     r.lastRankings,
            Scores:       r.lastScores,
            RematchVotes: votes,
        })
        return data
    default: // "waiting"
        // room:sync는 room:state와 별개 이벤트 → 클라이언트 phase 가드 우회
        data, _ := message.New("room:sync", r.statePayloadLocked())
        return data
    }
}

// statePayloadLocked는 이미 lock을 잡은 상태에서 호출 (StatePayload에서 lock 재획득 방지)
func (r *Room) statePayloadLocked() message.RoomStatePayload {
    players := make([]message.PlayerInfo, len(r.players))
    for i, p := range r.players {
        players[i] = message.PlayerInfo{
            ID: p.ID, Nickname: p.Nickname,
            IsHost: p.ID == r.hostID, IsReady: r.ready[p.ID],
        }
    }
    return message.RoomStatePayload{RoomCode: r.Code, Players: players}
}
```

### 4. Server: 새 메시지 타입

**`server/message/message.go`:**

```go
type ResultSyncPayload struct {
    Rankings     []RankEntry               `json:"rankings"`
    Scores       map[string]map[string]int `json:"scores"`
    RematchVotes []string                  `json:"rematchVotes"`
}
```

`room:sync`는 기존 `RoomStatePayload` 재사용.

### 5. Client: 새 sync 메시지 핸들러

**`client/src/hooks/useGameEvents.ts`:**

```ts
ws.on('room:sync', (env) => {
    const p = env.payload as RoomState;
    dispatch({ type: 'ROOM_SYNC', roomCode: p.roomCode, players: p.players });
}),
ws.on('result:sync', (env) => {
    const p = env.payload as ResultSyncPayload;
    dispatch({ type: 'RESULT_SYNC', rankings: p.rankings, scores: p.scores, rematchVotes: p.rematchVotes });
}),
```

### 6. Client: 새 reducer actions

**`client/src/hooks/useGameState.ts`:**

```ts
type GameAction =
    // ... 기존 ...
    | { type: 'ROOM_SYNC'; roomCode: string; players: PlayerInfo[] }
    | { type: 'RESULT_SYNC'; rankings: RankEntry[]; scores: Record<string, Record<string, number>>; rematchVotes: string[] };

// reducer:
case 'ROOM_SYNC':
    return { ...state, phase: 'room', roomCode: action.roomCode, players: action.players };
case 'RESULT_SYNC':
    return { ...state, phase: 'result', rankings: action.rankings, scores: action.scores, rematchVotes: action.rematchVotes };
    // players는 이미 state에 남아있으므로 별도 복원 불필요
    // (room:state → game:start → result 경로에서 players가 유지됨)
```

### 7. Client: game:sync에 game:turn 정보 포함

현재 `game:sync`에 `currentPlayer`와 `round`가 있지만, 재연결 시 `game:turn` 메시지가 별도로 오지 않음. 기존 `GAME_SYNC` action이 이미 `currentPlayer`와 `round`를 설정하므로 추가 변경 불필요.

### 8. Tests

**Go 유닛 테스트:**
- 2인 게임에서 disconnect → 60초 내 reconnect → game:sync 전송 확인
- 대기실에서 disconnect → 30초 내 reconnect → room:sync 전송 확인
- 결과 화면에서 disconnect → reconnect → result:sync 전송 확인
- 유예기간 만료 후 reconnect → 방 없음 확인

**E2E 테스트 (`e2e/run-e2e.sh`):**
- 게임 중 P2 연결 끊기 → P2 재연결 → 게임 화면 복원 확인
- 대기실에서 P2 연결 끊기 → P2 재연결 → 방 화면 복원 확인

### 9. Server restart vs client disconnect 구분

기존 로직 유지:
- 서버 재시작 → signingKey 변경 → 토큰 무효 → 새 playerId → 클라이언트 `onSessionReset` → 로비
- 클라이언트 일시 끊김 → 토큰 유효 → 같은 playerId → sync 메시지로 상태 복원
