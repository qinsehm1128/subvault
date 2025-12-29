import { useState, useEffect } from 'react';
import { api } from '../services/api';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

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

  const unlock = async (masterKey: string) => {
    setIsLoading(true);
    setError('');
    try {
      await api.unlock(masterKey);
      setIsAuthenticated(true);
    } catch (err: any) {
      setError(err.message || '解锁失败');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const lock = () => {
    api.lock();
    setIsAuthenticated(false);
  };

  return {
    isAuthenticated,
    isLoading,
    error,
    setError,
    unlock,
    lock,
  };
};
