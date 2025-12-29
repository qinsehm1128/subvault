import React, { useState } from 'react';
import { VaultData, Subscription, Credential } from '../types';
import { Sidebar, TabType } from '../components/Sidebar';
import { SubscriptionCard } from '../components/SubscriptionCard';
import { CredentialRow } from '../components/CredentialRow';
import { SubscriptionModal } from '../components/modals/SubscriptionModal';
import { AddCredentialModal } from '../components/modals/AddCredentialModal';
import { ImportCredentialsModal } from '../components/modals/ImportCredentialsModal';
import { AISubscriptionModal } from '../components/modals/AISubscriptionModal';
import { AIPage } from './AIPage';
import { AnalyticsPage } from './AnalyticsPage';
import { SettingsPage } from './SettingsPage';
import { PlusIcon, CreditCardIcon, KeyIcon, UploadIcon, BrainIcon } from '../components/Icons';

interface DashboardPageProps {
  vaultData: VaultData;
  onAddSubscription: (sub: Partial<Subscription>) => void;
  onUpdateSubscription: (id: string, sub: Partial<Subscription>) => void;
  onDeleteSubscription: (id: string) => void;
  onAddCredential: (cred: Partial<Credential>) => void;
  onBatchAddCredentials: (creds: Partial<Credential>[]) => void;
  onDeleteCredential: (id: string) => void;
  onExport: () => void;
  onLock: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  vaultData,
  onAddSubscription,
  onUpdateSubscription,
  onDeleteSubscription,
  onAddCredential,
  onBatchAddCredentials,
  onDeleteCredential,
  onExport,
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

  // 渲染主内容区域
  const renderContent = () => {
    switch (activeTab) {
      case 'ai':
        return <AIPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return (
          <main className="flex-1 overflow-y-auto px-8 py-8">
            <div className="max-w-5xl mx-auto">
              {activeTab === 'subscriptions' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">订阅总览</h2>
                      <p className="text-slate-400 text-sm mt-1">追踪并优化您的订阅支出</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => setShowAISubModal(true)} 
                        className="flex items-center space-x-2 bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-white px-4 py-2.5 rounded-xl transition-all duration-200 shadow-sm font-medium text-sm cursor-pointer"
                      >
                        <BrainIcon className="w-4 h-4" />
                        <span>AI新增</span>
                      </button>
                      <button 
                        onClick={handleAddSubscription} 
                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition-colors duration-200 shadow-sm font-medium text-sm cursor-pointer"
                      >
                        <PlusIcon className="w-4 h-4" />
                        <span>手动新增</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vaultData.subscriptions.map(sub => (
                      <SubscriptionCard
                        key={sub.id}
                        subscription={sub}
                        linkedCredential={vaultData.credentials.find(c => c.id === sub.credentialId)}
                        onEdit={() => handleEditSubscription(sub)}
                        onDelete={() => onDeleteSubscription(sub.id)}
                      />
                    ))}
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
                </div>
              )}

              {activeTab === 'credentials' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">凭证库</h2>
                      <p className="text-slate-400 text-sm mt-1">安全存储您的账号密码</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => setShowImportModal(true)} 
                        className="flex items-center space-x-2 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-600 hover:text-blue-600 px-3 py-2 rounded-lg transition-colors duration-200 font-medium text-sm cursor-pointer"
                      >
                        <UploadIcon className="w-4 h-4" />
                        <span>导入</span>
                      </button>
                      <button 
                        onClick={() => setShowAddCredModal(true)} 
                        className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl transition-colors duration-200 shadow-sm font-medium text-sm cursor-pointer"
                      >
                        <PlusIcon className="w-4 h-4" />
                        <span>新增凭证</span>
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {vaultData.credentials.map(cred => (
                      <CredentialRow
                        key={cred.id}
                        credential={cred}
                        onDelete={() => onDeleteCredential(cred.id)}
                      />
                    ))}
                    {vaultData.credentials.length === 0 && (
                      <div className="py-16 flex flex-col items-center justify-center bg-white border border-slate-200/60 rounded-2xl">
                        <KeyIcon className="w-12 h-12 text-slate-200 mb-4" />
                        <p className="text-slate-400 font-medium text-sm">暂无存储凭证</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </main>
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        subscriptionCount={vaultData.subscriptions.length}
        credentialCount={vaultData.credentials.length}
        onExport={onExport}
        onLock={onLock}
      />

      {renderContent()}

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
        onClose={() => setShowAddCredModal(false)}
        onAdd={onAddCredential}
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
    </div>
  );
};
