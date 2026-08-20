import React from 'react';
import { VaultGroup, groupColor, groupCounts, uniqueGroupNames } from '../utils/groups';

interface GroupFilterProps {
  value: string;
  onChange: (value: string) => void;
  groups: VaultGroup[];
  items: Array<{ category?: string }>;
}

export const GroupFilter: React.FC<GroupFilterProps> = ({ value, onChange, groups, items }) => {
  const names = uniqueGroupNames(groups, items);
  const counts = groupCounts(items);

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange('all')}
        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
          value === 'all'
            ? 'bg-slate-800 text-white border-slate-800'
            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
        }`}
      >
        全部 {items.length}
      </button>
      {names.map(name => {
        const color = groupColor(groups, name);
        const active = value === name;
        return (
          <button
            key={name}
            type="button"
            onClick={() => onChange(name)}
            className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
            style={
              active
                ? { backgroundColor: color, color: '#fff', borderColor: color }
                : { backgroundColor: `${color}14`, color, borderColor: `${color}55` }
            }
          >
            {name} {counts[name] || 0}
          </button>
        );
      })}
    </div>
  );
};
