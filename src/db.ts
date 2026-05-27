/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, setDoc as fsetDoc, deleteDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

import {
  Person,
  Item,
  Transaction,
  Invoice,
  Formula,
  ProductionOrder,
  WarehouseVoucher,
  AccountingVoucher,
  Account,
  Category,
  Receive
} from './types';

// Lazy initialization of Firebase Services
let app: any;
let db: any;
let auth: any;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  auth = getAuth(app);
} catch (e) {
  console.error("Firebase Initialization failed:", e);
}

export { auth, db };

// Error logger conformant to safety rule specifications
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Initial seed data for "شادی آوران" (Pastry, Event Packages & Joyful goods)
const initialPersons: Person[] = [
  {
    id: 'p1',
    name: 'علی احمدی (مشتری سفارشات)',
    code: '1001',
    type: 'customer',
    phone: '09121111111',
    address: 'تهران، خیابان ولیعصر، کوچه بهار، پلاک ۱۰',
    city: 'تهران',
    createdAt: new Date().toISOString()
  },
  {
    id: 'p2',
    name: 'شرکت تامین آرد تهران (تامین‌کننده)',
    code: '2001',
    type: 'supplier',
    phone: '02188888888',
    address: 'تهران، جاده مخصوص کرج، کیلومتر ۵',
    city: 'تهران',
    createdAt: new Date().toISOString()
  },
  {
    id: 'p3',
    name: 'زهرا رضایی (کارمند تولید)',
    code: '3001',
    type: 'employee',
    phone: '09192222222',
    address: 'تهران، نازی آباد، کوچه صفا',
    city: 'تهران',
    createdAt: new Date().toISOString()
  }
];

const initialItems: Item[] = [
  {
    id: 'i1',
    name: 'آرد قنادی درجه یک',
    code: 'M-101',
    unit: 'کیلوگرم',
    price: 35000,
    cost: 30000,
    stock: 250,
    createdAt: new Date().toISOString()
  },
  {
    id: 'i2',
    name: 'شکر سفید همگن',
    code: 'M-102',
    unit: 'کیلوگرم',
    price: 28000,
    cost: 24000,
    stock: 180,
    createdAt: new Date().toISOString()
  },
  {
    id: 'i3',
    name: 'کیک تولد تم شادی آوران (بزرگ)',
    code: 'P-501',
    unit: 'عدد',
    price: 650000,
    cost: 450000,
    stock: 12,
    createdAt: new Date().toISOString()
  },
  {
    id: 'i4',
    name: 'پکیج بادکنک‌آرایی و تم جشن تولد',
    code: 'P-502',
    unit: 'بسته',
    price: 1200000,
    cost: 700000,
    stock: 25,
    createdAt: new Date().toISOString()
  }
];

const initialTransactions: Transaction[] = [
  {
    id: 't1',
    code: 'TR-101',
    date: '1405/03/01',
    type: 'revenue',
    category: 'فروش مستقیم خدمات',
    amount: 15000000,
    personId: 'p1',
    description: 'تسویه بابت اجرای تم تولد سالن صدف شادی آوران',
    createdAt: new Date().toISOString()
  },
  {
    id: 't2',
    code: 'TR-102',
    date: '1405/03/02',
    type: 'expense',
    category: 'اجاره و ملزومات دفتر',
    amount: 8000000,
    description: 'پرداخت قبض آب و برق و ملزومات تزئینی سالگی',
    createdAt: new Date().toISOString()
  },
  {
    id: 't3',
    code: 'TR-103',
    date: '1405/03/03',
    type: 'receive',
    category: 'دریافت نقدی',
    amount: 5000000,
    personId: 'p1',
    description: 'دریافت بیعانه برای جشن هفته آینده',
    createdAt: new Date().toISOString()
  },
  {
    id: 't4',
    code: 'TR-104',
    date: '1405/03/04',
    type: 'payment',
    category: 'پرداخت به تامین‌کننده',
    amount: 3200000,
    personId: 'p2',
    description: 'تسویه بخشی از فاکتور خرید شکر و آرد',
    createdAt: new Date().toISOString()
  },
  {
    id: 't5',
    code: 'TR-105',
    date: '1405/03/05',
    type: 'waste',
    category: 'ضایعات مواد اولیه',
    amount: 120000,
    itemId: 'i1',
    quantity: 4,
    description: 'ضایعات به دلیل رطوبت نامناسب انبار فرعی',
    createdAt: new Date().toISOString()
  }
];

