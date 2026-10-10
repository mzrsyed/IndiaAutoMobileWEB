import React, { useState } from 'react';
import {
  X,
  Send,
  Download,
  PlusCircle,
  Edit,
  FileText,
  IndianRupee,
  Layers,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Calendar,
  Package,
  BellRing,
  Plus,
  Minus,
  AlertCircle,
  RotateCcw,
  Check
} from 'lucide-react';
import { SaleRecord } from '../types';
import { formatWhatsAppUrlForTotalDueReminder } from '../services/whatsappService';
import { getDueReminderPDFFile, sharePDFFile } from '../services/pdfService';

interface CustomerLedgerModalProps {
  contact: string | null;
  name: string | null;
  sales: SaleRecord[];
  onClose: () => void;
  onBookOrder: (contact: string, name: string) => void;
  onShareWhatsApp?: (contact: string, name: string) => void;
  onDownloadLedgerPDF: (contact: string, name: string) => void;
  onOpenPaymentModal: (sale: SaleRecord) => void;
  onDownloadSalePDF: (sale: SaleRecord) => void;
  onShareSaleWhatsApp: (sale: SaleRecord) => void;
  onAdjustCustomerBalance: (contact: string, amount: number, action?: 'add' | 'reduce') => Promise<void>;
  onUpdatePayment?: (saleId: string, newPaidAmount: number) => Promise<void> | void;
  onSendTotalDueReminderWhatsApp?: (contact: string, name: string) => void;
  onSendBillDueReminderWhatsApp?: (sale: SaleRecord) => void; // retained optional for compatibility
}

