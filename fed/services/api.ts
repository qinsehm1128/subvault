const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: '请求失败' }));
      throw new Error(error.error || '请求失败');
    }

    return response.json();
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  getToken() {
    return this.token;
  }

  isAuthenticated() {
    return !!this.token;
  }

  // === 解锁 ===
  async unlock(masterKey: string) {
    const data = await this.request<{ token: string; vaultId: string; isNew: boolean }>('/unlock', {
      method: 'POST',
      body: JSON.stringify({ masterKey }),
    });
    this.setToken(data.token);
    return data;
  }

  // 验证 token 是否有效
  async verify() {
    return this.request<{ vaultId: string; valid: boolean }>('/verify');
  }

  lock() {
    this.clearToken();
  }

  // === Vault ===
  async getVault() {
    return this.request<{
      credentials: any[];
      subscriptions: any[];
      lastUpdated: number;
    }>('/vault');
  }

  // === 订阅 ===
  async getSubscriptions() {
    return this.request<any[]>('/subscriptions');
  }

  async createSubscription(data: any) {
    return this.request<any>('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSubscription(id: string, data: any) {
    return this.request<any>(`/subscriptions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSubscription(id: string) {
    return this.request<void>(`/subscriptions/${id}`, {
      method: 'DELETE',
    });
  }

  // === 凭证 ===
  async getCredentials() {
    return this.request<any[]>('/credentials');
  }

  async createCredential(data: any) {
    return this.request<any>('/credentials', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCredential(id: string, data: any) {
    return this.request<any>(`/credentials/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCredential(id: string) {
    return this.request<void>(`/credentials/${id}`, {
      method: 'DELETE',
    });
  }

  // === AI 分析 ===
  async getAIConfig() {
    return this.request<{
      baseUrl: string;
      apiKey: string;
      model: string;
    }>('/ai/config');
  }

  async saveAIConfig(config: { baseUrl: string; apiKey: string; model: string }) {
    return this.request<{ message: string }>('/ai/config', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async analyzeSubscriptions() {
    return this.request<{
      totalMonthly: number;
      totalYearly: number;
      categories: { name: string; amount: number; percentage: number }[];
      insights: string[];
    }>('/ai/analyze', {
      method: 'POST',
    });
  }

  async parseSubscription(data: { text?: string; imageData?: string }) {
    return this.request<{
      name: string;
      cost: number;
      currency: string;
      frequencyAmount: number;
      frequencyUnit: string;
      website: string;
      category: string;
      tagCreated?: boolean;
      newTag?: { id: string; name: string; color: string };
    }>('/ai/parse-subscription', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAIReports() {
    return this.request<{
      id: string;
      totalMonthly: number;
      totalYearly: number;
      categories: { name: string; amount: number; percentage: number }[];
      insights: string[];
      createdAt: string;
    }[]>('/ai/reports');
  }

  async getChatHistory() {
    return this.request<{
      id: string;
      role: 'user' | 'assistant';
      content: string;
      createdAt: string;
    }[]>('/ai/chat');
  }

  async sendChatMessage(message: string) {
    return this.request<{
      reply: string;
      chat: { id: string; role: string; content: string; createdAt: string };
    }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async clearChatHistory() {
    return this.request<{ message: string }>('/ai/chat', {
      method: 'DELETE',
    });
  }

  // === 标签 ===
  async getTags() {
    return this.request<{
      id: string;
      name: string;
      color: string;
      createdAt: string;
    }[]>('/tags');
  }

  async createTag(data: { name: string; color: string }) {
    return this.request<{ id: string; name: string; color: string }>('/tags', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTag(id: string, data: { name?: string; color?: string }) {
    return this.request<any>(`/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTag(id: string) {
    return this.request<void>(`/tags/${id}`, {
      method: 'DELETE',
    });
  }

  // === 通知设置 ===
  async getNotificationSettings() {
    return this.request<{
      enabled: boolean;
      daysBeforeList: string;
    }>('/notifications/settings');
  }

  async saveNotificationSettings(data: { enabled: boolean; daysBeforeList: string }) {
    return this.request<{ message: string }>('/notifications/settings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getUpcomingRenewals() {
    return this.request<{
      id: string;
      name: string;
      cost: number;
      currency: string;
      renewalDate: string;
      daysLeft: number;
    }[]>('/notifications/upcoming');
  }

  // === 数据分析 ===
  async getAnalytics() {
    return this.request<{
      monthlySpending: { month: string; amount: number }[];
      categoryBreakdown: { category: string; amount: number; percentage: number; count: number }[];
      currencyBreakdown: { currency: string; amount: number; count: number }[];
      totalMonthly: number;
      totalYearly: number;
      subscriptionCount: number;
      upcomingCount: number;
    }>('/analytics');
  }
}

export const api = new ApiService();
