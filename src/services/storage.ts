import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  Firestore,
  Unsubscribe,
  writeBatch
} from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { InventoryItem, SaleRecord, SystemUser } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyBg2jZUOhX-606J6fhwq-LnJDAhKmUZtn8",
  authDomain: "indiaautomobileshopdb.firebaseapp.com",
  projectId: "indiaautomobileshopdb",
  storageBucket: "indiaautomobileshopdb.firebasestorage.app",
  messagingSenderId: "198090020365",
  appId: "1:198090020365:web:922a0b14d568ac1e3f6744",
  measurementId: "G-M9XJ4BCRP0"
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  db = getFirestore(app);

  // Authenticate anonymously so all multi-user Firestore security checks pass seamlessly
  try {
    const auth = getAuth(app);
    signInAnonymously(auth).catch((err) => {
      console.warn('Firebase anonymous auth notice (operating with public rules fallback):', err);
    });
  } catch (err) {
    console.warn('Firebase auth initialization notice:', err);
  }
} catch (err) {
  console.warn('Firebase initialization notice (running with local cache fallback):', err);
}

// Instant cross-tab & cross-window synchronization channel for all active users
const syncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('ia_realtime_cloud_sync') : null;

export function broadcastLocalChange(type: 'inventory' | 'sales' | 'users' | 'all') {
  try {
    syncChannel?.postMessage({ type, timestamp: Date.now() });
  } catch {
    // Graceful fallback
  }
}

const STORAGE_KEYS = {
  INVENTORY: 'ia_inventory_cache',
  SALES: 'ia_sales_cache',
  USERS: 'ia_users_cache',
  ACTIVE_USER: 'ia_active_user',
  SESSION_TIMEOUT: 'ia_session_timeout_minutes',
  LAST_ACTIVITY: 'ia_last_activity_timestamp'
};

// Session timeout: default 30 minutes (0 = never timeout)
export const DEFAULT_SESSION_TIMEOUT_MINUTES = 30;

export function getSessionTimeoutMinutes(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION_TIMEOUT);
    if (raw === null) return DEFAULT_SESSION_TIMEOUT_MINUTES;
    const val = parseInt(raw, 10);
    return isNaN(val) ? DEFAULT_SESSION_TIMEOUT_MINUTES : val;
  } catch {
    return DEFAULT_SESSION_TIMEOUT_MINUTES;
  }
}

export function setSessionTimeoutMinutes(minutes: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SESSION_TIMEOUT, minutes.toString());
  } catch {
    // Graceful fallback
  }
}

export function updateLastActivity(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString());
  } catch {
    // Graceful fallback
  }
}

export function getLastActivity(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY);
    if (!raw) return Date.now();
    const val = parseInt(raw, 10);
    return isNaN(val) ? Date.now() : val;
  } catch {
    return Date.now();
  }
}

export function checkSessionExpired(): boolean {
  const timeoutMins = getSessionTimeoutMinutes();
  if (timeoutMins <= 0) return false; // 0 means Never timeout
  const lastActive = getLastActivity();
  const elapsedMs = Date.now() - lastActive;
  return elapsedMs > timeoutMins * 60 * 1000;
}

export const DEFAULT_ADMIN: SystemUser = {
  id: 'USER_ADMIN',
  name: 'Mazhar Sayyed',
  username: 'admin',
  password: 'India',
  isAdmin: true,
  created: new Date().toISOString()
};

const SEED_INVENTORY: InventoryItem[] = [
  {
    id: 'ITEM_001',
    code: 'IA-BP01',
    name: 'Front Disc Brake Pad',
    qty: 24,
    mrp: 450,
    discount: 10,
    sp: 405,
    dateAdded: new Date().toISOString()
  },
  {
    id: 'ITEM_002',
    code: 'IA-EO20',
    name: 'Premium 4T Engine Oil 20W40 (1L)',
    qty: 40,
    mrp: 380,
    discount: 5,
    sp: 361,
    dateAdded: new Date().toISOString()
  },
  {
    id: 'ITEM_003',
    code: 'IA-SP08',
    name: 'High Performance Spark Plug',
    qty: 55,
    mrp: 160,
    discount: 0,
    sp: 160,
    dateAdded: new Date().toISOString()
  },
  {
    id: 'ITEM_004',
    code: 'IA-CS01',
    name: 'Chain & Sprocket Kit Complete',
    qty: 12,
    mrp: 1450,
    discount: 15,
    sp: 1232.5,
    dateAdded: new Date().toISOString()
  },
  {
    id: 'ITEM_005',
    code: 'IA-CP04',
    name: 'Clutch Plate Friction Set',
    qty: 18,
    mrp: 650,
    discount: 8,
    sp: 598,
    dateAdded: new Date().toISOString()
  }
];

