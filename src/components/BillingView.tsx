import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Send,
  Download,
  Share2,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { InventoryItem, CartItem, SaleRecord, SystemUser } from '../types';
import { BrandLogo } from './Logo';
import { formatWhatsAppUrlForSale } from '../services/whatsappService';

interface BillingViewProps {
  inventory: InventoryItem[];
  currentUser: SystemUser | null;
  onProcessSale: (sale: SaleRecord) => void;
  onDownloadPDF: (sale: SaleRecord) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  initialCustomer?: { name: string; contact: string } | null;
}

export const BillingView: React.FC<BillingViewProps> = ({
  inventory,
  currentUser,
  onProcessSale,
  onDownloadPDF,
  onShowToast,
  initialCustomer
}) => {
  // Customer info
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');

  // Cart & items
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchItemQuery, setSearchItemQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [itemDisc, setItemDisc] = useState(0);

  // Billing discounts & payment
  const [overallDiscountPercent, setOverallDiscountPercent] = useState(0);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState('');

  // Last generated sale for success panel
  const [lastSale, setLastSale] = useState<SaleRecord | null>(null);

  // Auto-fill initial customer if booked from another screen
  useEffect(() => {
    if (initialCustomer) {
      setCustomerName(initialCustomer.name || '');
      setCustomerContact(initialCustomer.contact || '');
    }
  }, [initialCustomer]);

  // Selected item object
  const activeItem = inventory.find((i) => String(i.id).trim() === String(selectedItemId).trim());
  const alreadyInCart = activeItem
    ? cart
        .filter((ci) => String(ci.id).trim() === String(activeItem.id).trim())
        .reduce((sum, ci) => sum + ci.qty, 0)
    : 0;
  const availableStock = activeItem ? Math.max(0, (Number(activeItem.qty) || 0) - alreadyInCart) : 0;

  // Search filtered items
  const searchMatches = inventory.filter((item) => {
    const q = searchItemQuery.toLowerCase().trim();
    if (!q) return false;
    return (
      item.name.toLowerCase().includes(q) ||
      (item.code && item.code.toLowerCase().includes(q))
    );
  });

  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItemId(String(item.id).trim());
    setSearchItemQuery(item.name);
    setShowSearchResults(false);
    setItemQty(1);
    setItemDisc(0);
  };

  const handleAddToCart = () => {
    if (!activeItem) return;

    if (itemQty <= 0 || itemQty > availableStock) {
      onShowToast(`Invalid quantity. Only ${availableStock} unit(s) available.`, 'error');
      return;
    }

    const basePrice = Number(activeItem.sp) || 0;
    const effectiveDisc = Math.min(100, Math.max(0, itemDisc));
    const effectivePrice = basePrice - (basePrice * effectiveDisc) / 100;

    // Check if item already exists in cart with same discount
    const existingIndex = cart.findIndex(
      (c) => String(c.id).trim() === String(activeItem.id).trim() && c.discountPct === effectiveDisc
    );

    if (existingIndex >= 0) {
      const updated = [...cart];
      const newQty = updated[existingIndex].qty + itemQty;
      updated[existingIndex] = {
        ...updated[existingIndex],
        qty: newQty,
        total: newQty * updated[existingIndex].price
      };
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          id: String(activeItem.id).trim(),
          code: activeItem.code || '-',
          name: activeItem.name,
          basePrice: basePrice,
          discountPct: effectiveDisc,
          price: effectivePrice,
          qty: itemQty,
          total: itemQty * effectivePrice
        }
      ]);
    }

    // Reset item selection
    setSelectedItemId('');
    setSearchItemQuery('');
    setItemQty(1);
    setItemDisc(0);
  };

  const handleRemoveFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const handleUpdateCartDiscount = (index: number, newDisc: number) => {
    const updated = [...cart];
    const item = updated[index];
    if (!item) return;

    const clampedDisc = Math.min(100, Math.max(0, isNaN(newDisc) ? 0 : newDisc));
    const effectivePrice = item.basePrice - (item.basePrice * clampedDisc) / 100;

    updated[index] = {
      ...item,
      discountPct: clampedDisc,
      price: effectivePrice,
      total: item.qty * effectivePrice
    };
    setCart(updated);
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const overallDiscAmount = subtotal * (overallDiscountPercent / 100);
  const grandTotal = Math.max(0, subtotal - overallDiscAmount);

  // Synchronize amountPaid with grand total unless customized
  useEffect(() => {
    if (cart.length === 0) {
      setAmountPaid('0.00');
    } else if (paymentMode === 'Credit / Due') {
      setAmountPaid('0.00');
    } else {
      setAmountPaid(grandTotal.toFixed(2));
    }
  }, [grandTotal, paymentMode, cart.length]);

  const paidVal = parseFloat(amountPaid) || 0;
  const balanceVal = Math.max(0, grandTotal - paidVal);

  const handleSubmitBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = customerName.trim();
    const cleanContact = customerContact.replace(/\D/g, '');

    if (!cleanName) {
      onShowToast('Please enter Customer Name.', 'error');
      return;
    }
    if (cleanContact.length !== 10) {
      onShowToast('Please enter a valid 10-digit mobile number.', 'error');
      return;
    }
    if (cart.length === 0) {
      onShowToast('Cart is empty. Please add items to bill.', 'error');
      return;
    }

    const sale: SaleRecord = {
      id: 'INV_' + Date.now(),
      timestamp: new Date().toISOString(),
      customer: {
        name: cleanName,
        contact: cleanContact
      },
      items: [...cart],
      subtotal: subtotal,
      discountPercent: overallDiscountPercent,
      discountAmount: overallDiscAmount,
      total: grandTotal,
      paymentMode: paymentMode,
      paid: paidVal,
      balance: balanceVal,
      generatedBy: currentUser ? currentUser.name : 'Admin'
    };

    await onProcessSale(sale);
    setLastSale(sale);
    onShowToast('Bill created and stock updated successfully!', 'success');

    // Reset cart and form
    setCart([]);
    setSelectedItemId('');
    setSearchItemQuery('');
    setItemQty(1);
    setItemDisc(0);
    setOverallDiscountPercent(0);
    setPaymentMode('Cash');
    setCustomerName('');
    setCustomerContact('');
  };

  const handleShareDetails = async () => {
    if (!lastSale) return;
    const itemsStr = lastSale.items
      .map(
        (i) =>
          `${i.name} [Code: ${i.code || '-'}] (Disc: ${i.discountPct || 0}%) x${i.qty}`
      )
      .join(', ');
    const text = `Invoice from India Automobiles\nProprietor: Khaja Mungle (+91 8055650977)\nBill ID: ${lastSale.id}\nCustomer: ${lastSale.customer.name}\nItems: ${itemsStr}\nPayment: ${lastSale.paymentMode || 'Cash'}\nGrand Total: Rs. ${lastSale.total.toFixed(2)}\nPaid: Rs. ${lastSale.paid.toFixed(2)}\nBalance Due: Rs. ${lastSale.balance.toFixed(2)}\nGenerated by: ${lastSale.generatedBy || 'Admin'}\nThank you for your business!`;

    if (navigator.share) {
      try {
        await navigator.share({ title: `Invoice ${lastSale.id}`, text });
      } catch {
        // Share cancelled or unavailable
      }
    } else if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        onShowToast('Invoice text copied to clipboard!', 'info');
      } catch {
        onShowToast('Invoice details ready. Please share via WhatsApp.', 'info');
      }
    } else {
      onShowToast('Invoice details ready. Please share via WhatsApp.', 'info');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Details Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-800">Customer Details</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Required for invoicing & WhatsApp ledger statements
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Mazhar Sayyed"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  10-Digit Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={customerContact}
                  onChange={(e) => setCustomerContact(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 9876543210"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm outline-none font-mono"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Used for direct WhatsApp invoicing & PDF ledger dispatch.
                </p>
              </div>

              <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 text-[11px] text-blue-800 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  India Automobiles invoices feature proprietor contact <strong>Khaja Mungle (+91 8055650977)</strong> and automatic WhatsApp formatting.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sale Items & Cart Card */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Sale Details</h2>
                <p className="text-xs text-gray-500">
                  Select parts from inventory, apply discounts, and generate bill
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full">
                {cart.length} item{cart.length === 1 ? '' : 's'} in cart
              </span>
            </div>

            <div className="p-6">
              <form onSubmit={handleSubmitBilling} className="space-y-6">
                {/* Search / Browse items */}
                <div className="relative">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Browse Items by Name or Item Code
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchItemQuery}
                      onChange={(e) => {
                        setSearchItemQuery(e.target.value);
                        setShowSearchResults(true);
                      }}
                      onFocus={() => setShowSearchResults(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (searchMatches.length > 0) {
                            handleSelectItem(searchMatches[0]);
                          }
                        }
                      }}
                      placeholder="Type item name or code (e.g. Brake Pad, IA-001)..."
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm outline-none"
                    />
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  </div>

                  {/* Autocomplete dropdown */}
                  {showSearchResults && searchItemQuery.trim() && (
                    <div className="absolute z-30 mt-1 w-full max-h-60 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100 bg-white shadow-xl">
                      {searchMatches.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-400 text-center">
                          No matching inventory items found.
                        </div>
                      ) : (
                        searchMatches.map((item) => {
                          const inStock = item.qty > 0;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              disabled={!inStock}
                              onClick={() => handleSelectItem(item)}
                              className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer ${
                                inStock ? 'hover:bg-blue-50' : 'opacity-50 cursor-not-allowed'
                              }`}
                            >
                              <div>
                                <div className="text-sm font-semibold text-gray-800">
                                  {item.name}
                                </div>
                                <div className="text-xs text-gray-400 font-mono">
                                  {item.code ? `Code: ${item.code} • ` : ''}
                                  {inStock ? `${item.qty} in stock` : 'Out of stock'}
                                </div>
                              </div>
                              <div className="text-sm font-bold text-blue-600 whitespace-nowrap">
                                ₹{item.sp.toFixed(2)}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Quick Add Row */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end bg-blue-50/70 p-4 rounded-2xl border border-blue-100">
                  <div className="sm:col-span-5">
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Select Item
                    </label>
                    <select
                      value={selectedItemId}
                      onChange={(e) => {
                        const it = inventory.find((i) => i.id === e.target.value);
                        if (it) handleSelectItem(it);
                        else setSelectedItemId('');
                      }}
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm bg-white outline-none"
                    >
                      <option value="">-- Choose an item --</option>
                      {inventory
                        .filter((i) => i.qty > 0)
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.code ? `[${item.code}] ` : ''}
                            {item.name} (₹{item.sp.toFixed(2)}) - {item.qty} in stock
                          </option>
                        ))}
                    </select>
                    <p className="mt-1 text-xs text-blue-600 font-semibold h-4">
                      {activeItem
                        ? `${availableStock} available in stock (₹${activeItem.sp.toFixed(2)})`
                        : ''}
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Disc (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      disabled={!activeItem}
                      value={itemDisc}
                      onChange={(e) => setItemDisc(parseFloat(e.target.value) || 0)}
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm outline-none disabled:bg-gray-100 font-semibold text-orange-700"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Qty
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={availableStock || 1}
                      disabled={!activeItem || availableStock <= 0}
                      value={itemQty}
                      onChange={(e) => setItemQty(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm outline-none disabled:bg-gray-100 font-bold"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <button
                      type="button"
                      disabled={!activeItem || availableStock <= 0}
                      onClick={handleAddToCart}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-xl font-semibold text-sm shadow-sm transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer h-[38px]"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add to Cart</span>
                    </button>
                  </div>
                </div>

                {/* Cart Table with Editable Discount (%) */}
                {cart.length > 0 && (
                  <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-gray-100 px-4 py-2.5 border-b border-gray-200 flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                        Items in Bill ({cart.length})
                      </span>
                      <span className="text-[11px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        Tip: You can edit Disc (%) directly in each row
                      </span>
                    </div>

                    <div className="overflow-x-auto table-container">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600">
                              Item Code
                            </th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">
                              Item Name
                            </th>
                            <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-600">
                              Qty
                            </th>
                            <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600">
                              Base Price
                            </th>
                            <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">
                              Item Disc (%)
                            </th>
                            <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600">
                              Unit Price
                            </th>
                            <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600">
                              Total
                            </th>
                            <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-600">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100 text-sm">
                          {cart.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                              <td className="px-3 py-3 font-mono text-xs font-semibold text-gray-700">
                                {item.code || '-'}
                              </td>
                              <td className="px-4 py-3 font-semibold text-gray-900">
                                {item.name}
                              </td>
                              <td className="px-3 py-3 text-center font-bold text-gray-800">
                                {item.qty}
                              </td>
                              <td className="px-3 py-3 text-right text-gray-500">
                                ₹{item.basePrice.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="inline-flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={item.discountPct}
                                    onChange={(e) =>
                                      handleUpdateCartDiscount(
                                        idx,
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                    className="w-16 px-2 py-1 text-center font-bold text-xs border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none bg-orange-50/60 text-orange-800"
                                  />
                                  <span className="text-xs font-bold text-orange-600">%</span>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-right font-medium text-gray-800">
                                ₹{item.price.toFixed(2)}
                              </td>
                              <td className="px-3 py-3 text-right font-bold text-gray-900">
                                ₹{item.total.toFixed(2)}
                              </td>
                              <td className="px-3 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFromCart(idx)}
                                  className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                  title="Remove Item"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Totals & Discounts Calculation */}
                <div className="border-t border-gray-200 pt-6 mt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                        Overall Bill Discount (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={overallDiscountPercent}
                        onChange={(e) =>
                          setOverallDiscountPercent(
                            Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                          )
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm outline-none font-semibold text-orange-700"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                        Discount Amount (₹)
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={overallDiscAmount.toFixed(2)}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-600 font-bold"
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2 mb-5">
                    <div className="flex justify-between items-center text-sm text-gray-600">
                      <span>Subtotal (Items):</span>
                      <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-orange-600">
                      <span>Overall Discount:</span>
                      <span className="font-semibold">- ₹{overallDiscAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <span className="text-base font-bold text-gray-800">Grand Total:</span>
                      <span className="text-2xl font-black text-gray-900">
                        ₹{grandTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                        Payment Option *
                      </label>
                      <select
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm bg-white outline-none font-semibold"
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI / QR Code">UPI / QR Code</option>
                        <option value="Card">Credit / Debit Card</option>
                        <option value="Net Banking">Net Banking</option>
                        <option value="Credit / Due">Credit / Due</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                        Amount Paid (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm shadow-sm outline-none font-bold text-green-700"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                        Remaining Balance (₹)
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={balanceVal.toFixed(2)}
                        className={`w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold ${
                          balanceVal > 0 ? 'text-red-600' : 'text-green-700'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      type="submit"
                      disabled={cart.length === 0}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-3.5 px-6 rounded-xl font-bold text-sm shadow-md transition-all disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Sell Item & Record Transaction</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Invoice Success Panel */}
              {lastSale && (
                <div className="mt-6 bg-green-50 border border-green-200 rounded-2xl p-5 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <BrandLogo className="w-10 h-10 border border-green-300 bg-white p-0.5" />
                    <div>
                      <h3 className="text-sm font-bold text-green-900">
                        Bill Generated Successfully
                      </h3>
                      <p className="text-[11px] text-green-700 font-semibold">
                        India Automobiles &bull; Khaja Mungle (+91 8055650977)
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-gray-700 mb-4 space-y-1 bg-white p-3.5 rounded-xl border border-green-100">
                    <div className="flex justify-between border-b border-gray-100 pb-1.5 font-bold">
                      <span>Invoice ID: {lastSale.id}</span>
                      <span className="text-blue-700">
                        Generated by: {lastSale.generatedBy || 'Admin'}
                      </span>
                    </div>
                    <p>
                      <strong>Customer:</strong> {lastSale.customer.name} (
                      <span className="font-mono">{lastSale.customer.contact}</span>)
                    </p>
                    <p>
                      <strong>Items:</strong>{' '}
                      {lastSale.items
                        .map(
                          (i) =>
                            `${i.name} [${i.code || '-'}] x${i.qty}${
                              i.discountPct ? ` (${i.discountPct}% off)` : ''
                            }`
                        )
                        .join(', ')}
                    </p>
                    <div className="flex flex-wrap gap-4 pt-1 font-semibold">
                      <span>
                        Grand Total: <strong>₹{lastSale.total.toFixed(2)}</strong>
                      </span>
                      <span>
                        Paid: <strong className="text-green-700">₹{lastSale.paid.toFixed(2)}</strong>
                      </span>
                      <span>
                        Balance:{' '}
                        <strong className={lastSale.balance > 0 ? 'text-red-600' : 'text-green-700'}>
                          ₹{lastSale.balance.toFixed(2)}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <a
                      href={formatWhatsAppUrlForSale(lastSale)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <Send className="w-4 h-4" />
                      <span>Send Bill on WhatsApp</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => onDownloadPDF(lastSale)}
                      className="bg-gray-900 hover:bg-black text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleShareDetails}
                      className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share Details</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
