import { describe, it, expect } from 'vitest';
import {
  DEFAULT_GROUP,
  credentialDupKey,
  groupItems,
  normalizeWebsite,
  resolveGroupName,
} from './groups';

describe('groups', () => {
  it('empty category falls back to default', () => {
    expect(resolveGroupName('')).toBe(DEFAULT_GROUP);
    expect(resolveGroupName('  工作  ')).toBe('工作');
  });

  it('normalizes websites for duplicate matching', () => {
    expect(normalizeWebsite('https://www.GitHub.com/')).toBe('github.com');
    expect(credentialDupKey({ label: 'GitHub', username: 'User@Mail.com', website: 'https://www.github.com/' }))
      .toBe(credentialDupKey({ label: 'github', username: 'user@mail.com', website: 'github.com' }));
  });

  it('sections items by group', () => {
    const sections = groupItems(
      [
        { category: '工作', id: '1' },
        { category: '', id: '2' },
        { category: '工作', id: '3' },
      ],
      [{ id: 'g1', name: '工作', color: '#3B82F6' }]
    );
    expect(sections.map(s => s.name)).toEqual([DEFAULT_GROUP, '工作']);
    expect(sections[0].items).toHaveLength(1);
    expect(sections[1].items).toHaveLength(2);
  });
});
