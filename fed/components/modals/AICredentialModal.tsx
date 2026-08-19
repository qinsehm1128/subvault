import React, { useState, useRef } from 'react';
import { Credential } from '../../types';
import { api } from '../../services/api';
import { BrainIcon, UploadIcon, SpinnerIcon } from '../Icons';
import { ModalOverlay } from './ModalOverlay';

interface AICredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onParsed: (credentials: Partial<Credential>[]) => void;
}

// 支持的文件类型
const SUPPORTED_FILE_TYPES = [
  '.txt', '.md', '.csv', '.html', '.htm', '.xlsx', '.xls'
];

export const AICredentialModal: React.FC<AICredentialModalProps> = ({
  isOpen,
  onClose,
  onParsed
}) => {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 从 HTML 提取纯文本
  const extractTextFromHtml = (html: string): string => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    // 移除 script 和 style 标签
    doc.querySelectorAll('script, style').forEach(el => el.remove());
    return doc.body?.textContent || '';
  };

  // 解析 CSV 内容
  const parseCSV = (csvText: string): string => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return csvText;

    // 尝试解析为表格格式
    const result: string[] = [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      const row: string[] = [];
      headers.forEach((header, idx) => {
        if (cols[idx]) {
          row.push(`${header}: ${cols[idx]}`);
        }
      });
      if (row.length > 0) {
        result.push(row.join(', '));
      }
    }

    return result.join('\n');
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
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  // 处理文件选择
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setFileName(file.name);

    const ext = file.name.toLowerCase().split('.').pop() || '';
    setFileType(ext);

    try {
      if (ext === 'xlsx' || ext === 'xls') {
        // Excel 文件需要特殊处理
        const content = await readExcelFile(file);
        setText(content);
      } else {
        // 文本文件直接读取
        const reader = new FileReader();
        reader.onload = (event) => {
          let content = event.target?.result as string;

          // 根据文件类型预处理
          if (ext === 'html' || ext === 'htm') {
            content = extractTextFromHtml(content);
          } else if (ext === 'csv') {
            content = parseCSV(content);
          }

          setText(content);
        };
        reader.readAsText(file);
      }
    } catch (err) {
      setError('文件读取失败，请重试');
    }
  };

  // 读取 Excel 文件（简化版，使用文本解析）
  const readExcelFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          // 动态导入 xlsx 库
          const XLSX = await import('xlsx');
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          let result = '';
          workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const csvContent = XLSX.utils.sheet_to_csv(worksheet);
            result += `=== ${sheetName} ===\n${parseCSV(csvContent)}\n\n`;
          });

          resolve(result);
        } catch (err) {
          // 如果 xlsx 库不可用，提示用户
          reject(new Error('Excel 文件解析失败，请转换为 CSV 格式后重试'));
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsArrayBuffer(file);
    });
  };

  // 提交解析
  const handleSubmit = async () => {
    if (!text.trim()) {
      setError('请输入文本内容或上传文件');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await api.parseCredentials({
        text: text.trim(),
        fileName: fileName || '直接输入',
        fileType: fileType || 'text'
      });

      if (result.count === 0) {
        setError('未能从内容中识别出账号信息，请检查内容格式');
        return;
      }

      // 转换为 Credential 格式
      const credentials: Partial<Credential>[] = result.credentials.map(item => ({
        label: item.label || '',
        username: item.username || '',
        password: item.password || '',
        website: item.website || '',
        category: item.category || '其他',
        notes: item.notes || ''
      }));

      onParsed(credentials);
      handleClose();
    } catch (err: any) {
      setError(err.message || 'AI 解析失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setText('');
    setFileName('');
    setFileType('');
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay className="animate-fade-in">
      <div className="modal-sheet max-w-2xl">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-violet-500 to-blue-500 rounded-xl">
              <BrainIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">AI 智能解析凭据</h3>
              <p className="text-xs text-slate-400 mt-0.5">上传文件或粘贴文本，AI 自动提取账号信息</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 text-xl cursor-pointer">&times;</button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto page-scroll flex-1 min-h-0">
          {/* 文件上传区域 */}
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-blue-300 transition-colors">
            <UploadIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-600 mb-1">拖拽文件到此处或点击上传</p>
            <p className="text-xs text-slate-400 mb-3">支持 TXT、MD、CSV、HTML、Excel 格式</p>
            <input
              ref={fileInputRef}
              type="file"
              accept={SUPPORTED_FILE_TYPES.join(',')}
              onChange={handleFileSelect}
              className="hidden"
              id="credential-file-upload"
            />
            <label
              htmlFor="credential-file-upload"
              className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg cursor-pointer transition-colors"
            >
              选择文件
            </label>
            {fileName && (
              <p className="mt-2 text-sm text-blue-600 font-medium">{fileName}</p>
            )}
          </div>

          {/* 文本输入区域 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              或直接粘贴文本内容
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="粘贴包含账号信息的文本...&#10;&#10;例如：&#10;GitHub: username: john@example.com, password: xxx&#10;淘宝账号：手机号 138xxxx，密码 xxx"
              className="w-full h-36 md:h-48 bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none font-mono"
            />
          </div>

          {/* 提示信息 */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-700 font-medium mb-1">AI 将尝试识别以下信息：</p>
            <ul className="text-xs text-amber-600 space-y-0.5">
              <li>• 服务/网站名称、用户名/账号、密码</li>
              <li>• 网站地址、分类标签、备注信息</li>
              <li>• 支持多种格式：纯文本、表格、列表等</li>
            </ul>
          </div>

          {error && (
            <p className="text-rose-500 text-sm bg-rose-50 border border-rose-200 rounded-lg p-3">{error}</p>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:space-x-3 bg-slate-50/50 flex-shrink-0">
          <button
            onClick={handleClose}
            className="px-4 py-2.5 text-sm text-slate-500 hover:text-slate-700 cursor-pointer min-h-[44px]"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !text.trim()}
            className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 disabled:from-slate-300 disabled:to-slate-300 text-white text-sm font-medium rounded-lg cursor-pointer transition-all disabled:cursor-not-allowed min-h-[44px]"
          >
            {loading ? (
              <>
                <SpinnerIcon className="w-4 h-4 animate-spin" />
                <span>解析中...</span>
              </>
            ) : (
              <>
                <BrainIcon className="w-4 h-4" />
                <span>AI 解析</span>
              </>
            )}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
};
