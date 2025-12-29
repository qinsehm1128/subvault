import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { api } from '../services/api';

interface AnalyticsData {
  monthlySpending: { month: string; amount: number }[];
  categoryBreakdown: { category: string; amount: number; percentage: number; count: number }[];
  currencyBreakdown: { currency: string; amount: number; count: number }[];
  totalMonthly: number;
  totalYearly: number;
  subscriptionCount: number;
  upcomingCount: number;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const result = await api.getAnalytics();
      setData(result);
    } catch (err) {
      console.error('加载分析数据失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <p className="text-slate-400">加载失败</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 px-8 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 头部 */}
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">数据分析</h2>
            <p className="text-slate-400 text-sm mt-1">订阅支出的可视化分析</p>
          </div>
          <button
            onClick={loadAnalytics}
            className="px-4 py-2 text-sm text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
          >
            刷新数据
          </button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="月度支出" value={`¥${data.totalMonthly.toFixed(0)}`} color="blue" />
          <StatCard title="年度支出" value={`¥${data.totalYearly.toFixed(0)}`} color="emerald" />
          <StatCard title="订阅数量" value={data.subscriptionCount.toString()} color="violet" />
          <StatCard title="即将到期" value={data.upcomingCount.toString()} color="amber" />
        </div>

        {/* 图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 月度趋势 */}
          <div className="bg-white rounded-xl border border-slate-200/60 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">月度支出趋势</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.monthlySpending}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94A3B8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94A3B8" />
                  <Tooltip 
                    contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0' }}
                    formatter={(value: number) => [`¥${value.toFixed(0)}`, '支出']}
                  />
                  <Line type="monotone" dataKey="amount" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 分类占比 */}
          <div className="bg-white rounded-xl border border-slate-200/60 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">分类占比</h3>
            <div className="h-64 flex items-center">
              {data.categoryBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.categoryBreakdown}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ category, percentage }) => `${category} ${percentage.toFixed(0)}%`}
                      labelLine={{ stroke: '#94A3B8' }}
                    >
                      {data.categoryBreakdown.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `¥${value.toFixed(0)}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-slate-400 text-sm w-full text-center">暂无数据</p>
              )}
            </div>
          </div>
        </div>

        {/* 分类详情 */}
        <div className="bg-white rounded-xl border border-slate-200/60 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">分类详情</h3>
          <div className="space-y-3">
            {data.categoryBreakdown.length > 0 ? (
              data.categoryBreakdown.map((cat, idx) => (
                <div key={cat.category} className="flex items-center space-x-4">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }} 
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-slate-700">{cat.category}</span>
                      <span className="text-sm text-slate-500">
                        ¥{cat.amount.toFixed(0)}/月 · {cat.count} 个订阅
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${cat.percentage}%`,
                          backgroundColor: COLORS[idx % COLORS.length]
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-sm text-center py-8">暂无订阅数据</p>
            )}
          </div>
        </div>

        {/* 货币分布 */}
        {data.currencyBreakdown.length > 1 && (
          <div className="bg-white rounded-xl border border-slate-200/60 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">货币分布</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.currencyBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94A3B8" />
                  <YAxis dataKey="currency" type="category" tick={{ fontSize: 12 }} stroke="#94A3B8" width={50} />
                  <Tooltip formatter={(value: number) => value.toFixed(0)} />
                  <Bar dataKey="amount" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 统计卡片组件
const StatCard: React.FC<{ title: string; value: string; color: string }> = ({ title, value, color }) => {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-100 text-blue-600',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-600',
    violet: 'bg-violet-50 border-violet-100 text-violet-600',
    amber: 'bg-amber-50 border-amber-100 text-amber-600',
  };

  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color]}`}>
      <p className="text-xs font-medium opacity-70 mb-1">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
};
