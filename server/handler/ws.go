package handler

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"

	"yacht-dice-server/hub"
	"yacht-dice-server/message"
	"yacht-dice-server/player"
	"yacht-dice-server/room"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type WSHandler struct {
	hub *hub.Hub
}

func NewWSHandler(h *hub.Hub) *WSHandler {
	return &WSHandler{hub: h}
}

func (wh *WSHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("upgrade error: %v", err)
		return
	}
	defer conn.Close()

	nickname := r.URL.Query().Get("nickname")
	if nickname == "" {
		nickname = "Player_" + uuid.New().String()[:4]
	}

	existingID := r.URL.Query().Get("playerId")
	var p *player.Player
	if existingID != "" {
		p = wh.hub.GetPlayer(existingID)
	}
	if p != nil {
		p.SetConn(conn)
		rm := wh.hub.PlayerRoom(p.ID)
		if rm != nil {
			rm.HandleReconnect(p.ID)
			rm.BroadcastState()
			if syncData := rm.SyncPayload(); syncData != nil {
				p.Send(syncData)
			}
		}
	} else {
		p = player.New(uuid.New().String(), nickname, conn)
		wh.hub.RegisterPlayer(p)
	}

	data, _ := message.New("connected", message.ConnectedPayload{PlayerID: p.ID})
	p.Send(data)

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			log.Printf("read error (player %s): %v", p.ID, err)
			wh.handleDisconnect(p)
			return
		}
		env, err := message.Parse(msg)
		if err != nil {
			continue
		}
		wh.handleMessage(p, env)
	}
}

func (wh *WSHandler) handleDisconnect(p *player.Player) {
	p.SetConn(nil)
	rm := wh.hub.PlayerRoom(p.ID)
	if rm == nil {
		wh.hub.RemovePlayerFull(p.ID)
		return
	}

	data, _ := message.New("player:disconnected", message.PlayerEventPayload{PlayerID: p.ID})
	rm.Broadcast(data)

	if rm.Status() == "playing" {
		rm.HandleDisconnect(p.ID, func() {
			rm.RemovePlayer(p.ID, func() { wh.hub.RemoveRoom(rm.Code) })
			remData, _ := message.New("player:removed", message.PlayerEventPayload{PlayerID: p.ID})
			rm.Broadcast(remData)

			if rm.PlayerCount() < 2 && rm.Status() == "playing" {
				wh.endGame(rm)
			} else {
				rm.BroadcastState()
				wh.broadcastTurn(rm)
			}
		})
	} else {
		wh.hub.LeaveRoom(p.ID)
		leftData, _ := message.New("player:left", message.PlayerEventPayload{PlayerID: p.ID})
		rm.Broadcast(leftData)
		rm.BroadcastState()
	}
}

func (wh *WSHandler) handleMessage(p *player.Player, env message.Envelope) {
	switch env.Type {
	case "room:create":
		wh.handleRoomCreate(p, env.Payload)
	case "room:join":
		wh.handleRoomJoin(p, env.Payload)
	case "room:leave":
		wh.handleRoomLeave(p)
	case "room:list":
		wh.handleRoomList(p)
	case "room:ready":
		wh.handleReady(p)
	case "room:start":
		wh.handleStart(p)
	case "game:roll":
		wh.handleRoll(p, env.Payload)
	case "game:score":
		wh.handleScore(p, env.Payload)
	case "game:rematch":
		wh.handleRematch(p)
	case "reaction:send":
		wh.handleReaction(p, env.Payload)
	}
}

func (wh *WSHandler) sendError(p *player.Player, code, msg string) {
	data, _ := message.New("error", message.ErrorPayload{Code: code, Message: msg})
	p.Send(data)
}

func (wh *WSHandler) handleRoomCreate(p *player.Player, payload json.RawMessage) {
	var req message.RoomCreatePayload
	json.Unmarshal(payload, &req)
	rm := wh.hub.CreateRoom(req.Password)
	wh.hub.JoinRoom(rm.Code, p)
	data, _ := message.New("room:created", message.RoomCreatedPayload{RoomCode: rm.Code})
	p.Send(data)
	rm.BroadcastState()
}

func (wh *WSHandler) handleRoomJoin(p *player.Player, payload json.RawMessage) {
	var req message.RoomJoinPayload
	json.Unmarshal(payload, &req)
	rm := wh.hub.GetRoom(req.RoomCode)
	if rm == nil {
		wh.sendError(p, message.ErrRoomNotFound, "Room not found")
		return
	}
	if rm.HasPassword() && rm.Password != req.Password {
		wh.sendError(p, message.ErrWrongPassword, "Wrong password")
		return
	}
	if err := wh.hub.JoinRoom(req.RoomCode, p); err != nil {
		wh.sendError(p, err.Error(), err.Error())
		return
	}
	data, _ := message.New("room:joined", message.RoomStatePayload{RoomCode: rm.Code})
	p.Send(data)
	joinData, _ := message.New("player:joined", message.PlayerInfo{ID: p.ID, Nickname: p.Nickname})
	rm.Broadcast(joinData)
	rm.BroadcastState()
}

