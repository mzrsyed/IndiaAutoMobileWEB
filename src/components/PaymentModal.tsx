import React, { useState, useEffect } from 'react';
import { X, Check, CheckCircle2 } from 'lucide-react';
import { SaleRecord } from '../types';

interface PaymentModalProps {
  sale: SaleRecord | null;
  onClose: () => void;
  onUpdatePayment: (saleId: string, newPaidAmount: number) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  sale,
  onClose,
  onUpdatePayment
}) => {
  const [paidInput, setPaidInput] = useState('0.00');

  useEffect(() => {
    if (sale) {
      setPaidInput(sale.paid.toString());
    }
  }, [sale]);

  if (!sale) return null;

  const total = Number(sale.total) || 0;
  const currentPaid = parseFloat(paidInput) || 0;
  const currentBalance = Math.max(0, total - currentPaid);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdatePayment(sale.id, currentPaid);
    onClose();
  };

  const handleSetFullyPaid = () => {
    setPaidInput(total.toFixed(2));
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="text-base font-bold text-gray-800">
              Update Sale & Payment Details
            </h3>
            <span className="text-xs font-mono text-indigo-600 font-semibold">
              Invoice #{sale.id}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-grow">
          <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-100 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">Customer:</span>
              <span className="font-bold text-gray-900">
                {sale.customer.name} ({sale.customer.contact})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Date:</span>
              <span className="font-medium text-gray-700">
                {new Date(sale.timestamp).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Payment Option:</span>
              <span className="font-semibold text-blue-700">{sale.paymentMode || 'Cash'}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-2">
              Purchased Items & Quantities
            </label>
            <div className="space-y-1.5 border border-gray-200 rounded-xl p-3 bg-gray-50 max-h-40 overflow-y-auto">
              {sale.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center text-xs text-gray-700 py-1 border-b border-gray-100 last:border-0"
                >
                  <span>
                    {item.name}{' '}
                    {item.code && item.code !== '-' && (
                      <span className="font-mono text-gray-400">[{item.code}]</span>
                    )}{' '}
                    (x{item.qty})
                    {item.discountPct ? (
                      <span className="text-orange-600 font-semibold">
                        {' '}
                        (-{item.discountPct}%)
                      </span>
                    ) : null}
                  </span>
                  <span className="font-bold text-gray-900">
                    ₹{(Number(item.total) || 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center py-2 px-4 bg-gray-100 rounded-xl border border-gray-200">
            <span className="text-sm font-semibold text-gray-700">Total Bill Amount:</span>
            <span className="text-lg font-black text-gray-900">₹{total.toFixed(2)}</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">
              Update Paid Amount (₹)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={paidInput}
              onChange={(e) => setPaidInput(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm font-bold text-green-700 outline-none"
            />
          </div>

          <div className="flex justify-between items-center py-2 px-4 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-sm font-medium text-gray-700">Remaining Balance:</span>
            <span
              className={`text-lg font-black ${
                currentBalance > 0 ? 'text-red-600' : 'text-green-600'
              }`}
            >
              ₹{currentBalance.toFixed(2)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSetFullyPaid}
            className="w-full bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Set as Fully Paid (₹0 Balance)</span>
          </button>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
