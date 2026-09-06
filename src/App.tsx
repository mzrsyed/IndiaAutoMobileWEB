import React, { useState, useEffect, useCallback } from 'react';
import {
  InventoryItem,
  SaleRecord,
  SystemUser,
  TabType
} from './types';
import {
  getLocalActiveUser,
  setLocalActiveUser,
  getLocalInventory,
  getLocalSales,
  getLocalUsers,
  saveInventoryItem,
  deleteInventoryItem,
  saveSaleRecord,
  deleteSaleRecord,
  clearAllSalesHistory,
  saveUserRecord,
  deleteUserRecord,
  subscribeToData
} from './services/storage';
import { generateInvoicePDF, generateLedgerPDF } from './services/pdfService';
import {
  formatWhatsAppUrlForSale,
  formatWhatsAppUrlForLedger
} from './services/whatsappService';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { AuthScreen } from './components/AuthScreen';
import { DashboardView } from './components/DashboardView';
import { InventoryView } from './components/InventoryView';
import { BillingView } from './components/BillingView';
import { CustomersView } from './components/CustomersView';
import { HistoryView } from './components/HistoryView';
import { UsersView } from './components/UsersView';
import { PaymentModal } from './components/PaymentModal';
import { CustomerLedgerModal } from './components/CustomerLedgerModal';
import { ToastContainer, ToastMessage } from './components/Toast';