func (wh *WSHandler) handleRoomLeave(p *player.Player) {
	rm := wh.hub.PlayerRoom(p.ID)
	if rm == nil {
		return
	}
	wh.hub.LeaveRoom(p.ID)
	data, _ := message.New("player:left", message.PlayerEventPayload{PlayerID: p.ID})
	rm.Broadcast(data)
	rm.BroadcastState()
}

func (wh *WSHandler) handleRoomList(p *player.Player) {
	list := wh.hub.ListRooms()
	data, _ := message.New("room:list", list)
	p.Send(data)
}

func (wh *WSHandler) handleReady(p *player.Player) {
	rm := wh.hub.PlayerRoom(p.ID)
	if rm == nil {
		return
	}
	rm.ToggleReady(p.ID)
	rm.BroadcastState()
}

func (wh *WSHandler) handleStart(p *player.Player) {
	rm := wh.hub.PlayerRoom(p.ID)
	if rm == nil || !rm.CanStart(p.ID) {
		return
	}
	order := rm.StartGame()
	data, _ := message.New("game:start", message.GameStartPayload{PlayerOrder: order})
	rm.Broadcast(data)
	wh.broadcastTurn(rm)
}

func (wh *WSHandler) handleRoll(p *player.Player, payload json.RawMessage) {
	rm := wh.hub.PlayerRoom(p.ID)
	if rm == nil {
		return
	}
	var req message.GameRollPayload
	json.Unmarshal(payload, &req)
	dice, rollCount, err := rm.Roll(p.ID, req.Held)
	if err != nil {
		wh.sendError(p, err.Error(), err.Error())
		return
	}
	var held [5]bool
	for _, idx := range req.Held {
		if idx >= 0 && idx < 5 {
			held[idx] = true
		}
	}
	data, _ := message.New("game:rolled", message.GameRolledPayload{Dice: dice, Held: held, RollCount: rollCount})
	rm.Broadcast(data)
}

func (wh *WSHandler) handleScore(p *player.Player, payload json.RawMessage) {
	rm := wh.hub.PlayerRoom(p.ID)
	if rm == nil {
		return
	}
	var req message.GameScorePayload
	json.Unmarshal(payload, &req)
	engine := rm.GameState()
	if engine == nil {
		return
	}
	score, err := rm.Score(p.ID, req.Category)
	if err != nil {
		wh.sendError(p, err.Error(), err.Error())
		return
	}
	data, _ := message.New("game:scored", message.GameScoredPayload{
		PlayerID: p.ID, Category: req.Category, Score: score, TotalScores: engine.Scores(),
	})
	rm.Broadcast(data)
	if rm.IsFinished() {
		wh.endGame(rm)
	} else {
		wh.broadcastTurn(rm)
	}
}

func (wh *WSHandler) endGame(rm *room.Room) {
	engine := rm.GameState()
	if engine == nil {
		return
	}
	rankings := engine.Rankings()
	nicks := rm.NicknameMap()
	for i := range rankings {
		rankings[i].Nickname = nicks[rankings[i].PlayerID]
	}
	data, _ := message.New("game:end", message.GameEndPayload{Rankings: rankings})
	rm.Broadcast(data)
	rm.EndGame()
	rm.StartRematchTimer(func() {
		wh.hub.RemoveRoom(rm.Code)
	})
}

func (wh *WSHandler) broadcastTurn(rm *room.Room) {
	engine := rm.GameState()
	if engine == nil {
		return
	}
	data, _ := message.New("game:turn", message.GameTurnPayload{
		CurrentPlayer: engine.CurrentPlayer(), Round: engine.Round(),
	})
	rm.Broadcast(data)
}

func (wh *WSHandler) handleRematch(p *player.Player) {
	rm := wh.hub.PlayerRoom(p.ID)
	if rm == nil {
		return
	}
	rm.CancelRematchTimer()
	rm.Rematch(p.ID)
	rm.BroadcastState()
}

func (wh *WSHandler) handleReaction(p *player.Player, payload json.RawMessage) {
	rm := wh.hub.PlayerRoom(p.ID)
	if rm == nil {
		return
	}
	var req message.ReactionSendPayload
	json.Unmarshal(payload, &req)
	data, _ := message.New("reaction:show", message.ReactionShowPayload{PlayerID: p.ID, Emoji: req.Emoji})
	rm.Broadcast(data)
}
