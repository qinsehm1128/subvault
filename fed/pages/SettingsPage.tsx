import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { TrashIcon, PlusIcon, BellIcon } from '../components/Icons';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface UpcomingRenewal {
  id: string;
  name: string;
  cost: number;
  currency: string;
  renewalDate: string;
  daysLeft: number;
}

const TAG_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

export const SettingsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'tags' | 'notifications'>('tags');
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [notifyDays, setNotifyDays] = useState('1,3,7');
  const [upcoming, setUpcoming] = useState<UpcomingRenewal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tagsData, notifySettings, upcomingData] = await Promise.all([
        api.getTags(),
        api.getNotificationSettings(),
        api.getUpcomingRenewals(),
      ]);
      setTags(tagsData);
      setNotifyEnabled(notifySettings.enabled);
      setNotifyDays(notifySettings.daysBeforeList);
      setUpcoming(upcomingData);
    } catch (err) {
      console.error('加载设置失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const tag = await api.createTag({ name: newTagName, color: newTagColor });
      setTags(prev => [...prev, tag]);
      setNewTagName('');
      setNewTagColor(TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]);
    } catch (err) {
      console.error('创建标签失败:', err);
    }
  };

  const handleDeleteTag = async (id: string) => {
    if (!confirm('确定删除此标签？')) return;
    try {
      await api.deleteTag(id);
      setTags(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('删除标签失败:', err);
    }
  };

  const handleSaveNotifySettings = async () => {
    try {
      await api.saveNotificationSettings({
        enabled: notifyEnabled,
        daysBeforeList: notifyDays,
      });
      alert('设置已保存');
    } catch (err) {
      console.error('保存设置失败:', err);
    }
  };

  const getDaysLeftColor = (days: number) => {
    if (days <= 1) return 'text-rose-600 bg-rose-50';
    if (days <= 3) return 'text-amber-600 bg-amber-50';
    if (days <= 7) return 'text-blue-600 bg-blue-50';
    return 'text-slate-600 bg-slate-50';
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 px-8 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* 头部 */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900">设置</h2>
          <p className="text-slate-400 text-sm mt-1">管理标签和通知提醒</p>
        </div>

        {/* 切换标签 */}
        <div className="flex space-x-1 bg-white rounded-lg p-1 border border-slate-200/60 w-fit">
          {[
            { key: 'tags', label: '标签管理' },
            { key: 'notifications', label: '到期提醒' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key as 'tags' | 'notifications')}
              className={`px-4 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors ${
                activeSection === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 标签管理 */}
        {activeSection === 'tags' && (
          <div className="space-y-4">
            {/* 创建标签 */}
            <div className="bg-white rounded-xl border border-slate-200/60 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">创建新标签</h3>
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  placeholder="标签名称"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  onKeyPress={e => e.key === 'Enter' && handleCreateTag()}
                />
                <div className="flex items-center space-x-1">
                  {TAG_COLORS.slice(0, 6).map(color => (
                    <button
                      key={color}
                      onClick={() => setNewTagColor(color)}
                      className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${
                        newTagColor === color ? 'ring-2 ring-offset-2 ring-blue-400 scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <button
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg cursor-pointer transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 标签列表 */}
            <div className="bg-white rounded-xl border border-slate-200/60 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">已有标签 ({tags.length})</h3>
              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <div
                      key={tag.id}
                      className="group flex items-center space-x-2 px-3 py-1.5 rounded-full border"
                      style={{ borderColor: tag.color, backgroundColor: `${tag.color}10` }}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                      <span className="text-sm font-medium" style={{ color: tag.color }}>{tag.name}</span>
                      <button
                        onClick={() => handleDeleteTag(tag.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 cursor-pointer transition-all"
                      >
                        <TrashIcon className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm text-center py-4">暂无标签，创建一个吧</p>
              )}
            </div>
          </div>
        )}

        {/* 通知设置 */}
        {activeSection === 'notifications' && (
          <div className="space-y-4">
            {/* 通知开关 */}
            <div className="bg-white rounded-xl border border-slate-200/60 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">提醒设置</h3>
              <div className="space-y-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-slate-600">启用到期提醒</span>
                  <div
                    onClick={() => setNotifyEnabled(!notifyEnabled)}
                    className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${
                      notifyEnabled ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow transition-transform mt-0.5 ${
                        notifyEnabled ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'
                      }`}
                    />
                  </div>
                </label>

                <div>
                  <label className="text-sm text-slate-600 block mb-2">提前提醒天数（逗号分隔）</label>
                  <input
                    type="text"
                    value={notifyDays}
                    onChange={e => setNotifyDays(e.target.value)}
                    placeholder="1,3,7"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  />
                  <p className="text-xs text-slate-400 mt-1">例如：1,3,7 表示提前1天、3天、7天提醒</p>
                </div>

                <button
                  onClick={handleSaveNotifySettings}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg cursor-pointer transition-colors"
                >
                  保存设置
                </button>
              </div>
            </div>

            {/* 即将到期 */}
            <div className="bg-white rounded-xl border border-slate-200/60 p-5">
              <div className="flex items-center space-x-2 mb-4">
                <BellIcon className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-semibold text-slate-700">即将到期的订阅</h3>
              </div>
              {upcoming.length > 0 ? (
                <div className="space-y-2">
                  {upcoming.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">{item.name}</p>
                        <p className="text-xs text-slate-400">{item.renewalDate}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-slate-600">
                          {item.currency === 'CNY' ? '¥' : item.currency === 'USD' ? '$' : item.currency}
                          {item.cost}
                        </span>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${getDaysLeftColor(item.daysLeft)}`}>
                          {item.daysLeft === 0 ? '今天' : `${item.daysLeft}天后`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm text-center py-4">近期没有即将到期的订阅</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