// In-memory active cache to prevent stale reads
let cachedInventory: InventoryItem[] | null = null;

// Synchronous local reading with cache priority
export function getLocalInventory(): InventoryItem[] {
  if (cachedInventory && cachedInventory.length > 0) {
    return cachedInventory;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INVENTORY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(SEED_INVENTORY));
      cachedInventory = SEED_INVENTORY;
      return SEED_INVENTORY;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      cachedInventory = parsed;
      return parsed;
    }
    cachedInventory = SEED_INVENTORY;
    return SEED_INVENTORY;
  } catch {
    cachedInventory = SEED_INVENTORY;
    return SEED_INVENTORY;
  }
}

/**
 * Strict hierarchical matching helper:
 * 1. Exact ID match (highest priority, preventing brand-name collisions)
 * 2. Exact match on BOTH clean code AND clean name
 * 3. Exact match on clean name
 * 4. Normalized name match (whitespace collapsed)
 * Never matches on code alone, because code frequently holds shared brand/manufacturer tags.
 */
export function findMatchingInventoryItem(
  inventory: InventoryItem[],
  target: { id?: string; code?: string; name?: string }
): InventoryItem | undefined {
  if (!inventory || !Array.isArray(inventory) || inventory.length === 0) return undefined;

  // 1. Highest priority: exact ID
  if (target.id) {
    const targetIdStr = String(target.id).trim();
    if (targetIdStr) {
      const matchById = inventory.find(i => String(i.id).trim() === targetIdStr);
      if (matchById) return matchById;
    }
  }

  // 2. Exact match on BOTH code AND name
  const targetCode = target.code && target.code !== '-' ? target.code.trim().toLowerCase() : '';
  const targetName = target.name ? target.name.trim().toLowerCase() : '';

  if (targetCode && targetName) {
    const matchByBoth = inventory.find(i =>
      i.code &&
      i.code.trim().toLowerCase() === targetCode &&
      i.name &&
      i.name.trim().toLowerCase() === targetName
    );
    if (matchByBoth) return matchByBoth;
  }

  // 3. Exact match on name
  if (targetName) {
    const matchByName = inventory.find(i =>
      i.name && i.name.trim().toLowerCase() === targetName
    );
    if (matchByName) return matchByName;
  }

  // 4. Normalized name match
  if (targetName) {
    const normTargetName = targetName.replace(/\s+/g, ' ');
    const matchByNorm = inventory.find(i =>
      i.name && i.name.trim().toLowerCase().replace(/\s+/g, ' ') === normTargetName
    );
    if (matchByNorm) return matchByNorm;
  }

  return undefined;
}

export function getLocalSales(): SaleRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SALES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getLocalUsers(): SystemUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([DEFAULT_ADMIN]));
      return [DEFAULT_ADMIN];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure admin user is always in system
      if (!parsed.some(u => u.username && u.username.toLowerCase() === 'admin')) {
        parsed.unshift(DEFAULT_ADMIN);
      }
      return parsed;
    }
    return [DEFAULT_ADMIN];
  } catch {
    return [DEFAULT_ADMIN];
  }
}

export function setLocalActiveUser(user: SystemUser | null): void {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(user));
      sessionStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(user));
      updateLastActivity();
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER);
      sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_USER);
      localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);
    }
  } catch {
    // Graceful storage fallback
  }
}

