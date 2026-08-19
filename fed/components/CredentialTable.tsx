import React, { useState } from 'react';
import { Credential } from '../types';
import { EyeIcon, EditIcon, TrashIcon, GlobeIcon } from './Icons';
import { copyToClipboard } from '../utils/clipboard';

interface CredentialTableProps {
  credentials: Credential[];
  onCredentialClick: (cred: Credential) => void;
  onEdit: (cred: Credential) => void;
  onDelete: (id: string) => void;
}

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

const TableRow: React.FC<{
  cred: Credential;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ cred, onClick, onEdit, onDelete }) => {
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

  const catColor = categoryColors[cred.category || '其他'] || categoryColors['其他'];

  return (
    <tr
      className="group hover:bg-blue-50/50 cursor-pointer transition-colors duration-150"
      onClick={onClick}
    >
      {/* 名称 + 分类 */}
      <td className="px-4 py-3">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-slate-900 truncate">{cred.label}</span>
          {cred.category && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium whitespace-nowrap ${catColor}`}>
              {cred.category}
            </span>
          )}
        </div>
      </td>

      {/* 账号 */}
      <td className="px-4 py-3">
        <div className="flex items-center space-x-1.5">
          <span className="text-sm text-slate-600 truncate max-w-[200px]">{cred.username}</span>
          <button
            onClick={(e) => handleCopy(cred.username, 'username', e)}
            className={`text-[10px] px-1 py-0.5 rounded cursor-pointer transition-colors ${
              copiedField === 'username' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-blue-600 touch-action-visible md:opacity-0 md:group-hover:opacity-100'
            }`}
          >
            {copiedField === 'username' ? '已复制' : '复制'}
          </button>
        </div>
      </td>

      {/* 密码 */}
      <td className="px-4 py-3">
        <div className="flex items-center space-x-1.5">
          <span className="text-sm font-mono text-slate-600">
            {revealed ? (cred.password || '(空)') : '••••••••'}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); setRevealed(!revealed); }}
            className="p-0.5 text-slate-400 hover:text-blue-600 cursor-pointer transition-colors touch-action-visible md:opacity-0 md:group-hover:opacity-100"
          >
            <EyeIcon className="w-3.5 h-3.5" />
          </button>
          {cred.password && (
            <button
              onClick={(e) => handleCopy(cred.password || '', 'password', e)}
              className={`text-[10px] px-1 py-0.5 rounded cursor-pointer transition-colors ${
                copiedField === 'password' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-blue-600 touch-action-visible md:opacity-0 md:group-hover:opacity-100'
              }`}
            >
              {copiedField === 'password' ? '已复制' : '复制'}
            </button>
          )}
        </div>
      </td>

      {/* 网站 */}
      <td className="px-4 py-3">
        {cred.website ? (
          <a
            href={cred.website.startsWith('http') ? cred.website : `https://${cred.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-xs text-blue-500 hover:text-blue-700 transition-colors"
            onClick={e => e.stopPropagation()}
          >
            <GlobeIcon className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
            <span className="truncate max-w-[120px]">{cred.website}</span>
          </a>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        )}
      </td>

      {/* 操作 */}
      <td className="px-4 py-3">
        <div className="flex items-center space-x-1 touch-action-visible md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
          >
            <EditIcon className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export const CredentialTable: React.FC<CredentialTableProps> = ({
  credentials,
  onCredentialClick,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="credential-table bg-white rounded-2xl border border-slate-200/60 overflow-x-auto">
      <table className="w-full min-w-[720px]">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/50">
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">名称</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">账号</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">密码</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">网站</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {credentials.map(cred => (
            <TableRow
              key={cred.id}
              cred={cred}
              onClick={() => onCredentialClick(cred)}
              onEdit={() => onEdit(cred)}
              onDelete={() => onDelete(cred.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};
