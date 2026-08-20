package handlers

import (
	"strings"

	"subvault/internal/database"
	"subvault/internal/models"
)

const DefaultGroupName = "默认"

var tagPalette = []string{
	"#64748B", "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
	"#8B5CF6", "#EC4899", "#06B6D4", "#84CC16",
}

func ResolveGroupName(name string) string {
	name = normalizeTagName(name)
	if name == "" {
		return DefaultGroupName
	}
	return name
}

func EnsureDefaultGroup(vaultID string) models.Tag {
	existing := loadVaultTags(vaultID)
	if t := findTagByName(existing, DefaultGroupName); t != nil {
		fillEmptyCategories(vaultID)
		return *t
	}

	tag := models.Tag{
		VaultID: vaultID,
		Name:    DefaultGroupName,
		Color:   tagPalette[0],
	}
	database.DB.Create(&tag)
	database.DB.Model(&models.Credential{}).Where("vault_id = ?", vaultID).Update("category", DefaultGroupName)
	database.DB.Model(&models.Memo{}).Where("vault_id = ?", vaultID).Update("category", DefaultGroupName)
	database.DB.Model(&models.Subscription{}).Where("vault_id = ? AND (category = '' OR category IS NULL)", vaultID).Update("category", DefaultGroupName)
	return tag
}

func fillEmptyCategories(vaultID string) {
	database.DB.Model(&models.Credential{}).Where("vault_id = ? AND (category = '' OR category IS NULL)", vaultID).Update("category", DefaultGroupName)
	database.DB.Model(&models.Memo{}).Where("vault_id = ? AND (category = '' OR category IS NULL)", vaultID).Update("category", DefaultGroupName)
	database.DB.Model(&models.Subscription{}).Where("vault_id = ? AND (category = '' OR category IS NULL)", vaultID).Update("category", DefaultGroupName)
}

func normalizeTagName(name string) string {
	return strings.TrimSpace(name)
}

func findTagByName(tags []models.Tag, name string) *models.Tag {
	want := strings.ToLower(normalizeTagName(name))
	if want == "" {
		return nil
	}
	for i := range tags {
		if strings.ToLower(tags[i].Name) == want {
			return &tags[i]
		}
	}
	return nil
}

func loadVaultTags(vaultID string) []models.Tag {
	var tags []models.Tag
	database.DB.Where("vault_id = ?", vaultID).Order("created_at asc").Find(&tags)
	if tags == nil {
		tags = []models.Tag{}
	}
	return tags
}

func tagsContextLine(tags []models.Tag) string {
	if len(tags) == 0 {
		return "\n\n当前还没有分组。请为每条内容起一个简短中文分组名，例如：工作、生活、金融、开发。"
	}
	names := make([]string, 0, len(tags))
	for _, t := range tags {
		names = append(names, t.Name)
	}
	return "\n\n用户已有的分组：" + strings.Join(names, "、") +
		"\n请优先使用以上已有分组名称（保持文字完全一致）。只有确实没有合适分组时，才新建一个简短中文分组名。"
}

func ensureTagsForNames(vaultID string, names []string) (map[string]string, []models.Tag) {
	existing := loadVaultTags(vaultID)
	canonical := map[string]string{}
	var created []models.Tag
	colorIndex := len(existing)

	for _, raw := range names {
		name := ResolveGroupName(raw)
		if t := findTagByName(existing, name); t != nil {
			canonical[raw] = t.Name
			continue
		}
		if t := findTagByName(created, name); t != nil {
			canonical[raw] = t.Name
			continue
		}
		tag := models.Tag{
			VaultID: vaultID,
			Name:    name,
			Color:   tagPalette[colorIndex%len(tagPalette)],
		}
		if err := database.DB.Create(&tag).Error; err != nil {
			continue
		}
		created = append(created, tag)
		existing = append(existing, tag)
		canonical[raw] = tag.Name
		colorIndex++
	}
	return canonical, created
}

func applyCanonicalCategories(vaultID, key string, items []map[string]interface{}) []models.Tag {
	names := make([]string, 0, len(items))
	for _, item := range items {
		if s, ok := item[key].(string); ok {
			names = append(names, s)
		}
	}
	canonical, created := ensureTagsForNames(vaultID, names)
	for i := range items {
		s, _ := items[i][key].(string)
		if next, ok := canonical[s]; ok {
			items[i][key] = next
		} else {
			items[i][key] = DefaultGroupName
		}
	}
	return created
}

func tagsAsJSON(tags []models.Tag) []map[string]string {
	out := make([]map[string]string, 0, len(tags))
	for _, t := range tags {
		out = append(out, map[string]string{
			"id":    t.ID,
			"name":  t.Name,
			"color": t.Color,
		})
	}
	return out
}