export function getLocalActiveUser(): SystemUser | null {
  try {
    if (checkSessionExpired()) {
      setLocalActiveUser(null);
      return null;
    }
    const raw = sessionStorage.getItem(STORAGE_KEYS.ACTIVE_USER) || localStorage.getItem(STORAGE_KEYS.ACTIVE_USER);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Storage managers with Cloud Sync + Fallback
export async function saveInventoryItem(item: InventoryItem): Promise<void> {
  const sanitizedItem: InventoryItem = {
    ...item,
    id: String(item.id).trim(),
    code: item.code ? item.code.trim() : '',
    name: item.name ? item.name.trim() : '',
    qty: typeof item.qty === 'number' ? item.qty : Number(item.qty) || 0,
    mrp: typeof item.mrp === 'number' ? item.mrp : Number(item.mrp) || 0,
    sp: typeof item.sp === 'number' ? item.sp : Number(item.sp) || 0,
    discount: typeof item.discount === 'number' ? item.discount : Number(item.discount) || 0,
    dateAdded: item.dateAdded || new Date().toISOString()
  };

  // Update in-memory cache first
  const current = getLocalInventory().map(i => ({ ...i }));
  const index = current.findIndex(i => String(i.id).trim() === sanitizedItem.id);
  if (index >= 0) {
    current[index] = sanitizedItem;
  } else {
    current.unshift(sanitizedItem);
  }
  cachedInventory = current;

  try {
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(current));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }

  // Broadcast to other tabs & windows
  broadcastLocalChange('inventory');

  // Sync to Firestore if available
  if (db) {
    try {
      await setDoc(doc(db, 'inventory', sanitizedItem.id), sanitizedItem);
    } catch (err) {
      console.warn('Firestore write warning (saved locally):', err);
    }
  }
}

/**
 * Bulk save inventory items (e.g., from Excel upload) with batch Firestore sync
 */
export async function bulkSaveInventoryItems(newItems: InventoryItem[]): Promise<{ added: number; updated: number; total: number }> {
  if (!Array.isArray(newItems) || newItems.length === 0) {
    return { added: 0, updated: 0, total: 0 };
  }

  const current = getLocalInventory().map(i => ({ ...i }));
  const invMap = new Map<string, InventoryItem>();
  current.forEach(i => invMap.set(String(i.id).trim(), i));

  let addedCount = 0;
  let updatedCount = 0;
  const processedItems: InventoryItem[] = [];

  for (const rawItem of newItems) {
    const cleanId = String(rawItem.id || `ITEM_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`).trim();
    const cleanCode = rawItem.code ? String(rawItem.code).trim() : '';
    const cleanName = rawItem.name ? String(rawItem.name).trim() : '';
    if (!cleanName) continue;

    // Check if item exists by exact ID, or matching clean code and name
    let existingKey: string | undefined = undefined;
    if (invMap.has(cleanId)) {
      existingKey = cleanId;
    } else {
      for (const [key, existing] of invMap.entries()) {
        const sameCode = cleanCode && existing.code && existing.code.trim().toLowerCase() === cleanCode.toLowerCase();
        const sameName = existing.name && existing.name.trim().toLowerCase() === cleanName.toLowerCase();
        if ((sameCode && sameName) || (sameCode && !existing.name) || (sameName && !cleanCode)) {
          existingKey = key;
          break;
        }
      }
    }

    const mrp = typeof rawItem.mrp === 'number' ? rawItem.mrp : Number(rawItem.mrp) || 0;
    const discount = typeof rawItem.discount === 'number' ? rawItem.discount : Number(rawItem.discount) || 0;
    let sp = typeof rawItem.sp === 'number' ? rawItem.sp : Number(rawItem.sp) || 0;
    if (sp <= 0 && mrp > 0) {
      sp = Number((mrp - (mrp * discount) / 100).toFixed(2));
    }

    const qty = typeof rawItem.qty === 'number' ? rawItem.qty : Number(rawItem.qty) || 0;

    const itemToSave: InventoryItem = {
      id: existingKey || cleanId,
      code: cleanCode || (existingKey ? invMap.get(existingKey)?.code || '-' : '-'),
      name: cleanName,
      qty,
      mrp,
      discount,
      sp,
      dateAdded: rawItem.dateAdded || new Date().toISOString()
    };

    if (existingKey) {
      updatedCount++;
    } else {
      addedCount++;
    }

    invMap.set(itemToSave.id, itemToSave);
    processedItems.push(itemToSave);
  }

  const finalInventory = Array.from(invMap.values());
  cachedInventory = finalInventory;

  try {
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(finalInventory));
  } catch (e) {
    console.warn('LocalStorage save error during bulk inventory upload:', e);
  }

  broadcastLocalChange('inventory');

  // Push batch to Firestore in chunks of up to 450 items
  if (db && processedItems.length > 0) {
    try {
      const CHUNK_SIZE = 450;
      for (let i = 0; i < processedItems.length; i += CHUNK_SIZE) {
        const chunk = processedItems.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(item => {
          if (db) batch.set(doc(db, 'inventory', item.id), item);
        });
        await batch.commit();
      }
    } catch (err) {
      console.warn('Firestore bulk inventory batch sync warning, saving individually:', err);
      for (const item of processedItems) {
        try {
          if (db) await setDoc(doc(db, 'inventory', item.id), item);
        } catch {
          // ignore individual fallback errors
        }
      }
    }
  }

  return { added: addedCount, updated: updatedCount, total: finalInventory.length };
}

