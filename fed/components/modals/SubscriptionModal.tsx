import React, { useState, useEffect } from 'react';
import { Subscription, Credential, FrequencyUnit } from '../../types';
import { calculateNextRenewal } from '../../utils/subscription';
import { api } from '../../services/api';
import { ModalOverlay } from './ModalOverlay';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (subscription: Partial<Subscription>) => void;
  credentials: Credential[];
  editingSubscription?: Subscription | null; // 编辑模式时传入
  initialData?: Partial<Subscription> | null; // AI 解析的预填数据
}

const defaultSub: Partial<Subscription> = {
  frequencyAmount: 1,
  frequencyUnit: 'MONTHS',
  currency: 'CNY',
  startDate: new Date().toISOString().split('T')[0],
  category: '',
  autoRotate: false,
};

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  credentials,
  editingSubscription,
  initialData
}) => {
  const [formData, setFormData] = useState<Partial<Subscription>>(defaultSub);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const isEditMode = !!editingSubscription;

  // 加载标签列表
  useEffect(() => {
    if (isOpen) {
      loadTags();
    }
  }, [isOpen]);

  const loadTags = async () => {
    setIsLoadingTags(true);
    try {
      const data = await api.getTags();
      setTags(data);
    } catch (err) {
      console.error('加载标签失败:', err);
    } finally {
      setIsLoadingTags(false);
    }
  };

  // 当编辑的订阅变化时，更新表单数据
  useEffect(() => {
    if (editingSubscription) {
      setFormData({
        ...editingSubscription,
      });
    } else if (initialData) {
      // AI 解析的预填数据
      setFormData({
        ...defaultSub,
        ...initialData,
        startDate: new Date().toISOString().split('T')[0],
      });
    } else {
      setFormData({
        ...defaultSub,
        startDate: new Date().toISOString().split('T')[0],
      });
    }
  }, [editingSubscription, initialData, isOpen]);

  const handleSubmit = () => {
    onSave(formData);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      ...defaultSub,
      startDate: new Date().toISOString().split('T')[0],
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay className="animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="sub-modal-title">
      <div className="modal-sheet max-w-[440px] md:animate-slide-up">
        <div className="p-5 md:p-7 border-b border-slate-50 flex justify-between items-center flex-shrink-0">
          <h3 id="sub-modal-title" className="text-lg font-bold text-slate-800 tracking-tight">
            {isEditMode ? '编辑订阅' : '添加订阅服务'}
          </h3>
          <button onClick={handleClose} className="text-slate-300 hover:text-slate-500 text-2xl cursor-pointer transition-colors duration-200" aria-label="关闭弹窗">&times;</button>
        </div>
        <div className="p-5 md:p-7 space-y-5 overflow-y-auto page-scroll flex-1 min-h-0">
          <div className="space-y-1.5">
            <label htmlFor="sub-name" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">服务名称</label>
            <input 
              id="sub-name" 
              type="text" 
              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-colors duration-200 font-medium text-sm" 
              placeholder="例如：Netflix, iCloud..." 
              value={formData.name || ''} 
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="sub-cost" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">扣费金额</label>
              <input 
                id="sub-cost" 
                type="number" 
                step="0.01" 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-colors duration-200 font-bold text-sm" 
                placeholder="0.00"
                value={formData.cost || ''} 
                onChange={e => setFormData({...formData, cost: parseFloat(e.target.value)})}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="sub-currency" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">结算币种</label>
              <select 
                id="sub-currency" 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-colors duration-200 font-bold text-sm appearance-none cursor-pointer"
                value={formData.currency || 'CNY'} 
                onChange={e => setFormData({...formData, currency: e.target.value})}
              >
                <option value="CNY">CNY (¥)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="HKD">HKD (HK$)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="sub-category" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">分类标签</label>
            {isLoadingTags ? (
              <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-slate-400 text-sm">
                加载中...
              </div>
            ) : tags.length > 0 ? (
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                {tags.map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => setFormData({...formData, category: tag.name})}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all duration-200 ${
                      formData.category === tag.name
                        ? 'ring-2 ring-offset-1 scale-105'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: `${tag.color}20`,
                      color: tag.color,
                      borderColor: tag.color,
                      ...(formData.category === tag.name ? { ringColor: tag.color } : {})
                    }}
                  >
                    <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: tag.color }} />
                    {tag.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="w-full bg-amber-50 border border-amber-100 rounded-xl p-3.5 text-amber-600 text-xs">
                暂无标签，请先在「设置 → 标签管理」中创建分类标签
              </div>
            )}
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl space-y-4 border border-slate-100">
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label htmlFor="sub-frequency" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">周期设置</label>
                <div className="flex items-center space-x-2">
                  {formData.frequencyUnit !== 'PERMANENT' && (
                    <input 
                      id="sub-frequency-amount" 
                      type="number" 
                      min="1" 
                      className="w-12 bg-white border border-slate-200 rounded-lg p-2.5 text-center text-slate-800 font-bold outline-none text-xs" 
                      aria-label="周期数量"
                      value={formData.frequencyAmount || 1} 
                      onChange={e => setFormData({...formData, frequencyAmount: parseInt(e.target.value) || 1})}
                    />
                  )}
                  <select 
                    id="sub-frequency" 
                    className="flex-1 bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 font-bold outline-none text-xs appearance-none cursor-pointer text-center"
                    value={formData.frequencyUnit || 'MONTHS'} 
                    onChange={e => setFormData({...formData, frequencyUnit: e.target.value as FrequencyUnit})}
                  >
                    <option value="DAYS">天</option>
                    <option value="WEEKS">周</option>
                    <option value="MONTHS">月</option>
                    <option value="YEARS">年</option>
                    <option value="PERMANENT">买断</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="sub-start-date" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">起算日期</label>
                <input 
                  id="sub-start-date" 
                  type="date" 
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 font-bold outline-none text-sm md:text-[11px]"
                  value={formData.startDate || ''} 
                  onChange={e => setFormData({...formData, startDate: e.target.value})}
                />
              </div>
            </div>
            {formData.frequencyUnit !== 'PERMANENT' && (
              <div className="text-[11px] text-slate-400 flex items-center justify-between font-bold px-1">
                <span>预计结算日</span>
                <span className="text-brand-600 tabular font-mono">
                  {calculateNextRenewal(formData.startDate || '', formData.frequencyAmount || 1, formData.frequencyUnit || 'MONTHS')}
                </span>
              </div>
            )}
          </div>

          {formData.frequencyUnit !== 'PERMANENT' && (
            <label
              className="flex items-start justify-between gap-4 cursor-pointer rounded-2xl border border-slate-100 bg-slate-50 p-4"
              onClick={(e) => {
                e.preventDefault();
                setFormData({ ...formData, autoRotate: !formData.autoRotate });
              }}
            >
              <div>
                <p className="text-sm font-medium text-slate-700">到期自动轮转</p>
                <p className="text-xs text-slate-400 mt-1">到期后自动进入下一周期，不再显示为过期</p>
              </div>
              <div
                className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                  formData.autoRotate ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transition-transform mt-0.5 ${
                    formData.autoRotate ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </label>
          )}

          <div className="space-y-1.5">
            <label htmlFor="sub-credential" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">关联凭证 (可选)</label>
            <select 
              id="sub-credential" 
              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-colors duration-200 font-bold text-[12px] appearance-none cursor-pointer"
              value={formData.credentialId || ''} 
              onChange={e => setFormData({...formData, credentialId: e.target.value || undefined})}
            >
              <option value="">点击选择保险库凭证</option>
              {credentials.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="sub-website" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">网站地址 (可选)</label>
            <input 
              id="sub-website" 
              type="url" 
              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-colors duration-200 font-medium text-sm" 
              placeholder="https://..." 
              value={formData.website || ''} 
              onChange={e => setFormData({...formData, website: e.target.value})}
            />
          </div>
        </div>
        <div className="p-5 md:p-7 border-t border-slate-50 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:space-x-3 bg-slate-50/20 flex-shrink-0">
          <button onClick={handleClose} className="px-5 py-2.5 text-[12px] font-bold text-slate-400 hover:text-slate-600 transition-colors duration-200 uppercase tracking-widest cursor-pointer min-h-[44px]">取消</button>
          <button onClick={handleSubmit} className="px-8 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-sm active:scale-95 text-[12px] uppercase tracking-widest cursor-pointer transition-colors duration-200 min-h-[44px]">
            {isEditMode ? '保存修改' : '保存记录'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
};
