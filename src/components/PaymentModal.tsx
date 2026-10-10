import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  CheckCircle2,
  Plus,
  Minus,
  RotateCcw,
  IndianRupee,
  Send,
  Download,
  AlertCircle
} from 'lucide-react';
import { SaleRecord } from '../types';
import { formatWhatsAppUrlForSale } from '../services/whatsappService';

interface PaymentModalProps {
  sale: SaleRecord | null;
  onClose: () => void;
  onUpdatePayment: (saleId: string, newPaidAmount: number) => void;
  onSendBillDueReminderWhatsApp?: (sale: SaleRecord) => void; // retained for backwards compatibility
  onShareSaleWhatsApp?: (sale: SaleRecord) => void;
  onDownloadSalePDF?: (sale: SaleRecord) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  sale,
  onClose,
  onUpdatePayment,
  onSendBillDueReminderWhatsApp,
  onShareSaleWhatsApp,
  onDownloadSalePDF
}) => {
  const [paidInput, setPaidInput] = useState('0.00');
  const [customDelta, setCustomDelta] = useState('');

  useEffect(() => {
    if (sale) {
      setPaidInput((Number(sale.paid) || 0).toFixed(2));
      setCustomDelta('');
    }
  }, [sale]);

  if (!sale) return null;

  const total = Number(sale.total) || 0;
  const originalPaid = Number(sale.paid) || 0;
  const currentPaid = Math.max(0, parseFloat(paidInput) || 0);
  const currentBalance = Math.max(0, Number((total - currentPaid).toFixed(2)));
  const diff = Number((currentPaid - originalPaid).toFixed(2));

  const handleApplyDelta = (delta: number) => {
    const nextVal = Math.max(0, Number((currentPaid + delta).toFixed(2)));
    setPaidInput(nextVal.toFixed(2));
  };

  const handleApplyCustomDelta = (isAdd: boolean) => {
    const amt = parseFloat(customDelta);
    if (isNaN(amt) || amt <= 0) return;
    const delta = isAdd ? amt : -amt;
    handleApplyDelta(delta);
    setCustomDelta('');
  };

  const handleSetFullyPaid = () => {
    setPaidInput(total.toFixed(2));
  };

  const handleResetToZero = () => {
    setPaidInput('0.00');
  };

  const handleResetToOriginal = () => {
    setPaidInput(originalPaid.toFixed(2));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdatePayment(sale.id, currentPaid);
    onClose();
  };

  const handleSendInvoice = () => {
    if (onShareSaleWhatsApp) {
      onShareSaleWhatsApp(sale);
    } else {
      const url = formatWhatsAppUrlForSale(sale);
      if (url && url !== '#') {
        window.open(url, '_blank');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header - Sticky */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center sticky top-0 z-30 shadow-2xs">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-indigo-600" />
              <span>Edit Paid Amount & Adjust Bill Due</span>
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded">
                Invoice #{sale.id}
              </span>
              <span className="text-xs text-gray-500 font-medium">
                {new Date(sale.timestamp).toLocaleDateString()}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-grow text-xs">
          {/* Customer info */}
          <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-100 space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600 font-medium">Customer:</span>
              <span className="font-bold text-gray-900">
                {sale.customer.name} ({sale.customer.contact})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 font-medium">Payment Mode:</span>
              <span className="font-semibold text-blue-700">{sale.paymentMode || 'Cash'}</span>
            </div>
          </div>

          {/* WhatsApp PDF Invoice Action Banner */}
          <div className="flex items-center justify-between gap-2 p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-700 shrink-0" />
              <div>
                <span className="font-bold text-emerald-950 block">WhatsApp PDF Invoice</span>
                <span className="text-[11px] text-emerald-800">
                  Directly share official PDF bill document with customer
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleSendInvoice}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Share PDF</span>
              </button>
              {onDownloadSalePDF && (
                <button
                  type="button"
                  onClick={() => onDownloadSalePDF(sale)}
                  className="p-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors cursor-pointer"
                  title="Download Bill PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Bill summary stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-50 border border-gray-200 p-2.5 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-gray-500 block">Total Bill</span>
              <strong className="text-sm font-black text-gray-900">₹{total.toFixed(2)}</strong>
            </div>
            <div className="bg-emerald-50/60 border border-emerald-100 p-2.5 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">Current Paid</span>
              <strong className="text-sm font-black text-emerald-700">₹{currentPaid.toFixed(2)}</strong>
            </div>
            <div
              className={`p-2.5 rounded-xl border ${
                currentBalance > 0
                  ? 'bg-rose-50/70 border-rose-200 text-rose-700'
                  : 'bg-emerald-50/60 border-emerald-200 text-emerald-700'
              }`}
            >
              <span className="text-[10px] uppercase font-bold block">
                {currentBalance > 0 ? 'Pending Due' : 'Status'}
              </span>
              <strong className="text-sm font-black">
                {currentBalance > 0 ? `₹${currentBalance.toFixed(2)}` : 'Cleared'}
              </strong>
            </div>
          </div>

          {/* Input & Adjustments */}
          <div className="space-y-3 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-200">
            <label className="block text-xs font-bold text-gray-800 uppercase tracking-wide">
              Edit Paid Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-sm font-bold text-gray-500">₹</span>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={paidInput}
                onChange={(e) => setPaidInput(e.target.value)}
                className="w-full pl-8 pr-4 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base shadow-xs font-black text-emerald-700 outline-none"
              />
            </div>

            {/* Quick Add (+) & Reduce (-) buttons */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-gray-600 mb-1.5">
                <span>Quick Add / Reduce Buttons:</span>
                {diff !== 0 && (
                  <button
                    type="button"
                    onClick={handleResetToOriginal}
                    className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Revert to ₹{originalPaid.toFixed(2)}</span>
                  </button>
                )}
              </div>

              {/* Add buttons */}
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <span className="text-[10px] font-bold uppercase text-emerald-700 w-12 flex items-center gap-0.5">
                  <Plus className="w-3 h-3" /> Add:
                </span>
                {[50, 100, 200, 500, 1000].map((amt) => (
                  <button
                    key={`add-${amt}`}
                    type="button"
                    onClick={() => handleApplyDelta(amt)}
                    className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                  >
                    +₹{amt}
                  </button>
                ))}
              </div>

              {/* Reduce buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase text-rose-700 w-12 flex items-center gap-0.5">
                  <Minus className="w-3 h-3" /> Reduce:
                </span>
                {[50, 100, 200, 500, 1000].map((amt) => (
                  <button
                    key={`red-${amt}`}
                    type="button"
                    disabled={currentPaid < amt}
                    onClick={() => handleApplyDelta(-amt)}
                    className="px-2 py-1 bg-rose-100 hover:bg-rose-200 disabled:opacity-40 disabled:hover:bg-rose-100 text-rose-900 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                  >
                    -₹{amt}
                  </button>
                ))}
              </div>

              {/* Custom Delta Input */}
              <div className="mt-2.5 pt-2 border-t border-gray-200 flex items-center gap-2">
                <span className="text-[11px] font-semibold text-gray-600 shrink-0">Custom ₹:</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 250"
                  value={customDelta}
                  onChange={(e) => setCustomDelta(e.target.value)}
                  className="w-24 px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs font-bold outline-none"
                />
                <button
                  type="button"
                  disabled={!customDelta || parseFloat(customDelta) <= 0}
                  onClick={() => handleApplyCustomDelta(true)}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                >
                  + Add
                </button>
                <button
                  type="button"
                  disabled={!customDelta || parseFloat(customDelta) <= 0 || currentPaid < parseFloat(customDelta)}
                  onClick={() => handleApplyCustomDelta(false)}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                >
                  - Reduce
                </button>
              </div>
            </div>

            {/* Quick Set Full / Zero */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-200">
              <button
                type="button"
                onClick={handleSetFullyPaid}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 py-1.5 rounded-xl font-bold text-[11px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Set Fully Paid (₹0 Due)</span>
              </button>
              <button
                type="button"
                onClick={handleResetToZero}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 py-1.5 rounded-xl font-bold text-[11px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                <span>Reset to ₹0 Paid</span>
              </button>
            </div>
          </div>

          {/* Impact Banner on Customer Ledger */}
          {diff !== 0 && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2 ${
                diff > 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-amber-50 border-amber-200 text-amber-950'
              }`}
            >
              <AlertCircle
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  diff > 0 ? 'text-emerald-600' : 'text-amber-600'
                }`}
              />
              <div className="text-[11px] leading-tight">
                <strong>
                  {diff > 0 ? `+₹${diff.toFixed(2)} Added` : `-₹${Math.abs(diff).toFixed(2)} Reduced`}
                </strong>
                <p className="mt-0.5 text-gray-700">
                  {diff > 0
                    ? `Paid amount increased. Customer total due balance will decrease by ₹${diff.toFixed(2)}.`
                    : `Paid amount reduced. Customer total due balance will increase by ₹${Math.abs(diff).toFixed(2)}.`}
                </p>
              </div>
            </div>
          )}

          {/* Purchased Items Accordion/List */}
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
              Items in this bill ({sale.items.length})
            </label>
            <div className="space-y-1 border border-gray-200 rounded-xl p-2.5 bg-gray-50/60 max-h-32 overflow-y-auto">
              {sale.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center text-[11px] text-gray-700 py-0.5 border-b border-gray-100 last:border-0"
                >
                  <span className="truncate pr-2">
                    {item.name}{' '}
                    {item.code && item.code !== '-' && (
                      <span className="font-mono text-gray-400">[{item.code}]</span>
                    )}{' '}
                    (x{item.qty})
                  </span>
                  <span className="font-bold text-gray-900 shrink-0">
                    ₹{(Number(item.total) || 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex justify-between items-center pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={handleSendInvoice}
              className="px-3 py-1.5 text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl font-bold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Send className="w-3 h-3" />
              <span>Share Invoice</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save Payment</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
