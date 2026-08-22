import { useState, useCallback } from 'react';
import { api } from '../services/api';
import { VaultData, Subscription, Credential, Memo, GroupAssignment, BatchImportResult } from '../types';
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
        memos: data.memos || [],
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
      category: newSub.category || '默认',
      credentialId: newSub.credentialId || null,
      website: newSub.website || '',
      autoRotate: !!newSub.autoRotate,
      status: newSub.status || 'active',
      paymentMethod: newSub.paymentMethod || '',
      cardLast4: newSub.cardLast4 || '',
      cancelUrl: newSub.cancelUrl || '',
      trialEndsOn: newSub.trialEndsOn || '',
      promoEndsOn: newSub.promoEndsOn || '',
      reminderDays: newSub.reminderDays || '',
      notes: newSub.notes || '',
      active: (newSub.status || 'active') !== 'paused' && (newSub.status || 'active') !== 'canceled',
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
      category: updates.category || '默认',
      credentialId: updates.credentialId || null,
      website: updates.website || '',
      autoRotate: !!updates.autoRotate,
      status: updates.status || 'active',
      paymentMethod: updates.paymentMethod || '',
      cardLast4: updates.cardLast4 || '',
      cancelUrl: updates.cancelUrl || '',
      trialEndsOn: updates.trialEndsOn || '',
      promoEndsOn: updates.promoEndsOn || '',
      reminderDays: updates.reminderDays || '',
      notes: updates.notes || '',
      active: (updates.status || 'active') !== 'paused' && (updates.status || 'active') !== 'canceled',
    };

    try {
      const updated = await api.updateSubscription(id, subData);
      setVaultData(prev => prev ? {
        ...prev,
        subscriptions: prev.subscriptions.map(s => s.id === id ? { ...s, ...updated, ...subData, id } : s),
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
    if (!newCred.label || (!newCred.username && !newCred.password)) return;

    const credData = {
      label: newCred.label,
      username: newCred.username || '',
      password: newCred.password || '',
      notes: newCred.notes || '',
      website: newCred.website || '',
      category: newCred.category || '默认',
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

  const updateCredential = async (id: string, updates: Partial<Credential>) => {
    if (!updates.label || (!updates.username && !updates.password)) return;

    const credData = {
      label: updates.label,
      username: updates.username || '',
      password: updates.password || '',
      notes: updates.notes || '',
      website: updates.website || '',
      category: updates.category || '默认',
    };

    try {
      const updated = await api.updateCredential(id, credData);
      setVaultData(prev => prev ? {
        ...prev,
        credentials: prev.credentials.map(c => c.id === id ? { ...c, ...updated } : c),
        lastUpdated: Date.now(),
      } : null);
    } catch (err: any) {
      setError(err.message || '更新凭证失败');
      throw err;
    }
  };

  const batchAddCredentials = async (credentials: Partial<Credential>[]): Promise<BatchImportResult> => {
    const items = credentials
      .filter(cred => (cred.label || '').trim())
      .map(cred => ({
        label: (cred.label || '').trim(),
        username: cred.username || '',
        password: cred.password || '',
        notes: cred.notes || '',
        website: cred.website || '',
        category: cred.category || '默认',
      }));

    try {
      const result = await api.batchCreateCredentials(items);
      if (result.created?.length) {
        setVaultData(prev => prev ? {
          ...prev,
          credentials: [...prev.credentials, ...result.created],
          lastUpdated: Date.now(),
        } : null);
      }
      if (result.failedCount > 0) {
        setError(`部分导入失败: ${(result.failed || []).map(item => `${item.label}: ${item.reason}`).join(', ')}`);
      }
      return {
        created: result.createdCount,
        skipped: result.skippedCount,
        failed: result.failedCount,
        skippedItems: result.skipped,
        failedItems: result.failed,
      };
    } catch (err: any) {
      setError(err.message || '批量导入失败');
      throw err;
    }
  };

  const batchUpdateCredentialGroups = async (assignments: GroupAssignment[]) => {
    if (assignments.length === 0) return;
    try {
      await api.updateCredentialGroups(assignments);
      const byId = new Map(assignments.map(item => [item.id, item.category]));
      setVaultData(prev => prev ? {
        ...prev,
        credentials: prev.credentials.map(cred => byId.has(cred.id) ? { ...cred, category: byId.get(cred.id) } : cred),
        lastUpdated: Date.now(),
      } : null);
    } catch (err: any) {
      setError(err.message || '批量调整分组失败');
      throw err;
    }
  };

  const batchUpdateSubscriptionGroups = async (assignments: GroupAssignment[]) => {
    if (assignments.length === 0) return;
    try {
      await api.updateSubscriptionGroups(assignments);
      const byId = new Map(assignments.map(item => [item.id, item.category]));
      setVaultData(prev => prev ? {
        ...prev,
        subscriptions: prev.subscriptions.map(sub => byId.has(sub.id) ? { ...sub, category: byId.get(sub.id)! } : sub),
        lastUpdated: Date.now(),
      } : null);
    } catch (err: any) {
      setError(err.message || '批量调整分组失败');
      throw err;
    }
  };

  const refreshSubscription = async (id: string) => {
    const sub = vaultData?.subscriptions.find(s => s.id === id);
    if (!sub || sub.frequencyUnit === 'PERMANENT') return;
    if (!confirm(`确认「${sub.name}」已续费？将从今天重新计算到期日。`)) return;

    const today = new Date().toISOString().split('T')[0];
    const newRenewalDate = calculateNextRenewal(today, sub.frequencyAmount, sub.frequencyUnit);

    try {
      const updated = await api.updateSubscription(id, {
        ...sub,
        startDate: today,
        renewalDate: newRenewalDate,
      });
      setVaultData(prev => prev ? {
        ...prev,
        subscriptions: prev.subscriptions.map(s => s.id === id ? { ...s, ...updated, startDate: today, renewalDate: newRenewalDate } : s),
        lastUpdated: Date.now(),
      } : null);
    } catch (err: any) {
      setError(err.message || '刷新订阅失败');
    }
  };

  const importVaultData = async (data: Partial<VaultData>) => {
    const results = { subscriptions: 0, credentials: 0, memos: 0, failed: 0 };
    const failures: string[] = [];
    const newSubscriptions: Subscription[] = [];
    const newCredentials: Credential[] = [];
    const newMemos: Memo[] = [];

    if (data.subscriptions?.length) {
      for (const sub of data.subscriptions) {
        try {
          const created = await api.createSubscription({
            name: sub.name,
            cost: sub.cost,
            currency: sub.currency || 'CNY',
            frequencyAmount: sub.frequencyAmount || 1,
            frequencyUnit: sub.frequencyUnit || 'MONTHS',
            startDate: sub.startDate || new Date().toISOString().split('T')[0],
            renewalDate: sub.renewalDate || calculateNextRenewal(sub.startDate || new Date().toISOString().split('T')[0], sub.frequencyAmount || 1, sub.frequencyUnit || 'MONTHS'),
            category: sub.category || '默认',
            autoRotate: !!sub.autoRotate,
            status: sub.status || (sub.active === false ? 'paused' : 'active'),
            paymentMethod: sub.paymentMethod || '',
            website: sub.website || '',
            active: sub.active !== false,
          });
          newSubscriptions.push(created);
          results.subscriptions++;
        } catch (err: any) {
          results.failed++;
          failures.push(sub.name || '未命名订阅');
        }
      }
    }

    if (data.credentials?.length) {
      for (const cred of data.credentials) {
        try {
          const created = await api.createCredential({
            label: cred.label,
            username: cred.username,
            password: cred.password || '',
            notes: cred.notes || '',
            website: cred.website || '',
            category: cred.category || '默认',
          });
          newCredentials.push(created);
          results.credentials++;
        } catch {
          results.failed++;
          failures.push(cred.label || '未命名凭证');
        }
      }
    }

    if (data.memos?.length) {
      for (const memo of data.memos) {
        try {
          const created = await api.createMemo({
            title: memo.title,
            content: memo.content,
            category: memo.category || '其他',
            isPinned: memo.isPinned || false,
          });
          newMemos.push(created);
          results.memos++;
        } catch {
          results.failed++;
          failures.push(memo.title || '未命名备忘');
        }
      }
    }

    setVaultData(prev => prev ? {
      ...prev,
      subscriptions: [...prev.subscriptions, ...newSubscriptions],
      credentials: [...prev.credentials, ...newCredentials],
      memos: [...prev.memos, ...newMemos],
      lastUpdated: Date.now(),
    } : null);

    return { ...results, failures };
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
    updateCredential,
    batchAddCredentials,
    batchUpdateCredentialGroups,
    batchUpdateSubscriptionGroups,
    deleteCredential,
    refreshSubscription,
    importVaultData,
  };
};