export async function deleteInventoryItem(itemId: string): Promise<void> {
  const current = getLocalInventory().filter(i => String(i.id).trim() !== String(itemId).trim());
  cachedInventory = current;
  try {
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(current));
  } catch (e) {
    console.warn('LocalStorage delete error:', e);
  }

  // Broadcast to other tabs & windows
  broadcastLocalChange('inventory');

  if (db) {
    try {
      await deleteDoc(doc(db, 'inventory', String(itemId).trim()));
    } catch (err) {
      console.warn('Firestore delete warning (removed locally):', err);
    }
  }
}

export async function saveSaleRecord(
  sale: SaleRecord,
  updateStock = true,
  baseInventory?: InventoryItem[]
): Promise<{ updatedInventory: InventoryItem[]; updatedSales: SaleRecord[] }> {
  // 1. Update sales record list
  const currentSales = getLocalSales();
  const index = currentSales.findIndex(s => s.id === sale.id);
  if (index >= 0) {
    currentSales[index] = sale;
  } else {
    currentSales.unshift(sale);
  }
  try {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(currentSales));
  } catch (e) {
    console.warn('LocalStorage sales save error:', e);
  }

  // 2. Determine base inventory to apply stock adjustments
  const invSource = (baseInventory && baseInventory.length > 0)
    ? baseInventory
    : (cachedInventory && cachedInventory.length > 0)
      ? cachedInventory
      : getLocalInventory();

  const inv: InventoryItem[] = invSource.map(i => ({ ...i }));
  const modifiedItems: InventoryItem[] = [];

  // 3. Deduct stock accurately using strict hierarchical matching
  if (updateStock && Array.isArray(sale.items) && sale.items.length > 0) {
    sale.items.forEach(ci => {
      const qtyToDeduct = Number(ci.qty) || 0;
      if (qtyToDeduct <= 0) return;

      const item = findMatchingInventoryItem(inv, ci);
      if (item) {
        const prevQty = Number(item.qty) || 0;
        item.qty = Math.max(0, prevQty - qtyToDeduct);
        if (!modifiedItems.some(m => String(m.id).trim() === String(item.id).trim())) {
          modifiedItems.push(item);
        }
      } else {
        console.warn(`[Stock Adjustment] Item not found for deduction: "${ci.name}" (id: ${ci.id}, code: ${ci.code})`);
      }
    });

    cachedInventory = inv;
    try {
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inv));
    } catch (e) {
      console.warn('LocalStorage inventory update error:', e);
    }
  }

  // 4. Cloud sync: write sale document AND adjust inventory items in Firestore
  if (db) {
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'sales', sale.id), sale);
      if (updateStock && modifiedItems.length > 0) {
        for (const item of modifiedItems) {
          if (item && item.id) {
            batch.set(doc(db, 'inventory', String(item.id).trim()), item);
          }
        }
      }
      await batch.commit();
    } catch (err) {
      console.warn('Firestore sale batch sync warning, attempting individual document writes:', err);
      try {
        await setDoc(doc(db, 'sales', sale.id), sale);
      } catch (e) {
        console.warn('Individual sale write warning:', e);
      }
      if (updateStock && modifiedItems.length > 0) {
        for (const item of modifiedItems) {
          try {
            await setDoc(doc(db, 'inventory', String(item.id).trim()), item);
          } catch (e) {
            console.warn(`Individual inventory stock write warning for ${item.id}:`, e);
          }
        }
      }
    }
  }

  // Broadcast to other tabs & windows
  broadcastLocalChange('sales');
  if (updateStock && modifiedItems.length > 0) {
    broadcastLocalChange('inventory');
  }

  return { updatedInventory: inv, updatedSales: currentSales };
}

/**
 * Adjust money/payment against a customer's total due balance,
 * updating individual order bills in chronological order (oldest pending bill first).
 * Returns the updated sales list and the actual amount applied.
 */
