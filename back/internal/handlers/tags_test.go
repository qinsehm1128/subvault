package handlers

import (
	"testing"

	"subvault/internal/models"
)

func TestFindTagByNameIgnoresCaseAndSpace(t *testing.T) {
	tags := []models.Tag{{Name: "工作"}, {Name: "金融"}}
	if got := findTagByName(tags, " 工作 "); got == nil || got.Name != "工作" {
		t.Fatal("应匹配已有分组")
	}
	if findTagByName(tags, "生活") != nil {
		t.Fatal("不存在的分组不应匹配")
	}
}

func TestNormalizeTagName(t *testing.T) {
	if got := normalizeTagName("  开发  "); got != "开发" {
		t.Fatalf("got %q", got)
	}
}

func TestResolveGroupNameDefaults(t *testing.T) {
	if got := ResolveGroupName(""); got != DefaultGroupName {
		t.Fatalf("空分组应为默认，实际 %q", got)
	}
	if got := ResolveGroupName("  "); got != DefaultGroupName {
		t.Fatalf("空白分组应为默认，实际 %q", got)
	}
	if got := ResolveGroupName("工作"); got != "工作" {
		t.Fatalf("已选分组应保留，实际 %q", got)
	}
}
