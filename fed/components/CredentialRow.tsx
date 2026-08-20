import React, { useState } from 'react';
import { Credential } from '../types';
import { KeyIcon, EyeIcon, TrashIcon, EditIcon, GlobeIcon } from './Icons';
import { copyToClipboard } from '../utils/clipboard';
import { GroupBadge } from './GroupBadge';
import { VaultGroup } from '../utils/groups';

interface CredentialRowProps {
  credential: Credential;
  groups?: VaultGroup[];
  onDelete: () => void;
  onEdit?: () => void;
  onClick?: () => void;
}

export const CredentialRow: React.FC<CredentialRowProps> = ({ credential: cred, groups = [], onDelete, onEdit, onClick }) => {
  const [revealed, setRevealed] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = async (text: string, field: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  return (
    <div
      className="group relative bg-white rounded-2xl border border-slate-200/60 hover:border-blue-200 hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden"
      onClick={onClick}
    >
      {/* 顶部渐变条 */}
      <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-500" />

      <div className="p-5">
        {/* 头部：图标 + 名称 + 操作 */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <KeyIcon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900 text-[15px] truncate leading-tight">{cred.label}</h3>
              <div className="mt-1">
                <GroupBadge name={cred.category} groups={groups} />
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center space-x-0.5 touch-action-visible md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
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

        {/* 用户名 */}
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">账号</span>
            <button
              onClick={(e) => handleCopy(cred.username, 'username', e)}
              className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer transition-colors duration-200 ${
                copiedField === 'username' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-blue-600'
              }`}
            >
              {copiedField === 'username' ? '已复制' : '复制'}
            </button>
          </div>
          <p className="text-sm text-slate-700 truncate mt-0.5">{cred.username}</p>
        </div>

        {/* 密码 */}
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">密码</span>
            <div className="flex items-center space-x-1">
              <button
                onClick={(e) => { e.stopPropagation(); setRevealed(!revealed); }}
                className="p-0.5 text-slate-400 hover:text-blue-600 cursor-pointer transition-colors duration-200"
              >
                <EyeIcon className="w-3.5 h-3.5" />
              </button>
              {cred.password && (
                <button
                  onClick={(e) => handleCopy(cred.password || '', 'password', e)}
                  className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer transition-colors duration-200 ${
                    copiedField === 'password' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-blue-600'
                  }`}
                >
                  {copiedField === 'password' ? '已复制' : '复制'}
                </button>
              )}
            </div>
          </div>
          <p className="text-sm font-mono text-slate-700 mt-0.5">
            {revealed ? (cred.password || '(空)') : '••••••••'}
          </p>
        </div>

        {/* 底部：网站 + 备注 */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          {cred.website && (
            <a
              href={cred.website.startsWith('http') ? cred.website : `https://${cred.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-xs text-blue-500 hover:text-blue-700 transition-colors duration-200"
              onClick={e => e.stopPropagation()}
            >
              <GlobeIcon className="w-3.5 h-3.5 mr-1" />
              <span className="truncate">{cred.website}</span>
            </a>
          )}
          {cred.notes && (
            <p className="text-xs text-slate-400 truncate">{cred.notes}</p>
          )}
          {!cred.website && !cred.notes && (
            <span className="text-xs text-slate-300">—</span>
          )}
        </div>
      </div>
    </div>
  );
};
