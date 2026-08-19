import React, { useState, useEffect, useMemo } from 'react';
import { VaultData, Subscription, Credential } from '../types';
import { Sidebar, TabType } from '../components/Sidebar';
import { SubscriptionCard } from '../components/SubscriptionCard';
import { CredentialRow } from '../components/CredentialRow';
import { SubscriptionModal } from '../components/modals/SubscriptionModal';
import { AddCredentialModal } from '../components/modals/AddCredentialModal';
import { ImportCredentialsModal } from '../components/modals/ImportCredentialsModal';
import { AISubscriptionModal } from '../components/modals/AISubscriptionModal';
import { AICredentialModal } from '../components/modals/AICredentialModal';
import { AICredentialPreviewModal } from '../components/modals/AICredentialPreviewModal';
import { CredentialDetailModal } from '../components/modals/CredentialDetailModal';
import { AIPage } from './AIPage';
import { AnalyticsPage } from './AnalyticsPage';
import { SettingsPage } from './SettingsPage';
import { PlusIcon, CreditCardIcon, KeyIcon, UploadIcon, BrainIcon, GridViewIcon, TableViewIcon } from '../components/Icons';
import { CredentialTable } from '../components/CredentialTable';
import { MemoPage } from './MemoPage';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { api } from '../services/api';
import { passwordIssues } from '../utils/password';

const TAB_TITLES: Record<TabType, string> = {
  subscriptions: '服务订阅',
  credentials: '凭证管理',
  memos: '备忘录',
  analytics: '数据分析',
  ai: '智能助手',
  settings: '标签与通知',
};

