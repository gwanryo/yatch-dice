package player

import (
	"errors"
	"sync"

	"github.com/gorilla/websocket"
)

var ErrDisconnected = errors.New("player disconnected")

type Player struct {
	ID       string
	Nickname string
	conn     *websocket.Conn
	mu       sync.Mutex
}

func New(id, nickname string, conn *websocket.Conn) *Player {
	return &Player{ID: id, Nickname: nickname, conn: conn}
}

func (p *Player) Send(data []byte) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.conn == nil {
		return ErrDisconnected
	}
	return p.conn.WriteMessage(websocket.TextMessage, data)
}

func (p *Player) SetConn(conn *websocket.Conn) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.conn = conn
}

func (p *Player) Connected() bool {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.conn != nil
}
