package game

import "sort"

var categories = []string{
	"ones", "twos", "threes", "fours", "fives", "sixes",
	"choice", "fourOfAKind", "fullHouse",
	"smallStraight", "largeStraight", "yacht",
}

func AllCategories() []string {
	out := make([]string, len(categories))
	copy(out, categories)
	return out
}

func Calculate(dice [5]int, category string) int {
	counts := [7]int{}
	sum := 0
	for _, d := range dice {
		counts[d]++
		sum += d
	}
	switch category {
	case "ones":
		return counts[1] * 1
	case "twos":
		return counts[2] * 2
	case "threes":
		return counts[3] * 3
	case "fours":
		return counts[4] * 4
	case "fives":
		return counts[5] * 5
	case "sixes":
		return counts[6] * 6
	case "choice":
		return sum
	case "fourOfAKind":
		for v := 1; v <= 6; v++ {
			if counts[v] >= 4 {
				return sum
			}
		}
		return 0
	case "fullHouse":
		has3, has2 := false, false
		for v := 1; v <= 6; v++ {
			if counts[v] == 3 {
				has3 = true
			}
			if counts[v] == 2 {
				has2 = true
			}
		}
		if has3 && has2 {
			return 25
		}
		return 0
	case "smallStraight":
		sorted := make([]int, 5)
		copy(sorted, dice[:])
		sort.Ints(sorted)
		uniq := []int{sorted[0]}
		for i := 1; i < 5; i++ {
			if sorted[i] != sorted[i-1] {
				uniq = append(uniq, sorted[i])
			}
		}
		if hasRun(uniq, 4) {
			return 30
		}
		return 0
	case "largeStraight":
		sorted := make([]int, 5)
		copy(sorted, dice[:])
		sort.Ints(sorted)
		for i := 1; i < 5; i++ {
			if sorted[i] != sorted[i-1]+1 {
				return 0
			}
		}
		return 40
	case "yacht":
		for v := 1; v <= 6; v++ {
			if counts[v] == 5 {
				return 50
			}
		}
		return 0
	default:
		return -1
	}
}

func hasRun(uniq []int, length int) bool {
	if len(uniq) < length {
		return false
	}
	run := 1
	for i := 1; i < len(uniq); i++ {
		if uniq[i] == uniq[i-1]+1 {
			run++
			if run >= length {
				return true
			}
		} else {
			run = 1
		}
	}
	return false
}

var upperCategories = []string{"ones", "twos", "threes", "fours", "fives", "sixes"}

func UpperBonus(scores map[string]int) int {
	sum := 0
	for _, cat := range upperCategories {
		sum += scores[cat]
	}
	if sum >= 63 {
		return 35
	}
	return 0
}

func TotalScore(scores map[string]int) int {
	sum := 0
	for _, v := range scores {
		sum += v
	}
	sum += UpperBonus(scores)
	return sum
}
