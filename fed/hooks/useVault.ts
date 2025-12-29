import { useState } from 'react';
import { encryptVault, decryptVault } from '../services/cryptoService';
import { VaultData, Subscription, Credential, EncryptedStorage } from '../types';
import { calculateNextRenewal } from '../utils/subscription';

const VAULT_KEY = 'subvault_encrypted_data';
const INITIAL_VAULT: VaultData = { credentials: [], subscriptions: [], lastUpdated: 0 };

export const useVault = () => {
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [vaultData, setVaultData] = useState<VaultData | null>(null);
  const [error, setError] = useState<string>('');
  const [masterKey, setMasterKey] = useState<string>('');

  const unlock = async (password: string) => {
    setIsLoading(true);
    setError('');
    const stored = localStorage.getItem(VAULT_KEY);
    try {
      if (!stored) {
        const newData = { ...INITIAL_VAULT, lastUpdated: Date.now() };
        const encrypted = await encryptVault(newData, password);
        localStorage.setItem(VAULT_KEY, JSON.stringify(encrypted));
        setVaultData(newData);
        setMasterKey(password);
        setIsLocked(false);
      } else {
        const encryptedStore: EncryptedStorage = JSON.parse(stored);
        const data = await decryptVault(encryptedStore, password);
        setVaultData(data);
        setMasterKey(password);
        setIsLocked(false);
      }
    } catch (err) {
      setError('密钥核验失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const lock = () => {
    window.location.reload();
  };

  const saveVault = async (newData: VaultData) => {
    if (!masterKey) return;
    try {
      const encrypted = await encryptVault(newData, masterKey);
      localStorage.setItem(VAULT_KEY, JSON.stringify(encrypted));
      setVaultData(newData);
    } catch (e) {
      setError("数据保存异常");
    }
  };

  const addSubscription = (newSub: Partial<Subscription>) => {
    if (!vaultData || !newSub.name || !newSub.cost) return;
    const startDate = newSub.startDate || new Date().toISOString().split('T')[0];
    const amount = newSub.frequencyAmount || 1;
    const unit = newSub.frequencyUnit || 'MONTHS';
    
    const sub: Subscription = {
      id: crypto.randomUUID(),
      name: newSub.name,
      cost: Number(newSub.cost),
      currency: newSub.currency || 'CNY',
      frequencyAmount: amount,
      frequencyUnit: unit,
      startDate: startDate,
      renewalDate: calculateNextRenewal(startDate, amount, unit),
      category: newSub.category || '生活',
      credentialId: newSub.credentialId,
      active: true
    };

    const newData = { ...vaultData, subscriptions: [...vaultData.subscriptions, sub], lastUpdated: Date.now() };
    saveVault(newData);
  };

  const deleteSubscription = (id: string) => {
    if (!vaultData || !confirm('确定移除该记录？')) return;
    saveVault({ ...vaultData, subscriptions: vaultData.subscriptions.filter(s => s.id !== id) });
  };

  const addCredential = (newCred: Partial<Credential>) => {
    if (!vaultData || !newCred.label || !newCred.username) return;
    const cred: Credential = {
      id: crypto.randomUUID(),
      label: newCred.label,
      username: newCred.username,
      password: newCred.password,
      createdAt: Date.now()
    };
    const newData = { ...vaultData, credentials: [...vaultData.credentials, cred], lastUpdated: Date.now() };
    saveVault(newData);
  };

  const deleteCredential = (id: string) => {
    if (!vaultData || !confirm('确定永久删除该凭证？')) return;
    const newData = { 
      ...vaultData, 
      credentials: vaultData.credentials.filter(c => c.id !== id),
      subscriptions: vaultData.subscriptions.map(s => s.credentialId === id ? { ...s, credentialId: undefined } : s)
    };
    saveVault(newData);
  };

  const exportVault = () => {
    const stored = localStorage.getItem(VAULT_KEY);
    if (!stored) return;
    const blob = new Blob([stored], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SubVault_Export_${new Date().getTime()}.json`;
    a.click();
  };

  const importVault = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        JSON.parse(content);
        localStorage.setItem(VAULT_KEY, content);
        window.location.reload();
      } catch (err) {
        alert('无效的备份文件');
      }
    };
    reader.readAsText(file);
  };

  return {
    isLocked,
    isLoading,
    vaultData,
    error,
    setError,
    setIsLoading,
    unlock,
    lock,
    addSubscription,
    deleteSubscription,
    addCredential,
    deleteCredential,
    exportVault,
    importVault
  };
};
