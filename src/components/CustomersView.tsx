import React, { useState } from 'react';
import {
  Search,
  RefreshCw,
  Users,
  FileText,
  Send,
  Download,
  PlusCircle,
  Trash2
} from 'lucide-react';
import { SaleRecord, CustomerSummary } from '../types';

interface CustomersViewProps {
  sales: SaleRecord[];
  onRefresh: () => void;
  onOpenLedger: (contact: string, name: string) => void;
  onShareWhatsApp: (contact: string, name: string) => void;
  onDownloadLedgerPDF: (contact: string, name: string) => void;
  onBookOrder: (contact: string, name: string) => void;
  onDeleteCustomerSales: (contact: string) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  sales,
  onRefresh,
  onOpenLedger,
  onShareWhatsApp,
  onDownloadLedgerPDF,
  onBookOrder,
  onDeleteCustomerSales
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<string | null>(null);

  // Group sales by customer contact
  const custMap: Record<string, CustomerSummary> = {};
  sales.forEach((s) => {
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
    custMap[contact].totalSpent += Number(s.total) || 0;
    custMap[contact].totalDue += Number(s.balance) || 0;
  });

  const allCustomers = Object.values(custMap);
  const filteredCustomers = allCustomers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.contact.toLowerCase().includes(q);
  });

  const selectedCustomer = selectedContact ? custMap[selectedContact] : null;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header & Search */}
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Customer Records & Ledger
            </h2>
            <p className="text-xs text-gray-500">
              Select a customer row to view full ledger statement, download PDF, or send WhatsApp update
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onRefresh}
              title="Refresh customer list"
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 px-3 py-2 rounded-xl transition-colors shadow-sm cursor-pointer shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name or contact..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm outline-none"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            </div>
          </div>
        </div>

        {/* Selected Customer Action Toolbar */}
        {selectedCustomer && (
          <div className="bg-blue-50 px-6 py-3.5 border-b border-blue-100 flex flex-wrap items-center justify-between gap-3 transition-all">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
              <span className="text-xs font-bold text-gray-800">
                Selected Customer:{' '}
                <span className="text-blue-700 font-extrabold">{selectedCustomer.name}</span> (
                <span className="font-mono">{selectedCustomer.contact}</span>)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onOpenLedger(selectedCustomer.contact, selectedCustomer.name)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>View Ledger</span>
              </button>

              <button
                onClick={() => onShareWhatsApp(selectedCustomer.contact, selectedCustomer.name)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>WhatsApp Ledger</span>
              </button>

              <button
                onClick={() =>
                  onDownloadLedgerPDF(selectedCustomer.contact, selectedCustomer.name)
                }
                className="bg-gray-900 hover:bg-black text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ledger PDF</span>
              </button>

              <button
                onClick={() => onBookOrder(selectedCustomer.contact, selectedCustomer.name)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>New Bill</span>
              </button>

              <button
                onClick={() => {
                  if (
                    confirm(
                      `Permanently delete all sales records for customer ${selectedCustomer.name}?`
                    )
                  ) {
                    onDeleteCustomerSales(selectedCustomer.contact);
                    setSelectedContact(null);
                  }
                }}
                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Records</span>
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
                  Customer Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Contact Number
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Total Purchases
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Total Amount Spent
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Due Balance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredCustomers.map((c) => {
                const isSelected = selectedContact === c.contact;
                const hasDue = c.totalDue > 0;

                return (
                  <tr
                    key={c.contact}
                    onClick={() => setSelectedContact(c.contact)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'row-selected' : 'hover:bg-gray-50/80'
                    }`}
                  >
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <input
                        type="radio"
                        name="customer_radio"
                        checked={isSelected}
                        onChange={() => setSelectedContact(c.contact)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {c.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                      {c.contact}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold text-blue-600">
                      {c.ordersCount} {c.ordersCount === 1 ? 'order' : 'orders'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                      ₹{c.totalSpent.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <span className={`font-bold ${hasDue ? 'text-red-600' : 'text-green-600'}`}>
                        ₹{c.totalDue.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredCustomers.length === 0 && (
            <div className="py-12 text-center text-gray-400">
              <Users className="mx-auto h-12 w-12 text-gray-300 mb-2" />
              <p className="text-sm font-medium">No customer records found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
