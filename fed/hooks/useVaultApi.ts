import { useState, useCallback } from 'react';
import { api } from '../services/api';
import { VaultData, Subscription, Credential } from '../types';
import { calculateNextRenewal } from '../utils/subscription';

export const useVaultApi = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [vaultData, setVaultData] = useState<VaultData | null>(null);
  const [error, setError] = useState<string>('');

  const loadVault = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await api.getVault();
      setVaultData({
        credentials: data.credentials || [],
        subscriptions: data.subscriptions || [],
        lastUpdated: data.lastUpdated || Date.now(),
      });
    } catch (err: any) {
      setError(err.message || '加载数据失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addSubscription = async (newSub: Partial<Subscription>) => {
    if (!newSub.name || !newSub.cost) return;
    
    const startDate = newSub.startDate || new Date().toISOString().split('T')[0];
    const amount = newSub.frequencyAmount || 1;
    const unit = newSub.frequencyUnit || 'MONTHS';

    const subData = {
      name: newSub.name,
      cost: Number(newSub.cost),
      currency: newSub.currency || 'CNY',
      frequencyAmount: amount,
      frequencyUnit: unit,
      startDate: startDate,
      renewalDate: calculateNextRenewal(startDate, amount, unit),
      category: newSub.category || '生活',
      credentialId: newSub.credentialId || null,
      website: newSub.website || '',
      active: true,
    };

    try {
      const created = await api.createSubscription(subData);
      setVaultData(prev => prev ? {
        ...prev,
        subscriptions: [...prev.subscriptions, created],
        lastUpdated: Date.now(),
      } : null);
    } catch (err: any) {
      setError(err.message || '创建订阅失败');
      throw err;
    }
  };

  const updateSubscription = async (id: string, updates: Partial<Subscription>) => {
    if (!updates.name || !updates.cost) return;

    const startDate = updates.startDate || new Date().toISOString().split('T')[0];
    const amount = updates.frequencyAmount || 1;
    const unit = updates.frequencyUnit || 'MONTHS';

    const subData = {
      name: updates.name,
      cost: Number(updates.cost),
      currency: updates.currency || 'CNY',
      frequencyAmount: amount,
      frequencyUnit: unit,
      startDate: startDate,
      renewalDate: calculateNextRenewal(startDate, amount, unit),
      category: updates.category || '生活',
      credentialId: updates.credentialId || null,
      website: updates.website || '',
      active: updates.active !== false,
    };

    try {
      const updated = await api.updateSubscription(id, subData);
      setVaultData(prev => prev ? {
        ...prev,
        subscriptions: prev.subscriptions.map(s => s.id === id ? { ...s, ...updated } : s),
        lastUpdated: Date.now(),
      } : null);
    } catch (err: any) {
      setError(err.message || '更新订阅失败');
      throw err;
    }
  };

  const deleteSubscription = async (id: string) => {
    if (!confirm('确定移除该记录？')) return;
    
    try {
      await api.deleteSubscription(id);
      setVaultData(prev => prev ? {
        ...prev,
        subscriptions: prev.subscriptions.filter(s => s.id !== id),
        lastUpdated: Date.now(),
      } : null);
    } catch (err: any) {
      setError(err.message || '删除订阅失败');
    }
  };

  const addCredential = async (newCred: Partial<Credential>) => {
    if (!newCred.label || !newCred.username) return;

    const credData = {
      label: newCred.label,
      username: newCred.username,
      password: newCred.password || '',
      notes: newCred.notes || '',
    };

    try {
      const created = await api.createCredential(credData);
      setVaultData(prev => prev ? {
        ...prev,
        credentials: [...prev.credentials, created],
        lastUpdated: Date.now(),
      } : null);
    } catch (err: any) {
      setError(err.message || '创建凭证失败');
      throw err;
    }
  };

  const batchAddCredentials = async (credentials: Partial<Credential>[]) => {
    const results: Credential[] = [];
    const errors: string[] = [];

    for (const cred of credentials) {
      if (!cred.label || !cred.username) continue;

      try {
        const created = await api.createCredential({
          label: cred.label,
          username: cred.username,
          password: cred.password || '',
          notes: cred.notes || '',
        });
        results.push(created);
      } catch (err: any) {
        errors.push(`${cred.label}: ${err.message}`);
      }
    }

    if (results.length > 0) {
      setVaultData(prev => prev ? {
        ...prev,
        credentials: [...prev.credentials, ...results],
        lastUpdated: Date.now(),
      } : null);
    }

    if (errors.length > 0) {
      setError(`部分导入失败: ${errors.join(', ')}`);
    }

    return { success: results.length, failed: errors.length };
  };

  const deleteCredential = async (id: string) => {
    if (!confirm('确定永久删除该凭证？')) return;

    try {
      await api.deleteCredential(id);
      setVaultData(prev => prev ? {
        ...prev,
        credentials: prev.credentials.filter(c => c.id !== id),
        subscriptions: prev.subscriptions.map(s => 
          s.credentialId === id ? { ...s, credentialId: undefined } : s
        ),
        lastUpdated: Date.now(),
      } : null);
    } catch (err: any) {
      setError(err.message || '删除凭证失败');
    }
  };

  return {
    isLoading,
    vaultData,
    error,
    setError,
    loadVault,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    addCredential,
    batchAddCredentials,
    deleteCredential,
  };
};
