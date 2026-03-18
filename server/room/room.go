package room

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"math/big"
	"sync"
	"time"

	"yacht-dice-server/game"
	"yacht-dice-server/message"
	"yacht-dice-server/player"
)

const MaxPlayers = 4

type Room struct {
	Code     string
	Password string
	mu       sync.RWMutex
	players  []*player.Player
	hostID   string
	ready    map[string]bool
	engine   *game.Engine
	status   string
	cleanup  *time.Timer
	disconn  map[string]*time.Timer
}

func GenerateCode() string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	code := make([]byte, 6)
	for i := range code {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(chars))))
		code[i] = chars[n.Int64()]
	}
	return string(code)
}

func New(code, password string) *Room {
	return &Room{
		Code:     code,
		Password: password,
		ready:    make(map[string]bool),
		status:   "waiting",
		disconn:  make(map[string]*time.Timer),
	}
}

func (r *Room) Status() string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.status
}

func (r *Room) PlayerCount() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.players)
}

func (r *Room) HasPassword() bool {
	return r.Password != ""
}

func (r *Room) AddPlayer(p *player.Player) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.status == "playing" {
		return fmt.Errorf(message.ErrGameInProgress)
	}
	if len(r.players) >= MaxPlayers {
		return fmt.Errorf(message.ErrRoomFull)
	}
	for _, existing := range r.players {
		if existing.ID == p.ID {
			return nil
		}
	}
	r.players = append(r.players, p)
	if r.hostID == "" {
		r.hostID = p.ID
	}
	if r.cleanup != nil {
		r.cleanup.Stop()
		r.cleanup = nil
	}
	return nil
}

func (r *Room) RemovePlayer(playerID string, onEmpty func()) {
	r.mu.Lock()
	defer r.mu.Unlock()
	idx := -1
	for i, p := range r.players {
		if p.ID == playerID {
			idx = i
			break
		}
	}
	if idx == -1 {
		return
	}
	r.players = append(r.players[:idx], r.players[idx+1:]...)
	delete(r.ready, playerID)
	if r.hostID == playerID && len(r.players) > 0 {
		r.hostID = r.players[0].ID
	}
	if r.engine != nil {
		r.engine.RemovePlayer(playerID)
		if len(r.players) < 2 {
			r.status = "waiting"
			r.engine = nil
		}
	}
	if len(r.players) == 0 {
		r.cleanup = time.AfterFunc(30*time.Second, onEmpty)
	}
}

func (r *Room) ToggleReady(playerID string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.ready[playerID] = !r.ready[playerID]
}

func (r *Room) CanStart(playerID string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if playerID != r.hostID || len(r.players) < 2 || r.status == "playing" {
		return false
	}
	for _, p := range r.players {
		if p.ID != r.hostID && !r.ready[p.ID] {
			return false
		}
	}
	return true
}

func (r *Room) StartGame() []string {
	r.mu.Lock()
	defer r.mu.Unlock()
	order := make([]string, len(r.players))
	for i, p := range r.players {
		order[i] = p.ID
	}
	r.engine = game.NewEngine(order)
	r.status = "playing"
	r.ready = make(map[string]bool)
	return order
}

func (r *Room) Roll(playerID string, held []int) ([5]int, int, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.engine == nil {
		return [5]int{}, 0, fmt.Errorf("no game in progress")
	}
	dice, err := r.engine.Roll(playerID, held)
	return dice, r.engine.RollCount(), err
}

func (r *Room) Score(playerID string, category string) (int, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.engine == nil {
		return 0, fmt.Errorf("no game in progress")
	}
	return r.engine.Score(playerID, category)
}

func (r *Room) GameState() *game.Engine {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.engine
}

func (r *Room) IsFinished() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.engine != nil && r.engine.IsFinished()
}

func (r *Room) EndGame() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.status = "waiting"
	r.engine = nil
}

func (r *Room) Rematch(playerID string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.status = "waiting"
	r.engine = nil
	r.ready = make(map[string]bool)
}

func (r *Room) StartRematchTimer(onTimeout func()) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.cleanup != nil {
		r.cleanup.Stop()
	}
	r.cleanup = time.AfterFunc(30*time.Second, onTimeout)
}

func (r *Room) CancelRematchTimer() {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.cleanup != nil {
		r.cleanup.Stop()
		r.cleanup = nil
	}
}

func (r *Room) HandleDisconnect(playerID string, onTimeout func()) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if timer, ok := r.disconn[playerID]; ok {
		timer.Stop()
	}
	r.disconn[playerID] = time.AfterFunc(60*time.Second, onTimeout)
}

func (r *Room) HandleReconnect(playerID string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if timer, ok := r.disconn[playerID]; ok {
		timer.Stop()
		delete(r.disconn, playerID)
	}
}

func (r *Room) FindPlayer(playerID string) *player.Player {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, p := range r.players {
		if p.ID == playerID {
			return p
		}
	}
	return nil
}

func (r *Room) Broadcast(data []byte) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, p := range r.players {
		p.Send(data)
	}
}

func (r *Room) BroadcastState() {
	r.mu.RLock()
	players := make([]message.PlayerInfo, len(r.players))
	for i, p := range r.players {
		players[i] = message.PlayerInfo{
			ID:       p.ID,
			Nickname: p.Nickname,
			IsHost:   p.ID == r.hostID,
			IsReady:  r.ready[p.ID],
		}
	}
	r.mu.RUnlock()
	data, _ := message.New("room:state", message.RoomStatePayload{
		RoomCode: r.Code,
		Players:  players,
	})
	r.Broadcast(data)
}

func (r *Room) SyncPayload() []byte {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if r.engine == nil {
		return nil
	}
	data, _ := message.New("game:sync", message.GameSyncPayload{
		Dice:          r.engine.Dice(),
		Held:          r.engine.Held(),
		RollCount:     r.engine.RollCount(),
		Scores:        r.engine.Scores(),
		CurrentPlayer: r.engine.CurrentPlayer(),
		Round:         r.engine.Round(),
	})
	return data
}

func (r *Room) ListItem() message.RoomListItem {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return message.RoomListItem{
		Code:        r.Code,
		PlayerCount: len(r.players),
		HasPassword: r.Password != "",
		Status:      r.status,
	}
}

func (r *Room) NicknameMap() map[string]string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	m := make(map[string]string)
	for _, p := range r.players {
		m[p.ID] = p.Nickname
	}
	return m
}

func Decode[T any](raw json.RawMessage) (T, error) {
	var v T
	err := json.Unmarshal(raw, &v)
	return v, err
}
