import React, { useState, useRef } from 'react';
import { Credential } from '../../types';
import { UploadIcon } from '../Icons';

interface ImportCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (credentials: Partial<Credential>[]) => void;
}

interface ParsedCredential {
  name: string;
  url: string;
  username: string;
  password: string;
  selected: boolean;
}

export const ImportCredentialsModal: React.FC<ImportCredentialsModalProps> = ({
  isOpen,
  onClose,
  onImport
}) => {
  const [parsedData, setParsedData] = useState<ParsedCredential[]>([]);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          setError('未找到有效的凭证数据');
          return;
        }
        setParsedData(parsed.map(p => ({ ...p, selected: true })));
        setStep('preview');
        setError('');
      } catch (err) {
        setError('CSV 解析失败，请确保文件格式正确');
      }
    };
    reader.readAsText(file);
  };

  // 解析 CSV（支持 Chrome/Edge/Firefox 格式）
  const parseCSV = (text: string): Omit<ParsedCredential, 'selected'>[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const header = lines[0].toLowerCase();
    let nameIdx = -1, urlIdx = -1, usernameIdx = -1, passwordIdx = -1;

    // 解析表头
    const headers = parseCSVLine(lines[0]);
    headers.forEach((h, i) => {
      const col = h.toLowerCase().trim();
      if (col === 'name' || col === '名称' || col === 'title') nameIdx = i;
      if (col === 'url' || col === 'website' || col === '网址' || col === 'origin') urlIdx = i;
      if (col === 'username' || col === 'login' || col === '用户名' || col === 'email') usernameIdx = i;
      if (col === 'password' || col === '密码') passwordIdx = i;
    });

    if (usernameIdx === -1 || passwordIdx === -1) {
      throw new Error('CSV 格式不正确');
    }

    const results: Omit<ParsedCredential, 'selected'>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length <= Math.max(usernameIdx, passwordIdx)) continue;

      const username = cols[usernameIdx]?.trim();
      const password = cols[passwordIdx]?.trim();
      if (!username) continue;

      results.push({
        name: nameIdx >= 0 ? cols[nameIdx]?.trim() || '' : '',
        url: urlIdx >= 0 ? cols[urlIdx]?.trim() || '' : '',
        username,
        password: password || '',
      });
    }
    return results;
  };

  // 解析 CSV 行（处理引号）
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const handleToggleAll = (checked: boolean) => {
    setParsedData(prev => prev.map(p => ({ ...p, selected: checked })));
  };

  const handleToggleItem = (index: number) => {
    setParsedData(prev => prev.map((p, i) => i === index ? { ...p, selected: !p.selected } : p));
  };

  const handleImport = () => {
    const selected = parsedData.filter(p => p.selected);
    const credentials: Partial<Credential>[] = selected.map(p => ({
      label: p.name || extractDomain(p.url) || p.username,
      username: p.username,
      password: p.password,
      notes: p.url ? `来源: ${p.url}` : undefined,
    }));
    onImport(credentials);
    handleClose();
  };

  const extractDomain = (url: string): string => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return domain.split('.')[0];
    } catch {
      return '';
    }
  };

  const handleClose = () => {
    setParsedData([]);
    setError('');
    setStep('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  const selectedCount = parsedData.filter(p => p.selected).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/10 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-white shadow-xl rounded-2xl w-full max-w-lg overflow-hidden border border-slate-200/60">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-base font-semibold text-slate-900">
            {step === 'upload' ? '导入凭证' : `预览导入 (${selectedCount}/${parsedData.length})`}
          </h3>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 text-xl cursor-pointer">&times;</button>
        </div>

        <div className="p-5">
          {step === 'upload' ? (
            <div className="space-y-4">
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
                <UploadIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-600 mb-2">选择从浏览器导出的 CSV 文件</p>
                <p className="text-xs text-slate-400 mb-4">支持 Chrome、Edge、Firefox 导出格式</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg cursor-pointer transition-colors"
                >
                  选择文件
                </label>
              </div>
              {error && <p className="text-rose-500 text-sm">{error}</p>}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-700 font-medium mb-1">如何导出浏览器密码？</p>
                <ul className="text-xs text-amber-600 space-y-1">
                  <li>• Chrome: 设置 → 密码管理器 → 导出密码</li>
                  <li>• Edge: 设置 → 密码 → 导出密码</li>
                  <li>• Firefox: 设置 → 密码 → ⋯ → 导出登录信息</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={parsedData.every(p => p.selected)}
                    onChange={(e) => handleToggleAll(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer"
                  />
                  <span className="text-slate-600">全选</span>
                </label>
                <button
                  onClick={() => setStep('upload')}
                  className="text-blue-600 hover:text-blue-700 text-xs cursor-pointer"
                >
                  重新选择文件
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2 border border-slate-100 rounded-lg p-2">
                {parsedData.map((item, idx) => (
                  <label
                    key={idx}
                    className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      item.selected ? 'bg-blue-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => handleToggleItem(idx)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {item.name || extractDomain(item.url) || item.username}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{item.username}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 flex justify-end space-x-3 bg-slate-50/50">
          <button onClick={handleClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 cursor-pointer">取消</button>
          {step === 'preview' && (
            <button
              onClick={handleImport}
              disabled={selectedCount === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg cursor-pointer transition-colors"
            >
              导入 {selectedCount} 条凭证
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
