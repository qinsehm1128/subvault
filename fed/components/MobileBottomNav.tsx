import React from 'react';
import { CreditCardIcon, KeyIcon, MemoIcon, ChartIcon, MoreHorizontalIcon } from './Icons';
import { TabType } from './Sidebar';

const PRIMARY_TABS: TabType[] = ['subscriptions', 'credentials', 'memos', 'analytics'];

const items: Array<{
  id: TabType | 'more';
  label: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: 'subscriptions', label: '订阅', icon: CreditCardIcon },
  { id: 'credentials', label: '凭证', icon: KeyIcon },
  { id: 'memos', label: '备忘', icon: MemoIcon },
  { id: 'analytics', label: '分析', icon: ChartIcon },
  { id: 'more', label: '更多', icon: MoreHorizontalIcon },
];

interface MobileBottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onOpenMore: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenMore,
}) => {
  const moreActive = !PRIMARY_TABS.includes(activeTab);

  return (
    <nav
      className="mobile-bottom-nav flex md:hidden shrink-0 border-t border-slate-200/70 bg-white"
      aria-label="底部导航"
    >
      {items.map((item) => {
        const active = item.id === 'more' ? moreActive : activeTab === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (item.id === 'more') {
                onOpenMore();
                return;
              }
              onTabChange(item.id);
            }}
            className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
              active ? 'text-blue-600' : 'text-slate-400'
            }`}
          >
            <Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