const initialInvoices: Invoice[] = [
  {
    id: 'inv1',
    invoiceNumber: 'INV-1405-001',
    date: '1405/03/02',
    personId: 'p1',
    type: 'sale',
    items: [
      { itemId: 'i3', quantity: 2, price: 650000, total: 1300000 },
      { itemId: 'i4', quantity: 1, price: 1200000, total: 1200000 }
    ],
    discount: 100000,
    tax: 216000, // 9% tax (2500000 - 100000 = 2400000 * 0.09)
    total: 2516000,
    description: 'فروش پکیج جشن تولد به همراه دو عدد کیک سفارشی',
    createdAt: new Date().toISOString()
  }
];

const initialFormulas: Formula[] = [
  {
    id: 'f1',
    name: 'فرمول تولید کیک تولد بزرگ شادی آوران',
    outputItemId: 'i3',
    outputQuantity: 1,
    inputItems: [
      { itemId: 'i1', quantity: 5 }, // 5 kg flour
      { itemId: 'i2', quantity: 3 }  // 3 kg sugar
    ],
    cost: 150000, // overhead cost
    description: 'فرمول استاندارد قنادی کیک خامه‌ای با تزئین فوندانت تم رنگی شاد',
    createdAt: new Date().toISOString()
  }
];

const initialProductionOrders: ProductionOrder[] = [
  {
    id: 'po1',
    orderNumber: 'PR-1405-001',
    date: '1405/03/04',
    formulaId: 'f1',
    quantity: 5,
    status: 'completed',
    description: 'تولید فوری بابت سفارشات تالار مهرگان شادی آوران',
    createdAt: new Date().toISOString()
  }
];

const initialWarehouseVouchers: WarehouseVoucher[] = [
  {
    id: 'wv1',
    voucherNumber: 'WH-1405-01',
    date: '1405/03/01',
    type: 'receipt',
    items: [
      { itemId: 'i1', quantity: 100 },
      { itemId: 'i2', quantity: 50 }
    ],
    description: 'رسید ورود آرد و شکر جدید به انبار مرکزی شادی آوران',
    createdAt: new Date().toISOString()
  }
];

const initialAccountingVouchers: AccountingVoucher[] = [
  {
    id: 'av1',
    voucherNumber: 'ACC-1405-001',
    date: '1405/03/01',
    entries: [
      { accountId: '101', debit: 50000000, credit: 0, description: 'موجودی صندوق نقدی' },
      { accountId: '102', debit: 120000000, credit: 0, description: 'موجودی بانک ملی' },
      { accountId: '301', debit: 0, credit: 170000000, description: 'سرمایه اولیه شرکا شادی آوران' }
    ],
    description: 'سند افتتاحیه سال مالی ۱۴۰۵ شادی آوران',
    isOpening: true,
    createdAt: new Date().toISOString()
  }
];

