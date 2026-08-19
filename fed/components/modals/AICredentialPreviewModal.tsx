import React, { useState } from 'react';
import { Credential } from '../../types';
import { BrainIcon, GlobeIcon, TagIcon, KeyIcon } from '../Icons';
import { ModalOverlay } from './ModalOverlay';

interface ParsedCredential extends Partial<Credential> {
  selected: boolean;
}

interface AICredentialPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  credentials: Partial<Credential>[];
  onConfirm: (credentials: Partial<Credential>[]) => void;
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

export const AICredentialPreviewModal: React.FC<AICredentialPreviewModalProps> = ({
  isOpen,
  onClose,
  credentials,
  onConfirm
}) => {
  const [parsedData, setParsedData] = useState<ParsedCredential[]>(
    credentials.map(c => ({ ...c, selected: true }))
  );

  React.useEffect(() => {
    setParsedData(credentials.map(c => ({ ...c, selected: true })));
  }, [credentials]);

  const handleToggleAll = (checked: boolean) => {
    setParsedData(prev => prev.map(p => ({ ...p, selected: checked })));
  };

  const handleToggleItem = (index: number) => {
    setParsedData(prev => prev.map((p, i) => i === index ? { ...p, selected: !p.selected } : p));
  };

  const handleConfirm = () => {
    const selected = parsedData.filter(p => p.selected);
    const result: Partial<Credential>[] = selected.map(({ selected: _, ...rest }) => rest);
    onConfirm(result);
    onClose();
  };

  const getCategoryColor = (category?: string) => {
    return categoryColors[category || '其他'] || categoryColors['其他'];
  };

  const selectedCount = parsedData.filter(p => p.selected).length;

  if (!isOpen || credentials.length === 0) return null;

  return (
    <ModalOverlay className="animate-fade-in">
      <div className="modal-sheet max-w-2xl">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-violet-500 to-blue-500 rounded-xl">
              <BrainIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                AI 识别到 {credentials.length} 条凭据
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                已选择 {selectedCount} 条准备导入
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl cursor-pointer">&times;</button>
        </div>

        <div className="p-5 overflow-y-auto page-scroll flex-1 min-h-0">
          <div className="flex items-center justify-between text-sm mb-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={parsedData.every(p => p.selected)}
                onChange={(e) => handleToggleAll(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer"
              />
              <span className="text-slate-600 text-sm">全选</span>
            </label>
          </div>

          <div className="max-h-64 md:max-h-80 overflow-y-auto space-y-2 border border-slate-100 rounded-xl p-3">
            {parsedData.map((item, idx) => (
              <label
                key={idx}
                className={`flex items-start space-x-3 p-3 rounded-xl cursor-pointer transition-colors ${
                  item.selected ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50 border border-transparent hover:bg-slate-100'
                }`}
              >
                <input
                  type="checkbox"
                  checked={item.selected}
                  onChange={() => handleToggleItem(idx)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <KeyIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="text-sm font-semibold text-slate-800 truncate">
                      {item.label || '未命名'}
                    </span>
                    {item.category && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium border ${getCategoryColor(item.category)}`}>
                        {item.category}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 space-y-0.5">
                    <p className="truncate">账号: {item.username || '-'}</p>
                    <p className="truncate">密码: {item.password ? '••••••••' : '(无)'}</p>
                    {item.website && (
                      <p className="flex items-center text-blue-500 truncate">
                        <GlobeIcon className="w-3 h-3 mr-1" />
                        {item.website}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-slate-400 truncate">备注: {item.notes}</p>
                    )}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:space-x-3 bg-slate-50/50 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm text-slate-500 hover:text-slate-700 cursor-pointer min-h-[44px]"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedCount === 0}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg cursor-pointer transition-colors disabled:cursor-not-allowed min-h-[44px]"
          >
            导入 {selectedCount} 条凭据
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
};
