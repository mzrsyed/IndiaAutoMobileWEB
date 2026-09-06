import React from 'react';
import { X, Send, Download, PlusCircle, Edit, FileText } from 'lucide-react';
import { SaleRecord } from '../types';

interface CustomerLedgerModalProps {
  contact: string | null;
  name: string | null;
  sales: SaleRecord[];
  onClose: () => void;
  onBookOrder: (contact: string, name: string) => void;
  onShareWhatsApp: (contact: string, name: string) => void;
  onDownloadLedgerPDF: (contact: string, name: string) => void;
  onOpenPaymentModal: (sale: SaleRecord) => void;
  onDownloadSalePDF: (sale: SaleRecord) => void;
  onShareSaleWhatsApp: (sale: SaleRecord) => void;
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
  onShareSaleWhatsApp
}) => {
  if (!contact) return null;

  const customerOrders = sales.filter(
    (s) => s.customer && s.customer.contact && s.customer.contact.trim() === contact.trim()
  );
  const customerName = name || customerOrders[0]?.customer?.name || 'Customer';

  const totalSpent = customerOrders.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const totalPaid = customerOrders.reduce((sum, s) => sum + (Number(s.paid) || 0), 0);
  const totalDue = customerOrders.reduce((sum, s) => sum + (Number(s.balance) || 0), 0);

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Customer Ledger Statement
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Account history for <strong className="text-gray-900">{customerName}</strong> (
              <span className="font-mono">{contact}</span>)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-grow space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
              <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                Total Orders
              </div>
              <div className="text-lg font-black text-gray-900 mt-0.5">
                {customerOrders.length}
              </div>
            </div>
            <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 text-center">
              <div className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">
                Total Paid
              </div>
              <div className="text-lg font-black text-emerald-700 mt-0.5">
                ₹{totalPaid.toFixed(2)}
              </div>
            </div>
            <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-100 text-center">
              <div className="text-[10px] uppercase font-bold text-rose-700 tracking-wider">
                Outstanding Due
              </div>
              <div
                className={`text-lg font-black mt-0.5 ${
                  totalDue > 0 ? 'text-rose-600' : 'text-green-600'
                }`}
              >
                ₹{totalDue.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Orders list */}
          {customerOrders.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">
              No previous purchases found for this customer.
            </p>
          ) : (
            <div className="space-y-3">
              {customerOrders.map((s) => {
                const itemsText = s.items
                  .map(
                    (i) =>
                      `${i.name} [Code: ${i.code || '-'}] (x${i.qty})${
                        i.discountPct ? ` - ${i.discountPct}% off` : ''
                      } = ₹${(Number(i.total) || 0).toFixed(2)}`
                  )
                  .join(', ');

                return (
                  <div
                    key={s.id}
                    className="p-4 border border-gray-200 rounded-2xl bg-gray-50/60 text-xs space-y-2 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between font-bold text-gray-800 border-b border-gray-200 pb-2">
                      <span className="font-mono text-blue-700">Bill ID: {s.id}</span>
                      <span className="text-gray-500 font-normal">
                        {new Date(s.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-gray-700 leading-relaxed">
                      <strong>Items & Codes:</strong> {itemsText}
                    </div>

                    <div className="flex flex-wrap justify-between items-center pt-1 text-gray-700 gap-2 border-t border-gray-100">
                      <div>
                        <span>
                          Total: <strong>₹{(Number(s.total) || 0).toFixed(2)}</strong>
                        </span>{' '}
                        &bull;{' '}
                        <span>
                          Paid:{' '}
                          <strong className="text-green-700">
                            ₹{(Number(s.paid) || 0).toFixed(2)}
                          </strong>
                        </span>{' '}
                        &bull;{' '}
                        <span>
                          Balance:{' '}
                          <strong className={s.balance > 0 ? 'text-red-600' : 'text-green-600'}>
                            ₹{(Number(s.balance) || 0).toFixed(2)}
                          </strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onShareSaleWhatsApp(s)}
                          className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg hover:bg-emerald-200 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Send className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </button>
                        <button
                          onClick={() => onDownloadSalePDF(s)}
                          className="bg-gray-200 text-gray-800 px-2.5 py-1 rounded-lg hover:bg-gray-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          <span>PDF</span>
                        </button>
                        <button
                          onClick={() => onOpenPaymentModal(s)}
                          className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded-lg hover:bg-blue-200 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="bg-gray-50 px-6 py-3.5 border-t border-gray-100 flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onShareWhatsApp(contact, customerName)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>WhatsApp Ledger</span>
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
