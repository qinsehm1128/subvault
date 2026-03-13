import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
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

// Shield icon for security tab
const ShieldIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

export const SettingsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'tags' | 'notifications' | 'security'>('tags');
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [notifyDays, setNotifyDays] = useState('1,3,7');
  const [upcoming, setUpcoming] = useState<UpcomingRenewal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 2FA state
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpVerified, setTotpVerified] = useState(false);
  const [totpUri, setTotpUri] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [totpMessage, setTotpMessage] = useState('');
  const [totpError, setTotpError] = useState('');
  const [totpLoading, setTotpLoading] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

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

  const loadTotpStatus = async () => {
    try {
      const status = await api.getTotpStatus();
      setTotpEnabled(status.enabled);
      setTotpVerified(status.verified);
    } catch (err) {
      console.error('加载2FA状态失败:', err);
    }
  };

  useEffect(() => {
    if (activeSection === 'security') {
      loadTotpStatus();
    }
  }, [activeSection]);

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

  const handleSetupTotp = async () => {
    setTotpLoading(true);
    setTotpError('');
    setTotpMessage('');
    try {
      const data = await api.setupTotp();
      setTotpUri(data.uri);
      setTotpSecret(data.secret);
      setTotpEnabled(true);
      setTotpVerified(false);
    } catch (err: any) {
      setTotpError(err.message || '设置失败');
    } finally {
      setTotpLoading(false);
    }
  };

  const handleVerifyTotp = async () => {
    if (totpCode.length !== 6) return;
    setTotpLoading(true);
    setTotpError('');
    setTotpMessage('');
    try {
      await api.verifyTotp(totpCode);
      setTotpVerified(true);
      setTotpCode('');
      setTotpUri('');
      setTotpSecret('');
      setTotpMessage('两步验证已成功启用');
    } catch (err: any) {
      setTotpError(err.message || '验证失败');
    } finally {
      setTotpLoading(false);
    }
  };

  const handleDisableTotp = async () => {
    if (!confirm('确定禁用两步验证？禁用后登录将不再需要验证码。')) return;
    setTotpLoading(true);
    setTotpError('');
    setTotpMessage('');
    try {
      await api.disableTotp();
      setTotpEnabled(false);
      setTotpVerified(false);
      setTotpUri('');
      setTotpSecret('');
      setTotpMessage('两步验证已禁用');
    } catch (err: any) {
      setTotpError(err.message || '禁用失败');
    } finally {
      setTotpLoading(false);
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
      <div className="mx-auto space-y-6">
        {/* 头部 */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900">设置</h2>
          <p className="text-slate-400 text-sm mt-1">管理标签、通知提醒和安全设置</p>
        </div>

        {/* 切换标签 */}
        <div className="flex space-x-1 bg-white rounded-lg p-1 border border-slate-200/60 w-fit">
          {[
            { key: 'tags', label: '标签管理' },
            { key: 'notifications', label: '到期提醒' },
            { key: 'security', label: '安全设置' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key as 'tags' | 'notifications' | 'security')}
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

        {/* 安全设置 */}
        {activeSection === 'security' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200/60 p-5">
              <div className="flex items-center space-x-2 mb-4">
                <ShieldIcon className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-semibold text-slate-700">两步验证 (TOTP)</h3>
              </div>

              {/* 状态消息 */}
              {totpMessage && (
                <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl">
                  {totpMessage}
                </div>
              )}
              {totpError && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl">
                  {totpError}
                </div>
              )}

              {/* 当前状态 */}
              <div className="mb-4 flex items-center space-x-3">
                <div className={`w-2.5 h-2.5 rounded-full ${
                  totpEnabled && totpVerified ? 'bg-emerald-500' : 'bg-slate-300'
                }`} />
                <span className="text-sm text-slate-600">
                  {totpEnabled && totpVerified
                    ? '两步验证已启用'
                    : totpEnabled && !totpVerified
                    ? '等待验证 — 请用身份验证器扫码并输入验证码'
                    : '两步验证未启用'}
                </span>
              </div>

              {/* 未启用 — 显示启用按钮 */}
              {!totpEnabled && (
                <div>
                  <p className="text-sm text-slate-500 mb-4">
                    启用两步验证后，每次登录除了输入主密钥外，还需要输入身份验证器中的动态验证码，大幅提升账户安全性。
                  </p>
                  <button
                    onClick={handleSetupTotp}
                    disabled={totpLoading}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg cursor-pointer transition-colors"
                  >
                    {totpLoading ? '设置中...' : '启用两步验证'}
                  </button>
                </div>
              )}

              {/* 已启用但未验证 — 显示 QR + 验证输入 */}
              {totpEnabled && !totpVerified && totpUri && (
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-xl p-6">
                    <p className="text-sm text-slate-600 mb-4 font-medium">
                      1. 使用身份验证器应用扫描二维码
                    </p>
                    <div className="flex justify-center mb-4">
                      <div className="bg-white p-4 rounded-xl shadow-sm">
                        <QRCodeSVG value={totpUri} size={200} />
                      </div>
                    </div>

                    <p className="text-sm text-slate-600 mb-2 font-medium">
                      无法扫码？手动输入密钥：
                    </p>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-700 select-all">
                        {showSecret ? totpSecret : '••••••••••••••••'}
                      </code>
                      <button
                        onClick={() => setShowSecret(!showSecret)}
                        className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg cursor-pointer transition-colors"
                      >
                        {showSecret ? '隐藏' : '显示'}
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(totpSecret).catch(() => {});
                        }}
                        className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg cursor-pointer transition-colors"
                      >
                        复制
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-6">
                    <p className="text-sm text-slate-600 mb-3 font-medium">
                      2. 输入身份验证器中显示的6位验证码
                    </p>
                    <div className="flex items-center space-x-3">
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={totpCode}
                        onChange={e => {
                          setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                          setTotpError('');
                        }}
                        placeholder="000000"
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-3 text-center text-xl font-mono tracking-[0.3em] outline-none focus:border-blue-400"
                        maxLength={6}
                      />
                      <button
                        onClick={handleVerifyTotp}
                        disabled={totpLoading || totpCode.length !== 6}
                        className="px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg cursor-pointer transition-colors whitespace-nowrap"
                      >
                        {totpLoading ? '验证中...' : '确认绑定'}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleDisableTotp}
                    disabled={totpLoading}
                    className="text-sm text-slate-400 hover:text-rose-500 cursor-pointer transition-colors"
                  >
                    取消设置
                  </button>
                </div>
              )}

              {/* 已启用且已验证 — 显示禁用按钮 */}
              {totpEnabled && totpVerified && (
                <div>
                  <p className="text-sm text-slate-500 mb-4">
                    两步验证已启用。每次登录时除了主密钥，还需要输入身份验证器中的验证码。
                  </p>
                  <button
                    onClick={handleDisableTotp}
                    disabled={totpLoading}
                    className="px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-sm font-medium rounded-lg cursor-pointer transition-colors border border-rose-200"
                  >
                    {totpLoading ? '处理中...' : '禁用两步验证'}
                  </button>
                </div>
              )}
            </div>

            {/* 安全说明 */}
            <div className="bg-white rounded-xl border border-slate-200/60 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">安全说明</h3>
              <ul className="space-y-2 text-sm text-slate-500">
                <li className="flex items-start space-x-2">
                  <span className="text-blue-500 mt-0.5">&#8226;</span>
                  <span>推荐使用 Google Authenticator、Microsoft Authenticator 或 Authy 等应用</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-500 mt-0.5">&#8226;</span>
                  <span>密钥已加密存储，请妥善保管身份验证器应用的备份</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-500 mt-0.5">&#8226;</span>
                  <span>如需禁用两步验证，请在此页面操作；丢失验证器将无法登录</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-amber-500 mt-0.5">&#8226;</span>
                  <span>安全兜底：设置过程中未完成验证的两步验证不会阻止登录</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
