import React, { useState } from 'react';
import {
  Search,
  RefreshCw,
  FileSpreadsheet,
  Trash2,
  Edit,
  Download,
  Send,
  ReceiptText,
  Eye,
  Printer,
  X,
  MapPin,
  FileText
} from 'lucide-react';
import { SaleRecord } from '../types';
import { BrandLogo } from './Logo';

interface HistoryViewProps {
  sales: SaleRecord[];
  onRefresh: () => void;
  onOpenPaymentModal: (sale: SaleRecord) => void;
  onDownloadPDF: (sale: SaleRecord) => void;
  onShareWhatsApp: (sale: SaleRecord) => void;
  onSendReminderWhatsApp?: (sale: SaleRecord) => void;
  onDeleteSale: (saleId: string) => void;
  onClearHistory: () => void;
  onExportCSV: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  sales,
  onRefresh,
  onOpenPaymentModal,
  onDownloadPDF,
  onShareWhatsApp,
  onSendReminderWhatsApp,
  onDeleteSale,
  onClearHistory,
  onExportCSV
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [viewingSale, setViewingSale] = useState<SaleRecord | null>(null);

  const filteredSales = sales.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const matchId = (s.id || '').toLowerCase().includes(q);
    const matchName = (s.customer?.name || '').toLowerCase().includes(q);
    const matchContact = (s.customer?.contact || '').toLowerCase().includes(q);
    const matchItems = (s.items || []).some(
      (it) =>
        (it.name || '').toLowerCase().includes(q) ||
        (it.code || '').toLowerCase().includes(q)
    );
    return matchId || matchName || matchContact || matchItems;
  });

  const selectedSale = selectedSaleId ? sales.find((s) => s.id === selectedSaleId) : null;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header & Controls - Sticky */}
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/95 backdrop-blur-xs sticky top-0 z-20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-2xs">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <ReceiptText className="w-5 h-5 text-blue-600" />
              Sales Record & Invoices
            </h2>
            <p className="text-xs text-gray-500">
              Select any transaction row to edit payment, download bill PDF, or share on WhatsApp
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-60">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ID, customer, item..."
                className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm outline-none"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
            </div>

            <button
              onClick={onRefresh}
              title="Refresh sales list"
              className="flex items-center gap-1 text-xs font-semibold text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 px-2.5 py-1.5 rounded-xl transition-colors shadow-sm cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>

            <button
              onClick={onExportCSV}
              className="text-xs text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1 font-semibold border border-green-200 cursor-pointer shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel (.csv)</span>
            </button>

            <button
              onClick={onClearHistory}
              className="text-xs text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1 font-semibold border border-red-200 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Selected Sale Action Toolbar - Sticky */}
        {selectedSale && (
          <div className="bg-indigo-50/95 backdrop-blur-xs px-6 py-3.5 border-b border-indigo-100 sticky top-[73px] z-20 flex flex-wrap items-center justify-between gap-3 transition-all shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
              <span className="text-xs font-bold text-gray-800">
                Selected Bill:{' '}
                <span className="text-indigo-700 font-mono font-extrabold">{selectedSale.id}</span> (
                {selectedSale.customer.name} - ₹{selectedSale.total.toFixed(2)})
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setViewingSale(selectedSale)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
                title="View Bill in tabular format with serial numbers"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View Bill</span>
              </button>

              <button
                onClick={() => onOpenPaymentModal(selectedSale)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit / Pay</span>
              </button>

              <button
                onClick={() => onDownloadPDF(selectedSale)}
                className="bg-gray-900 hover:bg-black text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>

              <button
                onClick={() => onShareWhatsApp(selectedSale)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                title="Share PDF Invoice directly to WhatsApp"
              >
                <Send className="w-3.5 h-3.5" />
                <span>WhatsApp PDF Invoice</span>
              </button>

              <button
                onClick={() => {
                  if (
                    confirm(
                      `Permanently delete bill ${selectedSale.id}? Quantities will be restored to inventory.`
                    )
                  ) {
                    onDeleteSale(selectedSale.id);
                    setSelectedSaleId(null);
                  }
                }}
                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Bill</span>
              </button>
            </div>
          </div>
        )}

        {/* Table with Sticky Headers */}
        <div className="overflow-x-auto max-h-[68vh] overflow-y-auto table-container">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/95 backdrop-blur-xs sticky top-0 z-10 shadow-2xs">
              <tr>
                <th scope="col" className="sticky top-0 bg-gray-50 z-10 w-12 px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
                  Select
                </th>
                <th scope="col" className="sticky top-0 bg-gray-50 z-10 px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th scope="col" className="sticky top-0 bg-gray-50 z-10 px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th scope="col" className="sticky top-0 bg-gray-50 z-10 px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Items & Codes
                </th>
                <th scope="col" className="sticky top-0 bg-gray-50 z-10 px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Total (₹)
                </th>
                <th scope="col" className="sticky top-0 bg-gray-50 z-10 px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Paid (₹)
                </th>
                <th scope="col" className="sticky top-0 bg-gray-50 z-10 px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Bal (₹)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredSales.map((sale) => {
                const isSelected = selectedSaleId === sale.id;
                const dateStr = new Date(sale.timestamp).toLocaleString();
                const itemsStr = sale.items
                  .map((i) => `${i.name} [${i.code || '-'}] x${i.qty}`)
                  .join(', ');
                const hasDue = Number(sale.balance) > 0;

                return (
                  <tr
                    key={sale.id}
                    onClick={() => setSelectedSaleId(sale.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'row-selected' : 'hover:bg-gray-50/80'
                    }`}
                  >
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <input
                        type="radio"
                        name="sale_radio"
                        checked={isSelected}
                        onChange={() => setSelectedSaleId(sale.id)}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      {dateStr}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {sale.customer.name}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        {sale.customer.contact}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600 max-w-xs truncate" title={itemsStr}>
                      {itemsStr}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                      ₹{sale.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-green-700">
                      ₹{sale.paid.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <span className={`font-bold ${hasDue ? 'text-red-600' : 'text-green-700'}`}>
                        ₹{sale.balance.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredSales.length === 0 && (
            <div className="py-12 text-center text-gray-400">
              <ReceiptText className="mx-auto h-12 w-12 text-gray-300 mb-2" />
              <p className="text-sm font-medium">No sales recorded yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bill Preview Modal in Tabular Format with Serial Numbers and Shop Address */}
      {viewingSale && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sticky top-0 z-10 flex justify-between items-start">
              <div className="flex items-center gap-3">
                <BrandLogo className="w-11 h-11 border border-white/20 bg-white p-1 rounded-xl shadow-md shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black tracking-tight text-white uppercase">
                      INDIA AUTOMOBILES
                    </h3>
                    <span className="bg-green-500/20 border border-green-400 text-green-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      Invoice #{viewingSale.id}
                    </span>
                  </div>
                  <p className="text-xs text-amber-300 font-semibold flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-3 h-3 shrink-0 text-amber-400" />
                    <span>Near ICICI Bank Main Road Ausa</span>
                  </p>
                  <p className="text-[11px] text-slate-300">
                    Proprietor: <strong className="text-white">Khaja Mungle</strong> (+91 8055650977)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingSale(null)}
                className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bill Content */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Customer and Sale Meta */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-xs">
                <div>
                  <span className="text-[10px] uppercase text-gray-500 font-bold block">Customer Name</span>
                  <span className="font-bold text-gray-900 text-sm">{viewingSale.customer.name}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-gray-500 font-bold block">Mobile Number</span>
                  <span className="font-mono font-bold text-gray-800 text-sm">{viewingSale.customer.contact}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-gray-500 font-bold block">Date & Time</span>
                  <span className="font-medium text-gray-700">{new Date(viewingSale.timestamp).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-gray-500 font-bold block">Payment Mode</span>
                  <span className="font-bold text-indigo-700">{viewingSale.paymentMode || 'Cash'}</span>
                </div>
              </div>

              {/* Items Table in Tabular Format with Serial Numbers */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Purchased Items List</span>
                </h4>
                <div className="border border-gray-200 rounded-xl overflow-x-auto shadow-2xs">
                  <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                    <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider">
                      <tr>
                        <th scope="col" className="px-3 py-2.5 text-center w-12">
                          Sr. No.
                        </th>
                        <th scope="col" className="px-3 py-2.5 text-left">
                          Item Code
                        </th>
                        <th scope="col" className="px-4 py-2.5 text-left">
                          Item Name / Description
                        </th>
                        <th scope="col" className="px-3 py-2.5 text-center w-16">
                          Qty
                        </th>
                        <th scope="col" className="px-3 py-2.5 text-right">
                          Rate (₹)
                        </th>
                        <th scope="col" className="px-3 py-2.5 text-center">
                          Disc (%)
                        </th>
                        <th scope="col" className="px-3 py-2.5 text-right">
                          Net Rate (₹)
                        </th>
                        <th scope="col" className="px-4 py-2.5 text-right font-black">
                          Total (₹)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {viewingSale.items.map((item, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                          <td className="px-3 py-2 text-center font-bold text-slate-700 bg-slate-50">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-600">
                            {item.code && item.code !== '-' ? item.code : '-'}
                          </td>
                          <td className="px-4 py-2 font-semibold text-slate-900">
                            {item.name}
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-slate-800">
                            {item.qty}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-600">
                            ₹{(Number(item.basePrice) || 0).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {item.discountPct ? `${item.discountPct}%` : '0%'}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-700">
                            ₹{(Number(item.price) || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-right font-bold text-slate-900">
                            ₹{(Number(item.total) || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-slate-50 p-4 rounded-xl border border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="text-gray-500 space-y-0.5">
                    <p><strong>Shop Address:</strong> Near ICICI Bank Main Road Ausa</p>
                    <p><strong>Proprietor:</strong> Khaja Mungle (+91 8055650977)</p>
                    <p><strong>Billed By:</strong> {viewingSale.generatedBy || 'Admin'}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal:</span>
                      <span className="font-semibold">₹{(viewingSale.subtotal || viewingSale.total).toFixed(2)}</span>
                    </div>
                    {viewingSale.discountAmount ? (
                      <div className="flex justify-between text-orange-600">
                        <span>Discount:</span>
                        <span className="font-semibold">-₹{viewingSale.discountAmount.toFixed(2)}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between text-sm font-black text-gray-900 pt-1 border-t border-gray-200">
                      <span>Grand Total:</span>
                      <span className="text-base text-indigo-950 font-extrabold">₹{viewingSale.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-700">
                      <span>Amount Paid:</span>
                      <span>₹{viewingSale.paid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-1 border-t border-dashed border-gray-200">
                      <span>Balance Due:</span>
                      <span className={viewingSale.balance > 0 ? 'text-rose-600 font-black' : 'text-emerald-700'}>
                        {viewingSale.balance > 0 ? `₹${viewingSale.balance.toFixed(2)} (Due)` : '₹0.00 (Fully Paid)'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-gray-50 px-5 py-3.5 border-t border-gray-100 flex flex-wrap justify-between items-center gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onShareWhatsApp(viewingSale)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>WhatsApp PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDownloadPDF(viewingSale)}
                  className="bg-gray-900 hover:bg-black text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setViewingSale(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
