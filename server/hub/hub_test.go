package hub

import (
	"testing"

	"yacht-dice-server/player"
)

func newTestPlayer(id, nickname string) *player.Player {
	return player.New(id, nickname, nil)
}

func TestRegisterAndGetPlayer(t *testing.T) {
	h := New()
	p := newTestPlayer("p1", "Alice")
	h.RegisterPlayer(p)

	got := h.GetPlayer("p1")
	if got == nil {
		t.Fatal("expected player, got nil")
	}
	if got.ID != "p1" {
		t.Errorf("player ID = %s, want p1", got.ID)
	}
	if got.Nickname != "Alice" {
		t.Errorf("nickname = %s, want Alice", got.Nickname)
	}
}

func TestGetPlayerNotFound(t *testing.T) {
	h := New()
	if got := h.GetPlayer("missing"); got != nil {
		t.Errorf("expected nil, got %v", got)
	}
}

func TestCreateRoom(t *testing.T) {
	h := New()
	rm := h.CreateRoom("")
	if rm == nil {
		t.Fatal("expected room, got nil")
	}
	if rm.Code == "" {
		t.Error("room code should not be empty")
	}
	if rm.HasPassword() {
		t.Error("room should not have password")
	}
}

func TestCreateRoomWithPassword(t *testing.T) {
	h := New()
	rm := h.CreateRoom("secret")
	if rm == nil {
		t.Fatal("expected room, got nil")
	}
	if !rm.HasPassword() {
		t.Error("room should have password")
	}
}

func TestJoinRoom(t *testing.T) {
	h := New()
	rm := h.CreateRoom("")
	p := newTestPlayer("p1", "Alice")
	h.RegisterPlayer(p)

	err := h.JoinRoom(rm.Code, p)
	if err != nil {
		t.Fatalf("JoinRoom: %v", err)
	}
	if rm.PlayerCount() != 1 {
		t.Errorf("player count = %d, want 1", rm.PlayerCount())
	}
}

func TestJoinRoomNotFound(t *testing.T) {
	h := New()
	p := newTestPlayer("p1", "Alice")
	h.RegisterPlayer(p)

	err := h.JoinRoom("NONEXIST", p)
	if err == nil {
		t.Error("expected error for non-existent room")
	}
}

func TestLeaveRoom(t *testing.T) {
	h := New()
	rm := h.CreateRoom("")
	p1 := newTestPlayer("p1", "Alice")
	p2 := newTestPlayer("p2", "Bob")
	h.RegisterPlayer(p1)
	h.RegisterPlayer(p2)
	h.JoinRoom(rm.Code, p1)
	h.JoinRoom(rm.Code, p2)

	h.LeaveRoom("p1")

	if rm.PlayerCount() != 1 {
		t.Errorf("player count = %d, want 1", rm.PlayerCount())
	}
	if h.PlayerRoom("p1") != nil {
		t.Error("expected PlayerRoom to return nil after leaving")
	}
}

func TestLeaveRoomNotInRoom(t *testing.T) {
	h := New()
	// Should not panic when leaving without being in a room
	h.LeaveRoom("p1")
}

func TestPlayerRoom(t *testing.T) {
	h := New()
	rm := h.CreateRoom("")
	p := newTestPlayer("p1", "Alice")
	h.RegisterPlayer(p)
	h.JoinRoom(rm.Code, p)

	got := h.PlayerRoom("p1")
	if got == nil {
		t.Fatal("expected room, got nil")
	}
	if got.Code != rm.Code {
		t.Errorf("room code = %s, want %s", got.Code, rm.Code)
	}
}

func TestPlayerRoomNotFound(t *testing.T) {
	h := New()
	if got := h.PlayerRoom("missing"); got != nil {
		t.Errorf("expected nil, got room %s", got.Code)
	}
}

func TestRemoveRoom(t *testing.T) {
	h := New()
	rm := h.CreateRoom("")
	code := rm.Code
	p := newTestPlayer("p1", "Alice")
	h.RegisterPlayer(p)
	h.JoinRoom(code, p)

	h.RemoveRoom(code)

	if h.GetRoom(code) != nil {
		t.Error("expected room to be removed")
	}
	if h.PlayerRoom("p1") != nil {
		t.Error("expected player-room mapping to be cleared")
	}
}

func TestRemovePlayerFull(t *testing.T) {
	h := New()
	rm := h.CreateRoom("")
	p := newTestPlayer("p1", "Alice")
	p2 := newTestPlayer("p2", "Bob")
	h.RegisterPlayer(p)
	h.RegisterPlayer(p2)
	h.JoinRoom(rm.Code, p)
	h.JoinRoom(rm.Code, p2)

	h.RemovePlayerFull("p1")

	if h.GetPlayer("p1") != nil {
		t.Error("expected player to be removed from players map")
	}
	if h.PlayerRoom("p1") != nil {
		t.Error("expected player-room mapping to be cleared")
	}
	if rm.PlayerCount() != 1 {
		t.Errorf("player count = %d, want 1", rm.PlayerCount())
	}
}

func TestListRooms(t *testing.T) {
	h := New()
	h.CreateRoom("")
	h.CreateRoom("secret")

	list := h.ListRooms()
	if len(list) != 2 {
		t.Fatalf("rooms count = %d, want 2", len(list))
	}

	hasPasswordCount := 0
	for _, item := range list {
		if item.HasPassword {
			hasPasswordCount++
		}
	}
	if hasPasswordCount != 1 {
		t.Errorf("rooms with password = %d, want 1", hasPasswordCount)
	}
}

func TestListRoomsEmpty(t *testing.T) {
	h := New()
	list := h.ListRooms()
	if len(list) != 0 {
		t.Errorf("rooms count = %d, want 0", len(list))
	}
}
