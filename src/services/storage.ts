import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  Firestore,
  Unsubscribe,
  writeBatch
} from 'firebase/firestore';
import { InventoryItem, SaleRecord, SystemUser } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyDIus_LYSd7kTqwik2WLrmGxEWNzJ2_CPw",
  authDomain: "indiaautomobiles-3439a.firebaseapp.com",
  projectId: "indiaautomobiles-3439a",
  storageBucket: "indiaautomobiles-3439a.firebasestorage.app",
  messagingSenderId: "896983559319",
  appId: "1:896983559319:web:896423275f9b85ddaccdd2"
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
} catch (err) {
  console.warn('Firebase initialization notice (running with local cache fallback):', err);
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

  // Sync to Firestore if available
  if (db) {
    try {
      await setDoc(doc(db, 'inventory', sanitizedItem.id), sanitizedItem);
    } catch (err) {
      console.warn('Firestore write warning (saved locally):', err);
    }
  }
}

export async function deleteInventoryItem(itemId: string): Promise<void> {
  const current = getLocalInventory().filter(i => String(i.id).trim() !== String(itemId).trim());
  cachedInventory = current;
  try {
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(current));
  } catch (e) {
    console.warn('LocalStorage delete error:', e);
  }

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
          if (item && item.id) {
            try {
              await setDoc(doc(db, 'inventory', String(item.id).trim()), item);
            } catch (e) {
              console.warn(`Individual inventory stock write warning for ${item.id}:`, e);
            }
          }
        }
      }
    }
  }

  return { updatedInventory: inv, updatedSales: currentSales };
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

  return { updatedInventory: inv, updatedSales: filtered };
}

export async function clearAllSalesHistory(): Promise<void> {
  localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify([]));
  if (db) {
    try {
      const current = getLocalSales();
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

  if (db) {
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (err) {
      console.warn('Firestore user delete warning:', err);
    }
  }
  return true;
}

// Real-time synchronization listeners
export function subscribeToData(
  onInventoryUpdate: (items: InventoryItem[]) => void,
  onSalesUpdate: (sales: SaleRecord[]) => void,
  onUsersUpdate: (users: SystemUser[]) => void,
  onStatusChange: (statusText: string, isOnline: boolean) => void
): () => void {
  // Push initial cached data immediately
  onInventoryUpdate(getLocalInventory());
  onSalesUpdate(getLocalSales());
  onUsersUpdate(getLocalUsers());

  if (!db) {
    onStatusChange('Local Storage Mode', true);
    return () => {};
  }

  const unsubs: Unsubscribe[] = [];

  try {
    unsubs.push(
      onSnapshot(
        collection(db, 'inventory'),
        (snapshot) => {
          if (!snapshot.empty) {
            const items: InventoryItem[] = snapshot.docs.map(d => {
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
            cachedInventory = items;
            try {
              localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(items));
            } catch (e) {
              console.warn('LocalStorage inventory cache warning:', e);
            }
            onInventoryUpdate(items);
          } else {
            // Seed cloud if empty
            const local = getLocalInventory();
            local.forEach(i => saveInventoryItem(i));
          }
          onStatusChange('Synced • Live Cloud', true);
        },
        (err) => {
          console.warn('Inventory cloud sync notice:', err);
          onStatusChange('Local Mode (Cloud Offline)', false);
        }
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'sales'),
        (snapshot) => {
          if (!snapshot.empty) {
            const sales = snapshot.docs.map(d => d.data() as SaleRecord);
            sales.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
            onSalesUpdate(sales);
          }
        },
        (err) => {
          console.warn('Sales cloud sync notice:', err);
        }
      )
    );

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

  return () => {
    unsubs.forEach(u => u());
  };
}