export async function adjustCustomerBalance(
  contact: string,
  amount: number,
  action: 'add' | 'reduce' = 'add',
  notes?: string
): Promise<{
  updatedSales: SaleRecord[];
  adjustedAmount: number;
  updatedCount: number;
  excessAmount: number;
  action: 'add' | 'reduce';
}> {
  const currentSales = getLocalSales();
  const cleanContact = (contact || '').trim().toLowerCase();

  // Find all sales belonging to this customer
  const customerSalesIndices: number[] = [];
  currentSales.forEach((s, idx) => {
    const sContact = (s.customer?.contact || '').trim().toLowerCase();
    if (sContact === cleanContact) {
      customerSalesIndices.push(idx);
    }
  });

  const parsedAmount = Math.max(0, Number(amount) || 0);

  if (customerSalesIndices.length === 0 || parsedAmount <= 0) {
    return {
      updatedSales: currentSales,
      adjustedAmount: 0,
      updatedCount: 0,
      excessAmount: parsedAmount,
      action
    };
  }

  let remainingMoney = Number(parsedAmount.toFixed(2));
  const modifiedSales: SaleRecord[] = [];

  if (action === 'add') {
    // Sort customer sales by timestamp ascending (oldest pending bills first)
    const pendingIndices = customerSalesIndices.filter((idx) => {
      const s = currentSales[idx];
      const total = Number(s.total) || 0;
      const paid = Number(s.paid) || 0;
      const effBal = Math.max(0, total - paid);
      return effBal > 0.001;
    });

    pendingIndices.sort((a, b) => {
      const timeA = new Date(currentSales[a].timestamp).getTime();
      const timeB = new Date(currentSales[b].timestamp).getTime();
      return timeA - timeB;
    });

    for (const idx of pendingIndices) {
      if (remainingMoney <= 0.001) break;

      const sale = currentSales[idx];
      const total = Number(sale.total) || 0;
      const currentPaid = Number(sale.paid) || 0;
      const currentBal = Math.max(0, Number((total - currentPaid).toFixed(2)));

      if (currentBal <= 0.001) continue;

      const paymentForThisBill = Number(Math.min(remainingMoney, currentBal).toFixed(2));
      const newPaid = Number((currentPaid + paymentForThisBill).toFixed(2));
      const newBalance = Math.max(0, Number((total - newPaid).toFixed(2)));

      const updatedSale: SaleRecord = {
        ...sale,
        paid: newPaid,
        balance: newBalance,
        paymentMode: sale.paymentMode || 'Cash'
      };

      currentSales[idx] = updatedSale;
      modifiedSales.push(updatedSale);
      remainingMoney = Math.max(0, Number((remainingMoney - paymentForThisBill).toFixed(2)));
    }
  } else {
    // action === 'reduce': reduce paid amounts starting with newest paid bills first
    const paidIndices = customerSalesIndices.filter((idx) => {
      const s = currentSales[idx];
      const paid = Number(s.paid) || 0;
      return paid > 0.001;
    });

    paidIndices.sort((a, b) => {
      const timeA = new Date(currentSales[a].timestamp).getTime();
      const timeB = new Date(currentSales[b].timestamp).getTime();
      return timeB - timeA; // newest first
    });

    for (const idx of paidIndices) {
      if (remainingMoney <= 0.001) break;

      const sale = currentSales[idx];
      const total = Number(sale.total) || 0;
      const currentPaid = Number(sale.paid) || 0;

      if (currentPaid <= 0.001) continue;

      const deductionForThisBill = Number(Math.min(remainingMoney, currentPaid).toFixed(2));
      const newPaid = Math.max(0, Number((currentPaid - deductionForThisBill).toFixed(2)));
      const newBalance = Math.max(0, Number((total - newPaid).toFixed(2)));

      const updatedSale: SaleRecord = {
        ...sale,
        paid: newPaid,
        balance: newBalance,
        paymentMode: sale.paymentMode || 'Cash'
      };

      currentSales[idx] = updatedSale;
      modifiedSales.push(updatedSale);
      remainingMoney = Math.max(0, Number((remainingMoney - deductionForThisBill).toFixed(2)));
    }
  }

  const adjustedAmount = Number((parsedAmount - remainingMoney).toFixed(2));
  const excessAmount = remainingMoney;

  // Save to LocalStorage
  try {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(currentSales));
  } catch (e) {
    console.warn('LocalStorage sales update error during customer balance adjustment:', e);
  }

  // Sync to Firestore
  if (db && modifiedSales.length > 0) {
    try {
      const batch = writeBatch(db);
      for (const s of modifiedSales) {
        batch.set(doc(db, 'sales', s.id), s);
      }
      await batch.commit();
    } catch (err) {
      console.warn('Firestore customer balance adjustment batch failed, writing individually:', err);
      for (const s of modifiedSales) {
        try {
          await setDoc(doc(db, 'sales', s.id), s);
        } catch (e) {
          console.warn(`Firestore write failure for sale ${s.id}:`, e);
        }
      }
    }
  }

  // Broadcast to other tabs & windows
  broadcastLocalChange('sales');

  return {
    updatedSales: currentSales,
    adjustedAmount,
    updatedCount: modifiedSales.length,
    excessAmount,
    action
  };
}

