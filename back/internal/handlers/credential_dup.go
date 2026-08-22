package handlers

import "strings"

func normalizeWebsite(website string) string {
	s := strings.ToLower(strings.TrimSpace(website))
	s = strings.TrimPrefix(s, "https://")
	s = strings.TrimPrefix(s, "http://")
	s = strings.TrimPrefix(s, "www.")
	return strings.TrimRight(s, "/")
}

func credentialDupKey(label, username, website string) string {
	return strings.ToLower(strings.TrimSpace(label)) + "\n" +
		strings.ToLower(strings.TrimSpace(username)) + "\n" +
		normalizeWebsite(website)
}
