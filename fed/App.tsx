import React, { useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useVaultApi } from './hooks/useVaultApi';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

const App: React.FC = () => {
  const {
    isAuthenticated,
    isLoading: authLoading,
    error: authError,
    unlock,
    lock,
  } = useAuth();

  const {
    isLoading: vaultLoading,
    vaultData,
    error: vaultError,
    loadVault,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    addCredential,
    batchAddCredentials,
    deleteCredential,
  } = useVaultApi();

  // 登录成功后加载 Vault 数据
  useEffect(() => {
    if (isAuthenticated) {
      loadVault();
    }
  }, [isAuthenticated, loadVault]);

  // 初始化检查中
  if (authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // 未登录时显示登录页
  if (!isAuthenticated) {
    return (
      <LoginPage
        onUnlock={unlock}
        isLoading={authLoading}
        error={authError}
      />
    );
  }

  // 加载 Vault 数据中
  if (vaultLoading && !vaultData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm font-medium">加载数据中...</p>
        </div>
      </div>
    );
  }

  // 数据加载失败
  if (!vaultData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-500 mb-4">{vaultError || '加载失败'}</p>
          <button
            onClick={loadVault}
            className="text-brand-600 hover:text-brand-700 font-medium cursor-pointer"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <DashboardPage
      vaultData={vaultData}
      onAddSubscription={addSubscription}
      onUpdateSubscription={updateSubscription}
      onDeleteSubscription={deleteSubscription}
      onAddCredential={addCredential}
      onBatchAddCredentials={batchAddCredentials}
      onDeleteCredential={deleteCredential}
      onExport={() => {
        const blob = new Blob([JSON.stringify(vaultData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SubVault_Export_${Date.now()}.json`;
        a.click();
      }}
      onLock={lock}
    />
  );
};

export default App;