export async function deleteSaleRecord(
  saleId: string,
  restoreStock = true,
  baseInventory?: InventoryItem[]
): Promise<{ updatedInventory: InventoryItem[]; updatedSales: SaleRecord[] }> {
  const currentSales = getLocalSales();
  const sale = currentSales.find(s => s.id === saleId);

  const invSource = (baseInventory && baseInventory.length > 0)
    ? baseInventory
    : (cachedInventory && cachedInventory.length > 0)
      ? cachedInventory
      : getLocalInventory();

  const inv: InventoryItem[] = invSource.map(i => ({ ...i }));
  const modifiedItems: InventoryItem[] = [];

  if (sale && restoreStock && Array.isArray(sale.items)) {
    sale.items.forEach(ci => {
      const qtyToRestore = Number(ci.qty) || 0;
      if (qtyToRestore <= 0) return;

      const item = findMatchingInventoryItem(inv, ci);
      if (item) {
        const prevQty = Number(item.qty) || 0;
        item.qty = prevQty + qtyToRestore;
        if (!modifiedItems.some(m => String(m.id).trim() === String(item.id).trim())) {
          modifiedItems.push(item);
        }
      }
    });

    cachedInventory = inv;
    try {
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inv));
    } catch (e) {
      console.warn('LocalStorage inventory restore error:', e);
    }

    if (db && modifiedItems.length > 0) {
      try {
        const batch = writeBatch(db);
        for (const item of modifiedItems) {
          if (item && item.id) {
            batch.set(doc(db, 'inventory', String(item.id).trim()), item);
          }
        }
        await batch.commit();
      } catch (err) {
        console.warn('Firestore stock restore batch warning:', err);
        for (const item of modifiedItems) {
          if (item && item.id) {
            try {
              await setDoc(doc(db, 'inventory', String(item.id).trim()), item);
            } catch (e) {
              console.warn(`Individual inventory stock restore warning for ${item.id}:`, e);
            }
          }
        }
      }
    }
  }

  const filtered = currentSales.filter(s => s.id !== saleId);
  try {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(filtered));
  } catch (e) {
    console.warn('LocalStorage sales delete error:', e);
  }

  if (db) {
    try {
      await deleteDoc(doc(db, 'sales', saleId));
    } catch (err) {
      console.warn('Firestore sale delete warning:', err);
    }
  }

  // Broadcast to other tabs & windows
  broadcastLocalChange('sales');
  if (restoreStock && modifiedItems.length > 0) {
    broadcastLocalChange('inventory');
  }

  return { updatedInventory: inv, updatedSales: filtered };
}

export async function clearAllSalesHistory(): Promise<void> {
  const current = getLocalSales();
  localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify([]));
  broadcastLocalChange('sales');
  if (db && current.length > 0) {
    try {
      const batch = writeBatch(db);
      current.slice(0, 400).forEach(s => {
        if (db) batch.delete(doc(db, 'sales', s.id));
      });
      await batch.commit();
    } catch (err) {
      console.warn('Firestore clear sales warning:', err);
    }
  }
}

export async function saveUserRecord(user: SystemUser): Promise<void> {
  const current = getLocalUsers();
  const index = current.findIndex(u => u.id === user.id);
  if (index >= 0) {
    current[index] = user;
  } else {
    current.push(user);
  }
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(current));
  broadcastLocalChange('users');

  if (db) {
    try {
      await setDoc(doc(db, 'users', user.id), user);
    } catch (err) {
      console.warn('Firestore user write warning:', err);
    }
  }
}

export async function deleteUserRecord(userId: string): Promise<boolean> {
  const current = getLocalUsers();
  if (current.length <= 1) return false;
  const filtered = current.filter(u => u.id !== userId);
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(filtered));
  broadcastLocalChange('users');

  if (db) {
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (err) {
      console.warn('Firestore user delete warning:', err);
    }
  }
  return true;
}

