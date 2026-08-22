import React, { useState, useEffect, useMemo } from 'react';
import { Memo } from '../types';
import { api } from '../services/api';
import { VaultGroup } from '../utils/groups';
import { GroupFilter } from '../components/GroupFilter';
import { MemoCard } from '../components/MemoCard';
import { AddMemoModal } from '../components/modals/AddMemoModal';
import { useMemoApi } from '../hooks/useMemoApi';
import { searchMemos } from '../utils/memoUtils';
import { PlusIcon, MemoIcon, BrainIcon } from '../components/Icons';
import { ModalOverlay } from '../components/modals/ModalOverlay';
import { GroupedSections } from '../components/GroupedSections';
import { BatchGroupBar } from '../components/BatchGroupBar';
import { AIGroupModal, AIGroupSourceItem } from '../components/modals/AIGroupModal';
import { useItemSelection } from '../hooks/useItemSelection';
import { GroupAssignment } from '../types';

// Search icon component
const SearchIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.3-4.3"/>
  </svg>
);

interface MemoPageProps {
  onAddMemo?: (memo: Partial<Memo>) => void;
  onUpdateMemo?: (id: string, memo: Partial<Memo>) => void;
  onDeleteMemo?: (id: string) => void;
}

export const MemoPage: React.FC<MemoPageProps> = ({
  onAddMemo,
  onUpdateMemo,
  onDeleteMemo
}) => {
  const { memos, isLoading, error, setError, loadMemos, addMemo, updateMemo, batchUpdateMemoGroups, deleteMemo } = useMemoApi();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMemo, setEditingMemo] = useState<Memo | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [groups, setGroups] = useState<VaultGroup[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [aiGroupItems, setAIGroupItems] = useState<AIGroupSourceItem[]>([]);
  const [showAIGroup, setShowAIGroup] = useState(false);
  const [groupBusy, setGroupBusy] = useState(false);

  // Load memos on mount
  useEffect(() => {
    loadMemos();
    api.getTags().then(setGroups).catch(() => setGroups([]));
  }, [loadMemos]);

  // Filter and search memos
  const filteredMemos = useMemo(() => {
    let result = memos;
    
    // Apply category filter
    if (selectedCategory !== 'all') {
      result = result.filter(m => ((m.category || '').trim() || '默认') === selectedCategory);
    }
    
    // Apply search filter
    if (searchTerm.trim()) {
      result = searchMemos(result, searchTerm);
    }
    
    return result;
  }, [memos, selectedCategory, searchTerm]);

  const memoIds = useMemo(() => filteredMemos.map(item => item.id), [filteredMemos]);
  const memoSelect = useItemSelection(memoIds);

  // Handle add memo
  const handleAddMemo = () => {
    setEditingMemo(undefined);
    setShowAddModal(true);
  };

  // Handle edit memo
  const handleEditMemo = (memo: Memo) => {
    setEditingMemo(memo);
    setShowAddModal(true);
  };

  // Handle save memo (create or update)
  const handleSaveMemo = async (memoData: Partial<Memo>) => {
    try {
      if (editingMemo) {
        await updateMemo(editingMemo.id, memoData);
        onUpdateMemo?.(editingMemo.id, memoData);
      } else {
        await addMemo(memoData);
        onAddMemo?.(memoData);
      }
      setShowAddModal(false);
      setEditingMemo(undefined);
      api.getTags().then(setGroups).catch(() => setGroups([]));
    } catch (err) {
      // Error is handled by useMemoApi
    }
  };

  // Handle delete memo
  const handleDeleteMemo = async (id: string) => {
    try {
      await deleteMemo(id);
      onDeleteMemo?.(id);
      setShowDeleteConfirm(null);
    } catch (err) {
      // Error is handled by useMemoApi
    }
  };

  // Handle close modal
  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingMemo(undefined);
  };

  // Category options including "全部"
  return (
    <main className="flex-1 overflow-y-auto page-scroll px-4 py-5 md:px-8 md:py-8">
      <div className="mx-auto">
        <div className="space-y-5 md:space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-end">
            <div className="hidden md:block">
              <h2 className="text-2xl font-bold text-slate-900">备忘录</h2>
              <p className="text-slate-400 text-sm mt-1">安全存储您的重要信息</p>
            </div>
            <button 
              onClick={handleAddMemo} 
              className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition-colors duration-200 shadow-sm font-medium text-sm cursor-pointer min-h-[44px]"
            >
              <PlusIcon className="w-4 h-4" />
              <span>新建备忘录</span>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium flex justify-between items-center">
              <span>{error}</span>
              <button 
                onClick={() => setError('')}
                className="text-red-400 hover:text-red-600 cursor-pointer"
              >
                &times;
              </button>
            </div>
          )}

          {/* Filter and Search Bar */}
          <div className="flex flex-col gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="搜索备忘录..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-colors duration-200"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  &times;
                </button>
              )}
            </div>
            <GroupFilter value={selectedCategory} onChange={setSelectedCategory} groups={groups} items={memos} />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => memoSelect.setSelectMode(true)}
                className="px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-xl min-h-[40px]"
              >
                批量管理
              </button>
              <button
                type="button"
                onClick={() => {
                  const source = memoSelect.selectedIds.length > 0
                    ? filteredMemos.filter(m => memoSelect.selectedIds.includes(m.id))
                    : filteredMemos;
                  if (source.length === 0) return;
                  setAIGroupItems(source.map(m => ({
                    id: m.id,
                    title: m.title,
                    notes: m.content,
                    category: m.category,
                  })));
                  setShowAIGroup(true);
                }}
                className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-violet-700 bg-violet-50 border border-violet-100 rounded-xl min-h-[40px]"
              >
                <BrainIcon className="w-3.5 h-3.5" />
                AI 整理分组
              </button>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="py-16 flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-slate-400 text-sm">加载中...</p>
            </div>
          )}

          {/* Memo Grid */}
          {!isLoading && filteredMemos.length > 0 && (
            <GroupedSections
              items={filteredMemos}
              groups={groups}
              onHeaderClick={setSelectedCategory}
              renderItem={memo => (
                <MemoCard
                  memo={memo}
                  groups={groups}
                  selectable={memoSelect.selectMode}
                  selected={memoSelect.isSelected(memo.id)}
                  onToggleSelect={() => memoSelect.toggle(memo.id)}
                  onEdit={() => handleEditMemo(memo)}
                  onDelete={() => setShowDeleteConfirm(memo.id)}
                />
              )}
            />
          )}
          {memoSelect.selectMode && (
            <BatchGroupBar
              selectedCount={memoSelect.selectedIds.length}
              visibleCount={filteredMemos.length}
              groups={groups}
              items={memos}
              busy={groupBusy}
              onSelectAll={memoSelect.selectAll}
              onClear={memoSelect.clear}
              onMoveTo={async (category) => {
                setGroupBusy(true);
                try {
                  await batchUpdateMemoGroups(memoSelect.selectedIds.map(id => ({ id, category })));
                  memoSelect.clear();
                  api.getTags().then(setGroups).catch(() => undefined);
                } finally {
                  setGroupBusy(false);
                }
              }}
              onAIOrganize={() => {
                const source = memoSelect.selectedIds.length > 0
                  ? filteredMemos.filter(m => memoSelect.selectedIds.includes(m.id))
                  : filteredMemos;
                if (source.length === 0) return;
                setAIGroupItems(source.map(m => ({
                  id: m.id,
                  title: m.title,
                  notes: m.content,
                  category: m.category,
                })));
                setShowAIGroup(true);
              }}
            />
          )}

          {/* Empty State */}
          {!isLoading && filteredMemos.length === 0 && (
            <div className="py-16 flex flex-col items-center justify-center bg-white border border-slate-200/60 rounded-2xl">
              <MemoIcon className="w-12 h-12 text-slate-200 mb-4" />
              {memos.length === 0 ? (
                <>
                  <p className="text-slate-400 font-medium text-sm mb-3">暂无备忘录</p>
                  <button 
                    onClick={handleAddMemo} 
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium cursor-pointer"
                  >
                    + 创建第一个备忘录
                  </button>
                </>
              ) : (
                <>
                  <p className="text-slate-400 font-medium text-sm mb-1">未找到匹配的备忘录</p>
                  <p className="text-slate-300 text-xs">
                    {selectedCategory !== 'all' && `分组: ${selectedCategory}`}
                    {selectedCategory !== 'all' && searchTerm && ' · '}
                    {searchTerm && `搜索: "${searchTerm}"`}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Memo Modal */}
      <AddMemoModal
        isOpen={showAddModal}
        onClose={handleCloseModal}
        onSave={handleSaveMemo}
        editMemo={editingMemo}
      />

      <AIGroupModal
        isOpen={showAIGroup}
        kind="memos"
        items={aiGroupItems}
        onClose={() => {
          setShowAIGroup(false);
          setAIGroupItems([]);
        }}
        onApply={async (assignments: GroupAssignment[]) => {
          await batchUpdateMemoGroups(assignments);
          memoSelect.clear();
          api.getTags().then(setGroups).catch(() => undefined);
        }}
      />

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <ModalOverlay
          className="animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
        >
          <div className="modal-sheet max-w-[400px] md:animate-slide-up">
            <div className="p-6">
              <h3 id="delete-confirm-title" className="text-lg font-bold text-slate-800 mb-2">
                确认删除
              </h3>
              <p className="text-slate-500 text-sm">
                确定要删除这个备忘录吗？此操作无法撤销。
              </p>
            </div>
            <div className="px-6 pb-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:space-x-3">
              <button 
                onClick={() => setShowDeleteConfirm(null)} 
                className="px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 cursor-pointer transition-colors duration-200 min-h-[44px]"
              >
                取消
              </button>
              <button 
                onClick={() => handleDeleteMemo(showDeleteConfirm)} 
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl text-sm cursor-pointer transition-colors duration-200 min-h-[44px]"
              >
                删除
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </main>
  );
};
