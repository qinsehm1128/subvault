package fx

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"
)

var (
	mu      sync.Mutex
	cached  map[string]float64
	fetched time.Time
)

func RatesTo(base string) (map[string]float64, error) {
	base = strings.ToUpper(strings.TrimSpace(base))
	if base == "" {
		base = "CNY"
	}

	mu.Lock()
	defer mu.Unlock()
	if cached != nil && time.Since(fetched) < 12*time.Hour {
		if _, ok := cached["__"+base]; ok {
			return cached, nil
		}
	}

	url := fmt.Sprintf("https://api.frankfurter.app/latest?from=%s", base)
	client := &http.Client{Timeout: 8 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		if cached != nil {
			return cached, nil
		}
		return fallback(base), nil
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		if cached != nil {
			return cached, nil
		}
		return fallback(base), nil
	}

	var payload struct {
		Rates map[string]float64 `json:"rates"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		if cached != nil {
			return cached, nil
		}
		return fallback(base), nil
	}
	if payload.Rates == nil {
		payload.Rates = map[string]float64{}
	}
	payload.Rates[base] = 1
	payload.Rates["__"+base] = 1
	cached = payload.Rates
	fetched = time.Now()
	return cached, nil
}

func Convert(amount float64, from, to string, rates map[string]float64) float64 {
	from = strings.ToUpper(from)
	to = strings.ToUpper(to)
	if from == "" {
		from = "CNY"
	}
	if to == "" {
		to = "CNY"
	}
	if from == to {
		return amount
	}
	rate, ok := rates[from]
	if !ok || rate == 0 {
		return amount
	}
	return amount / rate
}

func fallback(base string) map[string]float64 {
	rates := map[string]float64{
		"CNY": 1, "USD": 0.14, "EUR": 0.13, "HKD": 1.09,
		"GBP": 0.11, "JPY": 21, "AUD": 0.21, "CAD": 0.19,
		"__" + base: 1,
	}
	rates[base] = 1
	return rates
}
