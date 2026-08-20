import { useState, useCallback } from 'react';
import { api } from '../services/api';
import { Memo } from '../types';

export const useMemoApi = () => {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const loadMemos = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await api.getMemos();
      setMemos(data || []);
    } catch (err: any) {
      setError(err.message || '加载备忘录失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addMemo = async (memo: Partial<Memo>) => {
    if (!memo.title?.trim() || !memo.content?.trim()) {
      setError('标题和内容不能为空');
      return;
    }

    const memoData = {
      title: memo.title.trim(),
      content: memo.content.trim(),
      category: memo.category || '默认',
      isPinned: memo.isPinned || false,
    };

    try {
      const created = await api.createMemo(memoData);
      setMemos(prev => [...prev, created]);
      setError('');
      return created;
    } catch (err: any) {
      setError(err.message || '创建备忘录失败');
      throw err;
    }
  };

  const updateMemo = async (id: string, updates: Partial<Memo>) => {
    if (updates.title !== undefined && !updates.title?.trim()) {
      setError('标题不能为空');
      return;
    }
    if (updates.content !== undefined && !updates.content?.trim()) {
      setError('内容不能为空');
      return;
    }

    const updateData: Partial<Memo> = {};
    if (updates.title !== undefined) updateData.title = updates.title.trim();
    if (updates.content !== undefined) updateData.content = updates.content.trim();
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.isPinned !== undefined) updateData.isPinned = updates.isPinned;

    try {
      const updated = await api.updateMemo(id, updateData);
      setMemos(prev => prev.map(m => m.id === id ? { ...m, ...updated } : m));
      setError('');
      return updated;
    } catch (err: any) {
      setError(err.message || '更新备忘录失败');
      throw err;
    }
  };

  const deleteMemo = async (id: string) => {
    try {
      await api.deleteMemo(id);
      setMemos(prev => prev.filter(m => m.id !== id));
      setError('');
    } catch (err: any) {
      setError(err.message || '删除备忘录失败');
      throw err;
    }
  };

  return {
    memos,
    isLoading,
    error,
    setError,
    loadMemos,
    addMemo,
    updateMemo,
    deleteMemo,
  };
};
