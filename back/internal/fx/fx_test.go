package fx

import "testing"

func TestConvertFromQuotedRates(t *testing.T) {
	rates := map[string]float64{"CNY": 1, "USD": 0.14, "EUR": 0.13}
	if got := Convert(14, "USD", "CNY", rates); got < 99.9 || got > 100.1 {
		t.Fatalf("14 USD @ 0.14 USD/CNY 应为 100 CNY，实际 %v", got)
	}
	if got := Convert(50, "CNY", "CNY", rates); got != 50 {
		t.Fatalf("同币种应原样返回，实际 %v", got)
	}
}
