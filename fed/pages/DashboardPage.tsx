import React, { useState, useEffect, useMemo } from 'react';
import { VaultData, Subscription, Credential, GroupAssignment, BatchImportResult } from '../types';
import { Sidebar, TabType } from '../components/Sidebar';
import { SubscriptionCard } from '../components/SubscriptionCard';
import { CredentialRow } from '../components/CredentialRow';
import { SubscriptionModal } from '../components/modals/SubscriptionModal';
import { AddCredentialModal } from '../components/modals/AddCredentialModal';
import { ImportCredentialsModal } from '../components/modals/ImportCredentialsModal';
import { AISubscriptionModal } from '../components/modals/AISubscriptionModal';
import { AICredentialModal } from '../components/modals/AICredentialModal';
import { AICredentialPreviewModal } from '../components/modals/AICredentialPreviewModal';
import { AIGroupModal, AIGroupSourceItem } from '../components/modals/AIGroupModal';
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
import { GroupFilter } from '../components/GroupFilter';
import { GroupedSections } from '../components/GroupedSections';
import { BatchGroupBar } from '../components/BatchGroupBar';
import { useItemSelection } from '../hooks/useItemSelection';
import { groupItems } from '../utils/groups';

const TAB_TITLES: Record<TabType, string> = {
  subscriptions: '服务订阅',
  credentials: '凭证管理',
  memos: '备忘录',
  analytics: '数据分析',
  ai: '智能助手',
  settings: '分组与通知',
};

interface DashboardPageProps {
  vaultData: VaultData;
  onAddSubscription: (sub: Partial<Subscription>) => void;
  onUpdateSubscription: (id: string, sub: Partial<Subscription>) => void;
  onDeleteSubscription: (id: string) => void;
  onAddCredential: (cred: Partial<Credential>) => void;
  onUpdateCredential?: (id: string, cred: Partial<Credential>) => void;
  onBatchAddCredentials: (creds: Partial<Credential>[]) => Promise<BatchImportResult> | BatchImportResult | void;
  onBatchUpdateCredentialGroups: (assignments: GroupAssignment[]) => Promise<void> | void;
  onBatchUpdateSubscriptionGroups: (assignments: GroupAssignment[]) => Promise<void> | void;
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
  onBatchUpdateCredentialGroups,
  onBatchUpdateSubscriptionGroups,
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
  const [subGroup, setSubGroup] = useState('all');
  const [subView, setSubView] = useState<'grid' | 'calendar'>('grid');
  const [credQuery, setCredQuery] = useState('');
  const [credGroup, setCredGroup] = useState('all');
  const [groups, setGroups] = useState<{ id: string; name: string; color: string }[]>([]);
  const [insights, setInsights] = useState<{ kind: string; title: string; detail: string }[]>([]);
  const [importNotice, setImportNotice] = useState('');
  const [aiGroupKind, setAIGroupKind] = useState<'credentials' | 'subscriptions' | null>(null);
  const [aiGroupItems, setAIGroupItems] = useState<AIGroupSourceItem[]>([]);
  const [groupBusy, setGroupBusy] = useState(false);

  const filteredSubs = useMemo(() => {
    return vaultData.subscriptions.filter(sub => {
      const status = sub.status || (sub.active === false ? 'paused' : 'active');
      if (subStatus !== 'all' && status !== subStatus) return false;
      const group = (sub.category || '').trim() || '默认';
      if (subGroup !== 'all' && group !== subGroup) return false;
      const q = subQuery.trim().toLowerCase();
      if (!q) return true;
      return [sub.name, sub.category, sub.website, sub.paymentMethod, sub.cardLast4].some(v => (v || '').toLowerCase().includes(q));
    });
  }, [vaultData.subscriptions, subQuery, subStatus, subGroup]);

  const filteredCreds = useMemo(() => {
    return vaultData.credentials.filter(c => {
      const group = (c.category || '').trim() || '默认';
      if (credGroup !== 'all' && group !== credGroup) return false;
      const q = credQuery.trim().toLowerCase();
      if (!q) return true;
      return [c.label, c.username, c.website, c.category].some(v => (v || '').toLowerCase().includes(q));
    });
  }, [vaultData.credentials, credQuery, credGroup]);

