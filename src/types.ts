/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Person {
  id: string;
  name: string;
  code: string;
  type: 'customer' | 'supplier' | 'employee' | 'other' | 'distributor' | 'store' | 'shareholder' | string;
  phone: string;
  address?: string;
  createdAt: string;
  
  // New Fields
  nationalId?: string;       // کد ملی / شناسه ملی
  anotherNumber?: string;    // شماره تماس دوم
  city: string;              // شهر (Required along with name and phone)
  company?: string;          // نام شرکت
  economicCode?: string;     // کد اقتصادی
  registrationNumber?: string;// شماره ثبت
  branchCode?: string;       // کد شعبه
  shipmentType?: string;     // نوع ارسال (باربری، ارسال مستقیم، پست، تیپاکس، حضوری، غیره)
  cardNumber?: string;       // شماره کارت بانکی
  shabaNumber?: string;      // شماره شبا
  pic?: string;              // تصویر پرسنل / آواتار
  description?: string;      // توضیحات طرف حساب
}

export interface Item {
  id: string;
  name: string;
  code: string;
  unit: string;
  price: number; // Sale price
  cost: number;  // Cost price
  stock: number;
  createdAt: string;
  pic?: string;       // Image URL or base64 data URL
  category?: string;  // Category name or ID
  numberInBox?: number; // تعداد در کارتن (box quantity)
}

export interface Category {
  id: string;
  name: string;
  createdAt: string;
}

export type TransactionType = 'receive' | 'payment' | 'revenue' | 'expense' | 'waste';

export interface Transaction {
  id: string;
  code: string;
  date: string;
  type: TransactionType;
  category: string; // e.g. "فروش", "حقوق", "اجاره", "سایر"
  amount: number;
  personId?: string; // Who received or paid
  itemId?: string;   // For expenses/waste of goods
  quantity?: number; // Quantity for goods waste
  description: string;
  createdAt: string;
}

export interface InvoiceItem {
  itemId: string;
  quantity: number;
  price: number; // قیمت فروش نهایی
  consumerPrice?: number; // قیمت مصرف کننده اولیه
  discountPercentage?: number; // درصد تخفیف روی قیمت مصرف کننده
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  personId: string;
  type: 'sale' | 'purchase';
  items: InvoiceItem[];
  discount: number;
  tax: number;
  total: number; // calculated as (sum of items * quantity) - discount + tax
  description: string;
  createdAt: string;
  paymentMethod?: '100% نقد' | '100% چک' | '50% نقد' | '30 % نقد' | string;
  remainingBalance?: number; // مانده فاکتور
  status?: 'پیش فاکتور' | 'تایید شده' | 'ارسال شده';
}

export interface FormulaInputItem {
  itemId: string;
  quantity: number;
}

export interface Formula {
  id: string;
  name: string;
  outputItemId: string;
  outputQuantity: number;
  inputItems: FormulaInputItem[];
  cost: number; // overhead cost
  description: string;
  createdAt: string;
}

export interface ProductionOrder {
  id: string;
  orderNumber: string;
  date: string;
  formulaId: string;
  quantity: number; // target output quantity
  status: 'pending' | 'ongoing' | 'completed' | 'cancelled';
  description: string;
  createdAt: string;
}

export interface WarehouseItem {
  itemId: string;
  quantity: number;
}

export interface WarehouseVoucher {
  id: string;
  voucherNumber: string;
  date: string;
  type: 'receipt' | 'dispatch'; // رسید (entry) یا حواله (exit)
  items: WarehouseItem[];
  description: string;
  createdAt: string;
}

export interface VoucherEntry {
  accountId: string; // account code or name
  debit: number;  // بدهکار
  credit: number; // بستانکار
  description: string;
}

export interface AccountingVoucher {
  id: string;
  voucherNumber: string;
  date: string;
  entries: VoucherEntry[];
  description: string;
  isOpening?: boolean; // تراز افتتاحیه
  createdAt: string;
}

export interface Account {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  balance: number;
}

export interface Receive {
  id: string;
  code: string;
  personId: string;
  invoiceIds?: string[];
  amount: number;
  date: string;
  pic?: string;
  type: 'نقد' | 'چک';
  dueDate?: string;
  checkId?: string;
  checkSerial?: string;
  checkSeries?: string;
  accountOwner?: string;
  bank?: string;
  inquiryStatus?: string;
  status?: 'پاس شده' | 'موعد نرسیده' | 'برگشت';
  createdAt: string;
  description?: string;
}

