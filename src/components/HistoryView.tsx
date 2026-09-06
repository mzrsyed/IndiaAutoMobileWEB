import React, { useState } from 'react';
import {
  Search,
  RefreshCw,
  FileSpreadsheet,
  Trash2,
  Edit,
  Download,
  Send,
  ReceiptText
} from 'lucide-react';
import { SaleRecord } from '../types';

interface HistoryViewProps {
  sales: SaleRecord[];
  onRefresh: () => void;
  onOpenPaymentModal: (sale: SaleRecord) => void;
  onDownloadPDF: (sale: SaleRecord) => void;
  onShareWhatsApp: (sale: SaleRecord) => void;
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
  onDeleteSale,
  onClearHistory,
  onExportCSV
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

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
        {/* Header & Controls */}
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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

        {/* Selected Sale Action Toolbar */}
        {selectedSale && (
          <div className="bg-indigo-50 px-6 py-3.5 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-3 transition-all">
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
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
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

        {/* Table */}
        <div className="overflow-x-auto table-container">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="w-12 px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
                  Select
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Items & Codes
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Total (₹)
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Paid (₹)
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
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
    </div>
  );
};
