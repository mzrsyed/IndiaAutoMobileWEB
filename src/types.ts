export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  qty: number;
  mrp: number;
  discount: number;
  sp: number;
  dateAdded?: string;
}

export interface CartItem {
  id: string;
  code: string;
  name: string;
  basePrice: number;
  discountPct: number;
  price: number;
  qty: number;
  total: number;
}

export interface CustomerInfo {
  name: string;
  contact: string;
}

export interface SaleRecord {
  id: string;
  timestamp: string;
  customer: CustomerInfo;
  items: CartItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  paymentMode: string;
  paid: number;
  balance: number;
  generatedBy: string;
}

export interface SystemUser {
  id: string;
  name: string;
  username: string;
  password?: string;
  isAdmin: boolean;
  created: string;
}

export interface CustomerSummary {
  name: string;
  contact: string;
  ordersCount: number;
  totalSpent: number;
  totalDue: number;
}

export interface PaymentMetrics {
  cash: { amount: number; count: number };
  upi: { amount: number; count: number };
  card: { amount: number; count: number };
  netbanking: { amount: number; count: number };
  due: { amount: number; count: number };
}

export type TabType = 'dashboard' | 'inventory' | 'billing' | 'customers' | 'history' | 'users';
