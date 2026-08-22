package handlers

import "testing"

func TestNormalizeWebsite(t *testing.T) {
	cases := []struct {
		in, want string
	}{
		{"https://www.GitHub.com/", "github.com"},
		{"http://example.com/path", "example.com/path"},
		{"  WWW.Taobao.com  ", "taobao.com"},
		{"", ""},
	}
	for _, c := range cases {
		if got := normalizeWebsite(c.in); got != c.want {
			t.Fatalf("normalizeWebsite(%q)=%q, want %q", c.in, got, c.want)
		}
	}
}

func TestCredentialDupKey(t *testing.T) {
	a := credentialDupKey("GitHub", "User@Mail.com", "https://www.github.com/")
	b := credentialDupKey("github", "user@mail.com", "github.com")
	if a != b {
		t.Fatalf("same account should share key: %q vs %q", a, b)
	}
	c := credentialDupKey("GitHub", "", "github.com")
	if a == c {
		t.Fatal("empty username should not match a named account")
	}
}
