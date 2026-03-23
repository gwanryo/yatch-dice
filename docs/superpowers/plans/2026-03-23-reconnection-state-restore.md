# Mobile Reconnection State Restore — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable seamless reconnection across all game phases (waiting, playing, finished) so mobile users don't get kicked to lobby on temporary disconnections.

**Architecture:** Add grace periods for all disconnect scenarios (waiting: 30s, playing: 60s, finished: 30s). Extend `SyncPayload` to cover all phases with phase-specific messages (`room:sync`, `game:sync`, `result:sync`). Client handles new sync messages to restore the correct phase.

**Tech Stack:** Go (server), React 19 + TypeScript (client), Vitest (unit tests), agent-browser (E2E)

**Spec:** `docs/superpowers/specs/2026-03-23-reconnection-state-restore-design.md`

---

### Task 1: Server — Add ResultSyncPayload message type and update EndGame signature

**Files:**
- Modify: `server/message/message.go`
- Modify: `server/room/room.go`
- Modify: `server/handler/ws.go`

- [ ] **Step 1: Add ResultSyncPayload to message.go**

Add after `GameEndPayload` (line 158):

```go
type ResultSyncPayload struct {
	Rankings     []RankEntry               `json:"rankings"`
	Scores       map[string]map[string]int `json:"scores"`
	RematchVotes []string                  `json:"rematchVotes"`
}
```

- [ ] **Step 2: Update Room.EndGame to accept rankings and store scores**

In `server/room/room.go`, add fields to Room struct (after line 35 `rematch`):

```go
lastRankings []message.RankEntry
lastScores   map[string]map[string]int
```

Replace `EndGame()` method (lines 261-266):

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

- [ ] **Step 3: Update ws.go endGame to pass rankings**

In `server/handler/ws.go`, replace `rm.EndGame()` (line 544) with:

```go
rm.EndGame(rankings)
```

- [ ] **Step 4: Fix existing EndGame() calls in room_test.go**

The signature change breaks existing callers. Update `server/room/room_test.go` — replace all `rm.EndGame()` calls (lines 367, 517, 545, 569) with `rm.EndGame(nil)`:

```bash
# In room_test.go, replace all occurrences:
rm.EndGame()  →  rm.EndGame(nil)
```

- [ ] **Step 5: Run Go tests**

Run: `cd /Users/ryo/Personal/yacht-dice/server && go test ./...`
Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add server/message/message.go server/room/room.go server/handler/ws.go server/room/room_test.go
git commit -m "feat(server): ResultSyncPayload 추가 및 EndGame에 rankings 저장"
```

---

### Task 2: Server — Add grace periods for all disconnect scenarios

**Files:**
- Modify: `server/room/room.go`
- Modify: `server/handler/ws.go`

- [ ] **Step 1: Add HandleDisconnectWaiting to room.go**

Add after `HandleReconnect` (line 329):

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

- [ ] **Step 2: Replace handleDisconnect in ws.go**

Replace the entire `handleDisconnect` method (lines 297-335) with:

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
		rm.HandleDisconnectWaiting(p.ID, func() {
			rm.RemovePlayer(p.ID, func() { wh.hub.RemoveRoom(rm.Code) })
			remData, _ := message.New("player:removed", message.PlayerEventPayload{PlayerID: p.ID})
			rm.Broadcast(remData)
		})
	default:
		rm.HandleDisconnectWaiting(p.ID, func() {
			wh.hub.LeaveRoom(p.ID)
			leftData, _ := message.New("player:left", message.PlayerEventPayload{PlayerID: p.ID})
			rm.Broadcast(leftData)
			rm.BroadcastState()
		})
	}
}
```

- [ ] **Step 3: Run Go tests**