const initialAccounts: Account[] = [
  { id: '101', code: '10101', name: 'صندوق نقدی', type: 'asset', balance: 50000000 },
  { id: '102', code: '10102', name: 'بانک ملی ایران', type: 'asset', balance: 120000000 },
  { id: '103', code: '10301', name: 'حساب‌های دریافتنی (شخصی)', type: 'asset', balance: 12516000 },
  { id: '201', code: '20101', name: 'حساب‌های پرداختنی (تامین‌کنندگان)', type: 'liability', balance: 3200000 },
  { id: '301', code: '30101', name: 'سرمایه اولیه', type: 'equity', balance: 170000000 },
  { id: '401', code: '40101', name: 'درآمد خدمات و فروش شادی آوران', type: 'revenue', balance: 17516000 },
  { id: '501', code: '50101', name: 'هزینه‌های جاری و اداری', type: 'expense', balance: 8000000 },
  { id: '502', code: '50102', name: 'هزینه ضایعات و دورریز کالاها', type: 'expense', balance: 120000 }
];

const initialCategories: Category[] = [
  { id: 'cat_pocket', name: 'جیبی', createdAt: new Date().toISOString() },
  { id: 'cat_party', name: 'پارتی گیم', createdAt: new Date().toISOString() },
  { id: 'cat_board', name: 'برد گیم', createdAt: new Date().toISOString() }
];

const initialSeeds = {
  persons: initialPersons,
  items: initialItems,
  transactions: initialTransactions,
  invoices: initialInvoices,
  formulas: initialFormulas,
  productionOrders: initialProductionOrders,
  warehouseVouchers: initialWarehouseVouchers,
  accountingVouchers: initialAccountingVouchers,
  accounts: initialAccounts,
  categories: initialCategories
};

// Helper to load/save from LS with default seed fallback
function getStorage<T>(key: string, seed: T[]): T[] {
  const data = localStorage.getItem(`shadi_avaran_${key}`);
  if (!data) {
    localStorage.setItem(`shadi_avaran_${key}`, JSON.stringify(seed));
    return seed;
  }
  return JSON.parse(data);
}

function saveStorage<T>(key: string, data: T[]): void {
  localStorage.setItem(`shadi_avaran_${key}`, JSON.stringify(data));
}

// Recursively remove any keys with undefined values as Firestore doesn't support them
export function cleanUndefined(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => (typeof item === 'object' && item !== null) ? cleanUndefined(item) : item);
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        cleaned[key] = (typeof val === 'object' && val !== null) ? cleanUndefined(val) : val;
      }
    }
    return cleaned;
  }
  return obj;
}

// Wrapper of fsetDoc that cleans the written data first to prevent "Unsupported field value: undefined"
function setDoc(docRef: any, data: any) {
  return fsetDoc(docRef, cleanUndefined(data));
}

