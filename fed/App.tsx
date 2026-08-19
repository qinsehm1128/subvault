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
    totpRequired,
    unlockWithTotp,
    cancelTotp,
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
    updateCredential,
    batchAddCredentials,
    deleteCredential,
    refreshSubscription,
    importVaultData,
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
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 px-4">
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
        totpRequired={totpRequired}
        onUnlockWithTotp={unlockWithTotp}
        onCancelTotp={cancelTotp}
      />
    );
  }

  // 加载 Vault 数据中
  if (vaultLoading && !vaultData) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 px-4">
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
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 px-4">
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
      onUpdateCredential={updateCredential}
      onBatchAddCredentials={batchAddCredentials}
      onDeleteCredential={deleteCredential}
      onRefreshSubscription={refreshSubscription}
      onExport={() => {
        const blob = new Blob([JSON.stringify(vaultData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SubVault_Export_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }}
      onImport={() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) return;
          try {
            const text = await file.text();
            const data = JSON.parse(text);
            const results = await importVaultData(data);
            alert(`导入完成：${results.subscriptions} 个订阅，${results.credentials} 个凭证，${results.memos} 个备忘录`);
          } catch {
            alert('导入失败：文件格式不正确');
          }
        };
        input.click();
      }}
      onLock={lock}
    />
  );
};

export default App;