// Real-time synchronization listeners for multi-user & multi-tab cloud sync
export function subscribeToData(
  onInventoryUpdate: (items: InventoryItem[]) => void,
  onSalesUpdate: (sales: SaleRecord[]) => void,
  onUsersUpdate: (users: SystemUser[]) => void,
  onStatusChange: (statusText: string, isOnline: boolean) => void
): () => void {
  // Push initial cached data immediately for zero-latency UI
  onInventoryUpdate(getLocalInventory());
  onSalesUpdate(getLocalSales());
  onUsersUpdate(getLocalUsers());

  // 1. Cross-tab & Cross-window instant listener
  const handleSyncMessage = (event: MessageEvent) => {
    const type = event.data?.type;
    if (type === 'inventory' || type === 'all') {
      onInventoryUpdate(getLocalInventory());
    }
    if (type === 'sales' || type === 'all') {
      onSalesUpdate(getLocalSales());
    }
    if (type === 'users' || type === 'all') {
      onUsersUpdate(getLocalUsers());
    }
  };
  syncChannel?.addEventListener('message', handleSyncMessage);

  // 2. Storage event listener (fallback cross-window sync)
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === STORAGE_KEYS.INVENTORY) {
      onInventoryUpdate(getLocalInventory());
    } else if (e.key === STORAGE_KEYS.SALES) {
      onSalesUpdate(getLocalSales());
    } else if (e.key === STORAGE_KEYS.USERS) {
      onUsersUpdate(getLocalUsers());
    }
  };
  window.addEventListener('storage', handleStorageEvent);

  if (!db) {
    onStatusChange('Local Storage Mode', true);
    return () => {
      syncChannel?.removeEventListener('message', handleSyncMessage);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }

  const unsubs: Unsubscribe[] = [];

  try {
    // Inventory Cloud Listener
    unsubs.push(
      onSnapshot(
        collection(db, 'inventory'),
        (snapshot) => {
          if (!snapshot.empty) {
            const cloudItems: InventoryItem[] = snapshot.docs.map(d => {
              const data = d.data();
              return {
                id: String(data.id || d.id).trim(),
                code: data.code ? String(data.code).trim() : '',
                name: data.name ? String(data.name).trim() : '',
                qty: typeof data.qty === 'number' ? data.qty : Number(data.qty) || 0,
                mrp: typeof data.mrp === 'number' ? data.mrp : Number(data.mrp) || 0,
                sp: typeof data.sp === 'number' ? data.sp : Number(data.sp) || 0,
                discount: typeof data.discount === 'number' ? data.discount : Number(data.discount) || 0,
                dateAdded: data.dateAdded || new Date().toISOString()
              };
            });

            // Two-way merge: preserve any local items not yet in Firestore
            const localItems = getLocalInventory();
            const cloudIds = new Set(cloudItems.map(i => i.id));
            const pendingItems = localItems.filter(i => !cloudIds.has(i.id));

            if (pendingItems.length > 0 && db) {
              const batch = writeBatch(db);
              pendingItems.forEach(pi => {
                if (db) batch.set(doc(db, 'inventory', pi.id), pi);
              });
              batch.commit().catch(e => console.warn('Sync pending items notice:', e));
            }

            const merged = [...cloudItems, ...pendingItems];
            cachedInventory = merged;
            try {
              localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(merged));
            } catch (e) {
              console.warn('LocalStorage inventory cache warning:', e);
            }
            onInventoryUpdate(merged);
          } else {
            // Seed cloud if completely empty
            const local = getLocalInventory();
            local.forEach(i => saveInventoryItem(i));
          }
          onStatusChange('Live Cloud Synced', true);
        },
        (err) => {
          console.warn('Inventory cloud sync notice:', err);
          onStatusChange('Local Mode (Cloud Offline)', false);
        }
      )
    );

    // Sales Cloud Listener (Preserves all local bills and auto-pushes to Cloud)
    unsubs.push(
      onSnapshot(
        collection(db, 'sales'),
        (snapshot) => {
          if (!snapshot.empty) {
            const cloudSales = snapshot.docs.map(d => d.data() as SaleRecord);
            const localSales = getLocalSales();
            const cloudIds = new Set(cloudSales.map(s => s.id));
            const pendingSales = localSales.filter(s => !cloudIds.has(s.id));

            // Push any local pending sales to Firestore so other users see them immediately
            if (pendingSales.length > 0 && db) {
              const batch = writeBatch(db);
              pendingSales.forEach(ps => {
                if (db) batch.set(doc(db, 'sales', ps.id), ps);
              });
              batch.commit().catch(e => console.warn('Sync pending sales notice:', e));
            }

            const mergedSales = [...cloudSales, ...pendingSales];
            mergedSales.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(mergedSales));
            onSalesUpdate(mergedSales);
          }
        },
        (err) => {
          console.warn('Sales cloud sync notice:', err);
        }
      )
    );

    // Users Cloud Listener
    unsubs.push(
      onSnapshot(
        collection(db, 'users'),
        (snapshot) => {
          if (!snapshot.empty) {
            const users = snapshot.docs.map(d => d.data() as SystemUser);
            if (!users.some(u => u.username && u.username.toLowerCase() === 'admin')) {
              users.unshift(DEFAULT_ADMIN);
              saveUserRecord(DEFAULT_ADMIN);
            }
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
            onUsersUpdate(users);
          } else {
            saveUserRecord(DEFAULT_ADMIN);
          }
        },
        (err) => {
          console.warn('Users cloud sync notice:', err);
        }
      )
    );
  } catch (err) {
    console.warn('Subscription error:', err);
    onStatusChange('Local Mode', true);
  }

  // Auto sync on window focus and online reconnection
  const handleFocus = () => {
    forceSyncWithCloud().catch(() => {});
  };
  const handleOnline = () => {
    onStatusChange('Connecting to Cloud...', true);
    forceSyncWithCloud().catch(() => {});
  };

  window.addEventListener('focus', handleFocus);
  window.addEventListener('online', handleOnline);

  return () => {
    unsubs.forEach(u => u());
    syncChannel?.removeEventListener('message', handleSyncMessage);
    window.removeEventListener('storage', handleStorageEvent);
    window.removeEventListener('focus', handleFocus);
    window.removeEventListener('online', handleOnline);
  };
}