Run: `cd /Users/ryo/Personal/yacht-dice/server && go test ./...`
Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add server/room/room.go server/handler/ws.go
git commit -m "feat(server): 모든 단계에 disconnect 유예기간 추가"
```

---

### Task 3: Server — Extend SyncPayload for all phases

**Files:**
- Modify: `server/room/room.go`

- [ ] **Step 1: Add statePayloadLocked helper**

Add after `StatePayload()` method (line 366):

```go
func (r *Room) statePayloadLocked() message.RoomStatePayload {
	players := make([]message.PlayerInfo, len(r.players))
	for i, p := range r.players {
		players[i] = message.PlayerInfo{
			ID:       p.ID,
			Nickname: p.Nickname,
			IsHost:   p.ID == r.hostID,
			IsReady:  r.ready[p.ID],
		}
	}
	return message.RoomStatePayload{
		RoomCode: r.Code,
		Players:  players,
	}
}
```

- [ ] **Step 2: Replace SyncPayload to cover all phases**

Replace existing `SyncPayload()` (lines 374-394) with:

```go
func (r *Room) SyncPayload() []byte {
	r.mu.RLock()
	defer r.mu.RUnlock()

	switch r.status {
	case "playing":
		if r.engine == nil {
			return nil
		}
		var preview map[string]int
		if r.engine.RollCount() > 0 {
			preview = r.engine.Preview(r.engine.CurrentPlayer())
		}
		data, _ := message.New("game:sync", message.GameSyncPayload{
			Dice:          r.engine.Dice(),
			Held:          r.engine.Held(),
			RollCount:     r.engine.RollCount(),
			Scores:        r.engine.Scores(),
			CurrentPlayer: r.engine.CurrentPlayer(),
			Round:         r.engine.Round(),
			Preview:       preview,
		})
		return data
	case "finished":
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
	default:
		data, _ := message.New("room:sync", r.statePayloadLocked())
		return data
	}
}
```

- [ ] **Step 3: Update StatePayload to use statePayloadLocked**

Replace the body of `StatePayload()` (lines 350-366) to delegate to the lock-free helper:

```go
func (r *Room) StatePayload() message.RoomStatePayload {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.statePayloadLocked()
}
```

- [ ] **Step 4: Fix TestSyncPayloadNoEngine in room_test.go**

The existing test (line 396-402) asserts `SyncPayload()` returns `nil` for a waiting room. After this change, it returns `room:sync`. Update it:

```go
func TestSyncPayloadNoEngine(t *testing.T) {
	rm := New("TEST01", "")
	p1 := newMockPlayer("p1", "Alice")
	rm.AddPlayer(p1)
	data := rm.SyncPayload()
	if data == nil {
		t.Fatal("waiting room should return room:sync, not nil")
	}
	var env struct{ Type string `json:"type"` }
	json.Unmarshal(data, &env)
	if env.Type != "room:sync" {
		t.Errorf("type = %s, want room:sync", env.Type)
	}
}
```

- [ ] **Step 5: Run Go tests**

Run: `cd /Users/ryo/Personal/yacht-dice/server && go test ./...`
Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add server/room/room.go server/room/room_test.go
git commit -m "feat(server): SyncPayload를 모든 단계(waiting/playing/finished)로 확장"
```

---

### Task 4: Server — Add Go unit tests for reconnection

**Files:**
- Modify: `server/room/room_test.go`

- [ ] **Step 1: Add reconnection tests**

Add to end of `server/room/room_test.go`:

```go
func TestHandleDisconnectWaiting(t *testing.T) {
	rm := New("TEST01", "")
	p1 := newMockPlayer("p1", "Alice")
	p2 := newMockPlayer("p2", "Bob")
	rm.AddPlayer(p1)
	rm.AddPlayer(p2)

	called := false
	rm.HandleDisconnectWaiting("p2", func() { called = true })

	// Reconnect before timeout — callback should NOT fire
	rm.HandleReconnect("p2")
	// Give a moment for any spurious timer fire
	// (timer was stopped, so callback should not run)
	if called {
		t.Error("callback should not have fired after reconnect")
	}
}

func TestSyncPayloadWaiting(t *testing.T) {
	rm := New("TEST02", "")
	p1 := newMockPlayer("p1", "Alice")
	rm.AddPlayer(p1)

	data := rm.SyncPayload()
	if data == nil {
		t.Fatal("SyncPayload should return data for waiting room")
	}
	// Verify it's a room:sync message
	var env struct {
		Type    string          `json:"type"`
		Payload json.RawMessage `json:"payload"`
	}
	if err := json.Unmarshal(data, &env); err != nil {
		t.Fatal(err)
	}
	if env.Type != "room:sync" {
		t.Errorf("type = %s, want room:sync", env.Type)
	}
}

func TestSyncPayloadFinished(t *testing.T) {
	rm := New("TEST03", "")
	p1 := newMockPlayer("p1", "Alice")
	p2 := newMockPlayer("p2", "Bob")
	rm.AddPlayer(p1)
	rm.AddPlayer(p2)
	rm.StartGame()

	// End game with mock rankings
	rankings := []message.RankEntry{
		{PlayerID: "p1", Nickname: "Alice", Score: 100, Rank: 1},
		{PlayerID: "p2", Nickname: "Bob", Score: 80, Rank: 2},
	}
	rm.EndGame(rankings)

	data := rm.SyncPayload()
	if data == nil {
		t.Fatal("SyncPayload should return data for finished room")
	}
	var env struct {
		Type    string          `json:"type"`
		Payload json.RawMessage `json:"payload"`
	}
	if err := json.Unmarshal(data, &env); err != nil {
		t.Fatal(err)
	}
	if env.Type != "result:sync" {
		t.Errorf("type = %s, want result:sync", env.Type)
	}
	var payload message.ResultSyncPayload
	if err := json.Unmarshal(env.Payload, &payload); err != nil {
		t.Fatal(err)
	}
	if len(payload.Rankings) != 2 {
		t.Errorf("rankings len = %d, want 2", len(payload.Rankings))
	}
}

func TestSyncPayloadPlaying(t *testing.T) {
	rm := New("TEST04", "")
	p1 := newMockPlayer("p1", "Alice")
	p2 := newMockPlayer("p2", "Bob")
	rm.AddPlayer(p1)
	rm.AddPlayer(p2)
	rm.StartGame()

	data := rm.SyncPayload()
	if data == nil {
		t.Fatal("SyncPayload should return data for playing room")
	}
	var env struct {
		Type string `json:"type"`
	}
	if err := json.Unmarshal(data, &env); err != nil {
		t.Fatal(err)
	}
	if env.Type != "game:sync" {
		t.Errorf("type = %s, want game:sync", env.Type)
	}
}
```

