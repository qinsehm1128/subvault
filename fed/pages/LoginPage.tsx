import React, { useState } from 'react';
import { LockIcon } from '../components/Icons';

interface LoginPageProps {
  onUnlock: (masterKey: string, totpCode?: string) => Promise<void>;
  isLoading: boolean;
  error: string;
  totpRequired: boolean;
  onUnlockWithTotp: (totpCode: string) => Promise<void>;
  onCancelTotp: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onUnlock,
  isLoading,
  error,
  totpRequired,
  onUnlockWithTotp,
  onCancelTotp,
}) => {
  const [masterKey, setMasterKey] = useState('');
  const [totpCode, setTotpCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totpRequired) {
      try {
        await onUnlockWithTotp(totpCode);
      } catch {
        // error handled in useAuth
      }
    } else {
      try {
        await onUnlock(masterKey);
      } catch {
        // error handled in useAuth
      }
    }
  };

  const handleBack = () => {
    setTotpCode('');
    onCancelTotp();
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 selection:bg-brand-100 px-4 py-8 safe-top safe-bottom">
      <div className="w-full max-w-[360px] p-6 sm:p-10 bg-white rounded-3xl sm:rounded-[2.5rem] shadow-card animate-slide-up border border-slate-100">
        <div className="flex justify-center mb-8">
          <div className="p-4 bg-brand-50 rounded-2xl">
            <LockIcon className="w-7 h-7 text-brand-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center mb-2 text-slate-900 tracking-tight">SubVault</h1>
        <p className="text-center text-slate-400 mb-8 text-[12px] font-medium tracking-wide uppercase">
          {totpRequired ? '两步验证' : '安全订阅管理平台'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {totpRequired ? (
            <div className="space-y-1.5">
              <p className="text-sm text-slate-500 text-center mb-4">
                请输入身份验证器中的6位验证码，或一次性恢复码
              </p>
              <label htmlFor="totp-code" className="sr-only">验证码</label>
              <input
                id="totp-code"
                type="text"
                inputMode="text"
                autoComplete="one-time-code"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 9))}
                placeholder="000000 或恢复码"
                className="w-full bg-slate-50 border border-slate-100 text-slate-800 px-5 py-4 rounded-2xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-colors duration-200 placeholder:text-slate-300 text-center text-xl font-mono tracking-[0.2em]"
                autoFocus
                maxLength={9}
                aria-describedby={error ? "error-message" : undefined}
              />
            </div>
          ) : (
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
          )}

          {error && (
            <p id="error-message" role="alert" className="text-rose-500 text-[11px] text-center font-bold tracking-widest">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || (totpRequired ? totpCode.length < 6 : !masterKey)}
            className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-2xl transition-colors duration-200 shadow-md active:scale-95 text-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? '验证中...' : totpRequired ? '验证' : '进入空间'}
          </button>

          {totpRequired && (
            <button
              type="button"
              onClick={handleBack}
              className="w-full text-slate-400 hover:text-slate-600 text-sm font-medium py-2 cursor-pointer transition-colors"
            >
              返回
            </button>
          )}
        </form>

        <p className="mt-8 pt-6 border-t border-slate-50 text-center text-[10px] text-slate-300">
          {totpRequired ? '打开身份验证器应用获取验证码' : '请输入主密钥解锁保险库'}
        </p>
      </div>
    </div>
  );
};