interface DashboardPageProps {
  vaultData: VaultData;
  onAddSubscription: (sub: Partial<Subscription>) => void;
  onUpdateSubscription: (id: string, sub: Partial<Subscription>) => void;
  onDeleteSubscription: (id: string) => void;
  onAddCredential: (cred: Partial<Credential>) => void;
  onUpdateCredential?: (id: string, cred: Partial<Credential>) => void;
  onBatchAddCredentials: (creds: Partial<Credential>[]) => void;
  onDeleteCredential: (id: string) => void;
  onRefreshSubscription: (id: string) => void;
  onExport: () => void;
  onImport: () => void;
  onLock: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  vaultData,
  onAddSubscription,
  onUpdateSubscription,
  onDeleteSubscription,
  onAddCredential,
  onUpdateCredential,
  onBatchAddCredentials,
  onDeleteCredential,
  onRefreshSubscription,
  onExport,
  onImport,
  onLock
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('subscriptions');
  const [showSubModal, setShowSubModal] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [showAddCredModal, setShowAddCredModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAISubModal, setShowAISubModal] = useState(false);
  const [aiParsedData, setAiParsedData] = useState<Partial<Subscription> | null>(null);
  const [pendingAISubscriptions, setPendingAISubscriptions] = useState<Partial<Subscription>[]>([]);
  // AI 凭据解析相关状态
  const [showAICredModal, setShowAICredModal] = useState(false);
  const [showAICredPreview, setShowAICredPreview] = useState(false);
  const [aiParsedCredentials, setAIParsedCredentials] = useState<Partial<Credential>[]>([]);
  const [pendingCredential, setPendingCredential] = useState<Partial<Credential> | null>(null);
  // 凭证详情相关状态
  const [showCredentialDetail, setShowCredentialDetail] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null);
  const [editingCredential, setEditingCredential] = useState<Partial<Credential> | null>(null);
  const [credViewMode, setCredViewMode] = useState<'card' | 'table'>('card');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [subQuery, setSubQuery] = useState('');
  const [subStatus, setSubStatus] = useState('all');
  const [subView, setSubView] = useState<'grid' | 'calendar'>('grid');
  const [credQuery, setCredQuery] = useState('');
  const [insights, setInsights] = useState<{ kind: string; title: string; detail: string }[]>([]);

  const filteredSubs = useMemo(() => {
    return vaultData.subscriptions.filter(sub => {
      const status = sub.status || (sub.active === false ? 'paused' : 'active');
      if (subStatus !== 'all' && status !== subStatus) return false;
      const q = subQuery.trim().toLowerCase();
      if (!q) return true;
      return [sub.name, sub.category, sub.website, sub.paymentMethod, sub.cardLast4].some(v => (v || '').toLowerCase().includes(q));
    });
  }, [vaultData.subscriptions, subQuery, subStatus]);

  const filteredCreds = useMemo(() => {
    const q = credQuery.trim().toLowerCase();
    if (!q) return vaultData.credentials;
    return vaultData.credentials.filter(c => [c.label, c.username, c.website, c.category].some(v => (v || '').toLowerCase().includes(q)));
  }, [vaultData.credentials, credQuery]);

  useEffect(() => {
    if (activeTab !== 'subscriptions') return;
    api.getInsights().then(data => setInsights(data.insights || [])).catch(() => setInsights([]));
  }, [activeTab, vaultData.subscriptions.length]);

  const weakPasswords = useMemo(() => {
    return vaultData.credentials.filter(c => passwordIssues(c.password).length > 0).length;
  }, [vaultData.credentials]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setIsMobileNavOpen(false);
    setShowSubModal(false);
    setEditingSubscription(null);
    setAiParsedData(null);
    setPendingAISubscriptions([]);
    setShowAddCredModal(false);
    setEditingCredential(null);
    setShowImportModal(false);
    setShowAISubModal(false);
    setShowAICredModal(false);
    setShowAICredPreview(false);
    setAIParsedCredentials([]);
    setShowCredentialDetail(false);
    setSelectedCredential(null);
  };

  const handleAddSubscription = () => {
    setEditingSubscription(null);
    setShowSubModal(true);
  };

  const handleEditSubscription = (sub: Subscription) => {
    setEditingSubscription(sub);
    setShowSubModal(true);
  };

  const handleSaveSubscription = (data: Partial<Subscription>) => {
    if (editingSubscription) {
      onUpdateSubscription(editingSubscription.id, data);
    } else {
      onAddSubscription(data);
    }
  };

  const handleCloseSubModal = () => {
    setShowSubModal(false);
    setEditingSubscription(null);
    setAiParsedData(null);
    
    // 如果还有待处理的 AI 订阅，继续处理下一个
    if (pendingAISubscriptions.length > 0) {
      const [next, ...rest] = pendingAISubscriptions;
      setPendingAISubscriptions(rest);
      setAiParsedData(next);
      setShowSubModal(true);
    }
  };

  // AI 解析完成后，打开订阅模态框并预填数据
  const handleAIParsed = (data: any) => {
    const parsedSub: Partial<Subscription> = {
      name: data.name || '',
      cost: data.cost || 0,
      currency: data.currency || 'CNY',
      frequencyAmount: data.frequencyAmount || 1,
      frequencyUnit: data.frequencyUnit || 'MONTHS',
      website: data.website || '',
      category: data.category || '',
    };
    setPendingAISubscriptions([]);
    setAiParsedData(parsedSub);
    setEditingSubscription(null);
    setShowSubModal(true);
  };

  // AI 批量解析完成后，依次处理每个订阅
  const handleAIBatchParsed = (dataList: any[]) => {
    if (dataList.length === 0) return;

    const parsedList = dataList.map(data => ({
      name: data.name || '',
      cost: data.cost || 0,
      currency: data.currency || 'CNY',
      frequencyAmount: data.frequencyAmount || 1,
      frequencyUnit: data.frequencyUnit || 'MONTHS',
      website: data.website || '',
      category: data.category || '',
    }));

    // 第一个立即显示，其余放入待处理队列
    const [first, ...rest] = parsedList;
    setPendingAISubscriptions(rest);
    setAiParsedData(first);
    setEditingSubscription(null);
    setShowSubModal(true);
  };

  // AI 解析凭据完成后，显示预览
  const handleAICredentialsParsed = (credentials: Partial<Credential>[]) => {
    if (credentials.length === 0) return;
    setAIParsedCredentials(credentials);
    setShowAICredPreview(true);
  };

  // 确认导入 AI 解析的凭据
  const handleConfirmAICredentials = (credentials: Partial<Credential>[]) => {
    if (credentials.length === 0) return;

    // 批量添加凭据
    onBatchAddCredentials(credentials);
    setAIParsedCredentials([]);
  };

  // 点击凭证查看详情
  const handleCredentialClick = (credential: Credential) => {
    setSelectedCredential(credential);
    setShowCredentialDetail(true);
  };

  // 编辑凭证
  const handleEditCredential = (credential: Credential) => {
    setEditingCredential(credential);
    setShowAddCredModal(true);
  };

  // 保存凭证（新增或更新）
  const handleSaveCredential = (data: Partial<Credential>) => {
    if (editingCredential && editingCredential.id && onUpdateCredential) {
      onUpdateCredential(editingCredential.id as string, data);
    } else {
      onAddCredential(data);
    }
    setEditingCredential(null);
  };

  // 渲染主内容区域
  const renderContent = () => {
    switch (activeTab) {
      case 'ai':
        return <AIPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'settings':
        return <SettingsPage />;
      case 'memos':
        return <MemoPage />;
      default:
        return (
          <main className="flex-1 overflow-y-auto page-scroll px-4 py-5 md:px-8 md:py-8">
            <div className="mx-auto">
              {activeTab === 'subscriptions' && (
                <div className="space-y-5 md:space-y-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-end">
                    <div className="hidden md:block">
                      <h2 className="text-2xl font-bold text-slate-900">订阅总览</h2>
                      <p className="text-slate-400 text-sm mt-1">追踪并优化您的订阅支出</p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button 
                        onClick={() => setShowAISubModal(true)} 
                        className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-white px-3 md:px-4 py-2.5 rounded-xl transition-all duration-200 shadow-sm font-medium text-sm cursor-pointer min-h-[44px]"
                      >
                        <BrainIcon className="w-4 h-4" />
                        <span>AI新增</span>
                      </button>
                      <button 
                        onClick={handleAddSubscription} 
                        className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 md:px-4 py-2.5 rounded-xl transition-colors duration-200 shadow-sm font-medium text-sm cursor-pointer min-h-[44px]"
                      >
                        <PlusIcon className="w-4 h-4" />
                        <span>手动新增</span>
                      </button>
                    </div>
                  </div>

                  {(insights.length > 0 || weakPasswords > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {weakPasswords > 0 && (
                        <div className="text-xs bg-amber-50 text-amber-700 rounded-xl px-3 py-2">有 {weakPasswords} 个凭证密码偏弱，建议在凭证页搜索后更新。</div>
                      )}
                      {insights.slice(0, 4).map((item, idx) => (
                        <div key={idx} className="text-xs bg-blue-50 text-blue-700 rounded-xl px-3 py-2">
                          <span className="font-medium">{item.title}</span>
                          {item.detail ? ` · ${item.detail}` : ''}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row gap-2">
                    <input
                      value={subQuery}
                      onChange={e => setSubQuery(e.target.value)}
                      placeholder="搜索名称、分类、网站、卡号"
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                    />
                    <select value={subStatus} onChange={e => setSubStatus(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm">
                      <option value="all">全部状态</option>
                      <option value="active">生效中</option>
                      <option value="trial">试用</option>
                      <option value="paused">已暂停</option>
                      <option value="canceled">已取消</option>
                    </select>
                    <div className="flex bg-slate-100 rounded-xl p-0.5">
                      <button onClick={() => setSubView('grid')} className={`px-3 py-2 text-xs rounded-lg ${subView === 'grid' ? 'bg-white text-blue-600' : 'text-slate-500'}`}>卡片</button>
                      <button onClick={() => setSubView('calendar')} className={`px-3 py-2 text-xs rounded-lg ${subView === 'calendar' ? 'bg-white text-blue-600' : 'text-slate-500'}`}>日历</button>
                    </div>
                  </div>
                  
                  {subView === 'calendar' ? (
                    <RenewalCalendar subscriptions={filteredSubs} onEdit={handleEditSubscription} />
                  ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSubs.map(sub => (
                      <SubscriptionCard
                        key={sub.id}
                        subscription={sub}
                        linkedCredential={vaultData.credentials.find(c => c.id === sub.credentialId)}
                        onEdit={() => handleEditSubscription(sub)}
                        onDelete={() => onDeleteSubscription(sub.id)}
                        onRefresh={() => onRefreshSubscription(sub.id)}
                        onOpenCredential={() => {
                          const cred = vaultData.credentials.find(c => c.id === sub.credentialId);
                          if (cred) handleCredentialClick(cred);
                        }}
                      />
                    ))}
                    {filteredSubs.length === 0 && vaultData.subscriptions.length > 0 && (
                      <div className="col-span-full py-10 text-center text-sm text-slate-400 bg-white border border-slate-200/60 rounded-2xl">没有匹配的订阅</div>
                    )}
                    {vaultData.subscriptions.length === 0 && (
                      <div className="col-span-full py-16 flex flex-col items-center justify-center bg-white border border-slate-200/60 rounded-2xl">
                        <CreditCardIcon className="w-12 h-12 text-slate-200 mb-4" />
                        <p className="text-slate-400 font-medium text-sm mb-3">暂无订阅记录</p>
                        <button 
                          onClick={handleAddSubscription} 
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium cursor-pointer"
                        >
                          + 添加第一个订阅
                        </button>
                      </div>
                    )}
                  </div>
                  )}
                </div>
              )}

              {activeTab === 'credentials' && (
                <div className="space-y-5 md:space-y-6">
                  <div className="flex flex-col gap-3">
                    <div className="hidden md:flex justify-between items-end">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900">凭证库</h2>
                        <p className="text-slate-400 text-sm mt-1">安全存储您的账号密码</p>
                      </div>
                      <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                        <button
                          onClick={() => setCredViewMode('card')}
                          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                            credViewMode === 'card' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                          }`}
                          title="卡片视图"
                        >
                          <GridViewIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCredViewMode('table')}
                          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                            credViewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                          }`}
                          title="表格视图"
                        >
                          <TableViewIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <input
                      value={credQuery}
                      onChange={e => setCredQuery(e.target.value)}
                      placeholder="搜索凭证名称、账号、网站"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                    />
                    <div className="flex items-center gap-2 overflow-x-auto">
                      <button
                        onClick={() => setShowAICredModal(true)}
                        className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-white px-3 md:px-4 py-2.5 rounded-xl transition-all duration-200 shadow-sm font-medium text-sm cursor-pointer min-h-[44px] whitespace-nowrap"
                      >
                        <BrainIcon className="w-4 h-4" />
                        <span>AI解析</span>
                      </button>
                      <button
                        onClick={() => setShowImportModal(true)}
                        className="flex items-center justify-center space-x-2 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-600 hover:text-blue-600 px-3 py-2.5 rounded-xl transition-colors duration-200 font-medium text-sm cursor-pointer min-h-[44px] whitespace-nowrap"
                      >
                        <UploadIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">导入CSV</span>
                        <span className="sm:hidden">导入</span>
                      </button>
                      <button
                        onClick={() => setShowAddCredModal(true)}
                        className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 md:px-4 py-2.5 rounded-xl transition-colors duration-200 shadow-sm font-medium text-sm cursor-pointer min-h-[44px] whitespace-nowrap"
                      >
                        <PlusIcon className="w-4 h-4" />
                        <span>手动新增</span>
                      </button>
                    </div>
                  </div>
                  {credViewMode === 'table' ? (
                    <>
                      <div className="hidden md:block">
                        {vaultData.credentials.length > 0 ? (
                          <CredentialTable
                            credentials={filteredCreds}
                            onCredentialClick={handleCredentialClick}
                            onEdit={handleEditCredential}
                            onDelete={(id) => onDeleteCredential(id)}
                          />
                        ) : (
                          <div className="py-16 flex flex-col items-center justify-center bg-white border border-slate-200/60 rounded-2xl">
                            <KeyIcon className="w-12 h-12 text-slate-200 mb-4" />
                            <p className="text-slate-400 font-medium text-sm">暂无存储凭证</p>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:hidden">
                        {filteredCreds.map(cred => (
                          <CredentialRow
                            key={cred.id}
                            credential={cred}
                            onClick={() => handleCredentialClick(cred)}
                            onEdit={() => handleEditCredential(cred)}
                            onDelete={() => onDeleteCredential(cred.id)}
                          />
                        ))}
                        {vaultData.credentials.length === 0 && (
                          <div className="col-span-full py-16 flex flex-col items-center justify-center bg-white border border-slate-200/60 rounded-2xl">
                            <KeyIcon className="w-12 h-12 text-slate-200 mb-4" />
                            <p className="text-slate-400 font-medium text-sm">暂无存储凭证</p>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredCreds.map(cred => (
                        <CredentialRow
                          key={cred.id}
                          credential={cred}
                          onClick={() => handleCredentialClick(cred)}
                          onEdit={() => handleEditCredential(cred)}
                          onDelete={() => onDeleteCredential(cred.id)}
                        />
                      ))}
                      {vaultData.credentials.length === 0 && (
                        <div className="col-span-full py-16 flex flex-col items-center justify-center bg-white border border-slate-200/60 rounded-2xl">
                          <KeyIcon className="w-12 h-12 text-slate-200 mb-4" />
                          <p className="text-slate-400 font-medium text-sm">暂无存储凭证</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        );
    }
  };

  return (
    <div className="mobile-app-shell flex h-screen bg-slate-50 font-sans overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        subscriptionCount={vaultData.subscriptions.length}
        credentialCount={vaultData.credentials.length}
        memoCount={vaultData.memos?.length || 0}
        onExport={onExport}
        onImport={onImport}
        onLock={onLock}
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />

      <div className="mobile-content-shell flex min-w-0 flex-1 flex-col">
        <header className="mobile-header flex md:hidden min-h-14 shrink-0 items-center justify-between border-b border-slate-200/60 bg-white px-4">
          <button
            type="button"
            aria-label="打开导航"
            aria-expanded={isMobileNavOpen}
            onClick={() => setIsMobileNavOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-50"
          >
            <span className="flex w-5 flex-col gap-1.5" aria-hidden="true">
              <span className="h-0.5 w-full bg-current" />
              <span className="h-0.5 w-full bg-current" />
              <span className="h-0.5 w-full bg-current" />
            </span>
          </button>
          <span className="font-bold text-slate-900">{TAB_TITLES[activeTab]}</span>
          <span className="h-10 w-10" aria-hidden="true" />
        </header>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {renderContent()}
        </div>
        <MobileBottomNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onOpenMore={() => setIsMobileNavOpen(true)}
        />
      </div>

      <SubscriptionModal
        isOpen={showSubModal}
        onClose={handleCloseSubModal}
        onSave={handleSaveSubscription}
        credentials={vaultData.credentials}
        editingSubscription={editingSubscription}
        initialData={aiParsedData}
      />

      <AddCredentialModal
        isOpen={showAddCredModal}
        onClose={() => {
          setShowAddCredModal(false);
          setEditingCredential(null);
        }}
        onAdd={handleSaveCredential}
        initialData={editingCredential}
      />

      <CredentialDetailModal
        isOpen={showCredentialDetail}
        credential={selectedCredential}
        onClose={() => {
          setShowCredentialDetail(false);
          setSelectedCredential(null);
        }}
        onEdit={handleEditCredential}
        onDelete={onDeleteCredential}
      />

      <ImportCredentialsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={onBatchAddCredentials}
      />

      <AISubscriptionModal
        isOpen={showAISubModal}
        onClose={() => setShowAISubModal(false)}
        onParsed={handleAIParsed}
        onBatchParsed={handleAIBatchParsed}
      />

      <AICredentialModal
        isOpen={showAICredModal}
        onClose={() => setShowAICredModal(false)}
        onParsed={handleAICredentialsParsed}
      />

      <AICredentialPreviewModal
        isOpen={showAICredPreview}
        onClose={() => {
          setShowAICredPreview(false);
          setAIParsedCredentials([]);
        }}
        credentials={aiParsedCredentials}
        onConfirm={handleConfirmAICredentials}
      />
    </div>
  );
};

const RenewalCalendar: React.FC<{ subscriptions: Subscription[]; onEdit: (sub: Subscription) => void }> = ({ subscriptions, onEdit }) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ day: number | null }> = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ day: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d });

  const byDay: Record<number, Subscription[]> = {};
  subscriptions.forEach(sub => {
    if (!sub.renewalDate) return;
    const [y, m, d] = sub.renewalDate.split('-').map(Number);
    if (y === year && m === month + 1) {
      byDay[d] = byDay[d] || [];
      byDay[d].push(sub);
    }
  });

  return (
    <div className="bg-white border border-slate-200/60 rounded-2xl p-4">
      <p className="text-sm font-semibold text-slate-700 mb-3">{year}年{month + 1}月续费</p>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-slate-400 mb-2">
        {['日','一','二','三','四','五','六'].map(d => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => (
          <div key={idx} className="min-h-[72px] rounded-lg bg-slate-50 p-1">
            {cell.day && <div className="text-[11px] text-slate-400 mb-1">{cell.day}</div>}
            {cell.day && (byDay[cell.day] || []).map(sub => (
              <button key={sub.id} onClick={() => onEdit(sub)} className="block w-full text-left text-[10px] truncate text-blue-600 bg-blue-50 rounded px-1 py-0.5 mb-0.5">
                {sub.name}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
