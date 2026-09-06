import React from 'react';
import {
  Boxes,
  IndianRupee,
  Users,
  TrendingUp,
  PlusCircle,
  PackageCheck,
  CreditCard,
  QrCode,
  Banknote,
  Building,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import {
  InventoryItem,
  SaleRecord,
  CustomerSummary,
  PaymentMetrics,
  TabType
} from '../types';

interface DashboardViewProps {
  inventory: InventoryItem[];
  sales: SaleRecord[];
  onNavigateTab: (tab: TabType) => void;
  onSelectCustomer: (contact: string, name: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  inventory,
  sales,
  onNavigateTab,
  onSelectCustomer
}) => {
  // 1. Calculate stock metrics
  const totalStockQty = inventory.reduce((sum, i) => sum + (Number(i.qty) || 0), 0);
  const totalStockValue = inventory.reduce(
    (sum, i) => sum + (Number(i.qty) || 0) * (Number(i.sp) || 0),
    0
  );

  // 2. Customers & Sales metrics
  const custMap: Record<string, CustomerSummary> = {};
  let totalRevenue = 0;

  const paymentMetrics: PaymentMetrics = {
    cash: { amount: 0, count: 0 },
    upi: { amount: 0, count: 0 },
    card: { amount: 0, count: 0 },
    netbanking: { amount: 0, count: 0 },
    due: { amount: 0, count: 0 }
  };

  sales.forEach((s) => {
    const total = Number(s.total) || 0;
    const paid = Number(s.paid) || 0;
    const balance = Number(s.balance) || 0;
    totalRevenue += total;

    const contact = s.customer?.contact?.trim() || 'Unknown';
    const name = s.customer?.name?.trim() || 'Unknown';

    if (!custMap[contact]) {
      custMap[contact] = {
        name,
        contact,
        ordersCount: 0,
        totalSpent: 0,
        totalDue: 0
      };
    }
    custMap[contact].ordersCount += 1;
    custMap[contact].totalSpent += total;
    custMap[contact].totalDue += balance;

    const mode = (s.paymentMode || 'Cash').toLowerCase().trim();
    if (mode.includes('upi') || mode.includes('qr')) {
      paymentMetrics.upi.amount += paid;
      paymentMetrics.upi.count += 1;
    } else if (
      mode.includes('card') ||
      mode.includes('debit') ||
      mode.includes('credit card')
    ) {
      paymentMetrics.card.amount += paid;
      paymentMetrics.card.count += 1;
    } else if (
      mode.includes('net banking') ||
      mode.includes('bank') ||
      mode.includes('netbanking')
    ) {
      paymentMetrics.netbanking.amount += paid;
      paymentMetrics.netbanking.count += 1;
    } else if (mode.includes('credit') || mode.includes('due')) {
      if (paid > 0) {
        paymentMetrics.cash.amount += paid;
        paymentMetrics.cash.count += 1;
      }
    } else {
      paymentMetrics.cash.amount += paid;
      paymentMetrics.cash.count += 1;
    }

    if (balance > 0) {
      paymentMetrics.due.amount += balance;
      paymentMetrics.due.count += 1;
    }
  });

  const totalCustomersCount = Object.keys(custMap).length;
  const frequentCustomers = Object.values(custMap)
    .sort((a, b) => b.ordersCount - a.ordersCount)
    .slice(0, 10);

  const bgGradients = [
    'from-blue-600 to-indigo-600',
    'from-emerald-600 to-teal-600',
    'from-purple-600 to-indigo-600',
    'from-amber-600 to-orange-600',
    'from-rose-600 to-pink-600',
    'from-cyan-600 to-blue-600'
  ];

  return (
    <div className="space-y-6">
      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 border border-blue-100">
            <Boxes className="w-7 h-7" />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Available Stock Qty
            </div>
            <div className="text-2xl font-black text-gray-900 mt-0.5">
              {totalStockQty.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">Total units in inventory</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-100">
            <IndianRupee className="w-7 h-7" />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Stock Amount (Value)
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-0.5">
              ₹{totalStockValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">Inventory value in Rupees</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-100">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Total Customers
            </div>
            <div className="text-2xl font-black text-gray-900 mt-0.5">
              {totalCustomersCount}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">Registered customer records</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0 border border-amber-100">
            <TrendingUp className="w-7 h-7" />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Total Revenue
            </div>
            <div className="text-2xl font-black text-gray-900 mt-0.5">
              ₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">Overall recorded sales</div>
          </div>
        </div>
      </div>

      {/* Frequent Customers Carousel */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-gray-800 tracking-tight">
              Mostly Used / Frequent Customers
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Top active customers ranked by order volume. Click any customer to view ledger & details.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('customers')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>View All Customers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="p-6">
          {frequentCustomers.length === 0 ? (
            <div className="text-xs text-gray-400 font-medium py-4 text-center w-full">
              No sales recorded yet. Frequent customers will automatically appear here as bills are created.
            </div>
          ) : (
            <div className="flex items-center gap-6 overflow-x-auto no-scrollbar py-2">
              {frequentCustomers.map((cust, idx) => {
                const grad = bgGradients[idx % bgGradients.length];
                const initial = cust.name ? cust.name.charAt(0).toUpperCase() : 'C';

                return (
                  <button
                    key={cust.contact}
                    type="button"
                    onClick={() => onSelectCustomer(cust.contact, cust.name)}
                    className="group flex flex-col items-center gap-2 shrink-0 transition-all transform hover:scale-105 outline-none cursor-pointer"
                  >
                    <div className="relative">
                      <div
                        className={`w-16 h-16 rounded-2xl bg-gradient-to-tr ${grad} text-white font-black text-xl flex items-center justify-center shadow-md group-hover:shadow-lg ring-4 ring-white border border-gray-100 transition-all`}
                      >
                        {initial}
                      </div>
                      <span className="absolute -top-2 -right-2 bg-gray-900 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm border border-white">
                        {cust.ordersCount} {cust.ordersCount === 1 ? 'order' : 'orders'}
                      </span>
                    </div>
                    <div className="text-center max-w-[95px]">
                      <div className="text-xs font-bold text-gray-800 truncate leading-tight group-hover:text-blue-600 transition-colors">
                        {cust.name}
                      </div>
                      <div className="text-[10px] font-semibold text-emerald-600 mt-0.5">
                        ₹{cust.totalSpent.toFixed(0)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Action shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigateTab('billing')}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white p-5 rounded-2xl shadow-sm flex items-center justify-between text-left transition-all transform hover:-translate-y-0.5 cursor-pointer"
        >
          <div>
            <div className="text-base font-bold">New Billing Order</div>
            <div className="text-xs text-blue-100 mt-0.5">Create and issue customer invoices</div>
          </div>
          <PlusCircle className="w-6 h-6 text-white/80" />
        </button>

        <button
          onClick={() => onNavigateTab('inventory')}
          className="bg-gradient-to-r from-slate-800 to-gray-900 hover:from-slate-900 hover:to-black text-white p-5 rounded-2xl shadow-sm flex items-center justify-between text-left transition-all transform hover:-translate-y-0.5 cursor-pointer"
        >
          <div>
            <div className="text-base font-bold">Manage Inventory</div>
            <div className="text-xs text-gray-300 mt-0.5">Add stock items, prices & discounts</div>
          </div>
          <PackageCheck className="w-6 h-6 text-white/80" />
        </button>

        <button
          onClick={() => onNavigateTab('customers')}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white p-5 rounded-2xl shadow-sm flex items-center justify-between text-left transition-all transform hover:-translate-y-0.5 cursor-pointer"
        >
          <div>
            <div className="text-base font-bold">Customers & Ledger</div>
            <div className="text-xs text-emerald-100 mt-0.5">View purchase histories & pending dues</div>
          </div>
          <Users className="w-6 h-6 text-white/80" />
        </button>
      </div>

      {/* Payment Modes Sales Value Breakdown */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/80 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div>
            <h2 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Sale Value Breakdown by Payment Modes
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Real-time breakdown of transaction values collected across different payment methods.
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100 w-fit">
            Live Tracking
          </span>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Cash */}
          <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4 transition-all hover:shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                Cash
              </span>
              <span className="p-2 bg-emerald-100/80 text-emerald-700 rounded-xl">
                <Banknote className="w-4 h-4" />
              </span>
            </div>
            <div className="text-xl font-extrabold text-emerald-700">
              ₹{paymentMetrics.cash.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-emerald-600/90 mt-1 flex justify-between font-medium">
              <span>Transactions:</span>
              <strong>{paymentMetrics.cash.count}</strong>
            </div>
          </div>

          {/* UPI / QR Code */}
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 transition-all hover:shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-indigo-800 uppercase tracking-wide">
                UPI / QR Code
              </span>
              <span className="p-2 bg-indigo-100/80 text-indigo-700 rounded-xl">
                <QrCode className="w-4 h-4" />
              </span>
            </div>
            <div className="text-xl font-extrabold text-indigo-700">
              ₹{paymentMetrics.upi.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-indigo-600/90 mt-1 flex justify-between font-medium">
              <span>Transactions:</span>
              <strong>{paymentMetrics.upi.count}</strong>
            </div>
          </div>

          {/* Card */}
          <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 transition-all hover:shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wide">
                Card Payments
              </span>
              <span className="p-2 bg-blue-100/80 text-blue-700 rounded-xl">
                <CreditCard className="w-4 h-4" />
              </span>
            </div>
            <div className="text-xl font-extrabold text-blue-700">
              ₹{paymentMetrics.card.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-blue-600/90 mt-1 flex justify-between font-medium">
              <span>Transactions:</span>
              <strong>{paymentMetrics.card.count}</strong>
            </div>
          </div>

          {/* Net Banking */}
          <div className="bg-cyan-50/70 border border-cyan-100 rounded-2xl p-4 transition-all hover:shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-cyan-800 uppercase tracking-wide">
                Net Banking
              </span>
              <span className="p-2 bg-cyan-100/80 text-cyan-700 rounded-xl">
                <Building className="w-4 h-4" />
              </span>
            </div>
            <div className="text-xl font-extrabold text-cyan-700">
              ₹{paymentMetrics.netbanking.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-cyan-600/90 mt-1 flex justify-between font-medium">
              <span>Transactions:</span>
              <strong>{paymentMetrics.netbanking.count}</strong>
            </div>
          </div>

          {/* Credit / Due Balance */}
          <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-4 transition-all hover:shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wide">
                Credit / Due Bal
              </span>
              <span className="p-2 bg-rose-100/80 text-rose-700 rounded-xl">
                <AlertTriangle className="w-4 h-4" />
              </span>
            </div>
            <div className="text-xl font-extrabold text-rose-700">
              ₹{paymentMetrics.due.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-rose-600/90 mt-1 flex justify-between font-medium">
              <span>Due Bills Count:</span>
              <strong>{paymentMetrics.due.count}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
