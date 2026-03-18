package player

import (
	"sync"

	"github.com/gorilla/websocket"
)

type Player struct {
	ID       string
	Nickname string
	Conn     *websocket.Conn
	mu       sync.Mutex
}

func New(id, nickname string, conn *websocket.Conn) *Player {
	return &Player{ID: id, Nickname: nickname, Conn: conn}
}

func (p *Player) Send(data []byte) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.Conn == nil {
		return nil
	}
	return p.Conn.WriteMessage(websocket.TextMessage, data)
}

func (p *Player) SetConn(conn *websocket.Conn) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.Conn = conn
}

func (p *Player) Connected() bool {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.Conn != nil
}
