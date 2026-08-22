import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { GroupAssignment } from '../../types';
import { resolveGroupName } from '../../utils/groups';
import { BrainIcon } from '../Icons';
import { ModalOverlay } from './ModalOverlay';

export interface AIGroupSourceItem {
  id: string;
  title: string;
  username?: string;
  website?: string;
  notes?: string;
  category?: string;
}

interface PreviewRow extends GroupAssignment {
  title: string;
  current: string;
  selected: boolean;
}

interface AIGroupModalProps {
  isOpen: boolean;
  kind: 'credentials' | 'subscriptions' | 'memos';
  items: AIGroupSourceItem[];
  onClose: () => void;
  onApply: (assignments: GroupAssignment[]) => Promise<void> | void;
}

export const AIGroupModal: React.FC<AIGroupModalProps> = ({
  isOpen,
  kind,
  items,
  onClose,
  onApply,
}) => {
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<PreviewRow[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setRows([]);
      setError('');
      setLoading(false);
      setApplying(false);
      return;
    }
    if (items.length === 0) return;

    let cancelled = false;
    setLoading(true);
    setError('');
    api.assignGroups({
      kind,
      items: items.map(item => ({
        id: item.id,
        title: item.title,
        username: item.username || '',
        website: item.website || '',
        notes: (item.notes || '').slice(0, 80),
        category: resolveGroupName(item.category),
      })),
    }).then(data => {
      if (cancelled) return;
      const byId = new Map(items.map(item => [item.id, item]));
      setRows((data.assignments || []).map(item => {
        const source = byId.get(item.id);
        return {
          id: item.id,
          category: resolveGroupName(item.category),
          title: source?.title || item.id,
          current: resolveGroupName(source?.category),
          selected: true,
        };
      }));
    }).catch(err => {
      if (!cancelled) setError(err.message || 'AI 整理失败');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [isOpen, kind, items]);

  const selectedCount = rows.filter(row => row.selected && row.category !== row.current).length;

  const handleApply = async () => {
    const assignments = rows
      .filter(row => row.selected && row.category !== row.current)
      .map(row => ({ id: row.id, category: row.category }));
    if (assignments.length === 0) {
      onClose();
      return;
    }
    setApplying(true);
    try {
      await onApply(assignments);
      onClose();
    } catch (err: any) {
      setError(err.message || '应用分组失败');
    } finally {
      setApplying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay className="animate-fade-in">
      <div className="modal-sheet max-w-2xl">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-violet-500 to-blue-500 rounded-xl">
              <BrainIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">AI 整理分组</h3>
              <p className="text-xs text-slate-400 mt-0.5">确认后再写入，可取消不合适的建议</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl cursor-pointer">&times;</button>
        </div>

        <div className="p-5 overflow-y-auto page-scroll flex-1 min-h-0">
          {loading && <p className="text-sm text-slate-400 text-center py-8">正在分析分组…</p>}
          {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2 mb-3">{error}</p>}
          {!loading && rows.length > 0 && (
            <div className="space-y-2">
              {rows.map((row, idx) => (
                <label key={row.id} className={`flex items-center gap-3 p-3 rounded-xl border ${row.selected ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-transparent'}`}>
                  <input
                    type="checkbox"
                    checked={row.selected}
                    onChange={() => setRows(prev => prev.map((item, i) => i === idx ? { ...item, selected: !item.selected } : item))}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{row.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {row.current}
                      <span className="mx-1 text-slate-300">→</span>
                      <span className={row.category === row.current ? 'text-slate-400' : 'text-blue-600 font-medium'}>
                        {row.category}
                      </span>
                      {row.category === row.current && <span className="ml-1 text-slate-300">无需调整</span>}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}
          {!loading && !error && rows.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">没有可用的分组建议</p>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 bg-slate-50/50">
          <button onClick={onClose} className="px-4 py-2.5 text-sm text-slate-500 min-h-[44px]">取消</button>
          <button
            onClick={handleApply}
            disabled={loading || applying || selectedCount === 0}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg min-h-[44px]"
          >
            {applying ? '应用中…' : `应用 ${selectedCount} 条调整`}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
};
