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
  tagCreated?: boolean;
  newTag?: { id: string; name: string; color: string };
}

interface AISubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onParsed: (data: ParsedSubscription) => void;
}

export const AISubscriptionModal: React.FC<AISubscriptionModalProps> = ({
  isOpen,
  onClose,
  onParsed
}) => {
  const [text, setText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
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
      const result = await api.parseSubscription({
        text: text.trim() || undefined,
        imageData: imageData || undefined,
      });
      onParsed(result);
      handleClose();
    } catch (err: any) {
      setError(err.message || 'AI 解析失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setText('');
    setImagePreview(null);
    setImageData(null);
    setError('');
    onClose();
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

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
              💡 支持识别：订阅确认邮件、付款截图、App Store/Google Play 订阅页面等
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
