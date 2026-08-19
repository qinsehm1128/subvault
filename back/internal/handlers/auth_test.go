package handlers

import "testing"

func TestMasterKeyEquals(t *testing.T) {
	if !masterKeyEquals("correct-password", "correct-password") {
		t.Fatal("相同主密钥应通过")
	}
	if masterKeyEquals("wrong-password", "correct-password") {
		t.Fatal("错误主密钥应拒绝")
	}
	if masterKeyEquals("", "correct-password") {
		t.Fatal("空主密钥应拒绝")
	}
}