  const subIds = useMemo(() => filteredSubs.map(item => item.id), [filteredSubs]);
  const credIds = useMemo(() => filteredCreds.map(item => item.id), [filteredCreds]);
  const subSelect = useItemSelection(subIds);
  const credSelect = useItemSelection(credIds);

  useEffect(() => {
    if (activeTab !== 'subscriptions') return;
    api.getInsights().then(data => setInsights(data.insights || [])).catch(() => setInsights([]));
  }, [activeTab, vaultData.subscriptions.length]);

  useEffect(() => {
    api.getTags().then(setGroups).catch(() => setGroups([]));
  }, [activeTab, vaultData.credentials.length, vaultData.subscriptions.length]);

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
    subSelect.clear();
    credSelect.clear();
    setAIGroupKind(null);
    setAIGroupItems([]);
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
      category: data.category || '默认',
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
      category: data.category || '默认',
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

  const formatImportNotice = (result: BatchImportResult) => {
    const parts = [`新增 ${result.created} 条`];
    if (result.skipped) parts.push(`已存在跳过 ${result.skipped} 条`);
    if (result.failed) parts.push(`失败 ${result.failed} 条`);
    return `导入完成：${parts.join('，')}`;
  };

  const handleConfirmAICredentials = async (credentials: Partial<Credential>[]) => {
    if (credentials.length === 0) return;
    const result = await onBatchAddCredentials(credentials);
    if (result) setImportNotice(formatImportNotice(result));
    setAIParsedCredentials([]);
    api.getTags().then(setGroups).catch(() => undefined);
  };

  const handleImportCredentials = async (credentials: Partial<Credential>[]) => {
    const result = await onBatchAddCredentials(credentials);
    if (result) setImportNotice(formatImportNotice(result));
    api.getTags().then(setGroups).catch(() => undefined);
  };

  const handleMoveSubscriptions = async (category: string) => {
    if (subSelect.selectedIds.length === 0) return;
    setGroupBusy(true);
    try {
      await onBatchUpdateSubscriptionGroups(subSelect.selectedIds.map(id => ({ id, category })));
      subSelect.clear();
      api.getTags().then(setGroups).catch(() => undefined);
    } finally {
      setGroupBusy(false);
    }
  };

  const handleMoveCredentials = async (category: string) => {
    if (credSelect.selectedIds.length === 0) return;
    setGroupBusy(true);
    try {
      await onBatchUpdateCredentialGroups(credSelect.selectedIds.map(id => ({ id, category })));
      credSelect.clear();
      api.getTags().then(setGroups).catch(() => undefined);
    } finally {
      setGroupBusy(false);
    }
  };

  const openAIGroup = (kind: 'credentials' | 'subscriptions') => {
    const items: AIGroupSourceItem[] = kind === 'credentials'
      ? (credSelect.selectedIds.length > 0 ? filteredCreds.filter(c => credSelect.selectedIds.includes(c.id)) : filteredCreds)
          .map(c => ({ id: c.id, title: c.label, username: c.username, website: c.website, notes: c.notes, category: c.category }))
      : (subSelect.selectedIds.length > 0 ? filteredSubs.filter(s => subSelect.selectedIds.includes(s.id)) : filteredSubs)
          .map(s => ({ id: s.id, title: s.name, website: s.website, notes: s.notes, category: s.category }));
    if (items.length === 0) return;
    setAIGroupKind(kind);
    setAIGroupItems(items);
  };

  const handleApplyAIGroups = async (assignments: GroupAssignment[]) => {
    if (aiGroupKind === 'credentials') {
      await onBatchUpdateCredentialGroups(assignments);
      credSelect.clear();
    } else {
      await onBatchUpdateSubscriptionGroups(assignments);
      subSelect.clear();
    }
    api.getTags().then(setGroups).catch(() => undefined);
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
                  <GroupFilter value={subGroup} onChange={setSubGroup} groups={groups} items={vaultData.subscriptions} />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => subSelect.setSelectMode(true)}
                      className="px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-xl min-h-[40px]"
                    >
                      批量管理
                    </button>
                    <button
                      type="button"
                      onClick={() => openAIGroup('subscriptions')}
                      className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-violet-700 bg-violet-50 border border-violet-100 rounded-xl min-h-[40px]"
                    >
                      <BrainIcon className="w-3.5 h-3.5" />
                      AI 整理分组
                    </button>
                  </div>
                  
