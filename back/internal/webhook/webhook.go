package webhook

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"subvault/internal/models"
)

type Platform string

const (
	PlatformAuto     Platform = "auto"
	PlatformFeishu   Platform = "feishu"
	PlatformWeCom    Platform = "wecom"
	PlatformDingTalk Platform = "dingtalk"
	PlatformGeneric  Platform = "generic"
)

func DetectPlatform(rawURL, preferred string) Platform {
	switch Platform(strings.ToLower(strings.TrimSpace(preferred))) {
	case PlatformFeishu, PlatformWeCom, PlatformDingTalk, PlatformGeneric:
		return Platform(strings.ToLower(preferred))
	}

	u := strings.ToLower(rawURL)
	switch {
	case strings.Contains(u, "feishu.cn"), strings.Contains(u, "larksuite.com"):
		return PlatformFeishu
	case strings.Contains(u, "qyapi.weixin.qq.com"):
		return PlatformWeCom
	case strings.Contains(u, "oapi.dingtalk.com"):
		return PlatformDingTalk
	default:
		return PlatformGeneric
	}
}

func ValidateURL(rawURL string) error {
	parsed, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil || parsed.Host == "" {
		return fmt.Errorf("Webhook 地址无效")
	}
	host := strings.ToLower(parsed.Hostname())
	if parsed.Scheme == "http" && (host == "127.0.0.1" || host == "localhost") {
		return nil
	}
	if parsed.Scheme != "https" {
		return fmt.Errorf("Webhook 仅支持 HTTPS 地址")
	}
	return nil
}

func FormatAmount(currency string, cost float64) string {
	switch currency {
	case "CNY":
		return fmt.Sprintf("¥%.2f", cost)
	case "USD":
		return fmt.Sprintf("$%.2f", cost)
	case "EUR":
		return fmt.Sprintf("€%.2f", cost)
	case "HKD":
		return fmt.Sprintf("HK$%.2f", cost)
	default:
		return fmt.Sprintf("%s%.2f", currency, cost)
	}
}

func BuildText(sub models.Subscription, daysLeft int) string {
	when := "今天"
	if daysLeft > 0 {
		when = fmt.Sprintf("%d 天后", daysLeft)
	}
	return fmt.Sprintf("【SubVault 续费提醒】\n%s 将在%s到期（%s）\n金额：%s",
		sub.Name, when, sub.RenewalDate, FormatAmount(sub.Currency, sub.Cost))
}

func BuildTestText() string {
	return "【SubVault 测试提醒】\n这是一条测试消息。如果能看到它，说明 Webhook 已接通，到期前会按设定天数提醒。"
}

func BuildPayload(platform Platform, text, secret string) ([]byte, error) {
	var body any
	switch platform {
	case PlatformFeishu:
		payload := map[string]any{
			"msg_type": "text",
			"content":  map[string]string{"text": text},
		}
		if strings.TrimSpace(secret) != "" {
			ts := fmt.Sprintf("%d", time.Now().Unix())
			sign, err := feishuSign(secret, ts)
			if err != nil {
				return nil, err
			}
			payload["timestamp"] = ts
			payload["sign"] = sign
		}
		body = payload
	case PlatformWeCom, PlatformDingTalk:
		body = map[string]any{
			"msgtype": "text",
			"text":    map[string]string{"content": text},
		}
	default:
		body = map[string]any{
			"event": "renewal_reminder",
			"text":  text,
		}
	}
	return json.Marshal(body)
}

func feishuSign(secret, timestamp string) (string, error) {
	stringToSign := timestamp + "\n" + secret
	mac := hmac.New(sha256.New, []byte(stringToSign))
	sum := mac.Sum(nil)
	return base64.StdEncoding.EncodeToString(sum), nil
}

func Send(rawURL, platform, text, secret string) error {
	if err := ValidateURL(rawURL); err != nil {
		return err
	}
	platformKind := DetectPlatform(rawURL, platform)
	payload, err := BuildPayload(platformKind, text, secret)
	if err != nil {
		return err
	}
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Post(strings.TrimSpace(rawURL), "application/json", bytes.NewReader(payload))
	if err != nil {
		return fmt.Errorf("发送失败: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("Webhook 返回 HTTP %d", resp.StatusCode)
	}
	return checkPlatformError(platformKind, body)
}

func checkPlatformError(platform Platform, body []byte) error {
	if len(body) == 0 {
		return nil
	}
	var parsed map[string]any
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil
	}
	switch platform {
	case PlatformFeishu:
		if code, ok := asInt(parsed["code"]); ok && code != 0 {
			return fmt.Errorf("飞书: %s", firstString(parsed, "msg", "message"))
		}
	case PlatformWeCom, PlatformDingTalk:
		if code, ok := asInt(parsed["errcode"]); ok && code != 0 {
			return fmt.Errorf("%s: %s", platformLabel(platform), firstString(parsed, "errmsg", "msg"))
		}
	}
	return nil
}

func platformLabel(platform Platform) string {
	switch platform {
	case PlatformWeCom:
		return "企业微信"
	case PlatformDingTalk:
		return "钉钉"
	default:
		return string(platform)
	}
}

func asInt(v any) (int, bool) {
	switch n := v.(type) {
	case float64:
		return int(n), true
	case int:
		return n, true
	default:
		return 0, false
	}
}

func firstString(m map[string]any, keys ...string) string {
	for _, key := range keys {
		if s, ok := m[key].(string); ok && s != "" {
			return s
		}
	}
	return "发送失败"
}
