import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

interface AIConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const AIConfigModal: React.FC<AIConfigModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    setIsLoading(true);
    setError('');
    try {
      const config = await api.getAIConfig();
      setBaseUrl(config.baseUrl || '');
      setApiKey(config.apiKey || '');
      setModel(config.model || '');
    } catch (err: any) {
      setError(err.message || '加载配置失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!baseUrl || !apiKey || !model) {
      setError('请填写完整配置');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      await api.saveAIConfig({ baseUrl, apiKey, model });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/10 backdrop-blur-md p-4 animate-fade-in" role="dialog" aria-modal="true">
      <div className="bg-white shadow-2xl rounded-[2rem] w-full max-w-md overflow-hidden animate-slide-up border border-slate-100">
        <div className="p-7 border-b border-slate-50 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800 tracking-tight">AI 服务配置</h3>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-500 text-2xl cursor-pointer transition-colors duration-200">&times;</button>
        </div>
        
        <div className="p-7 space-y-5">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              <p className="text-slate-400 text-xs">
                支持 OpenAI 兼容格式的 API（如 OpenAI、DeepSeek、通义千问等）
              </p>

              <div className="space-y-1.5">
                <label htmlFor="ai-base-url" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  API 地址
                </label>
                <input
                  id="ai-base-url"
                  type="url"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-colors duration-200 font-medium text-sm"
                  placeholder="https://api.openai.com"
                  value={baseUrl}
                  onChange={e => setBaseUrl(e.target.value)}
                />
                <p className="text-[10px] text-slate-300 ml-1">例如: https://api.openai.com 或 https://api.deepseek.com</p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="ai-api-key" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  API Key
                </label>
                <input
                  id="ai-api-key"
                  type="password"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-colors duration-200 font-medium text-sm font-mono"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="ai-model" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  模型名称
                </label>
                <input
                  id="ai-model"
                  type="text"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-colors duration-200 font-medium text-sm"
                  placeholder="gpt-4o-mini"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                />
                <p className="text-[10px] text-slate-300 ml-1">例如: gpt-4o-mini, deepseek-chat, qwen-turbo</p>
              </div>

              {error && (
                <p className="text-rose-500 text-xs font-medium">{error}</p>
              )}
            </>
          )}
        </div>

        <div className="p-7 border-t border-slate-50 flex justify-end space-x-3 bg-slate-50/20">
          <button 
            onClick={onClose} 
            className="px-5 py-2.5 text-[12px] font-bold text-slate-400 hover:text-slate-600 transition-colors duration-200 uppercase tracking-widest cursor-pointer"
          >
            取消
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="px-8 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-sm active:scale-95 text-[12px] uppercase tracking-widest cursor-pointer transition-colors duration-200"
          >
            {isSaving ? '保存中...' : '保存配置'}
          </button>
        </div>
      </div>
    </div>
  );
};
