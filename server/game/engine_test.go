package game

import (
	"testing"
)

func TestNewEngine(t *testing.T) {
	e := NewEngine([]string{"p1", "p2"})
	if e.CurrentPlayer() != "p1" {
		t.Errorf("first player = %s, want p1", e.CurrentPlayer())
	}
	if e.Round() != 1 {
		t.Errorf("round = %d, want 1", e.Round())
	}
	if e.RollCount() != 0 {
		t.Errorf("rollCount = %d, want 0", e.RollCount())
	}
}

func TestRoll(t *testing.T) {
	e := NewEngine([]string{"p1", "p2"})
	dice, err := e.Roll("p1", []int{})
	if err != nil {
		t.Fatal(err)
	}
	for _, d := range dice {
		if d < 1 || d > 6 {
			t.Errorf("dice value out of range: %d", d)
		}
	}
	if e.RollCount() != 1 {
		t.Errorf("rollCount = %d, want 1", e.RollCount())
	}
}

func TestRollWrongPlayer(t *testing.T) {
	e := NewEngine([]string{"p1", "p2"})
	_, err := e.Roll("p2", []int{})
	if err == nil {
		t.Error("expected error for wrong player")
	}
}

func TestRollFirstMustBeEmpty(t *testing.T) {
	e := NewEngine([]string{"p1", "p2"})
	_, err := e.Roll("p1", []int{0, 1})
	if err == nil {
		t.Error("expected error for held on first roll")
	}
}

func TestRollMax3(t *testing.T) {
	e := NewEngine([]string{"p1", "p2"})
	e.Roll("p1", []int{})
	e.Roll("p1", []int{0, 1})
	e.Roll("p1", []int{0, 1, 2})
	_, err := e.Roll("p1", []int{})
	if err == nil {
		t.Error("expected error for 4th roll")
	}
}

func TestScoreAndAdvance(t *testing.T) {
	e := NewEngine([]string{"p1", "p2"})
	e.Roll("p1", []int{})
	score, err := e.Score("p1", "choice")
	if err != nil {
		t.Fatal(err)
	}
	if score < 5 || score > 30 {
		t.Errorf("choice score out of range: %d", score)
	}
	if e.CurrentPlayer() != "p2" {
		t.Errorf("next player = %s, want p2", e.CurrentPlayer())
	}
}

func TestScoreDuplicate(t *testing.T) {
	e := NewEngine([]string{"p1", "p2"})
	e.Roll("p1", []int{})
	e.Score("p1", "choice")
	e.Roll("p2", []int{})
	e.Score("p2", "choice")
	e.Roll("p1", []int{})
	_, err := e.Score("p1", "choice")
	if err == nil {
		t.Error("expected error for duplicate category")
	}
}

func TestGameEnd(t *testing.T) {
	e := NewEngine([]string{"p1", "p2"})
	cats := AllCategories()
	for round := 0; round < len(cats); round++ {
		for _, pid := range []string{"p1", "p2"} {
			e.Roll(pid, []int{})
			e.Score(pid, cats[round])
		}
	}
	if !e.IsFinished() {
		t.Error("game should be finished after all rounds")
	}
}

func TestRemovePlayer(t *testing.T) {
	e := NewEngine([]string{"p1", "p2", "p3"})
	e.RemovePlayer("p2")
	if len(e.PlayerOrder()) != 2 {
		t.Errorf("players = %d, want 2", len(e.PlayerOrder()))
	}
}

func TestHeld(t *testing.T) {
	e := NewEngine([]string{"p1"})
	e.Roll("p1", []int{})
	e.Roll("p1", []int{0, 2, 4})
	h := e.Held()
	if !h[0] || h[1] || !h[2] || h[3] || !h[4] {
		t.Errorf("held = %v, want [true false true false true]", h)
	}
}
