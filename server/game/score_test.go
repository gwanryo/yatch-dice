package game

import "testing"

func TestOnes(t *testing.T) {
	if got := Calculate([5]int{1, 1, 3, 4, 5}, "ones"); got != 2 {
		t.Errorf("ones = %d, want 2", got)
	}
}
func TestSixes(t *testing.T) {
	if got := Calculate([5]int{6, 6, 6, 1, 2}, "sixes"); got != 18 {
		t.Errorf("sixes = %d, want 18", got)
	}
}
func TestChoice(t *testing.T) {
	if got := Calculate([5]int{1, 2, 3, 4, 5}, "choice"); got != 15 {
		t.Errorf("choice = %d, want 15", got)
	}
}
func TestFourOfAKind(t *testing.T) {
	if got := Calculate([5]int{3, 3, 3, 3, 5}, "fourOfAKind"); got != 17 {
		t.Errorf("fourOfAKind = %d, want 17", got)
	}
}
func TestFourOfAKindFail(t *testing.T) {
	if got := Calculate([5]int{3, 3, 3, 2, 5}, "fourOfAKind"); got != 0 {
		t.Errorf("fourOfAKind = %d, want 0", got)
	}
}
func TestFullHouse(t *testing.T) {
	if got := Calculate([5]int{2, 2, 3, 3, 3}, "fullHouse"); got != 25 {
		t.Errorf("fullHouse = %d, want 25", got)
	}
}
func TestFullHouseFail(t *testing.T) {
	if got := Calculate([5]int{2, 2, 3, 3, 4}, "fullHouse"); got != 0 {
		t.Errorf("fullHouse = %d, want 0", got)
	}
}
func TestSmallStraight(t *testing.T) {
	tests := [][5]int{{1, 2, 3, 4, 6}, {2, 3, 4, 5, 5}, {1, 3, 4, 5, 6}}
	for _, d := range tests {
		if got := Calculate(d, "smallStraight"); got != 30 {
			t.Errorf("smallStraight(%v) = %d, want 30", d, got)
		}
	}
}
func TestSmallStraightFail(t *testing.T) {
	if got := Calculate([5]int{1, 2, 3, 5, 6}, "smallStraight"); got != 0 {
		t.Errorf("smallStraight = %d, want 0", got)
	}
}
func TestLargeStraight(t *testing.T) {
	if got := Calculate([5]int{1, 2, 3, 4, 5}, "largeStraight"); got != 40 {
		t.Errorf("largeStraight = %d, want 40", got)
	}
	if got := Calculate([5]int{2, 3, 4, 5, 6}, "largeStraight"); got != 40 {
		t.Errorf("largeStraight = %d, want 40", got)
	}
}
func TestLargeStraightFail(t *testing.T) {
	if got := Calculate([5]int{1, 2, 3, 4, 6}, "largeStraight"); got != 0 {
		t.Errorf("largeStraight = %d, want 0", got)
	}
}
func TestYacht(t *testing.T) {
	if got := Calculate([5]int{4, 4, 4, 4, 4}, "yacht"); got != 50 {
		t.Errorf("yacht = %d, want 50", got)
	}
}
func TestYachtFail(t *testing.T) {
	if got := Calculate([5]int{4, 4, 4, 4, 5}, "yacht"); got != 0 {
		t.Errorf("yacht = %d, want 0", got)
	}
}
func TestUpperBonus(t *testing.T) {
	scores := map[string]int{"ones": 3, "twos": 8, "threes": 12, "fours": 16, "fives": 15, "sixes": 18}
	if got := UpperBonus(scores); got != 35 {
		t.Errorf("upperBonus = %d, want 35", got)
	}
}
func TestUpperBonusNot(t *testing.T) {
	scores := map[string]int{"ones": 1, "twos": 2, "threes": 3, "fours": 4, "fives": 5, "sixes": 6}
	if got := UpperBonus(scores); got != 0 {
		t.Errorf("upperBonus = %d, want 0", got)
	}
}
func TestAllCategories(t *testing.T) {
	cats := AllCategories()
	if len(cats) != 12 {
		t.Errorf("categories count = %d, want 12", len(cats))
	}
}
func TestInvalidCategory(t *testing.T) {
	if got := Calculate([5]int{1, 2, 3, 4, 5}, "invalid"); got != -1 {
		t.Errorf("invalid = %d, want -1", got)
	}
}
