import React, { useState } from 'react';
import { Credential } from '../types';
import { KeyIcon, EyeIcon, TrashIcon, EditIcon } from './Icons';

interface CredentialRowProps {
  credential: Credential;
  onDelete: () => void;
  onEdit?: () => void;
}

export const CredentialRow: React.FC<CredentialRowProps> = ({ credential: cred, onDelete, onEdit }) => {
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

  return (
    <div className="group bg-white rounded-xl border border-slate-200/60 hover:border-blue-200 hover:shadow-md transition-all duration-200 overflow-hidden">
      <div className="p-4 flex items-center">
        {/* 图标 */}
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-sm">
          <KeyIcon className="w-5 h-5 text-white" />
        </div>
        
        {/* 信息 */}
        <div className="flex-1 min-w-0 ml-4">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-semibold text-slate-900 text-sm truncate">{cred.label}</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-500 truncate max-w-[150px]">{cred.username}</span>
            <button 
              onClick={() => handleCopy(cred.username)}
              className="text-[10px] text-slate-400 hover:text-blue-600 cursor-pointer transition-colors duration-200"
            >
              复制
            </button>
          </div>
        </div>

        {/* 密码区域 */}
        <div className="flex items-center space-x-2 mr-4">
          <button 
            onClick={() => setRevealed(!revealed)}
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
              onClick={() => handleCopy(cred.password || '')}
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
            onClick={() => setRevealed(!revealed)} 
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors duration-200" 
            aria-label={revealed ? '隐藏密码' : '显示密码'}
          >
            <EyeIcon className="w-4 h-4" />
          </button>
          {onEdit && (
            <button 
              onClick={onEdit} 
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors duration-200" 
              aria-label={`编辑凭证 ${cred.label}`}
            >
              <EditIcon className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={onDelete} 
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
