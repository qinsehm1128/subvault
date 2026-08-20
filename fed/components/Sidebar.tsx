import React from 'react';
import { UnlockIcon, CreditCardIcon, KeyIcon, BrainIcon, ChartIcon, SettingsIcon, DownloadIcon, UploadIcon, LockIcon, MemoIcon } from './Icons';
import { toggleTheme } from '../utils/theme';

interface SidebarItemProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ active, onClick, icon, label, count }) => (
  <button 
    onClick={onClick} 
    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-colors duration-200 group cursor-pointer ${active ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
  >
    <div className="flex items-center space-x-3 font-medium text-sm">
      <span className={`transition-colors duration-200 ${active ? 'text-blue-600' : 'group-hover:text-slate-600'}`}>{icon}</span>
      <span>{label}</span>
    </div>
    {count !== undefined && (
      <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
        {count}
      </span>
    )}
  </button>
);

export type TabType = 'subscriptions' | 'credentials' | 'memos' | 'analytics' | 'settings' | 'ai';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  subscriptionCount?: number;
  credentialCount?: number;
  memoCount?: number;
  onExport: () => void;
  onImport: () => void;
  onLock: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const runSidebarAction = (action: () => void, onClose?: () => void) => {
  onClose?.();
  action();
};

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  subscriptionCount,
  credentialCount,
  memoCount,
  onExport,
  onImport,
  onLock,
  isOpen = false,
  onClose,
}) => {
  const changeTab = (tab: TabType) => {
    onTabChange(tab);
    onClose?.();
  };

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="关闭导航"
          className="mobile-nav-backdrop fixed inset-0 z-40 bg-slate-900/30 md:hidden"
          onClick={onClose}
        />
      )}
    <aside className={`mobile-sidebar hidden w-56 flex-col bg-white border-r border-slate-200/60 z-50 md:flex ${isOpen ? 'is-open' : ''}`} aria-label="主导航">
      <div className="p-5 flex items-center space-x-3">
        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
          <UnlockIcon className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-lg text-slate-900">SubVault</span>
      </div>

      <nav className="flex-1 px-3 space-y-1 mt-4">
        <SidebarItem 
          active={activeTab === 'subscriptions'} 
          onClick={() => changeTab('subscriptions')}
          icon={<CreditCardIcon className="w-4 h-4" />} 
          label="服务订阅" 
          count={subscriptionCount} 
        />
        <SidebarItem 
          active={activeTab === 'credentials'} 
          onClick={() => changeTab('credentials')}
          icon={<KeyIcon className="w-4 h-4" />} 
          label="凭证管理" 
          count={credentialCount} 
        />
        <SidebarItem 
          active={activeTab === 'memos'} 
          onClick={() => changeTab('memos')}
          icon={<MemoIcon className="w-4 h-4" />} 
          label="备忘录" 
          count={memoCount} 
        />
        
        <div className="pt-4 pb-2">
          <p className="px-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">分析</p>
        </div>
        
        <SidebarItem 
          active={activeTab === 'analytics'} 
          onClick={() => changeTab('analytics')}
          icon={<ChartIcon className="w-4 h-4" />} 
          label="数据分析" 
        />
        <SidebarItem 
          active={activeTab === 'ai'} 
          onClick={() => changeTab('ai')}
          icon={<BrainIcon className="w-4 h-4" />} 
          label="智能助手" 
        />
        
        <div className="pt-4 pb-2">
          <p className="px-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">设置</p>
        </div>
        
        <SidebarItem 
          active={activeTab === 'settings'} 
          onClick={() => changeTab('settings')}
          icon={<SettingsIcon className="w-4 h-4" />} 
          label="分组与通知" 
        />
      </nav>

      <div className="p-4 border-t border-slate-100 space-y-1">
        <button
          onClick={() => runSidebarAction(onExport, onClose)}
          className="w-full flex items-center space-x-3 px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors duration-200 cursor-pointer"
        >
          <DownloadIcon className="w-4 h-4" />
          <span>导出备份</span>
        </button>
        <button
          onClick={() => runSidebarAction(onImport, onClose)}
          className="w-full flex items-center space-x-3 px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors duration-200 cursor-pointer"
        >
          <UploadIcon className="w-4 h-4" />
          <span>导入备份</span>
        </button>
        <button
          onClick={() => runSidebarAction(onLock, onClose)}
          className="w-full flex items-center space-x-3 px-3 py-2 text-xs font-medium text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors duration-200 cursor-pointer"
        >
          <LockIcon className="w-4 h-4" />
          <span>锁定</span>
        </button>
        <button
          type="button"
          onClick={() => toggleTheme()}
          className="w-full flex items-center space-x-3 px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors duration-200 cursor-pointer"
        >
          <span>切换深色模式</span>
        </button>
      </div>
    </aside>
    </>
  );
};
