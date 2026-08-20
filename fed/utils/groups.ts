export const DEFAULT_GROUP = '默认';

export interface VaultGroup {
  id: string;
  name: string;
  color: string;
}

export const GROUP_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
];

export function findGroup(groups: VaultGroup[], name?: string): VaultGroup | undefined {
  const key = (name || '').trim().toLowerCase();
  if (!key) return undefined;
  return groups.find(g => g.name.toLowerCase() === key);
}

export function resolveGroupName(name?: string): string {
  const trimmed = (name || '').trim();
  return trimmed || DEFAULT_GROUP;
}

export function groupColor(groups: VaultGroup[], name?: string): string {
  return findGroup(groups, resolveGroupName(name))?.color || '#64748B';
}

export function groupCounts(items: Array<{ category?: string }>): Record<string, number> {
  const counts: Record<string, number> = {};
  items.forEach(item => {
    const name = resolveGroupName(item.category);
    counts[name] = (counts[name] || 0) + 1;
  });
  return counts;
}

export function uniqueGroupNames(groups: VaultGroup[], used: Array<{ category?: string }>): string[] {
  const names = new Set<string>();
  names.add(DEFAULT_GROUP);
  groups.forEach(g => names.add(g.name));
  used.forEach(item => {
    const name = resolveGroupName(item.category);
    if (name) names.add(name);
  });
  return [DEFAULT_GROUP, ...Array.from(names).filter(n => n !== DEFAULT_GROUP)];
}
