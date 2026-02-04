import React, { useState } from 'react';
import { Credential } from '../types';
import { KeyIcon, EyeIcon, TrashIcon, EditIcon, GlobeIcon, TagIcon } from './Icons';

interface CredentialRowProps {
  credential: Credential;
  onDelete: () => void;
  onEdit?: () => void;
  onClick?: () => void;
}

// 分类颜色映射
const categoryColors: Record<string, string> = {
  '社交': 'bg-pink-100 text-pink-700',
  '购物': 'bg-orange-100 text-orange-700',
  '工作': 'bg-blue-100 text-blue-700',
  '娱乐': 'bg-purple-100 text-purple-700',
  '开发': 'bg-emerald-100 text-emerald-700',
  '金融': 'bg-yellow-100 text-yellow-700',
  '教育': 'bg-cyan-100 text-cyan-700',
  '其他': 'bg-slate-100 text-slate-600',
};

export const CredentialRow: React.FC<CredentialRowProps> = ({ credential: cred, onDelete, onEdit, onClick }) => {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const getCategoryColor = (category?: string) => {
    return categoryColors[category || '其他'] || categoryColors['其他'];
  };

  return (
    <div
      className="group bg-white rounded-xl border border-slate-200/60 hover:border-blue-200 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer"
      onClick={onClick}
    >
      <div className="p-4 flex items-center">
        {/* 图标 */}
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-sm">
          <KeyIcon className="w-5 h-5 text-white" />
        </div>

        {/* 信息 */}
        <div className="flex-1 min-w-0 ml-4">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-semibold text-slate-900 text-sm truncate">{cred.label}</span>
            {cred.category && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${getCategoryColor(cred.category)}`}>
                {cred.category}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-500 truncate max-w-[150px]">{cred.username}</span>
            <button
              onClick={(e) => { e.stopPropagation(); handleCopy(cred.username); }}
              className="text-[10px] text-slate-400 hover:text-blue-600 cursor-pointer transition-colors duration-200"
            >
              复制
            </button>
            {cred.website && (
              <a
                href={cred.website.startsWith('http') ? cred.website : `https://${cred.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-[10px] text-blue-500 hover:text-blue-700 transition-colors duration-200"
                onClick={e => e.stopPropagation()}
              >
                <GlobeIcon className="w-3 h-3 mr-0.5" />
                访问
              </a>
            )}
          </div>
        </div>

        {/* 密码区域 */}
        <div className="flex items-center space-x-2 mr-4">
          <button
            onClick={(e) => { e.stopPropagation(); setRevealed(!revealed); }}
            className={`font-mono text-xs px-3 py-1.5 rounded-lg border cursor-pointer transition-all duration-200 ${
              revealed
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'
            }`}
          >
            {revealed ? cred.password || '(空)' : '••••••••'}
          </button>
          {revealed && cred.password && (
            <button
              onClick={(e) => { e.stopPropagation(); handleCopy(cred.password || ''); }}
              className={`text-xs px-2 py-1 rounded cursor-pointer transition-colors duration-200 ${
                copied ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-blue-600'
              }`}
            >
              {copied ? '已复制' : '复制'}
            </button>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={(e) => { e.stopPropagation(); setRevealed(!revealed); }}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors duration-200"
            aria-label={revealed ? '隐藏密码' : '显示密码'}
          >
            <EyeIcon className="w-4 h-4" />
          </button>
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors duration-200"
              aria-label={`编辑凭证 ${cred.label}`}
            >
              <EditIcon className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors duration-200"
            aria-label={`删除凭证 ${cred.label}`}
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 备注 */}
      {cred.notes && (
        <div className="px-4 pb-3 pt-0">
          <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2 truncate">
            {cred.notes}
          </p>
        </div>
      )}
    </div>
  );
};
