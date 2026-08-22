import React, { useState } from 'react';
import { VaultGroup, uniqueGroupNames } from '../utils/groups';
import { BrainIcon } from './Icons';

interface BatchGroupBarProps {
  selectedCount: number;
  visibleCount: number;
  groups: VaultGroup[];
  items?: Array<{ category?: string }>;
  busy?: boolean;
  onSelectAll: () => void;
  onClear: () => void;
  onMoveTo: (category: string) => void;
  onAIOrganize?: () => void;
}

export const BatchGroupBar: React.FC<BatchGroupBarProps> = ({
  selectedCount,
  visibleCount,
  groups,
  items = [],
  busy,
  onSelectAll,
  onClear,
  onMoveTo,
  onAIOrganize,
}) => {
  const [target, setTarget] = useState('');
  const names = uniqueGroupNames(groups, items);

  return (
    <div className="sticky bottom-16 md:bottom-4 z-20 bg-white border border-slate-200 shadow-lg rounded-2xl px-3 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2">
      <p className="text-sm text-slate-600 whitespace-nowrap">
        已选 <span className="font-semibold text-slate-900">{selectedCount}</span> / {visibleCount}
      </p>
      <div className="flex flex-wrap items-center gap-2 flex-1">
        <button
          type="button"
          onClick={onSelectAll}
          className="px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl min-h-[40px]"
        >
          全选当前
        </button>
        <select
          value={target}
          onChange={e => setTarget(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs min-h-[40px]"
        >
          <option value="">移到分组…</option>
          {names.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <button
          type="button"
          disabled={!target || selectedCount === 0 || busy}
          onClick={() => target && onMoveTo(target)}
          className="px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded-xl min-h-[40px]"
        >
          批量移动
        </button>
        {onAIOrganize && (
          <button
            type="button"
            disabled={busy}
            onClick={onAIOrganize}
            className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-white bg-gradient-to-r from-violet-500 to-blue-500 rounded-xl min-h-[40px]"
          >
            <BrainIcon className="w-3.5 h-3.5" />
            AI 整理分组
          </button>
        )}
        <button
          type="button"
          onClick={onClear}
          className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 min-h-[40px]"
        >
          取消
        </button>
      </div>
    </div>
  );
};
