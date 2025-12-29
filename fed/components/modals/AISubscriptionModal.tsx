import React, { useState, useRef } from 'react';
import { api } from '../../services/api';
import { BrainIcon, UploadIcon } from '../Icons';

interface ParsedSubscription {
  name: string;
  cost: number;
  currency: string;
  frequencyAmount: number;
  frequencyUnit: string;
  website: string;
  category: string;
}

interface ParseResult {
  subscriptions: ParsedSubscription[];
  count: number;
  newTags?: { id: string; name: string; color: string }[];
}

interface AISubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onParsed: (data: ParsedSubscription) => void;
  onBatchParsed?: (data: ParsedSubscription[]) => void;
}

export const AISubscriptionModal: React.FC<AISubscriptionModalProps> = ({
  isOpen,
  onClose,
  onParsed,
  onBatchParsed
}) => {
  const [text, setText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsedResults, setParsedResults] = useState<ParsedSubscription[] | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('请上传图片文件');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('图片大小不能超过 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImagePreview(result);
      setImageData(result);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const result = event.target?.result as string;
            setImagePreview(result);
            setImageData(result);
            setError('');
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  };

  const handleSubmit = async () => {
    if (!text.trim() && !imageData) {
      setError('请输入文本描述或上传截图');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result: ParseResult = await api.parseSubscription({
        text: text.trim() || undefined,
        imageData: imageData || undefined,
      });
      
      if (result.subscriptions && result.subscriptions.length > 0) {
        if (result.subscriptions.length === 1) {
          // 单个订阅直接返回
          onParsed(result.subscriptions[0]);
          handleClose();
        } else {
          // 多个订阅显示选择界面
          setParsedResults(result.subscriptions);
          setSelectedIndices(new Set(result.subscriptions.map((_, i) => i)));
        }
      } else {
        setError('未能识别出订阅信息');
      }
    } catch (err: any) {
      setError(err.message || 'AI 解析失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSelection = () => {
    if (!parsedResults) return;
    
    const selected = parsedResults.filter((_, i) => selectedIndices.has(i));
    if (selected.length === 0) {
      setError('请至少选择一个订阅');
      return;
    }

    if (selected.length === 1) {
      onParsed(selected[0]);
    } else if (onBatchParsed) {
      onBatchParsed(selected);
    } else {
      // 如果没有批量处理函数，逐个添加
      selected.forEach(sub => onParsed(sub));
    }
    handleClose();
  };

  const toggleSelection = (index: number) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedIndices(newSet);
  };

  const handleClose = () => {
    setText('');
    setImagePreview(null);
    setImageData(null);
    setError('');
    setParsedResults(null);
    setSelectedIndices(new Set());
    onClose();
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFrequency = (amount: number, unit: string) => {
    const unitMap: Record<string, string> = {
      'DAYS': '天',
      'WEEKS': '周',
      'MONTHS': '月',
      'YEARS': '年',
      'PERMANENT': '永久',
    };
    if (unit === 'PERMANENT') return '永久';
    return `${amount}${unitMap[unit] || unit}`;
  };

  if (!isOpen) return null;

  // 显示选择界面
  if (parsedResults && parsedResults.length > 1) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/10 backdrop-blur-md p-4 animate-fade-in">
        <div className="bg-white shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden border border-slate-100">
          {/* 头部 */}
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-violet-50 to-blue-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-blue-500 rounded-xl flex items-center justify-center">
                <BrainIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">识别到 {parsedResults.length} 个订阅</h3>
                <p className="text-xs text-slate-400">选择要添加的订阅</p>
              </div>
            </div>
            <button 
              onClick={handleClose} 
              className="text-slate-300 hover:text-slate-500 text-2xl cursor-pointer transition-colors"
            >
              &times;
            </button>
          </div>

          {/* 订阅列表 */}
          <div className="p-4 max-h-80 overflow-y-auto space-y-2">
            {parsedResults.map((sub, index) => (
              <div
                key={index}
                onClick={() => toggleSelection(index)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedIndices.has(index)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedIndices.has(index)
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-slate-300'
                    }`}>
                      {selectedIndices.has(index) && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{sub.name}</p>
                      <p className="text-xs text-slate-400">{sub.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-800">
                      {sub.currency === 'CNY' ? '¥' : sub.currency === 'USD' ? '$' : sub.currency}
                      {sub.cost}
                    </p>
                    <p className="text-xs text-slate-400">/{formatFrequency(sub.frequencyAmount, sub.frequencyUnit)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mx-4 mb-4 p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-sm">
              {error}
            </div>
          )}

          {/* 底部 */}
          <div className="p-6 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
            <button
              onClick={() => setParsedResults(null)}
              className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              ← 重新识别
            </button>
            <div className="flex space-x-3">
              <button 
                onClick={handleClose} 
                className="px-5 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 cursor-pointer transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleConfirmSelection}
                disabled={selectedIndices.size === 0}
                className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 disabled:from-slate-300 disabled:to-slate-300 text-white font-medium rounded-xl shadow-sm cursor-pointer transition-all"
              >
                添加 {selectedIndices.size} 个订阅
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/10 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-white shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden border border-slate-100">
        {/* 头部 */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-violet-50 to-blue-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-blue-500 rounded-xl flex items-center justify-center">
              <BrainIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">AI 智能识别</h3>
              <p className="text-xs text-slate-400">输入描述或上传截图，自动提取订阅信息</p>
            </div>
          </div>
          <button 
            onClick={handleClose} 
            className="text-slate-300 hover:text-slate-500 text-2xl cursor-pointer transition-colors"
          >
            &times;
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-4">
          {/* 文本输入 */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              文本描述
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onPaste={handlePaste}
              placeholder="例如：Netflix 每月 15.99 美元&#10;或粘贴订阅确认邮件内容..."
              className="w-full h-28 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none transition-all"
            />
          </div>

          {/* 分隔线 */}
          <div className="flex items-center space-x-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">或</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* 图片上传 */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              上传截图
            </label>
            
            {imagePreview ? (
              <div className="relative">
                <img 
                  src={imagePreview} 
                  alt="预览" 
                  className="w-full max-h-48 object-contain rounded-xl border border-slate-200"
                />
                <button
                  onClick={clearImage}
                  className="absolute top-2 right-2 w-6 h-6 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center text-sm cursor-pointer transition-colors"
                >
                  ×
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onPaste={handlePaste}
                className="border-2 border-dashed border-slate-200 hover:border-blue-300 rounded-xl p-8 text-center cursor-pointer transition-colors group"
              >
                <UploadIcon className="w-8 h-8 text-slate-300 group-hover:text-blue-400 mx-auto mb-2 transition-colors" />
                <p className="text-sm text-slate-400 group-hover:text-slate-500">
                  点击上传或 <span className="text-blue-500">Ctrl+V</span> 粘贴截图
                </p>
                <p className="text-xs text-slate-300 mt-1">支持 PNG、JPG、WebP 格式</p>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-sm">
              {error}
            </div>
          )}

          {/* 提示 */}
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <p className="text-xs text-blue-600">
              💡 支持批量识别多个订阅，可输入多行描述或上传包含多个订阅的截图
            </p>
          </div>
        </div>

        {/* 底部 */}
        <div className="p-6 border-t border-slate-100 flex justify-end space-x-3 bg-slate-50/50">
          <button 
            onClick={handleClose} 
            className="px-5 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 cursor-pointer transition-colors"
          >
            取消
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isLoading || (!text.trim() && !imageData)}
            className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 disabled:from-slate-300 disabled:to-slate-300 text-white font-medium rounded-xl shadow-sm cursor-pointer transition-all flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>识别中...</span>
              </>
            ) : (
              <>
                <BrainIcon className="w-4 h-4" />
                <span>开始识别</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
