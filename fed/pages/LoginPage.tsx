import React, { useState } from 'react';
import { LockIcon } from '../components/Icons';

interface LoginPageProps {
  onUnlock: (masterKey: string) => Promise<void>;
  isLoading: boolean;
  error: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onUnlock,
  isLoading,
  error
}) => {
  const [masterKey, setMasterKey] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUnlock(masterKey);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 selection:bg-brand-100">
      <div className="w-full max-w-[360px] p-10 bg-white rounded-[2.5rem] shadow-card animate-slide-up border border-slate-100">
        <div className="flex justify-center mb-8">
          <div className="p-4 bg-brand-50 rounded-2xl">
            <LockIcon className="w-7 h-7 text-brand-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center mb-2 text-slate-900 tracking-tight">SubVault</h1>
        <p className="text-center text-slate-400 mb-8 text-[12px] font-medium tracking-wide uppercase">安全订阅管理平台</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="master-key" className="sr-only">主密钥</label>
            <input
              id="master-key"
              type="password"
              value={masterKey}
              onChange={(e) => setMasterKey(e.target.value)}
              placeholder="输入主密钥"
              className="w-full bg-slate-50 border border-slate-100 text-slate-800 px-5 py-4 rounded-2xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-colors duration-200 placeholder:text-slate-300 text-sm font-medium"
              autoFocus
              aria-describedby={error ? "error-message" : undefined}
            />
          </div>

          {error && (
            <p id="error-message" role="alert" className="text-rose-500 text-[11px] text-center font-bold tracking-widest">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || !masterKey}
            className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-2xl transition-colors duration-200 shadow-md active:scale-95 text-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? '解锁中...' : '进入空间'}
          </button>
        </form>

        <p className="mt-8 pt-6 border-t border-slate-50 text-center text-[10px] text-slate-300">
          首次使用？输入任意密钥即可创建新的保险库
        </p>
      </div>
    </div>
  );
};
