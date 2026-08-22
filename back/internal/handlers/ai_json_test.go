package handlers

import "testing"

func TestStripAIJSON(t *testing.T) {
	got := stripAIJSON("```json\n[{\"id\":\"1\"}]\n```")
	if got != "[{\"id\":\"1\"}]" {
		t.Fatalf("got %q", got)
	}
}

func TestTrimForPrompt(t *testing.T) {
	if got := trimForPrompt("hello\nworld", 20); got != "hello world" {
		t.Fatalf("got %q", got)
	}
	if got := trimForPrompt("一二三四五六七八九十", 4); got != "一二三四…" {
		t.Fatalf("got %q", got)
	}
}