export default function App() {
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(() => getLocalActiveUser());
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const [inventory, setInventory] = useState<InventoryItem[]>(() => getLocalInventory());
  const [sales, setSales] = useState<SaleRecord[]>(() => getLocalSales());
  const [users, setUsers] = useState<SystemUser[]>(() => getLocalUsers());

  const [cloudStatus, setCloudStatus] = useState('Connecting to storage...');
  const [isOnline, setIsOnline] = useState(true);

  // Modals & transient interactions
  const [paymentModalSale, setPaymentModalSale] = useState<SaleRecord | null>(null);
  const [ledgerModalCustomer, setLedgerModalCustomer] = useState<{
    contact: string;
    name: string;
  } | null>(null);
  const [bookingCustomer, setBookingCustomer] = useState<{
    contact: string;
    name: string;
  } | null>(null);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Real-time synchronization
  useEffect(() => {
    const unsubscribe = subscribeToData(
      (items) => setInventory(items),
      (records) => setSales(records),
      (sysUsers) => setUsers(sysUsers),
      (status, online) => {
        setCloudStatus(status);
        setIsOnline(online);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Sync active user changes with sessionStorage
  const handleLoginSuccess = (user: SystemUser) => {
    setCurrentUser(user);
    setLocalActiveUser(user);
    showToast(`Welcome back, ${user.name}!`, 'success');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLocalActiveUser(null);
    showToast('Logged out successfully.', 'info');
  };

  // Inventory actions
  const handleSaveInventoryItem = async (item: InventoryItem) => {
    await saveInventoryItem(item);
    setInventory(getLocalInventory());
    showToast(`Inventory item "${item.name}" saved.`, 'success');
  };

  const handleDeleteInventoryItem = async (itemId: string) => {
    await deleteInventoryItem(itemId);
    setInventory(getLocalInventory());
    showToast('Item deleted from inventory.', 'info');
  };

  // Billing actions
  const handleProcessSale = async (sale: SaleRecord) => {
    await saveSaleRecord(sale, true);
    setSales(getLocalSales());
    setInventory(getLocalInventory());
  };

  // Payment update modal
  const handleUpdatePayment = async (saleId: string, newPaidAmount: number) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return;

    const updatedSale: SaleRecord = {
      ...sale,
      paid: newPaidAmount,
      balance: Math.max(0, (Number(sale.total) || 0) - newPaidAmount)
    };

    await saveSaleRecord(updatedSale, false);
    setSales(getLocalSales());
    showToast('Payment details updated successfully.', 'success');
  };

  // Delete sale with stock restore
  const handleDeleteSale = async (saleId: string) => {
    await deleteSaleRecord(saleId, true);
    setSales(getLocalSales());
    setInventory(getLocalInventory());
    showToast('Bill deleted and inventory stock restored.', 'info');
  };

  // Clear sales history
  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to permanently clear all recorded sales history?')) {
      return;
    }
    await clearAllSalesHistory();
    setSales([]);
    showToast('Sales history cleared.', 'info');
  };

  // Delete all sales for one customer
  const handleDeleteCustomerSales = async (contact: string) => {
    const targetSales = sales.filter(
      (s) => s.customer && s.customer.contact && s.customer.contact.trim() === contact.trim()
    );
    for (const s of targetSales) {
      await deleteSaleRecord(s.id, false);
    }
    setSales(getLocalSales());
    showToast(`Deleted ${targetSales.length} transaction records for customer.`, 'info');
  };

  // Users management
  const handleAddUser = async (newUser: SystemUser) => {
    await saveUserRecord(newUser);
    setUsers(getLocalUsers());
  };

  const handleUpdateUser = async (user: SystemUser) => {
    await saveUserRecord(user);
    setUsers(getLocalUsers());
  };

  const handleDeleteUser = async (userId: string) => {
    const ok = await deleteUserRecord(userId);
    if (ok) {
      setUsers(getLocalUsers());
      showToast('User account deleted.', 'info');
    } else {
      showToast('Cannot delete the primary administrator.', 'error');
    }
  };

  // PDF Generators
  const handleDownloadInvoicePDF = (sale: SaleRecord) => {
    try {
      generateInvoicePDF(sale);
      showToast('Invoice PDF generated successfully.', 'success');
    } catch (err) {
      console.error('Invoice PDF generation failed:', err);
      showToast('Failed to generate PDF invoice.', 'error');
    }
  };

  const handleDownloadLedgerPDF = (contact: string, name: string) => {
    const customerOrders = sales.filter(
      (s) => s.customer && s.customer.contact && s.customer.contact.trim() === contact.trim()
    );
    if (customerOrders.length === 0) {
      showToast('No orders found for this customer.', 'info');
      return;
    }
    try {
      generateLedgerPDF(
        name || 'Customer',
        contact,
        customerOrders,
        currentUser ? currentUser.name : 'Admin'
      );
      showToast('Customer ledger PDF downloaded.', 'success');
    } catch (err) {
      console.error('Ledger PDF error:', err);
      showToast('Failed to generate ledger statement PDF.', 'error');
    }
  };

  // WhatsApp dispatchers
  const handleShareSaleWhatsApp = (sale: SaleRecord) => {
    const url = formatWhatsAppUrlForSale(sale);
    window.open(url, '_blank');
  };

  const handleShareLedgerWhatsApp = (contact: string, name: string) => {
    const customerOrders = sales.filter(
      (s) => s.customer && s.customer.contact && s.customer.contact.trim() === contact.trim()
    );
    if (customerOrders.length === 0) {
      showToast('No orders found to share.', 'info');
      return;
    }
    const url = formatWhatsAppUrlForLedger(name || 'Customer', contact, customerOrders);
    window.open(url, '_blank');
  };

  // Book order for customer navigation
  const handleBookOrderForCustomer = (contact: string, name: string) => {
    setBookingCustomer({ contact, name });
    setActiveTab('billing');
  };

  // Export to Excel CSV
  const handleExportCSV = () => {
    if (sales.length === 0) {
      showToast('No sales records to export.', 'info');
      return;
    }

    let csv =
      '\uFEFFInvoice ID,Date Time,Customer Name,Contact,Items With Codes,Total Amount,Paid Amount,Remaining Balance,Generated By\n';
    sales.forEach((s) => {
      const itemsStr = (s.items || [])
        .map(
          (i) =>
            `${i.name} [${i.code || '-'}] (Disc ${i.discountPct || 0}%) x${i.qty}`
        )
        .join('; ')
        .replace(/"/g, '""');
      const cName = (s.customer?.name || '').replace(/"/g, '""');
      const cContact = (s.customer?.contact || '').replace(/"/g, '""');
      const billedBy = (s.generatedBy || 'Admin').replace(/"/g, '""');
      csv += `"${s.id}","${new Date(s.timestamp).toLocaleString()}","${cName}","${cContact}","${itemsStr}",${s.total},${s.paid},${s.balance},"${billedBy}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sales_Export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('Exported to Excel CSV successfully!', 'success');
  };

  // Database Backup and Restore
  const handleExportBackup = () => {
    const backupData = {
      version: '2.0-cloud',
      exportedAt: new Date().toISOString(),
      inventory,
      salesHistory: sales,
      systemUsers: users
    };

    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `india_automobiles_backup_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Backup JSON file downloaded successfully!', 'success');
  };

  const handleImportBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!confirm('This will restore and merge the backup file into the database. Continue?')) {
          return;
        }

        const newItems: InventoryItem[] = Array.isArray(data.inventory) ? data.inventory : [];
        const newSales: SaleRecord[] = Array.isArray(data.salesHistory) ? data.salesHistory : [];
        const newUsers: SystemUser[] = Array.isArray(data.systemUsers) ? data.systemUsers : [];

        for (const item of newItems) {
          await saveInventoryItem(item);
        }
        for (const sale of newSales) {
          await saveSaleRecord(sale, false);
        }
        for (const u of newUsers) {
          await saveUserRecord(u);
        }

        setInventory(getLocalInventory());
        setSales(getLocalSales());
        setUsers(getLocalUsers());
        showToast('Backup restored successfully!', 'success');
      } catch (err) {
        console.error('Failed to import backup:', err);
        showToast('Invalid backup file format.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const isAdmin = Boolean(
    currentUser &&
      (currentUser.isAdmin ||
        (currentUser.username && currentUser.username.toLowerCase() === 'admin') ||
        currentUser.id === 'USER_ADMIN')
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-800 antialiased selection:bg-blue-100 selection:text-blue-900">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Auth Screen Modal */}
      {!currentUser && (
        <AuthScreen users={users} onLoginSuccess={handleLoginSuccess} />
      )}

      {/* Main App Layout */}
      {currentUser && (
        <>
          <Header
            currentUser={currentUser}
            cloudStatusText={cloudStatus}
            isOnline={isOnline}
            onLogout={handleLogout}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
          />

          <Navigation
            activeTab={activeTab}
            isAdmin={isAdmin}
            onSelectTab={setActiveTab}
          />

          <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 overflow-y-auto">
            {activeTab === 'dashboard' && (
              <DashboardView
                inventory={inventory}
                sales={sales}
                onNavigateTab={setActiveTab}
                onSelectCustomer={(contact, name) => {
                  setLedgerModalCustomer({ contact, name });
                }}
              />
            )}

            {activeTab === 'inventory' && (
              <InventoryView
                inventory={inventory}
                onSaveItem={handleSaveInventoryItem}
                onDeleteItem={handleDeleteInventoryItem}
                onRefresh={() => {
                  setInventory(getLocalInventory());
                  showToast('Inventory reloaded.', 'info');
                }}
              />
            )}

            {activeTab === 'billing' && (
              <BillingView
                inventory={inventory}
                currentUser={currentUser}
                onProcessSale={handleProcessSale}
                onDownloadPDF={handleDownloadInvoicePDF}
                onShowToast={showToast}
                initialCustomer={bookingCustomer}
              />
            )}

            {activeTab === 'customers' && (
              <CustomersView
                sales={sales}
                onRefresh={() => {
                  setSales(getLocalSales());
                  showToast('Customer data refreshed.', 'info');
                }}
                onOpenLedger={(contact, name) => setLedgerModalCustomer({ contact, name })}
                onShareWhatsApp={handleShareLedgerWhatsApp}
                onDownloadLedgerPDF={handleDownloadLedgerPDF}
                onBookOrder={handleBookOrderForCustomer}
                onDeleteCustomerSales={handleDeleteCustomerSales}
              />
            )}

            {activeTab === 'history' && (
              <HistoryView
                sales={sales}
                onRefresh={() => {
                  setSales(getLocalSales());
                  showToast('Sales records refreshed.', 'info');
                }}
                onOpenPaymentModal={(sale) => setPaymentModalSale(sale)}
                onDownloadPDF={handleDownloadInvoicePDF}
                onShareWhatsApp={handleShareSaleWhatsApp}
                onDeleteSale={handleDeleteSale}
                onClearHistory={handleClearHistory}
                onExportCSV={handleExportCSV}
              />
            )}

            {activeTab === 'users' && isAdmin && (
              <UsersView
                users={users}
                onAddUser={handleAddUser}
                onUpdateUser={handleUpdateUser}
                onDeleteUser={handleDeleteUser}
                onShowToast={showToast}
              />
            )}
          </main>
        </>
      )}

      {/* Payment Update Modal */}
      {paymentModalSale && (
        <PaymentModal
          sale={paymentModalSale}
          onClose={() => setPaymentModalSale(null)}
          onUpdatePayment={handleUpdatePayment}
        />
      )}

      {/* Customer Ledger Statement Modal */}
      {ledgerModalCustomer && (
        <CustomerLedgerModal
          contact={ledgerModalCustomer.contact}
          name={ledgerModalCustomer.name}
          sales={sales}
          onClose={() => setLedgerModalCustomer(null)}
          onBookOrder={handleBookOrderForCustomer}
          onShareWhatsApp={handleShareLedgerWhatsApp}
          onDownloadLedgerPDF={handleDownloadLedgerPDF}
          onOpenPaymentModal={(sale) => {
            setPaymentModalSale(sale);
            setLedgerModalCustomer(null);
          }}
          onDownloadSalePDF={handleDownloadInvoicePDF}
          onShareSaleWhatsApp={handleShareSaleWhatsApp}
        />
      )}
    </div>
  );
}
