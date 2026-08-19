package webhook

import "testing"

func TestDetectPlatform(t *testing.T) {
	if got := DetectPlatform("https://open.feishu.cn/open-apis/bot/v2/hook/abc", "auto"); got != PlatformFeishu {
		t.Fatalf("飞书地址应识别为 feishu，实际 %s", got)
	}
	if got := DetectPlatform("https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=1", ""); got != PlatformWeCom {
		t.Fatalf("企业微信地址应识别为 wecom，实际 %s", got)
	}
}

func TestBuildPayloadFeishu(t *testing.T) {
	body, err := BuildPayload(PlatformFeishu, "hello")
	if err != nil {
		t.Fatal(err)
	}
	if string(body) != `{"content":{"text":"hello"},"msg_type":"text"}` && string(body) != `{"msg_type":"text","content":{"text":"hello"}}` {
		if !containsAll(string(body), `"msg_type":"text"`, `"text":"hello"`) {
			t.Fatalf("飞书 payload 不正确: %s", body)
		}
	}
}

func TestDetectPlatformFeishuHost(t *testing.T) {
	if got := DetectPlatform("https://www.feishu.cn/flow/api/trigger-webhook/abc", "auto"); got != PlatformFeishu {
		t.Fatalf("feishu.cn 应识别为 feishu，实际 %s", got)
	}
}

func TestCheckPlatformError(t *testing.T) {
	if err := checkPlatformError(PlatformFeishu, []byte(`{"code":19021,"msg":"sign match fail"}`)); err == nil {
		t.Fatal("飞书业务错误应失败")
	}
	if err := checkPlatformError(PlatformWeCom, []byte(`{"errcode":0,"errmsg":"ok"}`)); err != nil {
		t.Fatal(err)
	}
	if err := checkPlatformError(PlatformWeCom, []byte(`{"errcode":93000,"errmsg":"invalid webhook url"}`)); err == nil {
		t.Fatal("企业微信业务错误应失败")
	}
}

func TestValidateURL(t *testing.T) {
	if err := ValidateURL("http://example.com/hook"); err == nil {
		t.Fatal("公网 HTTP 应被拒绝")
	}
	if err := ValidateURL("https://open.feishu.cn/open-apis/bot/v2/hook/x"); err != nil {
		t.Fatal(err)
	}
}

func containsAll(s string, parts ...string) bool {
	for _, part := range parts {
		if !contains(s, part) {
			return false
		}
	}
	return true
}

func contains(s, part string) bool {
	return len(s) >= len(part) && (s == part || len(part) == 0 || (func() bool {
		for i := 0; i+len(part) <= len(s); i++ {
			if s[i:i+len(part)] == part {
				return true
			}
		}
		return false
	})())
}
