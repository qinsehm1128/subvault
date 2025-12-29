import React, { useState } from 'react';
import { Credential } from '../../types';

interface AddCredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (credential: Partial<Credential>) => void;
}

export const AddCredentialModal: React.FC<AddCredentialModalProps> = ({
  isOpen,
  onClose,
  onAdd
}) => {
  const [newCred, setNewCred] = useState<Partial<Credential>>({});

  const handleSubmit = () => {
    onAdd(newCred);
    setNewCred({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/10 backdrop-blur-md p-4 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="add-cred-title">
      <div className="bg-white shadow-xl rounded-[2rem] w-full max-w-[400px] overflow-hidden animate-slide-up border border-slate-100">
        <div className="p-7 border-b border-slate-50 flex justify-between items-center">
          <h3 id="add-cred-title" className="text-lg font-bold text-slate-800 tracking-tight">添加安全凭证</h3>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-500 text-2xl cursor-pointer transition-colors duration-200" aria-label="关闭弹窗">&times;</button>
        </div>
        <div className="p-7 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="cred-label" className="sr-only">凭证标签</label>
            <input 
              id="cred-label" 
              type="text" 
              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-slate-800 focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-bold text-sm transition-colors duration-200" 
              placeholder="凭证标签 (如：主邮箱, OpenAI)" 
              value={newCred.label || ''} 
              onChange={e => setNewCred({...newCred, label: e.target.value})}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="cred-username" className="sr-only">用户名</label>
            <input 
              id="cred-username" 
              type="text" 
              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-slate-800 focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-bold text-sm transition-colors duration-200" 
              placeholder="用户名 / 账号"
              value={newCred.username || ''} 
              onChange={e => setNewCred({...newCred, username: e.target.value})}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="cred-password" className="sr-only">密码</label>
            <input 
              id="cred-password" 
              type="password" 
              placeholder="通行密码" 
              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-slate-800 focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-bold text-sm transition-colors duration-200" 
              value={newCred.password || ''} 
              onChange={e => setNewCred({...newCred, password: e.target.value})}
            />
          </div>
        </div>
        <div className="p-7 border-t border-slate-50 flex justify-end space-x-3 bg-slate-50/20">
          <button onClick={onClose} className="px-5 py-2.5 text-[12px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest cursor-pointer transition-colors duration-200">取消</button>
          <button onClick={handleSubmit} className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[12px] uppercase tracking-widest cursor-pointer transition-colors duration-200">确认录入</button>
        </div>
      </div>
    </div>
  );
};
