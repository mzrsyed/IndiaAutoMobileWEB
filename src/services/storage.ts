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
  ACTIVE_USER: 'ia_active_user'
};

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

// Synchronous local reading
export function getLocalInventory(): InventoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INVENTORY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(SEED_INVENTORY));
      return SEED_INVENTORY;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_INVENTORY;
  } catch {
    return SEED_INVENTORY;
  }
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
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER);
      sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_USER);
    }
  } catch {
    // Graceful storage fallback
  }
}

export function getLocalActiveUser(): SystemUser | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.ACTIVE_USER) || localStorage.getItem(STORAGE_KEYS.ACTIVE_USER);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Storage managers with Cloud Sync + Fallback
export async function saveInventoryItem(item: InventoryItem): Promise<void> {
  // Update local cache first
  const current = getLocalInventory();
  const index = current.findIndex(i => i.id === item.id);
  if (index >= 0) {
    current[index] = item;
  } else {
    current.unshift(item);
  }
  localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(current));

  // Sync to Firestore if available
  if (db) {
    try {
      await setDoc(doc(db, 'inventory', item.id), item);
    } catch (err) {
      console.warn('Firestore write warning (saved locally):', err);
    }
  }
}

export async function deleteInventoryItem(itemId: string): Promise<void> {
  const current = getLocalInventory().filter(i => i.id !== itemId);
  localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(current));

  if (db) {
    try {
      await deleteDoc(doc(db, 'inventory', itemId));
    } catch (err) {
      console.warn('Firestore delete warning (removed locally):', err);
    }
  }
}

export async function saveSaleRecord(sale: SaleRecord, updateStock = true): Promise<void> {
  const currentSales = getLocalSales();
  const index = currentSales.findIndex(s => s.id === sale.id);
  if (index >= 0) {
    currentSales[index] = sale;
  } else {
    currentSales.unshift(sale);
  }
  localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(currentSales));

  // Deduct stock locally
  if (updateStock && Array.isArray(sale.items)) {
    const inv = getLocalInventory();
    sale.items.forEach(ci => {
      const item = inv.find(i => i.id === ci.id);
      if (item) {
        item.qty = Math.max(0, (Number(item.qty) || 0) - Number(ci.qty));
      }
    });
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inv));
  }

  // Cloud sync
  if (db) {
    try {
      await setDoc(doc(db, 'sales', sale.id), sale);
      if (updateStock && Array.isArray(sale.items)) {
        for (const ci of sale.items) {
          const item = getLocalInventory().find(i => i.id === ci.id);
          if (item) {
            await setDoc(doc(db, 'inventory', item.id), item);
          }
        }
      }
    } catch (err) {
      console.warn('Firestore sale sync warning:', err);
    }
  }
}

export async function deleteSaleRecord(saleId: string, restoreStock = true): Promise<void> {
  const currentSales = getLocalSales();
  const sale = currentSales.find(s => s.id === saleId);

  if (sale && restoreStock && Array.isArray(sale.items)) {
    const inv = getLocalInventory();
    sale.items.forEach(ci => {
      const item = inv.find(i => i.id === ci.id);
      if (item) {
        item.qty = (Number(item.qty) || 0) + (Number(ci.qty) || 0);
      }
    });
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inv));

    if (db) {
      try {
        for (const ci of sale.items) {
          const item = inv.find(i => i.id === ci.id);
          if (item) {
            await setDoc(doc(db, 'inventory', item.id), item);
          }
        }
      } catch (err) {
        console.warn('Firestore stock restore warning:', err);
      }
    }
  }

  const filtered = currentSales.filter(s => s.id !== saleId);
  localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(filtered));

  if (db) {
    try {
      await deleteDoc(doc(db, 'sales', saleId));
    } catch (err) {
      console.warn('Firestore sale delete warning:', err);
    }
  }
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
            const items = snapshot.docs.map(d => d.data() as InventoryItem);
            localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(items));
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