export const CustomerLedgerModal: React.FC<CustomerLedgerModalProps> = ({
  contact,
  name,
  sales,
  onClose,
  onBookOrder,
  onShareWhatsApp,
  onDownloadLedgerPDF,
  onOpenPaymentModal,
  onDownloadSalePDF,
  onShareSaleWhatsApp,
  onAdjustCustomerBalance,
  onUpdatePayment,
  onSendTotalDueReminderWhatsApp
}) => {
  const [addMoneyInput, setAddMoneyInput] = useState('');
  const [adjustAction, setAdjustAction] = useState<'add' | 'reduce'>('add');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [showAddMoneyBox, setShowAddMoneyBox] = useState(false);
  const [activeTab, setActiveTab] = useState<'individual' | 'merged'>('merged');
  const [expandedMergedBill, setExpandedMergedBill] = useState(true);

  // Inline editing state for individual bills
  const [inlineEditingSaleId, setInlineEditingSaleId] = useState<string | null>(null);
  const [inlinePaidInput, setInlinePaidInput] = useState<string>('0.00');
  const [isSavingInline, setIsSavingInline] = useState(false);

  if (!contact) return null;

  const cleanContact = contact.trim().toLowerCase();
  const customerOrders = sales.filter(
    (s) => s.customer && s.customer.contact && s.customer.contact.trim().toLowerCase() === cleanContact
  );

  // Sort orders with newest first for display
  const sortedOrders = [...customerOrders].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const customerName = name || customerOrders[0]?.customer?.name || 'Customer';

  const totalSpent = customerOrders.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const totalPaid = customerOrders.reduce((sum, s) => sum + (Number(s.paid) || 0), 0);
  const totalDue = Math.max(0, Number((totalSpent - totalPaid).toFixed(2)));
  const pendingOrdersCount = customerOrders.filter((s) => {
    const bal = Math.max(0, (Number(s.total) || 0) - (Number(s.paid) || 0));
    return bal > 0.001;
  }).length;

  // Merged items list across all orders
  const mergedItemsMap: Record<
    string,
    { id: string; name: string; code: string; qty: number; total: number; orderCount: number }
  > = {};

  customerOrders.forEach((sale) => {
    (sale.items || []).forEach((item) => {
      const key = `${(item.name || '').trim().toLowerCase()}_${(item.code || '').trim().toLowerCase()}`;
      if (!mergedItemsMap[key]) {
        mergedItemsMap[key] = {
          id: item.id || key,
          name: item.name,
          code: item.code || '-',
          qty: 0,
          total: 0,
          orderCount: 0
        };
      }
      mergedItemsMap[key].qty += Number(item.qty) || 0;
      mergedItemsMap[key].total += Number(item.total) || 0;
      mergedItemsMap[key].orderCount += 1;
    });
  });

  const mergedItems = Object.values(mergedItemsMap);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(addMoneyInput);
    if (isNaN(amount) || amount <= 0) return;

    try {
      setIsAdjusting(true);
      await onAdjustCustomerBalance(contact, amount, adjustAction);
      setAddMoneyInput('');
      setShowAddMoneyBox(false);
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleQuickClearAllDue = async () => {
    if (totalDue <= 0) return;
    try {
      setIsAdjusting(true);
      await onAdjustCustomerBalance(contact, totalDue, 'add');
      setAddMoneyInput('');
      setShowAddMoneyBox(false);
    } finally {
      setIsAdjusting(false);
    }
  };

  // Direct WhatsApp reminder for TOTAL customer due balance (Shares Due Reminder PDF)
  const handleTotalDueReminder = async () => {
    if (onSendTotalDueReminderWhatsApp) {
      onSendTotalDueReminderWhatsApp(contact, customerName);
    } else {
      try {
        const pdfFile = await getDueReminderPDFFile(customerName, contact, customerOrders);
        const result = await sharePDFFile(
          pdfFile,
          `Payment Due Reminder - ${customerName}`,
          `Payment Due Reminder Statement for ${customerName}. Total Due: ₹${totalDue.toFixed(2)}`
        );
        if (!result.sharedDirectly) {
          const url = formatWhatsAppUrlForTotalDueReminder(customerName, contact, customerOrders);
          if (url && url !== '#') {
            const link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            link.remove();
          }
        }
      } catch (err) {
        console.error('Error sharing reminder PDF:', err);
      }
    }
  };

  // Start inline editing of a bill's paid amount
  const handleStartInlineEdit = (sale: SaleRecord) => {
    setInlineEditingSaleId(sale.id);
    setInlinePaidInput((Number(sale.paid) || 0).toFixed(2));
  };

  const handleCancelInlineEdit = () => {
    setInlineEditingSaleId(null);
    setInlinePaidInput('0.00');
  };

  const handleInlineApplyDelta = (delta: number) => {
    const cur = parseFloat(inlinePaidInput) || 0;
    const nextVal = Math.max(0, Number((cur + delta).toFixed(2)));
    setInlinePaidInput(nextVal.toFixed(2));
  };

  const handleSaveInlineEdit = async (sale: SaleRecord) => {
    if (!onUpdatePayment) {
      onOpenPaymentModal(sale);
      return;
    }
    const newPaid = Math.max(0, parseFloat(inlinePaidInput) || 0);
    try {
      setIsSavingInline(true);
      await onUpdatePayment(sale.id, newPaid);
      setInlineEditingSaleId(null);
    } finally {
      setIsSavingInline(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center z-50 px-4 py-6">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header - Sticky */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center sticky top-0 z-30 shadow-2xs">
          <div>
            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Customer Ledger Statement
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Account history for <strong className="text-gray-900">{customerName}</strong> (
              <span className="font-mono text-gray-700">{contact}</span>)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-grow space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-center">
              <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                Total Orders Bill Amount
              </div>
              <div className="text-lg font-black text-gray-900 mt-0.5">
                ₹{totalSpent.toFixed(2)}
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                {customerOrders.length} {customerOrders.length === 1 ? 'order' : 'orders'} recorded
              </div>
            </div>

            <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-100 text-center">
              <div className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
                Total Amount Paid
              </div>
              <div className="text-lg font-black text-emerald-700 mt-0.5">
                ₹{totalPaid.toFixed(2)}
              </div>
              <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
                Received so far
              </div>
            </div>

            <div className="bg-rose-50/70 p-3.5 rounded-xl border border-rose-100 text-center relative flex flex-col justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-rose-800 tracking-wider">
                  Total Due Balance
                </div>
                <div
                  className={`text-lg font-black mt-0.5 ${
                    totalDue > 0.01 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  ₹{totalDue.toFixed(2)}
                </div>
                <div className="text-[11px] text-rose-600 font-medium mt-0.5">
                  {pendingOrdersCount > 0
                    ? `${pendingOrdersCount} unpaid / partial bill(s)`
                    : 'All bills cleared'}
                </div>
              </div>

              {/* DIRECT WHATSAPP TOTAL DUE REMINDER (PDF FILE) BUTTON */}
              <div className="mt-2 pt-2 border-t border-rose-200/60">
                <button
                  type="button"
                  onClick={handleTotalDueReminder}
                  className={`w-full py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer ${
                    totalDue > 0.01
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                  title={
                    totalDue > 0.01
                      ? `Send official Due Reminder Statement PDF (₹${totalDue.toFixed(2)}) directly to WhatsApp`
                      : 'Send total balance settled PDF confirmation'
                  }
                >
                  <BellRing className="w-3.5 h-3.5 text-white shrink-0" />
                  <span>
                    {totalDue > 0.01
                      ? `WhatsApp Due Reminder PDF (₹${totalDue.toFixed(2)})`
                      : 'WhatsApp Settled PDF'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Add / Reduce Money & Adjust Due Payment Banner */}
          <div className="border border-indigo-100 bg-indigo-50/60 rounded-2xl p-4 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5 uppercase tracking-wide">
                  <IndianRupee className="w-4 h-4 text-indigo-600" />
                  Add or Reduce Money & Adjust Pending Bills
                </h4>
                <p className="text-xs text-indigo-800/80 mt-0.5">
                  Deposit money to clear customer debt or deduct adjustments across bills. Automatically updates total billing and remaining balances.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {totalDue > 0.01 && (
                  <button
                    type="button"
                    disabled={isAdjusting}
                    onClick={handleQuickClearAllDue}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Clear Full Due (₹{totalDue.toFixed(2)})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowAddMoneyBox(!showAddMoneyBox)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <IndianRupee className="w-3.5 h-3.5" />
                  <span>{showAddMoneyBox ? 'Hide Adjust Box' : 'Adjust Total Billing'}</span>
                </button>
              </div>
            </div>

            {/* Expandable Add / Reduce Money Form */}
            {showAddMoneyBox && (
              <div className="mt-4 pt-3 border-t border-indigo-200/70 space-y-3">
                {/* Action Selector: Add vs Reduce */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-900 mr-1">Action:</span>
                  <button
                    type="button"
                    onClick={() => setAdjustAction('add')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                      adjustAction === 'add'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Payment (Offset Due)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustAction('reduce')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                      adjustAction === 'reduce'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span>Reduce Payment (Reversal / Adjustment)</span>
                  </button>
                </div>

                <p className="text-[11px] text-gray-600">
                  {adjustAction === 'add'
                    ? 'Applies payment to unpaid bills starting from oldest to newest, reducing customer pending debt.'
                    : 'Deducts paid amounts starting from newest paid bills, re-opening pending balance and increasing customer debt.'}
                </p>

                {/* Quick chip buttons */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="font-semibold text-gray-600 text-[11px]">Quick Amounts:</span>
                  {(adjustAction === 'add' ? [100, 200, 500, 1000, 2000] : [100, 200, 500, 1000]).map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAddMoneyInput(amt.toString())}
                      className="px-2.5 py-0.5 bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-900 rounded-md text-[11px] font-bold cursor-pointer transition-colors"
                    >
                      {adjustAction === 'add' ? `+₹${amt}` : `-₹${amt}`}
                    </button>
                  ))}
                  {adjustAction === 'add' && totalDue > 0 && (
                    <button
                      type="button"
                      onClick={() => setAddMoneyInput(totalDue.toFixed(2))}
                      className="px-2.5 py-0.5 bg-emerald-100 border border-emerald-300 hover:bg-emerald-200 text-emerald-900 rounded-md text-[11px] font-bold cursor-pointer"
                    >
                      Full Due (₹{totalDue.toFixed(2)})
                    </button>
                  )}
                </div>

                <form
                  onSubmit={handleAdjustSubmit}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                >
                  <div className="relative flex-grow">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-500">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder={
                        adjustAction === 'add'
                          ? totalDue > 0
                            ? `Enter amount to add (current total due is ₹${totalDue.toFixed(2)})`
                            : 'Enter amount to deposit'
                          : `Enter amount to reduce (current total paid is ₹${totalPaid.toFixed(2)})`
                      }
                      value={addMoneyInput}
                      onChange={(e) => setAddMoneyInput(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 bg-white border border-indigo-300 rounded-xl text-sm font-bold text-indigo-950 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={isAdjusting || !addMoneyInput || parseFloat(addMoneyInput) <= 0}
                      className={`px-4 py-2 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                        adjustAction === 'add'
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : 'bg-rose-600 hover:bg-rose-700'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {isAdjusting
                          ? 'Updating Bills...'
                          : adjustAction === 'add'
                          ? 'Apply Payment & Update Bills'
                          : 'Reduce Payment & Update Bills'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddMoneyInput('');
                        setShowAddMoneyBox(false);
                      }}
                      className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* View Mode Switcher: Merged Bills vs Individual Orders - Sticky */}
          <div className="flex border-b border-gray-200 gap-4 pt-2 sticky top-0 z-20 bg-white/95 backdrop-blur-xs shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab('merged')}
              className={`pb-2 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'merged'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Merged Customer Statement ({customerOrders.length} Orders Combined)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('individual')}
              className={`pb-2 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'individual'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Individual Bills List ({customerOrders.length})</span>
            </button>
          </div>

          {/* TAB 1: Merged Orders View */}
          {activeTab === 'merged' && (
            <div className="space-y-4">
              <div className="border border-blue-200 bg-blue-50/40 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                      Consolidated Account Bill
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold">
                      {customerOrders.length} total transactions merged
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedMergedBill(!expandedMergedBill)}
                    className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
                  >
                    <span>{expandedMergedBill ? 'Hide Items' : 'Show All Purchased Items'}</span>
                    {expandedMergedBill ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Overall Summary Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-3 rounded-xl border border-blue-100 text-xs">
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Total Bill:</span>
                    <strong className="text-gray-900 text-sm">₹{totalSpent.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Total Paid:</span>
                    <strong className="text-green-700 text-sm">₹{totalPaid.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Pending Due:</span>
                    <strong className={`text-sm ${totalDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{totalDue.toFixed(2)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Ledger Status:</span>
                    <strong
                      className={`text-xs uppercase px-2 py-0.5 rounded-md inline-block font-bold ${
                        totalDue > 0
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {totalDue > 0 ? 'Payment Due' : 'Fully Settled'}
                    </strong>
                  </div>
                </div>

                {/* Merged Items Table */}
                {expandedMergedBill && (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden text-xs">
                    <div className="px-3.5 py-2 bg-gray-50 border-b border-gray-200 font-bold text-gray-700 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-gray-500" />
                      <span>Consolidated Purchased Items (Combined Quantities & Totals)</span>
                    </div>
                    {mergedItems.length === 0 ? (
                      <p className="p-4 text-center text-gray-400">No items found in account.</p>
                    ) : (
                      <div className="max-h-60 overflow-y-auto divide-y divide-gray-100">
                        {mergedItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="px-3.5 py-2 flex items-center justify-between hover:bg-gray-50/80 transition-colors"
                          >
                            <div>
                              <span className="font-semibold text-gray-800">{item.name}</span>
                              {item.code && item.code !== '-' && (
                                <span className="ml-1.5 font-mono text-[11px] text-gray-400">
                                  [{item.code}]
                                </span>
                              )}
                              <span className="ml-2 text-[11px] text-gray-500 font-medium">
                                (Ordered in {item.orderCount} bill{item.orderCount > 1 ? 's' : ''})
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md mr-3">
                                Total Qty: {item.qty}
                              </span>
                              <span className="font-bold text-gray-900">
                                ₹{item.total.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Individual Orders List */}
          {activeTab === 'individual' && (
            <div>
              {sortedOrders.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-6">
                  No previous purchases found for this customer.
                </p>
              ) : (
                <div className="space-y-3">
                  {sortedOrders.map((s) => {
                    const totalVal = Number(s.total) || 0;
                    const paidVal = Number(s.paid) || 0;
                    const balVal = Math.max(0, Number((totalVal - paidVal).toFixed(2)));
                    const isDue = balVal > 0.001;
                    const isInlineOpen = inlineEditingSaleId === s.id;
                    const inlineCurrentPaid = Math.max(0, parseFloat(inlinePaidInput) || 0);
                    const inlineCurrentBal = Math.max(0, Number((totalVal - inlineCurrentPaid).toFixed(2)));
                    const inlineDiff = Number((inlineCurrentPaid - paidVal).toFixed(2));

                    const itemsText = (s.items || [])
                      .map(
                        (i) =>
                          `${i.name}${i.code && i.code !== '-' ? ` [${i.code}]` : ''} (x${i.qty})${
                            i.discountPct ? ` - ${i.discountPct}% off` : ''
                          } = ₹${(Number(i.total) || 0).toFixed(2)}`
                      )
                      .join(', ');

                    return (
                      <div
                        key={s.id}
                        className={`p-4 border rounded-2xl text-xs space-y-2.5 transition-all ${
                          isDue
                            ? 'bg-rose-50/30 border-rose-200 hover:bg-rose-50/50'
                            : 'bg-gray-50/60 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {/* Bill Header */}
                        <div className="flex justify-between items-center border-b border-gray-200/80 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-blue-700">Bill ID: #{s.id}</span>
                            {isDue ? (
                              <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-rose-600" />
                                <span>Due Pending: ₹{balVal.toFixed(2)}</span>
                              </span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Fully Paid</span>
                              </span>
                            )}
                          </div>
                          <span className="text-gray-500 font-normal flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            {new Date(s.timestamp).toLocaleString()}
                          </span>
                        </div>

                        {/* Items text */}
                        <div className="text-gray-700 leading-relaxed">
                          <strong>Items & Codes:</strong> {itemsText}
                        </div>

                        {/* Financial summary & Action buttons */}
                        <div className="flex flex-wrap justify-between items-center pt-2 text-gray-700 gap-2 border-t border-gray-100">
                          <div className="flex items-center gap-2 text-xs">
                            <span>
                              Total: <strong className="text-gray-900">₹{totalVal.toFixed(2)}</strong>
                            </span>{' '}
                            &bull;{' '}
                            <span>
                              Paid:{' '}
                              <strong className="text-green-700">
                                ₹{paidVal.toFixed(2)}
                              </strong>
                            </span>{' '}
                            &bull;{' '}
                            <span>
                              Balance:{' '}
                              <strong className={isDue ? 'text-red-600 font-black' : 'text-green-600 font-bold'}>
                                ₹{balVal.toFixed(2)}
                              </strong>
                            </span>
                          </div>

                          {/* Action Buttons on Individual Bill (Individual reminder removed in favor of total due reminder) */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {/* Share Direct PDF Invoice on WhatsApp */}
                            <button
                              type="button"
                              onClick={() => onShareSaleWhatsApp(s)}
                              title="Share PDF invoice on WhatsApp"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                            >
                              <Send className="w-3.5 h-3.5 text-emerald-100" />
                              <span>WhatsApp PDF Invoice</span>
                            </button>

                            {/* Download PDF */}
                            <button
                              type="button"
                              onClick={() => onDownloadSalePDF(s)}
                              title="Download PDF invoice"
                              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1.5 rounded-xl font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Download className="w-3 h-3 text-gray-500" />
                              <span>PDF</span>
                            </button>

                            {/* Adjust / Edit Paid Amount */}
                            <button
                              type="button"
                              onClick={() => {
                                if (isInlineOpen) {
                                  handleCancelInlineEdit();
                                } else {
                                  handleStartInlineEdit(s);
                                }
                              }}
                              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs ${
                                isInlineOpen
                                  ? 'bg-indigo-700 text-white'
                                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                              }`}
                            >
                              <IndianRupee className="w-3.5 h-3.5" />
                              <span>{isInlineOpen ? 'Close Adjust' : 'Adjust Paid'}</span>
                            </button>

                            {/* Full Edit Modal */}
                            <button
                              type="button"
                              onClick={() => onOpenPaymentModal(s)}
                              title="Open complete payment edit dialog"
                              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-2.5 py-1.5 rounded-xl font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Edit className="w-3 h-3" />
                              <span>More</span>
                            </button>
                          </div>
                        </div>

                        {/* Inline Paid Amount Adjustment Drawer */}
                        {isInlineOpen && (
                          <div className="mt-3 pt-3 border-t border-indigo-200 bg-white rounded-xl p-3.5 space-y-3 shadow-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-indigo-950 flex items-center gap-1.5 text-xs">
                                <IndianRupee className="w-4 h-4 text-indigo-600" />
                                Edit Paid Amount on Bill #{s.id}
                              </span>
                              <span className="text-[11px] text-gray-500">
                                Total Bill: <strong>₹{totalVal.toFixed(2)}</strong>
                              </span>
                            </div>

                            {/* Quick Add / Reduce buttons */}
                            <div className="space-y-2">
                              {/* Add */}
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] font-bold uppercase text-emerald-700 w-12 flex items-center gap-0.5">
                                  <Plus className="w-3 h-3" /> Add:
                                </span>
                                {[50, 100, 200, 500, 1000].map((amt) => (
                                  <button
                                    key={amt}
                                    type="button"
                                    onClick={() => handleInlineApplyDelta(amt)}
                                    className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded font-bold text-[11px] cursor-pointer"
                                  >
                                    +₹{amt}
                                  </button>
                                ))}
                                {balVal > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setInlinePaidInput(totalVal.toFixed(2))}
                                    className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px] cursor-pointer"
                                  >
                                    Clear Due (₹{totalVal.toFixed(2)})
                                  </button>
                                )}
                              </div>

                              {/* Reduce */}
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] font-bold uppercase text-rose-700 w-12 flex items-center gap-0.5">
                                  <Minus className="w-3 h-3" /> Reduce:
                                </span>
                                {[50, 100, 200, 500].map((amt) => (
                                  <button
                                    key={amt}
                                    type="button"
                                    disabled={inlineCurrentPaid < amt}
                                    onClick={() => handleInlineApplyDelta(-amt)}
                                    className="px-2 py-0.5 bg-rose-100 hover:bg-rose-200 disabled:opacity-40 text-rose-900 rounded font-bold text-[11px] cursor-pointer"
                                  >
                                    -₹{amt}
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => setInlinePaidInput('0.00')}
                                  className="px-2 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-semibold text-[11px] cursor-pointer"
                                >
                                  Reset to ₹0 Paid
                                </button>
                              </div>
                            </div>

                            {/* Direct numeric input & Save */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 border-t border-gray-100">
                              <div className="relative flex-grow">
                                <span className="absolute left-3 top-2 text-xs font-bold text-gray-500">₹</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={inlinePaidInput}
                                  onChange={(e) => setInlinePaidInput(e.target.value)}
                                  className="w-full pl-7 pr-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-emerald-700 outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>

                              <div className="text-xs text-gray-600 whitespace-nowrap px-1">
                                New Due: <strong className={inlineCurrentBal > 0 ? 'text-red-600' : 'text-green-600'}>₹{inlineCurrentBal.toFixed(2)}</strong>
                                {inlineDiff !== 0 && (
                                  <span className="ml-1 text-[11px] font-semibold text-indigo-700">
                                    ({inlineDiff > 0 ? `+₹${inlineDiff.toFixed(2)} added` : `-₹${Math.abs(inlineDiff).toFixed(2)} reduced`})
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  disabled={isSavingInline}
                                  onClick={() => handleSaveInlineEdit(s)}
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer shadow-xs"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{isSavingInline ? 'Saving...' : 'Save Paid'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelInlineEdit}
                                  className="px-2.5 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-semibold cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="bg-gray-50 px-6 py-3.5 border-t border-gray-100 flex flex-wrap justify-between items-center gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleTotalDueReminder}
              className={`px-3.5 py-2 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer ${
                totalDue > 0.01
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
              title="Share Official Due Reminder PDF directly to WhatsApp"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>
                {totalDue > 0.01
                  ? `WhatsApp Due Reminder PDF (₹${totalDue.toFixed(2)})`
                  : 'WhatsApp Settled PDF'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onDownloadLedgerPDF(contact, customerName)}
              className="px-3.5 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ledger PDF</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onBookOrder(contact, customerName);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Book New Order</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
