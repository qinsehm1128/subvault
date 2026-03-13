import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Memo } from '../types';
import { EditIcon, TrashIcon } from './Icons';
import { copyToClipboard } from '../utils/memoUtils';

interface MemoCardProps {
  memo: Memo;
  onEdit: () => void;
  onDelete: () => void;
}

// Copy icon component
const CopyIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
  </svg>
);

// Category color mapping
const getCategoryColors = (category: string) => {
  switch (category) {
    case '个人信息':
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-600',
        border: 'border-blue-100',
        gradient: 'from-blue-500 to-blue-600'
      };
    case '银行卡':
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-600',
        border: 'border-emerald-100',
        gradient: 'from-emerald-500 to-teal-600'
      };
    case '地址':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-600',
        border: 'border-amber-100',
        gradient: 'from-amber-500 to-orange-600'
      };
    default:
      return {
        bg: 'bg-slate-50',
        text: 'text-slate-600',
        border: 'border-slate-100',
        gradient: 'from-slate-500 to-slate-600'
      };
  }
};

// Truncate content for preview
const truncateContent = (content: string, maxLength: number = 100): string => {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength).trim() + '...';
};

export const MemoCard: React.FC<MemoCardProps> = ({ memo, onEdit, onDelete }) => {
  const [copied, setCopied] = useState(false);
  const categoryColors = getCategoryColors(memo.category);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await copyToClipboard(memo.content);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200/60 hover:border-blue-200 hover:shadow-lg transition-all duration-200 overflow-hidden">
      {/* Top gradient bar */}
      <div className={`h-1 w-full bg-gradient-to-r ${categoryColors.gradient}`} />
      
      <div className="p-5">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            {/* Icon */}
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${categoryColors.gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}>
              <span className="text-white text-sm font-bold">
                {memo.title.slice(0, 1).toUpperCase()}
              </span>
            </div>
            
            {/* Title and category */}
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-slate-900 text-[15px] truncate leading-tight">
                {memo.title}
              </h3>
              <span className={`inline-flex items-center px-2 py-0.5 mt-1 rounded-md text-[10px] font-medium ${categoryColors.bg} ${categoryColors.text}`}>
                {memo.category}
              </span>
            </div>
          </div>
          
          {/* Action buttons - visible on hover */}
          <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button 
              onClick={handleEdit}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors duration-200" 
              aria-label={`编辑备忘录 ${memo.title}`}
            >
              <EditIcon className="w-4 h-4" />
            </button>
            <button 
              onClick={handleCopy}
              className={`p-2 rounded-lg cursor-pointer transition-colors duration-200 ${
                copied 
                  ? 'text-emerald-600 bg-emerald-50' 
                  : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
              }`}
              aria-label={copied ? '已复制' : `复制备忘录 ${memo.title}`}
            >
              <CopyIcon className="w-4 h-4" />
            </button>
            <button 
              onClick={handleDelete}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors duration-200" 
              aria-label={`删除备忘录 ${memo.title}`}
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Content preview */}
        <div className="mt-3 text-sm text-slate-500 leading-relaxed line-clamp-3 memo-markdown-preview memo-markdown-preview--compact">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {truncateContent(memo.content, 150)}
          </ReactMarkdown>
        </div>

        {/* Copy success indicator */}
        {copied && (
          <div className="absolute bottom-3 right-3 px-2 py-1 bg-emerald-500 text-white text-xs font-medium rounded-md shadow-sm animate-fade-in">
            已复制
          </div>
        )}

        {/* Pinned indicator */}
        {memo.isPinned && (
          <div className="absolute top-3 right-3 w-2 h-2 bg-blue-500 rounded-full" title="已置顶" />
        )}
      </div>
    </div>
  );
};
