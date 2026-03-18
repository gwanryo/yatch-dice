package message

import "encoding/json"

type Envelope struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload,omitempty"`
}

func New(typ string, payload any) ([]byte, error) {
	p, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return json.Marshal(Envelope{Type: typ, Payload: p})
}

func Parse(data []byte) (Envelope, error) {
	var e Envelope
	err := json.Unmarshal(data, &e)
	return e, err
}

// Error codes
const (
	ErrNotYourTurn    = "NOT_YOUR_TURN"
	ErrCategoryFilled = "CATEGORY_FILLED"
	ErrInvalidRoll    = "INVALID_ROLL"
	ErrRoomFull       = "ROOM_FULL"
	ErrWrongPassword  = "WRONG_PASSWORD"
	ErrRoomNotFound   = "ROOM_NOT_FOUND"
	ErrGameInProgress = "GAME_IN_PROGRESS"
)

// Payloads: Lobby
type RoomCreatePayload struct {
	Password string `json:"password,omitempty"`
}
type RoomCreatedPayload struct {
	RoomCode string `json:"roomCode"`
}
type RoomJoinPayload struct {
	RoomCode string `json:"roomCode"`
	Password string `json:"password,omitempty"`
}
type RoomListItem struct {
	Code        string `json:"code"`
	PlayerCount int    `json:"playerCount"`
	HasPassword bool   `json:"hasPassword"`
	Status      string `json:"status"` // "waiting" | "playing"
}

// Payloads: Waiting Room
type PlayerInfo struct {
	ID       string `json:"id"`
	Nickname string `json:"nickname"`
	IsHost   bool   `json:"isHost"`
	IsReady  bool   `json:"isReady"`
}
type RoomStatePayload struct {
	RoomCode string       `json:"roomCode"`
	Players  []PlayerInfo `json:"players"`
}
type GameStartPayload struct {
	PlayerOrder []string `json:"playerOrder"`
}

// Payloads: Game
type GameRollPayload struct {
	Held []int `json:"held"` // indices 0-4
}
type GameRolledPayload struct {
	Dice      [5]int `json:"dice"`
	Held      [5]bool `json:"held"`
	RollCount int    `json:"rollCount"`
}
type GameScorePayload struct {
	Category string `json:"category"`
}
type GameScoredPayload struct {
	PlayerID    string                    `json:"playerId"`
	Category    string                    `json:"category"`
	Score       int                       `json:"score"`
	TotalScores map[string]map[string]int `json:"totalScores"`
}
type GameTurnPayload struct {
	CurrentPlayer string `json:"currentPlayer"`
	Round         int    `json:"round"`
}
type GameSyncPayload struct {
	Dice          [5]int                    `json:"dice"`
	Held          [5]bool                   `json:"held"`
	RollCount     int                       `json:"rollCount"`
	Scores        map[string]map[string]int `json:"scores"`
	CurrentPlayer string                    `json:"currentPlayer"`
	Round         int                       `json:"round"`
}
type GameEndPayload struct {
	Rankings []RankEntry `json:"rankings"`
}
type RankEntry struct {
	PlayerID string `json:"playerId"`
	Nickname string `json:"nickname"`
	Score    int    `json:"score"`
	Rank     int    `json:"rank"`
}

// Payloads: Reaction
type ReactionSendPayload struct {
	Emoji string `json:"emoji"`
}
type ReactionShowPayload struct {
	PlayerID string `json:"playerId"`
	Emoji    string `json:"emoji"`
}

// Payloads: Connection
type ConnectedPayload struct {
	PlayerID string `json:"playerId"`
}
type PlayerEventPayload struct {
	PlayerID string `json:"playerId"`
}
type ErrorPayload struct {
	Message string `json:"message"`
	Code    string `json:"code"`
}
