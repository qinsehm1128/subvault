import React, { useState, useEffect } from 'react';
import { Memo, MEMO_CATEGORIES } from '../../types';
import { validateMemo } from '../../utils/memoUtils';

interface AddMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (memo: Partial<Memo>) => void;
  editMemo?: Memo;
}

export const AddMemoModal: React.FC<AddMemoModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editMemo
}) => {
  const [formData, setFormData] = useState<Partial<Memo>>({
    title: '',
    content: '',
    category: '其他'
  });
  const [error, setError] = useState<string>('');

  // Reset form when modal opens or editMemo changes
  useEffect(() => {
    if (isOpen) {
      if (editMemo) {
        setFormData({
          title: editMemo.title,
          content: editMemo.content,
          category: editMemo.category
        });
      } else {
        setFormData({
          title: '',
          content: '',
          category: '其他'
        });
      }
      setError('');
    }
  }, [isOpen, editMemo]);

  const handleSubmit = () => {
    const validationError = validateMemo(formData);
    if (validationError) {
      setError(validationError);
      return;
    }

    onSave(formData);
    setFormData({ title: '', content: '', category: '其他' });
    setError('');
    onClose();
  };

  const handleClose = () => {
    setFormData({ title: '', content: '', category: '其他' });
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  const isEditMode = !!editMemo;
  const modalTitle = isEditMode ? '编辑备忘录' : '添加备忘录';
  const submitButtonText = isEditMode ? '保存修改' : '确认添加';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/10 backdrop-blur-md p-4 animate-fade-in" 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="add-memo-title"
    >
      <div className="bg-white shadow-xl rounded-[2rem] w-full max-w-[500px] overflow-hidden animate-slide-up border border-slate-100">
        {/* Header */}
        <div className="p-7 border-b border-slate-50 flex justify-between items-center">
          <h3 id="add-memo-title" className="text-lg font-bold text-slate-800 tracking-tight">
            {modalTitle}
          </h3>
          <button 
            onClick={handleClose} 
            className="text-slate-300 hover:text-slate-500 text-2xl cursor-pointer transition-colors duration-200" 
            aria-label="关闭弹窗"
          >
            &times;
          </button>
        </div>

        {/* Form Content */}
        <div className="p-7 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          {/* Title Input */}
          <div className="space-y-1.5">
            <label htmlFor="memo-title" className="text-sm font-medium text-slate-600">
              标题
            </label>
            <input 
              id="memo-title" 
              type="text" 
              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-slate-800 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-sm transition-colors duration-200" 
              placeholder="输入备忘录标题" 
              value={formData.title || ''} 
              onChange={e => {
                setFormData({...formData, title: e.target.value});
                if (error) setError('');
              }}
              maxLength={100}
            />
          </div>

          {/* Content Textarea */}
          <div className="space-y-1.5">
            <label htmlFor="memo-content" className="text-sm font-medium text-slate-600">
              内容
            </label>
            <textarea 
              id="memo-content" 
              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-slate-800 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-sm transition-colors duration-200 resize-none" 
              placeholder="输入备忘录内容"
              rows={6}
              value={formData.content || ''} 
              onChange={e => {
                setFormData({...formData, content: e.target.value});
                if (error) setError('');
              }}
              maxLength={10000}
            />
          </div>

          {/* Category Select */}
          <div className="space-y-1.5">
            <label htmlFor="memo-category" className="text-sm font-medium text-slate-600">
              分类
            </label>
            <select
              id="memo-category"
              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-slate-800 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-medium text-sm transition-colors duration-200 cursor-pointer"
              value={formData.category || '其他'}
              onChange={e => setFormData({...formData, category: e.target.value})}
            >
              {MEMO_CATEGORIES.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="p-7 border-t border-slate-50 flex justify-end space-x-3 bg-slate-50/20">
          <button 
            onClick={handleClose} 
            className="px-5 py-2.5 text-[12px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest cursor-pointer transition-colors duration-200"
          >
            取消
          </button>
          <button 
            onClick={handleSubmit} 
            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-[12px] uppercase tracking-widest cursor-pointer transition-colors duration-200"
          >
            {submitButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};
