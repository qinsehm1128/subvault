import React, { useState, useEffect, useMemo } from 'react';
import { Memo, MEMO_CATEGORIES } from '../types';
import { MemoCard } from '../components/MemoCard';
import { AddMemoModal } from '../components/modals/AddMemoModal';
import { useMemoApi } from '../hooks/useMemoApi';
import { filterByCategory, searchMemos } from '../utils/memoUtils';
import { PlusIcon, MemoIcon } from '../components/Icons';

// Search icon component
const SearchIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.3-4.3"/>
  </svg>
);

// Chevron down icon for dropdown
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m6 9 6 6 6-6"/>
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
  const { memos, isLoading, error, setError, loadMemos, addMemo, updateMemo, deleteMemo } = useMemoApi();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMemo, setEditingMemo] = useState<Memo | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Load memos on mount
  useEffect(() => {
    loadMemos();
  }, [loadMemos]);

  // Filter and search memos
  const filteredMemos = useMemo(() => {
    let result = memos;
    
    // Apply category filter
    if (selectedCategory !== '全部') {
      result = filterByCategory(result, selectedCategory);
    }
    
    // Apply search filter
    if (searchTerm.trim()) {
      result = searchMemos(result, searchTerm);
    }
    
    return result;
  }, [memos, selectedCategory, searchTerm]);

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
  const categoryOptions = ['全部', ...MEMO_CATEGORIES];

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
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Category Filter Dropdown */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none cursor-pointer transition-colors duration-200 min-w-[140px]"
              >
                {categoryOptions.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Search Input */}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMemos.map(memo => (
                <MemoCard
                  key={memo.id}
                  memo={memo}
                  onEdit={() => handleEditMemo(memo)}
                  onDelete={() => setShowDeleteConfirm(memo.id)}
                />
              ))}
            </div>
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
                    {selectedCategory !== '全部' && `分类: ${selectedCategory}`}
                    {selectedCategory !== '全部' && searchTerm && ' · '}
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

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div 
          className="modal-overlay animate-fade-in"
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
        </div>
      )}
    </main>
  );
};