- [ ] **Step 2: Add message import if needed**

Ensure `"yacht-dice-server/message"` is in the imports of `room_test.go`.

- [ ] **Step 3: Run Go tests**

Run: `cd /Users/ryo/Personal/yacht-dice/server && go test ./room/ -v -run "TestHandleDisconnect|TestSyncPayload"`
Expected: All 4 new tests pass.

- [ ] **Step 4: Run full Go test suite**

Run: `cd /Users/ryo/Personal/yacht-dice/server && go test ./...`
Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add server/room/room_test.go
git commit -m "test(server): 재연결 유예기간 및 SyncPayload 확장 테스트 추가"
```

---

### Task 5: Client — Add new sync types, reducer actions, and event handlers

**Files:**
- Modify: `client/src/types/game.ts`
- Modify: `client/src/hooks/useGameState.ts`
- Modify: `client/src/hooks/useGameEvents.ts`

- [ ] **Step 1: Add ResultSyncPayload type**

In `client/src/types/game.ts`, add after `GameEndPayload` (line 73):

```ts
export interface ResultSyncPayload {
  rankings: RankEntry[];
  scores: Record<string, Record<string, number>>;
  rematchVotes: string[];
}
```

- [ ] **Step 2: Add ROOM_SYNC and RESULT_SYNC actions to useGameState.ts**

In `client/src/hooks/useGameState.ts`, add to the `GameAction` union (after line 47, before `CLEAR_LAST_SCORED`):

```ts
  | { type: 'ROOM_SYNC'; roomCode: string; players: PlayerInfo[] }
  | { type: 'RESULT_SYNC'; rankings: RankEntry[]; scores: Record<string, Record<string, number>>; rematchVotes: string[] }
```

Add the `RankEntry` import if needed (from `../types/game`).

Add reducer cases (before `default:` line 117):

```ts
    case 'ROOM_SYNC':
      return { ...state, phase: 'room', roomCode: action.roomCode, players: action.players };
    case 'RESULT_SYNC':
      return { ...state, phase: 'result', rankings: action.rankings, scores: action.scores, rematchVotes: action.rematchVotes };
