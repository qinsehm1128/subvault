import React, { useState } from 'react';
import { Credential } from '../../types';
import { KeyIcon, GlobeIcon, CopyIcon, CheckIcon, EyeIcon, EditIcon, TrashIcon } from '../Icons';
import { copyToClipboard } from '../../utils/clipboard';

interface CredentialDetailModalProps {
  isOpen: boolean;
  credential: Credential | null;
  onClose: () => void;
  onEdit?: (credential: Credential) => void;
  onDelete?: (id: string) => void;
}

// 分类颜色映射
const categoryColors: Record<string, string> = {
  '社交': 'bg-pink-100 text-pink-700 border-pink-200',
  '购物': 'bg-orange-100 text-orange-700 border-orange-200',
  '工作': 'bg-blue-100 text-blue-700 border-blue-200',
  '娱乐': 'bg-purple-100 text-purple-700 border-purple-200',
  '开发': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  '金融': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  '教育': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  '其他': 'bg-slate-100 text-slate-600 border-slate-200',
};

export const CredentialDetailModal: React.FC<CredentialDetailModalProps> = ({
  isOpen,
  credential,
  onClose,
  onEdit,
  onDelete
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen || !credential) return null;

  const handleCopy = async (text: string, field: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const getCategoryColor = (category?: string) => {
    return categoryColors[category || '其他'] || categoryColors['其他'];
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(credential);
      onClose();
    }
  };

  const handleDelete = () => {
    if (onDelete && confirm('确定要删除这个凭证吗？')) {
      onDelete(credential.id);
      onClose();
    }
  };

  const InfoRow = ({ label, value, canCopy, isSensitive, isLink }: {
    label: string;
    value?: string;
    canCopy?: boolean;
    isSensitive?: boolean;
    isLink?: boolean;
  }) => {
    if (!value) return null;

    const displayValue = isSensitive && !showPassword ? '••••••••••••' : value;

    return (
      <div className="py-3 border-b border-slate-100 last:border-b-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</span>
          <div className="flex items-center space-x-2">
            {isSensitive && (
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                title={showPassword ? '隐藏' : '显示'}
              >
                <EyeIcon className="w-4 h-4" />
              </button>
            )}
            {canCopy && (
              <button
                onClick={() => handleCopy(value, label)}
                className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                title="复制"
              >
                {copiedField === label ? (
                  <CheckIcon className="w-4 h-4 text-emerald-500" />
                ) : (
                  <CopyIcon className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>
        <div className="mt-1">
          {isLink ? (
            <a
              href={value.startsWith('http') ? value : `https://${value}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline break-all"
            >
              {value}
            </a>
          ) : (
            <p className={`text-sm break-all ${isSensitive ? 'font-mono' : 'text-slate-800'}`}>
              {displayValue}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/10 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-white shadow-xl rounded-2xl w-full max-w-md overflow-hidden border border-slate-200/60">
        {/* 头部 */}
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                <KeyIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{credential.label}</h3>
                {credential.category && (
                  <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-md font-medium border ${getCategoryColor(credential.category)}`}>
                    {credential.category}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-xl cursor-pointer"
            >
              &times;
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          <InfoRow label="用户名 / 账号" value={credential.username} canCopy />
          <InfoRow label="密码" value={credential.password} canCopy isSensitive />
          <InfoRow label="网站地址" value={credential.website} canCopy isLink />
          <InfoRow label="备注" value={credential.notes} />

          {credential.createdAt && (
            <div className="pt-3 mt-2">
              <span className="text-xs text-slate-400">
                创建于 {new Date(credential.createdAt).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="p-5 border-t border-slate-100 flex justify-between bg-slate-50/50">
          <button
            onClick={handleDelete}
            className="flex items-center space-x-1 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg text-sm font-medium cursor-pointer transition-colors"
          >
            <TrashIcon className="w-4 h-4" />
            <span>删除</span>
          </button>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              关闭
            </button>
            {onEdit && (
              <button
                onClick={handleEdit}
                className="flex items-center space-x-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg cursor-pointer transition-colors"
              >
                <EditIcon className="w-4 h-4" />
                <span>编辑</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
