import { useState, useEffect } from 'react';
import { api } from '../services/api';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [totpRequired, setTotpRequired] = useState<boolean>(false);
  const [pendingMasterKey, setPendingMasterKey] = useState<string>('');

  // 初始化时检查是否有有效 token
  useEffect(() => {
    const checkAuth = async () => {
      if (api.getToken()) {
        try {
          await api.verify();
          setIsAuthenticated(true);
        } catch (err) {
          // Token 无效，清除
          api.clearToken();
          setIsAuthenticated(false);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const unlock = async (masterKey: string, totpCode?: string) => {
    setIsLoading(true);
    setError('');
    try {
      await api.unlock(masterKey, totpCode);
      setIsAuthenticated(true);
      setTotpRequired(false);
      setPendingMasterKey('');
    } catch (err: any) {
      if (err.status === 403 && err.data?.totp_required) {
        setTotpRequired(true);
        setPendingMasterKey(masterKey);
        setError('');
      } else {
        setError(err.message || '解锁失败');
        setTotpRequired(false);
        setPendingMasterKey('');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const unlockWithTotp = async (totpCode: string) => {
    if (!pendingMasterKey) {
      setError('请先输入主密钥');
      return;
    }
    await unlock(pendingMasterKey, totpCode);
  };

  const cancelTotp = () => {
    setTotpRequired(false);
    setPendingMasterKey('');
    setError('');
  };

  const lock = () => {
    api.lock();
    setIsAuthenticated(false);
    setTotpRequired(false);
    setPendingMasterKey('');
  };

  return {
    isAuthenticated,
    isLoading,
    error,
    setError,
    unlock,
    lock,
    totpRequired,
    unlockWithTotp,
    cancelTotp,
  };
};