                  {subView === 'calendar' ? (
                    <RenewalCalendar subscriptions={filteredSubs} onEdit={handleEditSubscription} />
                  ) : (
                  <>
                    {filteredSubs.length > 0 && (
                      <GroupedSections
                        items={filteredSubs}
                        groups={groups}
                        onHeaderClick={setSubGroup}
                        renderItem={sub => (
                          <SubscriptionCard
                            subscription={sub}
                            linkedCredential={vaultData.credentials.find(c => c.id === sub.credentialId)}
                            groups={groups}
                            selectable={subSelect.selectMode}
                            selected={subSelect.isSelected(sub.id)}
                            onToggleSelect={() => subSelect.toggle(sub.id)}
                            onEdit={() => handleEditSubscription(sub)}
                            onDelete={() => onDeleteSubscription(sub.id)}
                            onRefresh={() => onRefreshSubscription(sub.id)}
                            onOpenCredential={() => {
                              const cred = vaultData.credentials.find(c => c.id === sub.credentialId);
                              if (cred) handleCredentialClick(cred);
                            }}
                          />
                        )}
                      />
                    )}
                    {filteredSubs.length === 0 && vaultData.subscriptions.length > 0 && (
                      <div className="py-10 text-center text-sm text-slate-400 bg-white border border-slate-200/60 rounded-2xl">没有匹配的订阅</div>
                    )}
                    {vaultData.subscriptions.length === 0 && (
                      <div className="py-16 flex flex-col items-center justify-center bg-white border border-slate-200/60 rounded-2xl">
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
                    {subSelect.selectMode && (
                      <BatchGroupBar
                        selectedCount={subSelect.selectedIds.length}
                        visibleCount={filteredSubs.length}
                        groups={groups}
                        items={vaultData.subscriptions}
                        busy={groupBusy}
                        onSelectAll={subSelect.selectAll}
                        onClear={subSelect.clear}
                        onMoveTo={handleMoveSubscriptions}
                        onAIOrganize={() => openAIGroup('subscriptions')}
                      />
                    )}
                  </>
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
                      placeholder="搜索凭证名称、账号、网站、密钥"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                    />
                    <GroupFilter value={credGroup} onChange={setCredGroup} groups={groups} items={vaultData.credentials} />
                    {importNotice && (
                      <div className="flex items-center justify-between text-xs bg-emerald-50 text-emerald-700 rounded-xl px-3 py-2">
                        <span>{importNotice}</span>
                        <button type="button" onClick={() => setImportNotice('')} className="text-emerald-500">×</button>
                      </div>
                    )}
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
                      <button
                        type="button"
                        onClick={() => credSelect.setSelectMode(true)}
                        className="px-3 py-2.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-xl min-h-[44px] whitespace-nowrap"
                      >
                        批量管理
                      </button>
                      <button
                        type="button"
                        onClick={() => openAIGroup('credentials')}
                        className="flex items-center gap-1 px-3 py-2.5 text-xs font-medium text-violet-700 bg-violet-50 border border-violet-100 rounded-xl min-h-[44px] whitespace-nowrap"
                      >
                        <BrainIcon className="w-3.5 h-3.5" />
                        AI 整理分组
                      </button>
                    </div>
                  </div>
                  {credViewMode === 'table' ? (
                    <>
                      <div className="hidden md:block space-y-6">
                        {vaultData.credentials.length > 0 && filteredCreds.length > 0 ? (
                          groupItems(filteredCreds, groups).map(section => (
                            <div key={section.name} className="space-y-3">
                              <button
                                type="button"
                                onClick={() => setCredGroup(section.name)}
                                className="flex items-center gap-2 px-1"
                              >
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: section.color }} />
                                <span className="text-sm font-semibold text-slate-800">{section.name}</span>
                                <span className="text-xs text-slate-400">{section.items.length}</span>
                              </button>
                              <CredentialTable
                                credentials={section.items}
                                groups={groups}
                                onCredentialClick={handleCredentialClick}
                                onEdit={handleEditCredential}
                                onDelete={(id) => onDeleteCredential(id)}
                                selectable={credSelect.selectMode}
                                selectedIds={new Set(credSelect.selectedIds)}
                                onToggleSelect={credSelect.toggle}
                              />
                            </div>
                          ))
                        ) : vaultData.credentials.length > 0 ? (
                          <div className="py-10 text-center text-sm text-slate-400 bg-white border border-slate-200/60 rounded-2xl">没有匹配的凭证</div>
                        ) : (
                          <div className="py-16 flex flex-col items-center justify-center bg-white border border-slate-200/60 rounded-2xl">
                            <KeyIcon className="w-12 h-12 text-slate-200 mb-4" />
                            <p className="text-slate-400 font-medium text-sm">暂无存储凭证</p>
                          </div>
                        )}
                      </div>
                      <div className="md:hidden">
                        {filteredCreds.length > 0 ? (
                          <GroupedSections
                            items={filteredCreds}
                            groups={groups}
                            gridClassName="grid grid-cols-1 gap-4"
                            onHeaderClick={setCredGroup}
                            renderItem={cred => (
                              <CredentialRow
                                credential={cred}
                                groups={groups}
                                selectable={credSelect.selectMode}
                                selected={credSelect.isSelected(cred.id)}
                                onToggleSelect={() => credSelect.toggle(cred.id)}
                                onClick={() => handleCredentialClick(cred)}
                                onEdit={() => handleEditCredential(cred)}
                                onDelete={() => onDeleteCredential(cred.id)}
                              />
                            )}
                          />
                        ) : vaultData.credentials.length === 0 ? (
                          <div className="py-16 flex flex-col items-center justify-center bg-white border border-slate-200/60 rounded-2xl">
                            <KeyIcon className="w-12 h-12 text-slate-200 mb-4" />
                            <p className="text-slate-400 font-medium text-sm">暂无存储凭证</p>
                          </div>
                        ) : (
                          <div className="py-10 text-center text-sm text-slate-400 bg-white border border-slate-200/60 rounded-2xl">没有匹配的凭证</div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      {filteredCreds.length > 0 ? (
                        <GroupedSections
                          items={filteredCreds}
                          groups={groups}
                          onHeaderClick={setCredGroup}
                          renderItem={cred => (
                            <CredentialRow
                              credential={cred}
                              groups={groups}
                              selectable={credSelect.selectMode}
                              selected={credSelect.isSelected(cred.id)}
                              onToggleSelect={() => credSelect.toggle(cred.id)}
                              onClick={() => handleCredentialClick(cred)}
                              onEdit={() => handleEditCredential(cred)}
                              onDelete={() => onDeleteCredential(cred.id)}
                            />
                          )}
                        />
                      ) : vaultData.credentials.length === 0 ? (
                        <div className="py-16 flex flex-col items-center justify-center bg-white border border-slate-200/60 rounded-2xl">
                          <KeyIcon className="w-12 h-12 text-slate-200 mb-4" />
                          <p className="text-slate-400 font-medium text-sm">暂无存储凭证</p>
                        </div>
                      ) : (
                        <div className="py-10 text-center text-sm text-slate-400 bg-white border border-slate-200/60 rounded-2xl">没有匹配的凭证</div>
                      )}
                    </>
                  )}
                  {credSelect.selectMode && (
                    <BatchGroupBar
                      selectedCount={credSelect.selectedIds.length}
                      visibleCount={filteredCreds.length}
                      groups={groups}
                      items={vaultData.credentials}
                      busy={groupBusy}
                      onSelectAll={credSelect.selectAll}
                      onClear={credSelect.clear}
                      onMoveTo={handleMoveCredentials}
                      onAIOrganize={() => openAIGroup('credentials')}
                    />
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
        groups={groups}
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
        onImport={handleImportCredentials}
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
        existingCredentials={vaultData.credentials}
        onConfirm={handleConfirmAICredentials}
      />

      <AIGroupModal
        isOpen={!!aiGroupKind}
        kind={aiGroupKind || 'credentials'}
        items={aiGroupItems}
        onClose={() => {
          setAIGroupKind(null);
          setAIGroupItems([]);
        }}
        onApply={handleApplyAIGroups}
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
