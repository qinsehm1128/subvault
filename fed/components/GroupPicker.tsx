import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { DEFAULT_GROUP, GROUP_COLORS, VaultGroup, resolveGroupName } from '../utils/groups';

interface GroupPickerProps {
  value: string;
  onChange: (name: string) => void;
}

export const GroupPicker: React.FC<GroupPickerProps> = ({
  value,
  onChange,
}) => {
  const selected = resolveGroupName(value);
  const [groups, setGroups] = useState<VaultGroup[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(GROUP_COLORS[1]);
  const [busy, setBusy] = useState(false);

  const loadGroups = async () => {
    try {
      const data = await api.getTags();
      setGroups(data || []);
    } catch {
      setGroups([]);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      const created = await api.createTag({ name, color: newColor });
      setGroups(prev => prev.some(g => g.id === created.id) ? prev : [...prev, created]);
      onChange(created.name);
      setNewName('');
      setCreating(false);
      setNewColor(GROUP_COLORS[(groups.length + 1) % GROUP_COLORS.length]);
    } finally {
      setBusy(false);
    }
  };

  const ordered = [
    ...groups.filter(g => g.name === DEFAULT_GROUP),
    ...groups.filter(g => g.name !== DEFAULT_GROUP),
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {ordered.map(group => {
          const active = selected === group.name;
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => onChange(group.name)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                active ? 'ring-2 ring-offset-1 scale-105' : 'opacity-80 hover:opacity-100'
              }`}
              style={{
                backgroundColor: `${group.color}20`,
                color: group.color,
                borderColor: group.color,
              }}
            >
              {group.name}
            </button>
          );
        })}
        {!ordered.some(g => g.name === DEFAULT_GROUP) && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_GROUP)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
              selected === DEFAULT_GROUP ? 'ring-2 ring-offset-1' : ''
            }`}
          >
            {DEFAULT_GROUP}
          </button>
        )}
        <button
          type="button"
          onClick={() => setCreating(v => !v)}
          className="px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-slate-300 text-slate-500"
        >
          {creating ? '取消' : '+ 新建分组'}
        </button>
      </div>
      {creating && (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="分组名称，如工作、密钥"
            className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400"
          />
          <div className="flex items-center gap-1">
            {GROUP_COLORS.slice(1, 7).map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setNewColor(color)}
                className={`w-6 h-6 rounded-full ${newColor === color ? 'ring-2 ring-offset-1 ring-slate-400' : ''}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!newName.trim() || busy}
            className="px-3 py-2 text-xs font-medium bg-blue-600 text-white rounded-xl disabled:bg-slate-300"
          >
            创建
          </button>
        </div>
      )}
    </div>
  );
};
