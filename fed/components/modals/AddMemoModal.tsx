import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Memo, MEMO_CATEGORIES } from '../../types';
import { validateMemo } from '../../utils/memoUtils';
import { ModalOverlay } from './ModalOverlay';

interface AddMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (memo: Partial<Memo>) => void;
  editMemo?: Memo;
}

type EditorTab = 'edit' | 'preview';

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
  const [activeTab, setActiveTab] = useState<EditorTab>('edit');
  const [isFullscreen, setIsFullscreen] = useState(false);

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
      setActiveTab('edit');
      setIsFullscreen(false);
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

  const modalContainerClass = isFullscreen
    ? 'animate-fade-in !items-stretch'
    : 'animate-fade-in';

  const modalPanelClass = isFullscreen
    ? 'modal-sheet !max-h-none !h-full !rounded-none max-w-none'
    : 'modal-sheet max-w-[900px] md:animate-slide-up';

  return (
    <ModalOverlay
      className={modalContainerClass}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-memo-title"
    >
      <div className={modalPanelClass}>
        {/* Header */}
        <div className="p-5 md:p-7 border-b border-slate-50 flex justify-between items-center flex-shrink-0">
          <h3 id="add-memo-title" className="text-lg font-bold text-slate-800 tracking-tight">
            {modalTitle}
          </h3>
          <div className="flex items-center space-x-2">
            {/* Fullscreen toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="hidden md:inline-flex text-slate-300 hover:text-slate-500 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors duration-200"
              aria-label={isFullscreen ? '退出全屏' : '全屏编辑'}
              title={isFullscreen ? '退出全屏' : '全屏编辑'}
            >
              {isFullscreen ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 14 10 14 10 20" />
                  <polyline points="20 10 14 10 14 4" />
                  <line x1="14" y1="10" x2="21" y2="3" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              )}
            </button>
            {/* Close button */}
            <button
              onClick={handleClose}
              className="text-slate-300 hover:text-slate-500 text-2xl cursor-pointer transition-colors duration-200"
              aria-label="关闭弹窗"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-5 md:p-7 space-y-4 overflow-y-auto page-scroll flex-1 min-h-0">
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

          {/* Content Area with Tabs */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-600">
                内容
              </label>
              {/* Tab Switcher */}
              <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                <button
                  onClick={() => setActiveTab('edit')}
                  className={`px-3 py-1 text-xs font-medium rounded-md cursor-pointer transition-all duration-200 ${
                    activeTab === 'edit'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  编辑
                </button>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1 text-xs font-medium rounded-md cursor-pointer transition-all duration-200 ${
                    activeTab === 'preview'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  预览
                </button>
              </div>
            </div>

            {activeTab === 'edit' ? (
              <>
                <textarea
                  id="memo-content"
                  className={`w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-slate-800 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-sm transition-colors duration-200 resize-none font-mono ${
                    isFullscreen ? 'min-h-[calc(100dvh-320px)]' : 'min-h-[180px] md:min-h-[400px]'
                  }`}
                  placeholder="输入备忘录内容，支持 Markdown 语法"
                  value={formData.content || ''}
                  onChange={e => {
                    setFormData({...formData, content: e.target.value});
                    if (error) setError('');
                  }}
                  maxLength={10000}
                />
                {/* Markdown syntax hints */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400 px-1">
                  <span><code className="bg-slate-100 px-1 rounded">**粗体**</code></span>
                  <span><code className="bg-slate-100 px-1 rounded">*斜体*</code></span>
                  <span><code className="bg-slate-100 px-1 rounded"># 标题</code></span>
                  <span><code className="bg-slate-100 px-1 rounded">- 列表</code></span>
                  <span><code className="bg-slate-100 px-1 rounded">[链接](url)</code></span>
                  <span><code className="bg-slate-100 px-1 rounded">`代码`</code></span>
                  <span><code className="bg-slate-100 px-1 rounded">| 表格 |</code></span>
                </div>
              </>
            ) : (
              <div
                className={`w-full bg-slate-50 border border-slate-100 rounded-xl p-4 overflow-y-auto ${
                  isFullscreen ? 'min-h-[calc(100dvh-320px)]' : 'min-h-[180px] md:min-h-[400px]'
                }`}
              >
                {formData.content ? (
                  <div className="memo-markdown-preview text-sm text-slate-800 leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {formData.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">暂无内容可预览</p>
                )}
              </div>
            )}
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
        <div className="p-5 md:p-7 border-t border-slate-50 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:space-x-3 bg-slate-50/20 flex-shrink-0">
          <button
            onClick={handleClose}
            className="px-5 py-2.5 text-[12px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest cursor-pointer transition-colors duration-200 min-h-[44px]"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-[12px] uppercase tracking-widest cursor-pointer transition-colors duration-200 min-h-[44px]"
          >
            {submitButtonText}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
};
