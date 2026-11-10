import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  Package,
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { InventoryItem } from '../types';

interface InventoryViewProps {
  inventory: InventoryItem[];
  onSaveItem: (item: InventoryItem) => void;
  onBulkImportItems?: (items: InventoryItem[]) => Promise<void>;
  onDeleteItem: (id: string) => void;
  onRefresh: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  inventory,
  onSaveItem,
  onBulkImportItems,
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

  // Excel Upload states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);
  const [excelPreviewItems, setExcelPreviewItems] = useState<InventoryItem[] | null>(null);
  const [excelFileName, setExcelFileName] = useState('');
  const [excelError, setExcelError] = useState<string | null>(null);

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

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Item Code': 'IA-BP01',
        'Item Name': 'Front Disc Brake Pad',
        'Quantity': 20,
        'MRP': 450,
        'Discount %': 10,
        'Selling Price': 405
      },
      {
        'Item Code': 'IA-OF02',
        'Item Name': 'Synthetic Engine Oil Filter',
        'Quantity': 15,
        'MRP': 280,
        'Discount %': 5,
        'Selling Price': 266
      },
      {
        'Item Code': 'IA-SP03',
        'Item Name': 'Iridium Spark Plug Set',
        'Quantity': 30,
        'MRP': 350,
        'Discount %': 0,
        'Selling Price': 350
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory_Template');

    // Auto-fit column widths
    worksheet['!cols'] = [
      { wch: 15 },
      { wch: 32 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 }
    ];

    XLSX.writeFile(workbook, 'IndiaAutomobiles_Inventory_Template.xlsx');
  };

  // Export current inventory to Excel
  const handleExportCurrentInventory = () => {
    if (inventory.length === 0) return;
    const exportData = inventory.map((item, idx) => ({
      'Sr. No.': idx + 1,
      'Item Code': item.code || '-',
      'Item Name': item.name,
      'Stock Qty': item.qty,
      'MRP (₹)': item.mrp,
      'Discount (%)': item.discount || 0,
      'Selling Price (₹)': item.sp,
      'Date Added': item.dateAdded ? new Date(item.dateAdded).toLocaleDateString() : '-'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock_Inventory');
    ws['!cols'] = [
      { wch: 8 },
      { wch: 15 },
      { wch: 32 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 16 },
      { wch: 14 }
    ];
    XLSX.writeFile(wb, `IndiaAutomobiles_Inventory_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Read and parse selected Excel / CSV file
  const handleExcelFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFileName(file.name);
    setExcelError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) throw new Error('File data could not be read.');

        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) throw new Error('The Excel file contains no sheets.');

        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          throw new Error('The selected Excel sheet has no data rows.');
        }

        const parsedItems: InventoryItem[] = [];

        rawJson.forEach((row, idx) => {
          // Normalize column names case-insensitively
          const keys = Object.keys(row);
          const findVal = (patterns: string[]): any => {
            const matchedKey = keys.find(k => {
              const clean = k.toLowerCase().replace(/[^a-z0-9]/g, '');
              return patterns.some(p => clean.includes(p));
            });
            return matchedKey ? row[matchedKey] : '';
          };

          const nameVal = String(findVal(['itemname', 'name', 'product', 'description', 'partname', 'title']) || '').trim();
          if (!nameVal) return; // Skip blank header/rows

          const codeVal = String(findVal(['itemcode', 'code', 'partcode', 'partno', 'partnumber', 'sku']) || '').trim();
          const qtyVal = Number(findVal(['quantity', 'qty', 'stock', 'count'])) || 0;
          const mrpVal = Number(findVal(['mrp', 'rate', 'price', 'retailprice'])) || 0;
          const discVal = Number(findVal(['discount', 'disc', 'discountpercentage'])) || 0;

          let spVal = Number(findVal(['sellingprice', 'sp', 'finalprice', 'netprice', 'saleprice'])) || 0;
          if (spVal <= 0 && mrpVal > 0) {
            spVal = Number((mrpVal - (mrpVal * discVal) / 100).toFixed(2));
          }

          parsedItems.push({
            id: `ITEM_EXCEL_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
            code: codeVal || '-',
            name: nameVal,
            qty: Math.max(0, qtyVal),
            mrp: Math.max(0, mrpVal),
            discount: Math.max(0, discVal),
            sp: Math.max(0, spVal),
            dateAdded: new Date().toISOString()
          });
        });

        if (parsedItems.length === 0) {
          throw new Error('Could not find valid items in Excel file. Please ensure column headers include "Item Name", "Quantity", and "MRP" or "Selling Price".');
        }

        setExcelPreviewItems(parsedItems);
      } catch (err: any) {
        console.error('Excel parse error:', err);
        setExcelError(err.message || 'Failed to read Excel file. Please check format.');
      }
    };

    reader.onerror = () => {
      setExcelError('Error reading uploaded file from disk.');
    };

    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Confirm Excel import
  const handleConfirmImport = async () => {
    if (!excelPreviewItems || excelPreviewItems.length === 0) return;

    try {
      setIsUploadingExcel(true);
      if (onBulkImportItems) {
        await onBulkImportItems(excelPreviewItems);
      } else {
        // Fallback individual saves
        for (const it of excelPreviewItems) {
          onSaveItem(it);
        }
      }
      setExcelPreviewItems(null);
      setExcelFileName('');
      setExcelError(null);
    } catch (err: any) {
      setExcelError(err.message || 'Failed to import items into database.');
    } finally {
      setIsUploadingExcel(false);
    }
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

      {/* Inventory Table with Sticky Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/95 backdrop-blur-xs sticky top-0 z-20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-2xs">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Current Stock Inventory</h2>
            <p className="text-xs text-gray-500">
              Showing {filteredItems.length} of {inventory.length} total products
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Hidden Excel File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleExcelFileSelect}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />

            {/* Excel Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Upload inventory parts from Excel or CSV file"
              className="flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Excel</span>
            </button>

            {/* Download Template Button */}
            <button
              type="button"
              onClick={handleDownloadTemplate}
              title="Download sample Excel template format with standard columns"
              className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-2 rounded-xl transition-colors shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Excel Template</span>
            </button>

            {/* Export Current Inventory to Excel */}
            <button
              type="button"
              onClick={handleExportCurrentInventory}
              title="Export all stock inventory to an Excel spreadsheet"
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 px-3 py-2 rounded-xl transition-colors shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-gray-500" />
              <span className="hidden md:inline">Export Excel</span>
            </button>

            <button
              onClick={onRefresh}
              title="Refresh inventory"
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 px-3 py-2 rounded-xl transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <div className="relative w-full sm:w-56">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items or codes..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs outline-none"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[68vh] overflow-y-auto table-container">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/95 backdrop-blur-xs sticky top-0 z-10 shadow-2xs">
              <tr>
                <th scope="col" className="sticky top-0 bg-gray-50 z-10 px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Item Code
                </th>
                <th scope="col" className="sticky top-0 bg-gray-50 z-10 px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Item Name
                </th>
                <th scope="col" className="sticky top-0 bg-gray-50 z-10 px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Stock Qty
                </th>
                <th scope="col" className="sticky top-0 bg-gray-50 z-10 px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  MRP
                </th>
                <th scope="col" className="sticky top-0 bg-gray-50 z-10 px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Discount
                </th>
                <th scope="col" className="sticky top-0 bg-gray-50 z-10 px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Selling Price
                </th>
                <th scope="col" className="sticky top-0 bg-gray-50 z-10 px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="sticky top-0 bg-gray-50 z-10 px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
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

      {/* Excel Upload Error Banner / Toast */}
      {excelError && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-rose-50 border-2 border-rose-300 text-rose-900 p-4 rounded-2xl shadow-2xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-4">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <h4 className="font-bold text-rose-900 text-sm">Excel Upload Issue</h4>
            <p className="mt-1 text-rose-700 leading-relaxed">{excelError}</p>
          </div>
          <button
            type="button"
            onClick={() => setExcelError(null)}
            className="text-rose-400 hover:text-rose-600 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Excel Import Preview & Confirmation Modal */}
      {excelPreviewItems && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white p-5 flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Review Excel Import Items
                  </h3>
                  <p className="text-xs text-emerald-200 mt-0.5">
                    File: <strong className="text-white">{excelFileName}</strong> &bull; Found{' '}
                    <strong className="text-white font-black">{excelPreviewItems.length}</strong> items ready to insert into cloud database
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setExcelPreviewItems(null);
                  setExcelFileName('');
                }}
                disabled={isUploadingExcel}
                className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Items Table */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Existing items with identical item codes or product names will have their stock quantity and rates updated automatically. New products will be inserted.
                </span>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-100 text-gray-700 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2.5 text-center w-12">Sr.</th>
                      <th className="px-3 py-2.5 text-left">Item Code</th>
                      <th className="px-4 py-2.5 text-left">Item Description</th>
                      <th className="px-3 py-2.5 text-center">Stock Qty</th>
                      <th className="px-3 py-2.5 text-right">MRP (₹)</th>
                      <th className="px-3 py-2.5 text-center">Disc (%)</th>
                      <th className="px-4 py-2.5 text-right font-black">Selling Price (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {excelPreviewItems.slice(0, 100).map((item, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                        <td className="px-3 py-2 text-center text-gray-400 font-bold">{idx + 1}</td>
                        <td className="px-3 py-2 font-mono font-bold text-gray-700">{item.code || '-'}</td>
                        <td className="px-4 py-2 font-medium text-gray-900">{item.name}</td>
                        <td className="px-3 py-2 text-center font-bold text-blue-700 bg-blue-50/50">
                          {item.qty}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-600">₹{item.mrp.toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">
                          {item.discount ? (
                            <span className="text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded-md font-semibold text-[10px]">
                              {item.discount}%
                            </span>
                          ) : (
                            <span className="text-gray-400 text-[10px]">0%</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right font-black text-gray-900">
                          ₹{item.sp.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {excelPreviewItems.length > 100 && (
                <p className="text-xs text-gray-500 text-center italic">
                  Showing first 100 of {excelPreviewItems.length} total items in preview. All {excelPreviewItems.length} items will be uploaded upon confirmation.
                </p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  setExcelPreviewItems(null);
                  setExcelFileName('');
                }}
                disabled={isUploadingExcel}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={isUploadingExcel}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>
                    {isUploadingExcel ? 'Inserting to Cloud Database...' : `Confirm & Insert ${excelPreviewItems.length} Items`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
