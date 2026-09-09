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
  subscribeToData,
  getSessionTimeoutMinutes,
  setSessionTimeoutMinutes,
  updateLastActivity,
  checkSessionExpired
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
import { Phone, Mail, Code2 } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(() => getLocalActiveUser());
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const [inventory, setInventory] = useState<InventoryItem[]>(() => getLocalInventory());
  const [sales, setSales] = useState<SaleRecord[]>(() => getLocalSales());
  const [users, setUsers] = useState<SystemUser[]>(() => getLocalUsers());

  const [cloudStatus, setCloudStatus] = useState('Connecting to storage...');
  const [isOnline, setIsOnline] = useState(true);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutesState] = useState<number>(() => getSessionTimeoutMinutes());

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

  // User activity tracker & session timeout watchdog
  useEffect(() => {
    if (!currentUser) return;

    let lastActiveRecord = Date.now();
    const handleUserActivity = () => {
      const now = Date.now();
      // Throttle updating storage to once every 15 seconds
      if (now - lastActiveRecord > 15000) {
        lastActiveRecord = now;
        updateLastActivity();
      }
    };

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    activityEvents.forEach((ev) => {
      window.addEventListener(ev, handleUserActivity, { passive: true });
    });

    // Check expiration every 10 seconds
    const interval = setInterval(() => {
      if (checkSessionExpired()) {
        setCurrentUser(null);
        setLocalActiveUser(null);
        showToast('Login session timed out due to inactivity. Please sign in again.', 'info');
      }
    }, 10000);

    return () => {
      activityEvents.forEach((ev) => {
        window.removeEventListener(ev, handleUserActivity);
      });
      clearInterval(interval);
    };
  }, [currentUser, sessionTimeoutMinutes, showToast]);

  const handleUpdateSessionTimeout = (minutes: number) => {
    setSessionTimeoutMinutes(minutes);
    setSessionTimeoutMinutesState(minutes);
    updateLastActivity();
    if (minutes === 0) {
      showToast('Session timeout set to: Never (Stay logged in).', 'info');
    } else if (minutes >= 60) {
      const hours = minutes / 60;
      showToast(`Session timeout set to: ${hours} hour${hours > 1 ? 's' : ''}.`, 'info');
    } else {
      showToast(`Session timeout set to: ${minutes} minutes.`, 'info');
    }
  };

  // Sync active user changes with storage
  const handleLoginSuccess = (user: SystemUser) => {
    setCurrentUser(user);
    setLocalActiveUser(user);
    updateLastActivity();
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

  // Billing actions: Auto-adjust item stock immediately
  const handleProcessSale = async (sale: SaleRecord) => {
    const { updatedInventory, updatedSales } = await saveSaleRecord(sale, true, inventory);
    setSales([...updatedSales]);
    setInventory([...updatedInventory]);
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

    await saveSaleRecord(updatedSale, false, inventory);
    setSales(getLocalSales());
    showToast('Payment details updated successfully.', 'success');
  };

  // Delete sale with stock restore
  const handleDeleteSale = async (saleId: string) => {
    const { updatedInventory, updatedSales } = await deleteSaleRecord(saleId, true, inventory);
    setSales([...updatedSales]);
    setInventory([...updatedInventory]);
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
  const handleDownloadInvoicePDF = async (sale: SaleRecord) => {
    try {
      await generateInvoicePDF(sale);
      showToast('Invoice PDF downloaded successfully.', 'success');
    } catch (err) {
      console.error('Invoice PDF generation failed:', err);
      showToast('Failed to generate PDF invoice.', 'error');
    }
  };

  const handleDownloadLedgerPDF = async (contact: string, name: string) => {
    const customerOrders = sales.filter(
      (s) => s.customer && s.customer.contact && s.customer.contact.trim() === contact.trim()
    );
    if (customerOrders.length === 0) {
      showToast('No orders found for this customer.', 'info');
      return;
    }
    try {
      await generateLedgerPDF(
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

  // WhatsApp dispatchers (anchor click prevents popup blocker in iframes)
  const handleShareSaleWhatsApp = (sale: SaleRecord) => {
    const url = formatWhatsAppUrlForSale(sale);
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
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
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
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
            sessionTimeoutMinutes={sessionTimeoutMinutes}
            onUpdateSessionTimeout={handleUpdateSessionTimeout}
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
                sessionTimeoutMinutes={sessionTimeoutMinutes}
                onUpdateSessionTimeout={handleUpdateSessionTimeout}
                onAddUser={handleAddUser}
                onUpdateUser={handleUpdateUser}
                onDeleteUser={handleDeleteUser}
                onShowToast={showToast}
              />
            )}
          </main>

          {/* Dynamic Developer Footer */}
          <footer className="border-t border-slate-200/80 bg-white/90 backdrop-blur-sm py-4 mt-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">India Automobiles</span>
                <span>&bull;</span>
                <span>Proprietor: <strong className="text-slate-700">Khaja Mungle</strong> (8055650977)</span>
              </div>
              <div className="inline-flex flex-wrap items-center gap-2.5 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-full shadow-sm">
                <div className="flex items-center gap-1 font-semibold text-slate-800">
                  <Code2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Developed by <strong className="text-blue-900 font-bold">Mazhar Sayyed</strong></span>
                </div>
                <span className="text-slate-300">&bull;</span>
                <a
                  href="tel:9975603455"
                  className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-medium transition-colors"
                  title="Call Mazhar Sayyed"
                >
                  <Phone className="w-3 h-3 text-emerald-600" />
                  <span>9975603455</span>
                </a>
                <span className="text-slate-300">&bull;</span>
                <a
                  href="mailto:mazharausa@gmail.com"
                  className="flex items-center gap-1 text-sky-700 hover:text-sky-900 font-medium transition-colors"
                  title="Email Mazhar Sayyed"
                >
                  <Mail className="w-3 h-3 text-sky-600" />
                  <span>mazharausa@gmail.com</span>
                </a>
              </div>
            </div>
          </footer>
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