export const dbService = {
  // Test connection function
  testConnection: async () => {
    try {
      const { getDocFromServer } = await import('firebase/firestore');
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration.");
      }
    }
  },

  // Hydrates files from Firestore cloud instance
  hydrateFromFirestore: async (): Promise<void> => {
    if (!auth?.currentUser) return;
    const collectionsToHydrate = [
      { key: 'persons', path: 'persons' },
      { key: 'items', path: 'items' },
      { key: 'transactions', path: 'transactions' },
      { key: 'invoices', path: 'invoices' },
      { key: 'formulas', path: 'formulas' },
      { key: 'productionOrders', path: 'productionOrders' },
      { key: 'warehouseVouchers', path: 'warehouseVouchers' },
      { key: 'accountingVouchers', path: 'accountingVouchers' },
      { key: 'accounts', path: 'accounts' },
      { key: 'categories', path: 'categories' },
      { key: 'receives', path: 'receives' }
    ];

    await Promise.all(collectionsToHydrate.map(async (coll) => {
      try {
        const querySnapshot = await getDocs(collection(db, coll.path));
        const list: any[] = [];
        querySnapshot.forEach((docSnap) => {
          list.push(docSnap.data());
        });

        if (list.length > 0) {
          saveStorage(coll.key, list);
        } else {
          // If empty in cloud, bootstrap it with native JSON seed values in parallel
          const currentLocal = getStorage(coll.key, (initialSeeds as any)[coll.key] || []);
          await Promise.all(currentLocal.map(docObj =>
            setDoc(doc(db, coll.path, (docObj as any).id), docObj)
              .catch(err => handleFirestoreError(err, OperationType.WRITE, `${coll.path}/${(docObj as any).id}`))
          ));
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, coll.path);
      }
    }));
  },

  // Persons CRUD
  getPersons: (): Person[] => getStorage('persons', initialPersons),
  savePerson: (person: Person): Person[] => {
    const list = dbService.getPersons();
    const index = list.findIndex(p => p.id === person.id);
    if (index >= 0) list[index] = person;
    else list.push(person);
    saveStorage('persons', list);

    if (auth?.currentUser) {
      setDoc(doc(db, 'persons', person.id), person)
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `persons/${person.id}`));
    }
    return list;
  },
  deletePerson: (id: string): Person[] => {
    const list = dbService.getPersons().filter(p => p.id !== id);
    saveStorage('persons', list);

    if (auth?.currentUser) {
      deleteDoc(doc(db, 'persons', id))
        .catch(err => handleFirestoreError(err, OperationType.DELETE, `persons/${id}`));
    }
    return list;
  },

  // Items CRUD
  getItems: (): Item[] => getStorage('items', initialItems),
  saveItem: (item: Item): Item[] => {
    const list = dbService.getItems();
    const index = list.findIndex(i => i.id === item.id);
    if (index >= 0) list[index] = item;
    else list.push(item);
    saveStorage('items', list);

    if (auth?.currentUser) {
      setDoc(doc(db, 'items', item.id), item)
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `items/${item.id}`));
    }
    return list;
  },
  deleteItem: (id: string): Item[] => {
    const list = dbService.getItems().filter(i => i.id !== id);
    saveStorage('items', list);

    if (auth?.currentUser) {
      deleteDoc(doc(db, 'items', id))
        .catch(err => handleFirestoreError(err, OperationType.DELETE, `items/${id}`));
    }
    return list;
  },

  // Categories CRUD
  getCategories: (): Category[] => getStorage('categories', initialCategories),
  saveCategory: (cat: Category): Category[] => {
    const list = dbService.getCategories();
    const index = list.findIndex(c => c.id === cat.id);
    if (index >= 0) list[index] = cat;
    else list.push(cat);
    saveStorage('categories', list);

    if (auth?.currentUser) {
      setDoc(doc(db, 'categories', cat.id), cat)
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `categories/${cat.id}`));
    }
    return list;
  },
  deleteCategory: (id: string): Category[] => {
    const list = dbService.getCategories().filter(c => c.id !== id);
    saveStorage('categories', list);

    if (auth?.currentUser) {
      deleteDoc(doc(db, 'categories', id))
        .catch(err => handleFirestoreError(err, OperationType.DELETE, `categories/${id}`));
    }
    return list;
  },

  // Transactions CRUD
  getTransactions: (): Transaction[] => getStorage('transactions', initialTransactions),
  saveTransaction: (tr: Transaction): Transaction[] => {
    const list = dbService.getTransactions();
    const index = list.findIndex(t => t.id === tr.id);
    if (index >= 0) list[index] = tr;
    else list.push(tr);
    saveStorage('transactions', list);

    if (auth?.currentUser) {
      setDoc(doc(db, 'transactions', tr.id), tr)
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `transactions/${tr.id}`));
    }
    return list;
  },
  deleteTransaction: (id: string): Transaction[] => {
    const list = dbService.getTransactions().filter(t => t.id !== id);
    saveStorage('transactions', list);

    if (auth?.currentUser) {
      deleteDoc(doc(db, 'transactions', id))
        .catch(err => handleFirestoreError(err, OperationType.DELETE, `transactions/${id}`));
    }
    return list;
  },

  // Receives CRUD
  getReceives: (): Receive[] => getStorage('receives', []),
  saveReceive: (rec: Receive): Receive[] => {
    const list = dbService.getReceives();
    const index = list.findIndex(r => r.id === rec.id);
    if (index >= 0) list[index] = rec;
    else list.push(rec);
    saveStorage('receives', list);

    if (auth?.currentUser) {
      setDoc(doc(db, 'receives', rec.id), rec)
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `receives/${rec.id}`));
    }
    return list;
  },
  deleteReceive: (id: string): Receive[] => {
    const list = dbService.getReceives().filter(r => r.id !== id);
    saveStorage('receives', list);

    if (auth?.currentUser) {
      deleteDoc(doc(db, 'receives', id))
        .catch(err => handleFirestoreError(err, OperationType.DELETE, `receives/${id}`));
    }
    return list;
  },

  // Invoices CRUD
  getInvoices: (): Invoice[] => getStorage('invoices', initialInvoices),
  saveInvoice: (invoice: Invoice): Invoice[] => {
    const list = dbService.getInvoices();
    const index = list.findIndex(i => i.id === invoice.id);
    if (index >= 0) list[index] = invoice;
    else list.push(invoice);
    saveStorage('invoices', list);

    if (auth?.currentUser) {
      setDoc(doc(db, 'invoices', invoice.id), invoice)
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `invoices/${invoice.id}`));
    }
    return list;
  },
  deleteInvoice: (id: string): Invoice[] => {
    const list = dbService.getInvoices().filter(i => i.id !== id);
    saveStorage('invoices', list);

    if (auth?.currentUser) {
      deleteDoc(doc(db, 'invoices', id))
        .catch(err => handleFirestoreError(err, OperationType.DELETE, `invoices/${id}`));
    }
    return list;
  },

  // Formulas CRUD
  getFormulas: (): Formula[] => getStorage('formulas', initialFormulas),
  saveFormula: (formula: Formula): Formula[] => {
    const list = dbService.getFormulas();
    const index = list.findIndex(f => f.id === formula.id);
    if (index >= 0) list[index] = formula;
    else list.push(formula);
    saveStorage('formulas', list);

    if (auth?.currentUser) {
      setDoc(doc(db, 'formulas', formula.id), formula)
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `formulas/${formula.id}`));
    }
    return list;
  },
  deleteFormula: (id: string): Formula[] => {
    const list = dbService.getFormulas().filter(f => f.id !== id);
    saveStorage('formulas', list);

    if (auth?.currentUser) {
      deleteDoc(doc(db, 'formulas', id))
        .catch(err => handleFirestoreError(err, OperationType.DELETE, `formulas/${id}`));
    }
    return list;
  },

  // ProductionOrders CRUD
  getProductionOrders: (): ProductionOrder[] => getStorage('productionOrders', initialProductionOrders),
  saveProductionOrder: (order: ProductionOrder): ProductionOrder[] => {
    const list = dbService.getProductionOrders();
    const index = list.findIndex(o => o.id === order.id);
    if (index >= 0) list[index] = order;
    else list.push(order);
    saveStorage('productionOrders', list);

    if (auth?.currentUser) {
      setDoc(doc(db, 'productionOrders', order.id), order)
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `productionOrders/${order.id}`));
    }
    return list;
  },
  deleteProductionOrder: (id: string): ProductionOrder[] => {
    const list = dbService.getProductionOrders().filter(o => o.id !== id);
    saveStorage('productionOrders', list);

    if (auth?.currentUser) {
      deleteDoc(doc(db, 'productionOrders', id))
        .catch(err => handleFirestoreError(err, OperationType.DELETE, `productionOrders/${id}`));
    }
    return list;
  },

  // WarehouseVouchers CRUD
  getWarehouseVouchers: (): WarehouseVoucher[] => getStorage('warehouseVouchers', initialWarehouseVouchers),
  saveWarehouseVoucher: (voucher: WarehouseVoucher): WarehouseVoucher[] => {
    const list = dbService.getWarehouseVouchers();
    const index = list.findIndex(v => v.id === voucher.id);
    if (index >= 0) list[index] = voucher;
    else list.push(voucher);
    saveStorage('warehouseVouchers', list);

    if (auth?.currentUser) {
      setDoc(doc(db, 'warehouseVouchers', voucher.id), voucher)
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `warehouseVouchers/${voucher.id}`));
    }
    return list;
  },
  deleteWarehouseVoucher: (id: string): WarehouseVoucher[] => {
    const list = dbService.getWarehouseVouchers().filter(v => v.id !== id);
    saveStorage('warehouseVouchers', list);

    if (auth?.currentUser) {
      deleteDoc(doc(db, 'warehouseVouchers', id))
        .catch(err => handleFirestoreError(err, OperationType.DELETE, `warehouseVouchers/${id}`));
    }
    return list;
  },

  // AccountingVouchers CRUD
  getAccountingVouchers: (): AccountingVoucher[] => getStorage('accountingVouchers', initialAccountingVouchers),
  saveAccountingVoucher: (voucher: AccountingVoucher): AccountingVoucher[] => {
    const list = dbService.getAccountingVouchers();
    const index = list.findIndex(v => v.id === voucher.id);
    if (index >= 0) list[index] = voucher;
    else list.push(voucher);
    saveStorage('accountingVouchers', list);

    if (auth?.currentUser) {
      setDoc(doc(db, 'accountingVouchers', voucher.id), voucher)
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `accountingVouchers/${voucher.id}`));
    }
    return list;
  },
  deleteAccountingVoucher: (id: string): AccountingVoucher[] => {
    const list = dbService.getAccountingVouchers().filter(v => v.id !== id);
    saveStorage('accountingVouchers', list);

    if (auth?.currentUser) {
      deleteDoc(doc(db, 'accountingVouchers', id))
        .catch(err => handleFirestoreError(err, OperationType.DELETE, `accountingVouchers/${id}`));
    }
    return list;
  },

  // Accounts CRUD
  getAccounts: (): Account[] => getStorage('accounts', initialAccounts),
  saveAccount: (account: Account): Account[] => {
    const list = dbService.getAccounts();
    const index = list.findIndex(a => a.id === account.id);
    if (index >= 0) list[index] = account;
    else list.push(account);
    saveStorage('accounts', list);

    if (auth?.currentUser) {
      setDoc(doc(db, 'accounts', account.id), account)
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `accounts/${account.id}`));
    }
    return list;
  },

  resetAllData: (): void => {
    saveStorage('persons', initialPersons);
    saveStorage('items', initialItems);
    saveStorage('transactions', initialTransactions);
    saveStorage('invoices', initialInvoices);
    saveStorage('formulas', initialFormulas);
    saveStorage('productionOrders', initialProductionOrders);
    saveStorage('warehouseVouchers', initialWarehouseVouchers);
    saveStorage('accountingVouchers', initialAccountingVouchers);
    saveStorage('accounts', initialAccounts);
    saveStorage('categories', initialCategories);

    if (auth?.currentUser) {
      // Background reset of cloud database as well
      const collectionsToReset = [
        { key: 'persons', seed: initialPersons },
        { key: 'items', seed: initialItems },
        { key: 'transactions', seed: initialTransactions },
        { key: 'invoices', seed: initialInvoices },
        { key: 'formulas', seed: initialFormulas },
        { key: 'productionOrders', seed: initialProductionOrders },
        { key: 'warehouseVouchers', seed: initialWarehouseVouchers },
        { key: 'accountingVouchers', seed: initialAccountingVouchers },
        { key: 'accounts', seed: initialAccounts },
        { key: 'categories', seed: initialCategories }
      ];

      for (const coll of collectionsToReset) {
        // Clean and update in cloud
        coll.seed.forEach(docObj => {
          setDoc(doc(db, coll.key, (docObj as any).id), docObj)
            .catch(err => handleFirestoreError(err, OperationType.WRITE, `${coll.key}/${(docObj as any).id}`));
        });
      }
    }
  }
};
