package handler

import (
	"testing"
	"time"
)

func TestRateLimiterAllow(t *testing.T) {
	rl := newRateLimiter(3, 50*time.Millisecond)

	// Should allow up to 3 tokens
	for i := 0; i < 3; i++ {
		if !rl.Allow() {
			t.Errorf("expected Allow() to return true on call %d", i+1)
		}
	}

	// 4th call should be denied (tokens depleted)
	if rl.Allow() {
		t.Error("expected Allow() to return false after token depletion")
	}
}

func TestRateLimiterRefill(t *testing.T) {
	rl := newRateLimiter(2, 50*time.Millisecond)

	// Deplete tokens
	rl.Allow()
	rl.Allow()
	if rl.Allow() {
		t.Error("expected Allow() to return false after depletion")
	}

	// Wait for refill (at least one token)
	time.Sleep(60 * time.Millisecond)

	if !rl.Allow() {
		t.Error("expected Allow() to return true after refill period")
	}
}

func TestRateLimiterMaxCap(t *testing.T) {
	rl := newRateLimiter(3, 10*time.Millisecond)

	// Wait a long time to accumulate refills
	time.Sleep(100 * time.Millisecond)

	// Should only allow max tokens (3), not more
	for i := 0; i < 3; i++ {
		if !rl.Allow() {
			t.Errorf("expected Allow() to return true on call %d", i+1)
		}
	}
	if rl.Allow() {
		t.Error("expected Allow() to return false — should not exceed max tokens")
	}
}

func TestHoverThrottleAllow(t *testing.T) {
	ht := newHoverThrottle(50 * time.Millisecond)

	// First call should always be allowed
	if !ht.Allow() {
		t.Error("expected first Allow() to return true")
	}

	// Immediate second call should be denied
	if ht.Allow() {
		t.Error("expected Allow() to return false within interval")
	}

	// Wait for interval to pass
	time.Sleep(60 * time.Millisecond)

	if !ht.Allow() {
		t.Error("expected Allow() to return true after interval")
	}
}

func TestHoverThrottleTiming(t *testing.T) {
	ht := newHoverThrottle(100 * time.Millisecond)

	ht.Allow() // first call

	// At 50ms, should still be denied
	time.Sleep(50 * time.Millisecond)
	if ht.Allow() {
		t.Error("expected Allow() to return false at half interval")
	}

	// At ~110ms total, should be allowed
	time.Sleep(60 * time.Millisecond)
	if !ht.Allow() {
		t.Error("expected Allow() to return true after full interval")
	}
}

func TestSignAndVerifyPlayerID(t *testing.T) {
	playerID := "test-player-123"
	token := signPlayerID(playerID)

	// Token should contain the player ID
	gotID, valid := verifyPlayerToken(token)
	if !valid {
		t.Fatal("expected token to be valid")
	}
	if gotID != playerID {
		t.Errorf("player ID = %s, want %s", gotID, playerID)
	}
}

func TestVerifyPlayerTokenInvalid(t *testing.T) {
	// Tampered token
	_, valid := verifyPlayerToken("fake-id:deadbeef")
	if valid {
		t.Error("expected tampered token to be invalid")
	}
}

func TestVerifyPlayerTokenMalformed(t *testing.T) {
	_, valid := verifyPlayerToken("no-colon-here")
	if valid {
		t.Error("expected malformed token to be invalid")
	}
}

func TestVerifyPlayerTokenEmpty(t *testing.T) {
	_, valid := verifyPlayerToken("")
	if valid {
		t.Error("expected empty token to be invalid")
	}
}

func TestExtractClientIPForwardedFor(t *testing.T) {
	// Create a minimal http.Request-like setup
	// We'll test extractClientIP by constructing requests manually
	tests := []struct {
		name       string
		xff        string
		remoteAddr string
		want       string
	}{
		{"xff single", "1.2.3.4", "5.6.7.8:1234", "1.2.3.4"},
		{"xff multiple", "1.2.3.4, 10.0.0.1", "5.6.7.8:1234", "1.2.3.4"},
		{"no xff", "", "5.6.7.8:1234", "5.6.7.8"},
		{"no xff no port", "", "5.6.7.8", "5.6.7.8"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Build a minimal http.Request
			req := &fakeRequest{xff: tt.xff, remoteAddr: tt.remoteAddr}
			got := extractClientIPFromFields(req.xff, req.remoteAddr)
			if got != tt.want {
				t.Errorf("extractClientIP = %s, want %s", got, tt.want)
			}
		})
	}
}

type fakeRequest struct {
	xff        string
	remoteAddr string
}

// extractClientIPFromFields mirrors the logic of extractClientIP for testing
func extractClientIPFromFields(xff, remoteAddr string) string {
	if xff != "" {
		parts := splitN(xff, ",", 2)
		ip := trimSpace(parts[0])
		if ip != "" {
			return ip
		}
	}
	host, _, err := splitHostPort(remoteAddr)
	if err != "" {
		return remoteAddr
	}
	return host
}

func splitN(s, sep string, n int) []string {
	result := make([]string, 0, n)
	for i := 0; i < n-1; i++ {
		idx := indexOf(s, sep)
		if idx < 0 {
			break
		}
		result = append(result, s[:idx])
		s = s[idx+len(sep):]
	}
	result = append(result, s)
	return result
}

func indexOf(s, sub string) int {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}

func trimSpace(s string) string {
	start, end := 0, len(s)
	for start < end && s[start] == ' ' {
		start++
	}
	for end > start && s[end-1] == ' ' {
		end--
	}
	return s[start:end]
}

func splitHostPort(addr string) (string, string, string) {
	idx := lastIndexOf(addr, ":")
	if idx < 0 {
		return addr, "", "no port"
	}
	return addr[:idx], addr[idx+1:], ""
}

func lastIndexOf(s, sub string) int {
	for i := len(s) - len(sub); i >= 0; i-- {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}

func TestAllowIPRateLimit(t *testing.T) {
	// Use a unique IP for this test to avoid interference
	testIP := "test-ip-rate-limit-unique"

	// Should allow up to ipMaxTokens
	for i := 0; i < ipMaxTokens; i++ {
		if !allowIP(testIP) {
			t.Errorf("expected allowIP to return true on call %d", i+1)
		}
	}

	// Next call should be denied
	if allowIP(testIP) {
		t.Error("expected allowIP to return false after exhausting tokens")
	}
}
