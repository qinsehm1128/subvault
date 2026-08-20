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
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookPlatform, setWebhookPlatform] = useState('auto');
  const [webhookDays, setWebhookDays] = useState('1,2,3');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [calendarToken, setCalendarToken] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [webhookMessage, setWebhookMessage] = useState('');
  const [webhookOk, setWebhookOk] = useState(true);
  const [webhookBusy, setWebhookBusy] = useState(false);
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

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [tagsData, notifySettings, upcomingData] = await Promise.all([
        api.getTags(),
        api.getNotificationSettings(),
        api.getUpcomingRenewals(),
      ]);
      setTags(tagsData);
      setWebhookEnabled(!!notifySettings.webhookEnabled);
      setWebhookUrl(notifySettings.webhookUrl || '');
      setWebhookPlatform(notifySettings.webhookPlatform || 'auto');
      setWebhookDays(notifySettings.webhookDaysBefore || '1,2,3');
      setWebhookSecret(notifySettings.webhookSecret || '');
      setCalendarToken(notifySettings.calendarToken || '');
      setUpcoming(upcomingData);
    } catch (err) {
      console.error('加载设置失败:', err);
    } finally {
      if (!silent) setIsLoading(false);
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
    if (tags.find(t => t.id === id)?.name === '默认') return;
    if (!confirm('确定删除此分组？该分组下的内容不会删除。')) return;
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
        enabled: webhookEnabled,
        daysBeforeList: webhookDays,
        webhookEnabled,
        webhookUrl,
        webhookPlatform,
        webhookDaysBefore: webhookDays,
        webhookSecret,
      });
      await loadData(true);
      setWebhookOk(true);
      setWebhookMessage('设置已保存');
    } catch (err: any) {
      setWebhookOk(false);
      setWebhookMessage(err.message || '保存设置失败');
    }
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl.trim()) {
      setWebhookOk(false);
      setWebhookMessage('请先填写 Webhook 地址');
      return;
    }
    setWebhookBusy(true);
    setWebhookMessage('');
    try {
      const result = await api.testWebhook({ webhookUrl, webhookPlatform, webhookSecret });
      setWebhookOk(true);
      setWebhookMessage(result.message || '测试消息已发送，请查看群聊');
    } catch (err: any) {
      setWebhookOk(false);
      setWebhookMessage(err.message || '测试发送失败');
    } finally {
      setWebhookBusy(false);
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
      const result = await api.verifyTotp(totpCode);
      setTotpVerified(true);
      setTotpCode('');
      setTotpUri('');
      setTotpSecret('');
      setRecoveryCodes(result.recoveryCodes || []);
      setTotpMessage(result.recoveryCodes?.length ? '两步验证已启用，请立刻保存恢复码' : '两步验证已成功启用');
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
      setRecoveryCodes([]);
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
    <div className="flex-1 overflow-y-auto page-scroll bg-slate-50 px-4 py-5 md:px-8 md:py-8">
      <div className="mx-auto space-y-5 md:space-y-6">
        {/* 头部 */}
        <div className="hidden md:block">
          <h2 className="text-2xl font-bold text-slate-900">设置</h2>
          <p className="text-slate-400 text-sm mt-1">管理分组、通知提醒和安全设置</p>
        </div>

        {/* 切换标签 */}
        <div className="flex space-x-1 bg-white rounded-lg p-1 border border-slate-200/60 w-full md:w-fit overflow-x-auto">
          {[
            { key: 'tags', label: '分组管理' },
            { key: 'notifications', label: '到期提醒' },
            { key: 'security', label: '安全设置' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key as 'tags' | 'notifications' | 'security')}
              className={`flex-1 md:flex-none px-3 md:px-4 py-2.5 text-sm font-medium rounded-md cursor-pointer transition-colors whitespace-nowrap min-h-[40px] ${
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
              <h3 className="text-sm font-semibold text-slate-700 mb-1">创建分组</h3>
              <p className="text-xs text-slate-400 mb-4">订阅、账号、密钥和备忘录共用同一套分组。不选择时归入「默认」，默认分组不能删除。</p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <input
                  type="text"
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  placeholder="分组名称，如工作、密钥"
                  className="w-full sm:flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400 min-h-[44px]"
                  onKeyPress={e => e.key === 'Enter' && handleCreateTag()}
                />
                <div className="flex items-center justify-between sm:justify-start gap-3">
                  <div className="flex items-center space-x-1">
                    {TAG_COLORS.slice(0, 6).map(color => (
                      <button
                        key={color}
                        onClick={() => setNewTagColor(color)}
                        className={`w-7 h-7 rounded-full cursor-pointer transition-transform ${
                          newTagColor === color ? 'ring-2 ring-offset-2 ring-blue-400 scale-110' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={handleCreateTag}
                    disabled={!newTagName.trim()}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg cursor-pointer transition-colors min-h-[44px] min-w-[44px]"
                  >
                    <PlusIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* 标签列表 */}
            <div className="bg-white rounded-xl border border-slate-200/60 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">已有分组 ({tags.length})</h3>
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
                      {tag.name !== '默认' && (
                      <button
                        onClick={() => handleDeleteTag(tag.id)}
                        className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-slate-400 hover:text-rose-500 cursor-pointer transition-all p-1"
                      >
                        <TrashIcon className="w-3 h-3" />
                      </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm text-center py-4">暂无分组，创建一个吧</p>
              )}
            </div>
          </div>
        )}

        {/* 通知设置 */}
        {activeSection === 'notifications' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200/60 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-1">到期提醒</h3>
              <p className="text-xs text-slate-400 mb-4">到期前按设定天数每天推送一次，支持飞书、企业微信、钉钉机器人</p>
              <div className="space-y-4">
                <label
                  className="flex items-center justify-between cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    setWebhookEnabled(!webhookEnabled);
                  }}
                >
                  <span className="text-sm text-slate-600">启用 Webhook 提醒</span>
                  <div
                    className={`w-11 h-6 rounded-full transition-colors ${
                      webhookEnabled ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow transition-transform mt-0.5 ${
                        webhookEnabled ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'
                      }`}
                    />
                  </div>
                </label>

                <div>
                  <label className="text-sm text-slate-600 block mb-2">平台</label>
                  <select
                    value={webhookPlatform}
                    onChange={e => setWebhookPlatform(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  >
                    <option value="auto">自动识别</option>
                    <option value="feishu">飞书 / Lark</option>
                    <option value="wecom">企业微信</option>
                    <option value="dingtalk">钉钉</option>
                    <option value="generic">通用 JSON</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm text-slate-600 block mb-2">Webhook 地址</label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={e => setWebhookUrl(e.target.value)}
                    placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-600 block mb-2">提前提醒天数</label>
                  <input
                    type="text"
                    value={webhookDays}
                    onChange={e => setWebhookDays(e.target.value)}
                    placeholder="1,2,3"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  />
                  <p className="text-xs text-slate-400 mt-1">默认 1,2,3：到期前 3 天每天提醒一次。填写签名密钥后可开启飞书签名校验。</p>
                </div>

                <div>
                  <label className="text-sm text-slate-600 block mb-2">飞书签名密钥（可选）</label>
                  <input
                    value={webhookSecret}
                    onChange={e => setWebhookSecret(e.target.value)}
                    placeholder="自定义机器人签名 secret"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-600 block mb-2">日历订阅</label>
                  <p className="text-xs text-slate-400 mb-2">复制到 Google / Apple 日历，即可看到续费日。</p>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={calendarToken ? `${window.location.origin}/api/v1/calendar/${calendarToken}` : '保存设置后生成'}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!calendarToken) return;
                        await navigator.clipboard.writeText(`${window.location.origin}/api/v1/calendar/${calendarToken}`);
                        setWebhookOk(true);
                        setWebhookMessage('日历链接已复制');
                      }}
                      disabled={!calendarToken}
                      className="px-3 py-2 text-xs border border-slate-200 rounded-lg disabled:opacity-40"
                    >
                      复制
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const data = await api.rotateCalendarToken();
                        setCalendarToken(data.calendarToken);
                        setWebhookOk(true);
                        setWebhookMessage('日历链接已更新，请重新订阅');
                      }}
                      className="px-3 py-2 text-xs border border-slate-200 rounded-lg"
                    >
                      重置
                    </button>
                  </div>
                </div>

                {webhookMessage && (
                  <p className={`text-xs ${webhookOk ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {webhookMessage}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleSaveNotifySettings}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg cursor-pointer transition-colors"
                  >
                    保存设置
                  </button>
                  <button
                    type="button"
                    onClick={handleTestWebhook}
                    disabled={webhookBusy || !webhookUrl.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {webhookBusy ? '发送中...' : '发送测试'}
                  </button>
                </div>
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
                      className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                        <p className="text-xs text-slate-400">{item.renewalDate}</p>
                      </div>
                      <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
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
                        <QRCodeSVG value={totpUri} size={168} className="w-40 h-40 md:w-[200px] md:h-[200px]" />
                      </div>
                    </div>

                    <p className="text-sm text-slate-600 mb-2 font-medium">
                      无法扫码？手动输入密钥：
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <code className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono text-slate-700 select-all break-all">
                        {showSecret ? totpSecret : '••••••••••••••••'}
                      </code>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setShowSecret(!showSecret)}
                          className="flex-1 sm:flex-none px-3 py-2.5 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg cursor-pointer transition-colors min-h-[44px]"
                        >
                          {showSecret ? '隐藏' : '显示'}
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(totpSecret).catch(() => {});
                          }}
                          className="flex-1 sm:flex-none px-3 py-2.5 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg cursor-pointer transition-colors min-h-[44px]"
                        >
                          复制
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-6">
                    <p className="text-sm text-slate-600 mb-3 font-medium">
                      2. 输入身份验证器中显示的6位验证码
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
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
                        className="w-full sm:flex-1 bg-white border border-slate-200 rounded-lg px-4 py-3 text-center text-xl font-mono tracking-[0.3em] outline-none focus:border-blue-400 min-h-[48px]"
                        maxLength={6}
                      />
                      <button
                        onClick={handleVerifyTotp}
                        disabled={totpLoading || totpCode.length !== 6}
                        className="w-full sm:w-auto px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg cursor-pointer transition-colors whitespace-nowrap min-h-[48px]"
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
                    两步验证已启用。每次登录时除了主密钥，还需要输入身份验证器中的验证码，或一次性恢复码。
                  </p>
                  {recoveryCodes.length > 0 && (
                    <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-sm font-medium text-amber-800 mb-2">请立刻保存这些一次性恢复码。关闭页面后将无法再查看，每个码只能用一次。</p>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-sm mb-3">
                        {recoveryCodes.map(code => (
                          <li key={code} className="bg-white px-3 py-2 rounded-lg text-slate-800">{code}</li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(recoveryCodes.join('\n'));
                          setTotpMessage('恢复码已复制，请存到安全的地方');
                        }}
                        className="text-sm text-amber-800 underline"
                      >
                        复制全部恢复码
                      </button>
                    </div>
                  )}
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
                  <span>如需禁用两步验证，请在此页面操作；丢失验证器时可用一次性恢复码登录</span>
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
