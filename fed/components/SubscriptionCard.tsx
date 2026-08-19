import React from 'react';
import { Subscription, Credential } from '../types';
import { TrashIcon, KeyIcon, EditIcon, RefreshIcon } from './Icons';
import { getDaysRemaining, getCycleProgress, formatCurrency, formatFrequency } from '../utils/subscription';

interface SubscriptionCardProps {
  subscription: Subscription;
  linkedCredential?: Credential;
  onEdit: () => void;
  onDelete: () => void;
  onRefresh?: () => void;
}

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscription: sub,
  linkedCredential,
  onEdit,
  onDelete,
  onRefresh,
}) => {
  const daysLeft = getDaysRemaining(sub.renewalDate);
  const progress = getCycleProgress(sub.startDate, sub.renewalDate);

  // 状态颜色
  let statusText = 'text-emerald-600';
  let progressColor = 'bg-emerald-500';

  if (daysLeft <= 3) {
    statusText = 'text-rose-600';
    progressColor = 'bg-rose-500';
  } else if (daysLeft <= 7) {
    statusText = 'text-amber-600';
    progressColor = 'bg-amber-500';
  }

  return (
    <div
      className="group relative bg-white rounded-2xl border border-slate-200/60 hover:border-blue-200 hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden"
      onClick={onEdit}
    >
      {/* 顶部渐变条 */}
      <div className={`h-1 w-full ${progressColor}`} />

      <div className="p-5">
        {/* 头部 */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
              {sub.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900 text-[15px] truncate leading-tight">{sub.name}</h3>
              <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded-md text-[10px] font-medium bg-slate-100 text-slate-500">
                {sub.category}
              </span>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center space-x-0.5 touch-action-visible md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
            {onRefresh && sub.frequencyUnit !== 'PERMANENT' && (
              <button
                onClick={(e) => { e.stopPropagation(); onRefresh(); }}
                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors duration-200"
                aria-label={`刷新续期 ${sub.name}`}
                title="已续费，刷新到期时间"
              >
                <RefreshIcon className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors duration-200"
              aria-label={`编辑 ${sub.name}`}
            >
              <EditIcon className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors duration-200"
              aria-label={`删除 ${sub.name}`}
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 价格 */}
        <div className="flex items-baseline mb-5">
          <span className="text-2xl font-bold text-slate-900 tracking-tight">
            {formatCurrency(sub.currency, sub.cost)}
          </span>
          <span className="text-sm text-slate-400 font-medium ml-1.5">
            / {formatFrequency(sub.frequencyAmount, sub.frequencyUnit)}
          </span>
        </div>

        {/* 进度和状态 */}
        <div className="space-y-3">
          {/* 进度条 */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">
                {sub.frequencyUnit === 'PERMANENT' ? '授权状态' : '计费周期'}
              </span>
              <div className="flex items-center space-x-1.5">
                <span className={`font-semibold ${statusText}`}>
                  {sub.frequencyUnit === 'PERMANENT'
                    ? '永久有效'
                    : (daysLeft <= 0 ? '今日扣费' : `${daysLeft} 天后续费`)}
                </span>
                {onRefresh && sub.frequencyUnit !== 'PERMANENT' && daysLeft <= 3 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRefresh(); }}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 cursor-pointer transition-colors font-medium"
                    title="已续费，点击刷新到期时间"
                  >
                    已续费
                  </button>
                )}
              </div>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full ${progressColor} transition-all duration-500 rounded-full`}
                style={{ width: `${sub.frequencyUnit === 'PERMANENT' ? 100 : progress}%` }}
              />
            </div>
          </div>

          {/* 底部信息 */}
          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            {linkedCredential ? (
              <div className="flex items-center space-x-1.5 text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                <KeyIcon className="w-3.5 h-3.5" />
                <span className="text-xs font-medium truncate max-w-[100px]">{linkedCredential.label}</span>
              </div>
            ) : (
              <span className="text-xs text-slate-400">未关联凭证</span>
            )}
            <span className="text-xs text-slate-400 font-medium tabular-nums">
              {sub.frequencyUnit !== 'PERMANENT' ? sub.renewalDate : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