```

- [ ] **Step 3: Add event handlers in useGameEvents.ts**

In `client/src/hooks/useGameEvents.ts`, add the `ResultSyncPayload` import from `../types/game`, and add two new handlers inside the `unsubs` array (after the `game:sync` handler around line 63):

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

- [ ] **Step 4: Run client tests**

Run: `cd /Users/ryo/Personal/yacht-dice/client && npx vitest run`
Expected: All pass (no regressions).

- [ ] **Step 5: Commit**

```bash
git add client/src/types/game.ts client/src/hooks/useGameState.ts client/src/hooks/useGameEvents.ts
git commit -m "feat(client): room:sync, result:sync 핸들러 및 reducer 추가"
```

---

### Task 6: Client — Add unit tests for new reducer actions

**Files:**
- Modify: `client/src/hooks/useGameState.test.ts`

- [ ] **Step 1: Add ROOM_SYNC and RESULT_SYNC reducer tests**

Add to `client/src/hooks/useGameState.test.ts`:

```ts
describe('reconnection sync actions', () => {
  it('ROOM_SYNC restores room phase', () => {
    const [, dispatch] = renderHookResult();
    act(() => dispatch({
      type: 'ROOM_SYNC',
      roomCode: 'ABC123',
      players: [{ id: 'p1', nickname: 'Alice', isHost: true, isReady: false }],
    }));
    const state = getState();
    expect(state.phase).toBe('room');
    expect(state.roomCode).toBe('ABC123');
    expect(state.players).toHaveLength(1);
  });

  it('RESULT_SYNC restores result phase', () => {
    const [, dispatch] = renderHookResult();
    act(() => dispatch({
      type: 'RESULT_SYNC',
      rankings: [{ playerId: 'p1', nickname: 'Alice', score: 100, rank: 1 }],
      scores: { p1: { ones: 3 } },
      rematchVotes: ['p1'],
    }));
    const state = getState();
    expect(state.phase).toBe('result');
    expect(state.rankings).toHaveLength(1);
    expect(state.scores.p1.ones).toBe(3);
    expect(state.rematchVotes).toEqual(['p1']);
  });
});
```

Note: Adapt the test helper pattern to match the existing `useGameState.test.ts` file — read the file first to understand how `renderHookResult` and `getState` are implemented. If the file uses `renderHook` from testing-library, follow that pattern.

- [ ] **Step 2: Run tests**

Run: `cd /Users/ryo/Personal/yacht-dice/client && npx vitest run src/hooks/useGameState.test.ts`
Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useGameState.test.ts
git commit -m "test(client): ROOM_SYNC, RESULT_SYNC reducer 테스트 추가"
```

---

### Task 7: E2E — Add reconnection tests

**Files:**
- Modify: `e2e/run-e2e.sh`
- Modify: `e2e-test.mjs`

- [ ] **Step 1: Add WebSocket reconnection test to e2e-test.mjs**

Add a new test function `testReconnectionDuringGame()` that:
1. Creates a room, two players join, start game
2. Player 2 closes WebSocket connection
3. Wait 2 seconds
4. Player 2 reconnects with same token
5. Verify Player 2 receives `game:sync` message
6. Verify game can continue (Player 2 can roll/score)

Read the existing `e2e-test.mjs` to understand the test patterns and WebSocket connection setup before writing.

- [ ] **Step 2: Add WebSocket room reconnection test**

Add `testReconnectionInRoom()` that:
1. Creates a room, two players join (no game start)
2. Player 2 closes WebSocket
3. Wait 2 seconds
4. Player 2 reconnects with same token
5. Verify Player 2 receives `room:sync` message
6. Verify Player 2 is still in the room

- [ ] **Step 3: Run WebSocket E2E tests**

Run: `cd /Users/ryo/Personal/yacht-dice && node e2e-test.mjs`
Expected: All tests pass including the new reconnection tests.

- [ ] **Step 4: Commit**

```bash
git add e2e-test.mjs
git commit -m "test(e2e): 게임 중/대기실 재연결 WebSocket E2E 테스트 추가"
```

---

### Task 8: Final integration test and squash commit

- [ ] **Step 1: Run all Go tests**

Run: `cd /Users/ryo/Personal/yacht-dice/server && go test ./...`
Expected: All pass.

- [ ] **Step 2: Run all client tests**

Run: `cd /Users/ryo/Personal/yacht-dice/client && npx vitest run`
Expected: All pass.

- [ ] **Step 3: Run WebSocket E2E tests**

Run: `cd /Users/ryo/Personal/yacht-dice && node e2e-test.mjs`
Expected: All pass.

- [ ] **Step 4: Squash into single commit**

```bash
# Count commits since main divergence before squashing:
# git log --oneline | head -10
# Then use the exact count:
git reset --soft HEAD~7  # Adjust count as needed based on actual commits
git commit -m "feat: 모바일 재연결 시 모든 단계(대기실/게임/결과)에서 상태 복원

- 대기실: 30초 유예기간 추가 (즉시 제거 → 타이머 기반)
- 게임 중 2인: 60초 유예기간 적용 (즉시 종료 제거)
- 결과 화면: result:sync로 rankings/scores/rematchVotes 복원
- SyncPayload 확장: room:sync, game:sync, result:sync
- 클라이언트: ROOM_SYNC, RESULT_SYNC reducer 및 이벤트 핸들러
- Go 유닛 테스트 + WebSocket E2E 테스트 추가"
```
