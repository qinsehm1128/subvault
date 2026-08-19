import React, { useState, useEffect } from 'react';
import { Credential, CREDENTIAL_CATEGORIES } from '../../types';
import { generatePassword } from '../../utils/password';
import { ModalOverlay } from './ModalOverlay';

interface AddCredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (credential: Partial<Credential>) => void;
  initialData?: Partial<Credential> | null;
}

export const AddCredentialModal: React.FC<AddCredentialModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  initialData
}) => {
  const [newCred, setNewCred] = useState<Partial<Credential>>({});

  useEffect(() => {
    if (initialData) {
      setNewCred(initialData);
    } else {
      setNewCred({});
    }
  }, [initialData, isOpen]);

  const handleSubmit = () => {
    onAdd(newCred);
    setNewCred({});
    onClose();
  };

  const handleClose = () => {
    setNewCred({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay className="animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="add-cred-title">
      <div className="modal-sheet max-w-[480px] md:animate-slide-up">
        <div className="p-5 md:p-7 border-b border-slate-50 flex justify-between items-center flex-shrink-0">
          <h3 id="add-cred-title" className="text-lg font-bold text-slate-800 tracking-tight">添加安全凭证</h3>
          <button onClick={handleClose} className="text-slate-300 hover:text-slate-500 text-2xl cursor-pointer transition-colors duration-200" aria-label="关闭弹窗">&times;</button>
        </div>
        <div className="p-5 md:p-7 space-y-4 overflow-y-auto page-scroll flex-1 min-h-0">
          <div className="space-y-1.5">
            <label htmlFor="cred-label" className="text-xs font-medium text-slate-500">服务名称 *</label>
            <input
              id="cred-label"
              type="text"
              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-slate-800 focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-bold text-sm transition-colors duration-200"
              placeholder="如：GitHub, 淘宝, OpenAI"
              value={newCred.label || ''}
              onChange={e => setNewCred({...newCred, label: e.target.value})}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="cred-username" className="text-xs font-medium text-slate-500">用户名 / 账号 *</label>
            <input
              id="cred-username"
              type="text"
              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-slate-800 focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-bold text-sm transition-colors duration-200"
              placeholder="用户名、邮箱或手机号"
              value={newCred.username || ''}
              onChange={e => setNewCred({...newCred, username: e.target.value})}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="cred-password" className="text-xs font-medium text-slate-500">密码</label>
            <div className="flex gap-2">
            <input
              id="cred-password"
              type="text"
              placeholder="通行密码"
              className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-4 text-slate-800 focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-bold text-sm transition-colors duration-200"
              value={newCred.password || ''}
              onChange={e => setNewCred({...newCred, password: e.target.value})}
            />
            <button
              type="button"
              onClick={() => setNewCred({ ...newCred, password: generatePassword() })}
              className="px-3 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-xl whitespace-nowrap"
            >
              生成
            </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="cred-website" className="text-xs font-medium text-slate-500">网站地址</label>
            <input
              id="cred-website"
              type="url"
              placeholder="https://example.com"
              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-slate-800 focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none text-sm transition-colors duration-200"
              value={newCred.website || ''}
              onChange={e => setNewCred({...newCred, website: e.target.value})}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="cred-category" className="text-xs font-medium text-slate-500">分类</label>
            <select
              id="cred-category"
              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-slate-800 focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none text-sm transition-colors duration-200 cursor-pointer"
              value={newCred.category || '其他'}
              onChange={e => setNewCred({...newCred, category: e.target.value})}
            >
              {CREDENTIAL_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="cred-notes" className="text-xs font-medium text-slate-500">备注</label>
            <textarea
              id="cred-notes"
              placeholder="额外信息或备注..."
              rows={3}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-slate-800 focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none text-sm transition-colors duration-200 resize-none"
              value={newCred.notes || ''}
              onChange={e => setNewCred({...newCred, notes: e.target.value})}
            />
          </div>
        </div>
        <div className="p-5 md:p-7 border-t border-slate-50 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:space-x-3 bg-slate-50/20 flex-shrink-0">
          <button onClick={handleClose} className="px-5 py-2.5 text-[12px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest cursor-pointer transition-colors duration-200 min-h-[44px]">取消</button>
          <button
            onClick={handleSubmit}
            disabled={!newCred.label || !newCred.username}
            className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-[12px] uppercase tracking-widest cursor-pointer disabled:cursor-not-allowed transition-colors duration-200 min-h-[44px]"
          >
            确认录入
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
};