/**
 * Force manual full two-way cloud synchronization across all users
 */
export async function forceSyncWithCloud(): Promise<{ success: boolean; message: string }> {
  if (!db) {
    return { success: false, message: 'Running in Local Storage Mode.' };
  }

  try {
    // 1. Sync inventory
    const invSnap = await getDocs(collection(db, 'inventory'));
    const localInv = getLocalInventory();
    const invMap = new Map<string, InventoryItem>();

    invSnap.forEach(d => {
      const data = d.data() as InventoryItem;
      const cleanId = String(data.id || d.id).trim();
      invMap.set(cleanId, { ...data, id: cleanId });
    });

    const invBatch = writeBatch(db);
    let invPushCount = 0;
    for (const item of localInv) {
      if (!invMap.has(item.id)) {
        invBatch.set(doc(db, 'inventory', item.id), item);
        invMap.set(item.id, item);
        invPushCount++;
      }
    }
    if (invPushCount > 0) {
      await invBatch.commit();
    }

    const mergedInv = Array.from(invMap.values());
    if (mergedInv.length > 0) {
      cachedInventory = mergedInv;
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(mergedInv));
    }

    // 2. Sync sales
    const salesSnap = await getDocs(collection(db, 'sales'));
    const localSales = getLocalSales();
    const salesMap = new Map<string, SaleRecord>();

    salesSnap.forEach(d => {
      const data = d.data() as SaleRecord;
      salesMap.set(data.id, data);
    });

    const salesBatch = writeBatch(db);
    let salesPushCount = 0;
    for (const s of localSales) {
      if (!salesMap.has(s.id)) {
        salesBatch.set(doc(db, 'sales', s.id), s);
        salesMap.set(s.id, s);
        salesPushCount++;
      }
    }
    if (salesPushCount > 0) {
      await salesBatch.commit();
    }

    const mergedSales = Array.from(salesMap.values());
    mergedSales.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(mergedSales));

    // 3. Broadcast to all users and tabs
    broadcastLocalChange('all');

    return {
      success: true,
      message: `Real-time Cloud Synced: ${mergedInv.length} items & ${mergedSales.length} bills in sync across all users.`
    };
  } catch (err) {
    console.warn('Force sync notice:', err);
    return {
      success: false,
      message: 'Cloud sync active with local cache fallback.'
    };
  }
}
