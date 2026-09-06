import React from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  ReceiptText,
  ShieldCheck
} from 'lucide-react';
import { TabType } from '../types';

interface NavigationProps {
  activeTab: TabType;
  isAdmin: boolean;
  onSelectTab: (tab: TabType) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  isAdmin,
  onSelectTab
}) => {
  const tabs: { id: TabType; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard Overview',
      icon: <LayoutDashboard className="w-4 h-4" />
    },
    {
      id: 'inventory',
      label: 'Parts Inventory',
      icon: <Package className="w-4 h-4" />
    },
    {
      id: 'billing',
      label: 'Customer Billing',
      icon: <ShoppingCart className="w-4 h-4" />
    },
    {
      id: 'customers',
      label: 'Customers & Ledger',
      icon: <Users className="w-4 h-4" />
    },
    {
      id: 'history',
      label: 'Sales History',
      icon: <ReceiptText className="w-4 h-4" />
    },
    {
      id: 'users',
      label: 'Manage Users',
      icon: <ShieldCheck className="w-4 h-4 text-blue-600" />,
      adminOnly: true
    }
  ];

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav
          className="flex -mb-px space-x-4 sm:space-x-8 overflow-x-auto no-scrollbar"
          aria-label="Tabs"
        >
          {tabs.map((tab) => {
            if (tab.adminOnly && !isAdmin) return null;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`whitespace-nowrap py-3.5 px-2 border-b-2 font-semibold text-sm transition-colors duration-150 flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
