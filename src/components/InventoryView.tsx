import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Plus, Edit2, Trash2, Package } from 'lucide-react';
import { InventoryItem } from '../types';

interface InventoryViewProps {
  inventory: InventoryItem[];
  onSaveItem: (item: InventoryItem) => void;
  onDeleteItem: (id: string) => void;
  onRefresh: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  inventory,
  onSaveItem,
  onDeleteItem,
  onRefresh
}) => {
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('');
  const [itemMrp, setItemMrp] = useState('');
  const [itemDiscount, setItemDiscount] = useState('0');
  const [itemSp, setItemSp] = useState('');

  // Auto-sync form when editingItem changes
  useEffect(() => {
    if (editingItem) {
      setItemCode(editingItem.code || '');
      setItemName(editingItem.name || '');
      setItemQty(editingItem.qty.toString());
      setItemMrp(editingItem.mrp.toString());
      setItemDiscount((editingItem.discount || 0).toString());
      setItemSp(editingItem.sp.toString());
    } else {
      resetForm();
    }
  }, [editingItem]);

  const resetForm = () => {
    setEditingItem(null);
    setItemCode('');
    setItemName('');
    setItemQty('');
    setItemMrp('');
    setItemDiscount('0');
    setItemSp('');
  };

  // Recalculate selling price when MRP or Discount changes
  const handleMrpChange = (val: string) => {
    setItemMrp(val);
    const mrpNum = parseFloat(val);
    const discNum = parseFloat(itemDiscount) || 0;
    if (!isNaN(mrpNum) && mrpNum >= 0) {
      const calculatedSp = mrpNum - (mrpNum * discNum) / 100;
      setItemSp(calculatedSp >= 0 ? calculatedSp.toFixed(2) : '0.00');
    }
  };

  const handleDiscountChange = (val: string) => {
    setItemDiscount(val);
    const discNum = parseFloat(val);
    const mrpNum = parseFloat(itemMrp) || 0;
    if (!isNaN(mrpNum) && mrpNum >= 0 && !isNaN(discNum) && discNum >= 0) {
      const calculatedSp = mrpNum - (mrpNum * discNum) / 100;
      setItemSp(calculatedSp >= 0 ? calculatedSp.toFixed(2) : '0.00');
    }
  };

  const handleSpChange = (val: string) => {
    setItemSp(val);
    const spNum = parseFloat(val);
    const mrpNum = parseFloat(itemMrp);
    if (!isNaN(mrpNum) && mrpNum > 0 && !isNaN(spNum) && spNum >= 0) {
      const calculatedDisc = ((mrpNum - spNum) / mrpNum) * 100;
      setItemDiscount(calculatedDisc >= 0 ? calculatedDisc.toFixed(2) : '0');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qtyNum = parseInt(itemQty, 10);
    const mrpNum = parseFloat(itemMrp);
    const spNum = parseFloat(itemSp);
    const discNum = parseFloat(itemDiscount) || 0;

    if (!itemName.trim() || isNaN(qtyNum) || isNaN(mrpNum) || isNaN(spNum)) {
      return;
    }

    if (editingItem) {
      onSaveItem({
        ...editingItem,
        code: itemCode.trim(),
        name: itemName.trim(),
        qty: qtyNum,
        mrp: mrpNum,
        discount: discNum,
        sp: spNum
      });
    } else {
      // Check existing match
      const existing = inventory.find(
        (i) =>
          i.name.toLowerCase() === itemName.trim().toLowerCase() &&
          (!itemCode || (i.code && i.code.toLowerCase() === itemCode.trim().toLowerCase()))
      );

      if (existing) {
        onSaveItem({
          ...existing,
          code: itemCode.trim() || existing.code,
          qty: (Number(existing.qty) || 0) + qtyNum,
          mrp: mrpNum,
          discount: discNum,
          sp: spNum
        });
      } else {
        const newItem: InventoryItem = {
          id: 'ITEM_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
          code: itemCode.trim(),
          name: itemName.trim(),
          qty: qtyNum,
          mrp: mrpNum,
          discount: discNum,
          sp: spNum,
          dateAdded: new Date().toISOString()
        };
        onSaveItem(newItem);
      }
    }

    resetForm();
  };

  // Filter inventory
  const filteredItems = inventory.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      (item.code && item.code.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Add / Edit Item Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            {editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
          </h2>
          {editingItem && (
            <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2.5 py-1 rounded-full">
              Editing: {editingItem.name}
            </span>
          )}
        </div>
        <div className="p-6">
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5"
          >
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Item Code
              </label>
              <input
                type="text"
                value={itemCode}
                onChange={(e) => setItemCode(e.target.value)}
                placeholder="e.g. IA-001"
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Item Name *
              </label>
              <input
                type="text"
                required
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g. Front Disc Brake Pad"
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Quantity *
              </label>
              <input
                type="number"
                min="0"
                required
                value={itemQty}
                onChange={(e) => setItemQty(e.target.value)}
                placeholder="0"
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                MRP (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={itemMrp}
                onChange={(e) => handleMrpChange(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Discount (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={itemDiscount}
                onChange={(e) => handleDiscountChange(e.target.value)}
                placeholder="0"
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm outline-none text-orange-700 font-semibold"
              />
              <p className="text-[10px] text-gray-400 mt-1">Auto-updates selling price</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Selling Price (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={itemSp}
                onChange={(e) => handleSpChange(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm outline-none font-bold text-gray-900"
              />
            </div>

            <div className="sm:col-span-2 md:col-span-3 lg:col-span-6 flex justify-end gap-3 mt-1">
              {editingItem && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-white py-2 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
              <button
                type="submit"
                className="bg-blue-600 text-white py-2 px-6 rounded-xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-semibold text-sm transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{editingItem ? 'Update Item' : 'Add Item to Inventory'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Current Stock Inventory</h2>
            <p className="text-xs text-gray-500">
              Showing {filteredItems.length} of {inventory.length} total products
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onRefresh}
              title="Refresh inventory"
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 px-3 py-2 rounded-xl transition-colors shadow-sm cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items or codes..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm outline-none"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto table-container">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Item Code
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Item Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Stock Qty
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  MRP
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Discount
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Selling Price
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredItems.map((item) => {
                const isOutOfStock = item.qty <= 0;
                const isLowStock = item.qty > 0 && item.qty <= 10;
                const statusClass = isOutOfStock
                  ? 'bg-red-100 text-red-800'
                  : isLowStock
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-green-100 text-green-800';
                const statusText = isOutOfStock
                  ? 'Out of Stock'
                  : isLowStock
                  ? 'Low Stock'
                  : 'In Stock';

                return (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded-md font-semibold">
                        {item.code || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">{item.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-gray-800">
                        {item.qty} units
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ₹{item.mrp.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {item.discount ? (
                        <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
                          {item.discount}% OFF
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      ₹{item.sp.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 inline-flex text-xs font-bold rounded-full ${statusClass}`}>
                        {statusText}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => setEditingItem(item)}
                          className="text-blue-600 hover:text-blue-900 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete ${item.name} from inventory?`)) {
                              onDeleteItem(item.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-900 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredItems.length === 0 && (
            <div className="py-12 text-center text-gray-400">
              <Package className="mx-auto h-12 w-12 text-gray-300 mb-2" />
              <p className="text-sm font-medium">No items found matching your filter.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
