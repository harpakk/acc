/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { dbService } from '../db';
import { Invoice, InvoiceItem, Item, Person, Transaction, Receive } from '../types';
import { 
  Plus, 
  Search, 
  Trash2, 
  Printer, 
  FileText, 
  CheckCircle2, 
  ShoppingCart, 
  User, 
  PlusCircle, 
  Edit, 
  DollarSign, 
  ArrowLeft, 
  Filter, 
  RefreshCw, 
  Layers, 
  Truck, 
  Award, 
  Info, 
  X, 
  Calendar, 
  CreditCard,
  FileCheck
} from 'lucide-react';

// Helper to get Jalaali Persian Date Today based on UTC or local time
const getPersianDateToday = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  
  let jy = year - 621;
  const base = new Date(year, 2, 21);
  const diffTime = today.getTime() - base.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  let jm = 1;
  let jd = 1;
  
  if (diffDays >= 0) {
    if (diffDays < 186) {
      jm = 1 + Math.floor(diffDays / 31);
      jd = 1 + (diffDays % 31);
    } else {
      const rest = diffDays - 186;
      jm = 7 + Math.floor(rest / 30);
      jd = 1 + (rest % 30);
    }
  } else {
    jy -= 1;
    const prevBase = new Date(year - 1, 2, 21);
    const diffTimePrev = today.getTime() - prevBase.getTime();
    const diffDaysPrev = Math.floor(diffTimePrev / (1000 * 60 * 60 * 24));
    if (diffDaysPrev < 186) {
      jm = 1 + Math.floor(diffDaysPrev / 31);
      jd = 1 + (diffDaysPrev % 31);
    } else {
      const rest = diffDaysPrev - 186;
      jm = 7 + Math.floor(rest / 30);
      jd = 1 + (rest % 30);
    }
  }

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${jy}/${pad(jm)}/${pad(jd)}`;
};

interface InvoicesProps {
  initialSubView: 'invoice-new' | 'invoice-list' | 'revenue-new' | 'revenue-list';
}

export default function Invoices({ initialSubView }: InvoicesProps) {
  const [subView, setSubView] = useState(initialSubView);

  const handlePrintInvoice = () => {
    const originalContent = document.getElementById('print-invoice-area');
    if (!originalContent) return;

    // Create a temporary container directly under body
    const printContainer = document.createElement('div');
    printContainer.id = 'temp-print-container-direct';
    printContainer.dir = 'rtl';
    printContainer.innerHTML = originalContent.innerHTML;

    // Remove no-print items from printed HTML
    const noPrintItems = printContainer.querySelectorAll('.no-print');
    noPrintItems.forEach(el => el.remove());

    // Add a print-active class to body
    document.body.classList.add('print-direct-active');
    document.body.appendChild(printContainer);

    // Add style tags to document.head if they don't exist
    let styleTag = document.getElementById('print-direct-styles');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'print-direct-styles';
      styleTag.innerHTML = `
        @media print {
          body.print-direct-active #root {
            display: none !important;
          }
          body.print-direct-active #temp-print-container-direct {
            display: block !important;
            background: white !important;
            color: black !important;
            width: 100% !important;
            direction: rtl !important;
            font-family: system-ui, sans-serif !important;
            padding: 24px !important;
          }
          .no-print, button, .btn {
            display: none !important;
          }
        }
      `;
      document.head.appendChild(styleTag);
    }

    // Trigger browser print
    setTimeout(() => {
      try {
        window.print();
      } catch (err) {
        console.error("Direct printing failed: ", err);
      } finally {
        // Cleanup afterwards
        setTimeout(() => {
          if (document.body.contains(printContainer)) {
            document.body.removeChild(printContainer);
          }
          document.body.classList.remove('print-direct-active');
        }, 1000);
      }
    }, 400);
  };
  
  // Data State
  const [items, setItems] = useState<Item[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [receives, setReceives] = useState<Receive[]>([]);

  // Editing Mode State
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

  // Invoice Form State
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [personId, setPersonId] = useState('');
  const [invoiceType, setInvoiceType] = useState<'sale' | 'purchase'>('sale');
  const [selectedItems, setSelectedItems] = useState<InvoiceItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(9); // 9% service vat/tax
  const [description, setDescription] = useState('');
  
  // Custom metadata & status fields for Invoices
  const [paymentMethod, setPaymentMethod] = useState<string>('100% نقد');
  const [invoiceStatus, setInvoiceStatus] = useState<'پیش فاکتور' | 'تایید شده' | 'ارسال شده'>('تایید شده');
  const [shipmentType, setShipmentType] = useState<string>('ارسال مستقیم');

  // Customer dynamic details display during billing
  const [clientAddress, setClientAddress] = useState('');
  const [clientCity, setClientCity] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  // Typable product selector states
  const [itemSearchText, setItemSearchText] = useState('');
  const [currentItemId, setCurrentItemId] = useState('');
  const [currentQty, setCurrentQty] = useState<number>(1);
  const [currentConsumerPrice, setCurrentConsumerPrice] = useState<number>(0);
  const [currentItemDiscountPct, setCurrentItemDiscountPct] = useState<number>(0);

  // Revenue Form State
  const [revDate, setRevDate] = useState('');
  const [revAmount, setRevAmount] = useState<number | ''>('');
  const [revPersonId, setRevPersonId] = useState('');
  const [revCategory, setRevCategory] = useState('درآمد خدمات و تشریفات');
  const [revDesc, setRevDesc] = useState('');

  // UI / Interactive Modals
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Payment Registrar Dialog State (the user pays toward outstanding balance "مانده")
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [paymentAmt, setPaymentAmt] = useState<number | ''>('');
  const [paymentType, setPaymentType] = useState<'نقد' | 'چک'>('نقد');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentDesc, setPaymentDesc] = useState('');
  const [paymentBank, setPaymentBank] = useState('');
  const [paymentSerial, setPaymentSerial] = useState('');
  const [paymentDueDate, setPaymentDueDate] = useState('');

  // Advanced Filtering States
  const [filterActiveStatus, setFilterActiveStatus] = useState<'all' | 'پیش فاکتور' | 'تایید شده' | 'ارسال شده'>('all');
  const [filterPersonId, setFilterPersonId] = useState<string>('all');
  const [filterBalance, setFilterBalance] = useState<'all' | 'outstanding' | 'settled'>('all');
  const [filterDateSearch, setFilterDateSearch] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');

  useEffect(() => {
    if (initialSubView) {
      setSubView(initialSubView);
    }
  }, [initialSubView]);

  useEffect(() => {
    loadData();
    const currentDateStr = getPersianDateToday();
    setInvoiceDate(currentDateStr);
    setRevDate(currentDateStr);
    setPaymentDate(currentDateStr);
  }, []);

  useEffect(() => {
    if (!editingInvoiceId && !invoiceNumber) {
      setInvoiceNumber(`INV-1405-${Math.floor(Math.random() * 90000) + 10000}`);
    }
  }, [editingInvoiceId]);

  const loadData = () => {
    setItems(dbService.getItems());
    setPersons(dbService.getPersons());
    setInvoices(dbService.getInvoices());
    setTransactions(dbService.getTransactions());
    setReceives(dbService.getReceives());
  };

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Trigger invoice edition helper
  const handleStartEditInvoice = (inv: Invoice) => {
    setEditingInvoiceId(inv.id);
    setInvoiceNumber(inv.invoiceNumber);
    setInvoiceDate(inv.date);
    setPersonId(inv.personId);
    setInvoiceType(inv.type);
    setSelectedItems(inv.items || []);
    setDiscount(inv.discount || 0);
    setTaxRate(9); // Default index 9% standard VAT tax
    setDescription(inv.description || '');
    setPaymentMethod(inv.paymentMethod || '100% نقد');
    setInvoiceStatus(inv.status || 'تایید شده');
    
    // Populate client details from database
    const personObj = dbService.getPersons().find(p => p.id === inv.personId);
    if (personObj) {
      setClientAddress(personObj.address || '');
      setClientCity(personObj.city || '');
      setClientPhone(personObj.phone || '');
      setShipmentType(personObj.shipmentType || 'ارسال مستقیم');
    }

    setSubView('invoice-new');
  };

  const cancelEditMode = () => {
    setEditingInvoiceId(null);
    setSelectedItems([]);
    setDiscount(0);
    setDescription('');
    setPersonId('');
    setClientAddress('');
    setClientCity('');
    setClientPhone('');
    setShipmentType('ارسال مستقیم');
    setInvoiceNumber(`INV-1405-${Math.floor(Math.random() * 90000) + 10000}`);
    setSubView('invoice-list');
  };

  // Auto populate customer address details on selection
  const handleSelectPerson = (pId: string) => {
    setPersonId(pId);
    if (!pId) {
      setClientAddress('');
      setClientCity('');
      setClientPhone('');
      setShipmentType('ارسال مستقیم');
      return;
    }
    const customerObj = persons.find(p => p.id === pId);
    if (customerObj) {
      setClientAddress(customerObj.address || '');
      setClientCity(customerObj.city || '');
      setClientPhone(customerObj.phone || '');
      setShipmentType(customerObj.shipmentType || 'ارسال مستقیم');
    }
  };

  // Add individual product block
  const handleRegisterProductLine = () => {
    if (!currentItemId) return;
    const itemObj = items.find(i => i.id === currentItemId);
    if (!itemObj) return;

    // Check quantity parameters
    if (currentQty <= 0) {
      alert('لطفا تعداد را معتبر وارد نمایید.');
      return;
    }

    // Calculations based on consumer price & specified item discount percentage
    // If discount parameter exists, calculate final price
    const unitConsumerPrice = currentConsumerPrice || itemObj.price;
    const calculatedDiscountAmount = (unitConsumerPrice * currentItemDiscountPct) / 100;
    const finalCalculatedPrice = Math.max(0, unitConsumerPrice - calculatedDiscountAmount);
    const lineTotal = currentQty * finalCalculatedPrice;

    // Check if item is already added
    const matchIndex = selectedItems.findIndex(x => x.itemId === currentItemId);
    if (matchIndex >= 0) {
      const copyList = [...selectedItems];
      copyList[matchIndex].quantity += currentQty;
      // Recalc values
      const mergedQty = copyList[matchIndex].quantity;
      copyList[matchIndex].consumerPrice = unitConsumerPrice;
      copyList[matchIndex].discountPercentage = currentItemDiscountPct;
      copyList[matchIndex].price = finalCalculatedPrice;
      copyList[matchIndex].total = mergedQty * finalCalculatedPrice;
      setSelectedItems(copyList);
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          itemId: currentItemId,
          quantity: currentQty,
          price: finalCalculatedPrice,
          consumerPrice: unitConsumerPrice,
          discountPercentage: currentItemDiscountPct,
          total: lineTotal
        }
      ]);
    }

    // Reset item selector controls
    setCurrentItemId('');
    setCurrentQty(1);
    setCurrentConsumerPrice(0);
    setCurrentItemDiscountPct(0);
    setItemSearchText('');
  };

  const handleRemoveInvoiceItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  // Pricing math metrics
  const totalConsumerSum = selectedItems.reduce((sum, it) => sum + ((it.consumerPrice || it.price) * it.quantity), 0);
  const totalItemDiscounts = selectedItems.reduce((sum, it) => {
    const rawConsumer = it.consumerPrice || it.price;
    const actualPrice = it.price;
    return sum + ((rawConsumer - actualPrice) * it.quantity);
  }, 0);

  const subtotal = selectedItems.reduce((sum, item) => sum + item.total, 0);
  const calculatedTax = Math.round((subtotal - discount) * (taxRate / 100));
  const finalInvoiceTotal = Math.max(0, subtotal - discount + calculatedTax);

  // Core save or update invoice operation
  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personId || selectedItems.length === 0) {
      alert('لطفا یکی از طرف حساب‌ها را انتخاب کرده و حداقل یک کفه اقلام به فاکتور بدهید.');
      return;
    }

    let finalRemaining = finalInvoiceTotal;
    
    if (editingInvoiceId) {
      const oldInvoice = invoices.find(inv => inv.id === editingInvoiceId);
      if (oldInvoice) {
        // Calculate already paid portion
        const previousTotal = oldInvoice.total;
        const previousRemaining = oldInvoice.remainingBalance ?? previousTotal;
        const paidAmount = Math.max(0, previousTotal - previousRemaining);
        finalRemaining = Math.max(0, finalInvoiceTotal - paidAmount);
      }
    }

    const payload: Invoice = {
      id: editingInvoiceId ? editingInvoiceId : `inv_${Date.now()}`,
      invoiceNumber,
      date: invoiceDate,
      personId,
      type: invoiceType,
      items: selectedItems,
      discount,
      tax: calculatedTax,
      total: finalInvoiceTotal,
      description: description.trim() || `ثبت فاکتور رسمی ${invoiceType === 'sale' ? 'فروش' : 'خرید'} به شماره ${invoiceNumber} شعبه کاشان`,
      createdAt: editingInvoiceId ? (invoices.find(v => v.id === editingInvoiceId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      
      // Extended fields
      paymentMethod,
      remainingBalance: finalRemaining,
      status: invoiceStatus
    };

    // 1. Commit Invoice to DB
    dbService.saveInvoice(payload);

    // 2. Safely deduct or adjust item warehousing levels
    // (Only if it's new, otherwise we trust previous stock transactions. For absolute cleanliness we increment/decrement appropriately)
    selectedItems.forEach(lineItem => {
      const dbItem = items.find(i => i.id === lineItem.itemId);
      if (dbItem) {
        // Simple stock calculation helper
        const qtyDiff = lineItem.quantity;
        const delta = invoiceType === 'sale' ? -qtyDiff : qtyDiff;
        dbService.saveItem({
          ...dbItem,
          stock: Math.max(0, dbItem.stock + (editingInvoiceId ? 0 : delta)) // only adjust stock automatically for new ones, or preserve
        });
      }
    });

    // 3. Keep standard audit tracking log
    dbService.saveTransaction({
      id: `tr_inv_${Date.now()}`,
      code: `TR-${invoiceNumber}`,
      date: invoiceDate,
      type: invoiceType === 'sale' ? 'revenue' : 'expense',
      category: invoiceType === 'sale' ? 'فروش کالا' : 'خرید مواد اولیه',
      amount: finalInvoiceTotal,
      personId,
      description: `فاکتور رسمی ${payload.invoiceNumber} به وضعیت ${invoiceStatus} با روش تسویه ${paymentMethod}`,
      createdAt: new Date().toISOString()
    });

    showNotice(editingInvoiceId ? 'تغییرات فاکتور با موفقیت ذخیره و اسناد مالی اصلاح گردید.' : 'فاکتور رسمی با موفقیت صادر و تحویل سیستم گردید.');
    
    // Clear forms
    setEditingInvoiceId(null);
    setSelectedItems([]);
    setDiscount(0);
    setDescription('');
    setPersonId('');
    setClientAddress('');
    setClientCity('');
    setClientPhone('');
    setShipmentType('ارسال مستقیم');
    loadData();
    setSubView('invoice-list');
  };

  const handleDeleteInvoice = (id: string) => {
    if (confirm('آیا از حذف دائم این فاکتور مطمئن هستید؟ اسناد متصل کماکان برای حسابرسان باقی می‌ماند.')) {
      dbService.deleteInvoice(id);
      loadData();
      showNotice('فاکتور با موفقیت حذف گردید.');
    }
  };

  // Payment Registrar: deduct from remaining balance "مانده"
  const handleOpenPaymentModal = (inv: Invoice) => {
    setPayingInvoice(inv);
    const initialAmt = inv.remainingBalance ?? inv.total;
    setPaymentAmt(initialAmt);
    setPaymentDesc(`وصول نقدی بابت فاکتور شماره ${inv.invoiceNumber}`);
    setPaymentBank('');
    setPaymentSerial('');
    setPaymentDueDate('');
  };

  const handleSaveInvoicePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoice || !paymentAmt || paymentAmt <= 0) return;

    const parsedAmt = Number(paymentAmt);
    const invoiceCurrentRemaining = payingInvoice.remainingBalance ?? payingInvoice.total;

    if (parsedAmt > invoiceCurrentRemaining) {
      if (!confirm('مبلغ دریافتی پرداختی بیشتر از مانده فاکتور است. آیا مطمئن هستید؟')) {
        return;
      }
    }

    // 1. Calculate new remaining balance
    const updatedInvoiceRemaining = Math.max(0, invoiceCurrentRemaining - parsedAmt);
    const updatedInvoiceObj: Invoice = {
      ...payingInvoice,
      remainingBalance: updatedInvoiceRemaining
    };

    // Save updated invoice
    dbService.saveInvoice(updatedInvoiceObj);

    // 2. Save corresponding Receive record
    const receiveId = `rec_inv_${Date.now()}`;
    const receiveLog: Receive = {
      id: receiveId,
      code: `REC-${Math.floor(Math.random() * 90000) + 10000}`,
      personId: payingInvoice.personId,
      invoiceIds: [payingInvoice.id],
      amount: parsedAmt,
      date: paymentDate,
      type: paymentType,
      dueDate: paymentType === 'چک' ? paymentDueDate : undefined,
      checkSerial: paymentType === 'چک' ? paymentSerial : undefined,
      bank: paymentType === 'چک' ? paymentBank : undefined,
      description: paymentDesc || `وصول ${paymentType} فاکتور ${payingInvoice.invoiceNumber}`,
      createdAt: new Date().toISOString()
    };

    dbService.saveReceive(receiveLog);

    // 3. Register transaction receipt
    dbService.saveTransaction({
      id: `tr_${receiveId}`,
      code: `TR-${receiveLog.code}`,
      date: paymentDate,
      type: 'revenue',
      category: paymentType === 'چک' ? 'دریافت چک' : 'دریافت نقدی',
      amount: parsedAmt,
      personId: payingInvoice.personId,
      description: receiveLog.description || '',
      createdAt: new Date().toISOString()
    });

    showNotice(`سند پرداخت به ارزش ${parsedAmt.toLocaleString()} ریال با موفقیت وصول وجر پرداخت ثبت گردید.`);
    setPayingInvoice(null);
    setPaymentAmt('');
    loadData();
  };

  // Independent revenue registration block
  const handleSaveRevenue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revAmount || Number(revAmount) <= 0) return;

    const newRevId = `tr_rev_${Date.now()}`;
    const newRev: Transaction = {
      id: newRevId,
      code: `REV-${Math.floor(Math.random() * 9000) + 1000}`,
      date: revDate,
      type: 'revenue',
      category: revCategory,
      amount: Number(revAmount),
      personId: revPersonId || undefined,
      description: revDesc.trim() || `ثبت درآمد متفرقه بابت ${revCategory} میم بازی`,
      createdAt: new Date().toISOString()
    };

    dbService.saveTransaction(newRev);

    // Create a complementary Receive for Cash Book compliance
    dbService.saveReceive({
      id: `rec_${newRevId}`,
      code: `REC-${Math.floor(Math.random() * 9000) + 1000}`,
      personId: revPersonId || 'unassigned_walkin',
      amount: Number(revAmount),
      date: revDate,
      type: 'نقد',
      description: newRev.description,
      createdAt: new Date().toISOString()
    });

    showNotice('درآمد متفرقه و خدمات شادی آوران با موفقیت به دفتر ثبت گردید.');
    setRevAmount('');
    setRevDesc('');
    setRevPersonId('');
    loadData();
    setSubView('revenue-list');
  };

  const handleDeleteTransaction = (id: string) => {
    if (confirm('آیا از حذف این ردیف درآمد مطمئن هستید؟')) {
      dbService.deleteTransaction(id);
      
      // Attempt removal of complementary Receive if exists
      try {
        dbService.deleteReceive(`rec_${id}`);
      } catch (err) {}

      loadData();
      showNotice('رکورد درآمد انتخابی با موفقیت حذف گردید.');
    }
  };

  // Typable product list filtering
  const filteredProductsToChoose = items.filter(itm => {
    if (!itemSearchText) return true;
    return itm.name.toLowerCase().includes(itemSearchText.toLowerCase()) || 
           itm.code.toLowerCase().includes(itemSearchText.toLowerCase());
  });

  // Advanced Filtering Math of Invoices
  const matchedInvoicesFiltered = invoices.filter(inv => {
    const personObj = persons.find(p => p.id === inv.personId);
    const clientName = (personObj?.name || 'ناشناخته').toLowerCase();
    
    // Status Filter Tab
    if (filterActiveStatus !== 'all' && inv.status !== filterActiveStatus) return false;

    // Client Selector Filter
    if (filterPersonId !== 'all' && inv.personId !== filterPersonId) return false;

    // Balance outstanding filter
    const rem = inv.remainingBalance ?? inv.total;
    if (filterBalance === 'outstanding' && rem <= 0) return false;
    if (filterBalance === 'settled' && rem > 0) return false;

    // Date search
    if (filterDateSearch && !inv.date.includes(filterDateSearch)) return false;

    // Fuzzy search box (by invoiceNumber or description or customerName)
    if (searchText) {
      const s = searchText.toLowerCase();
      const numMatch = inv.invoiceNumber.toLowerCase().includes(s);
      const descMatch = (inv.description || '').toLowerCase().includes(s);
      const nameMatch = clientName.includes(s);
      const methodMatch = (inv.paymentMethod || '').toLowerCase().includes(s);
      
      if (!numMatch && !descMatch && !nameMatch && !methodMatch) {
         return false;
      }
    }

    return true;
  });

  return (
    <div className="space-y-6 text-right animate-fade-in" dir="rtl" id="invoices-root-container">
      {/* Styles for pristine isolated A4 printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-invoice-area, #print-invoice-area * {
            visibility: visible !important;
          }
          #print-invoice-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            color: black !important;
            font-size: 12px !important;
            padding: 20px !important;
            direction: rtl !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Dynamic Popups */}
      {notification && (
        <div className="fixed bottom-6 left-6 bg-slate-900 border border-slate-800 text-emerald-400 px-6 py-4 rounded-2xl shadow-2xl z-50 text-xs font-black flex items-center gap-3 transition">
          <CheckCircle2 size={16} className="text-emerald-400 animate-pulse" />
          <span>{notification}</span>
        </div>
      )}

      {/* Navigation Ribbon - No-Print when isolated print active */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-4 no-print gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-sans">بخش جامع فروش، فاکتورها و خدمات درامدی</h2>
          <p className="text-slate-400 text-xs mt-1">مدیریت فاکتورهای رسمی، صدور پیش‌فاکتور، تایید، باربری دفتری شادی آوران (میم بازی)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => {
              setEditingInvoiceId(null);
              // reset states
              setSelectedItems([]);
              setDiscount(0);
              setDescription('');
              setPersonId('');
              setInvoiceNumber(`INV-1405-${Math.floor(Math.random() * 90000) + 10000}`);
              setSubView('invoice-new');
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              subView === 'invoice-new' && !editingInvoiceId ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Plus size={14} />
            فاکتور فروش جدید
          </button>
          <button 
            onClick={() => {
              setEditingInvoiceId(null);
              setSubView('invoice-list');
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              subView === 'invoice-list' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText size={14} />
            دفتر و دفترچه فاکتورها
          </button>
          <button 
            onClick={() => {
              setSubView('revenue-new');
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              subView === 'revenue-new' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <PlusCircle size={14} />
            ثبت درآمد متفرقه
          </button>
          <button 
            onClick={() => {
              setSubView('revenue-list');
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              subView === 'revenue-list' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers size={14} />
            لیست جامع درآمدهای جانبی
          </button>
        </div>
      </div>

      {/* SUBVIEW 1: INVOICE BUILDER (NEW / EDIT) */}
      {subView === 'invoice-new' && (
        <div className="space-y-6 animate-fade-in no-print bg-slate-50/50 p-1 rounded-2xl">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100">
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-base">
                {editingInvoiceId ? 'ویرایش و اصلاح فاکتور فروش صادره' : 'فرآیند ثبت و صدور فاکتور جدید'}
              </h3>
              <p className="text-[11px] text-slate-400">اطلاعات فاکتور پس از تایید نهایی بلافاصله در ترازهای مالی و انبار اعمال می‌شود.</p>
            </div>
            {editingInvoiceId && (
              <button 
                type="button" 
                onClick={cancelEditMode}
                className="text-xs bg-rose-50 text-rose-600 border border-rose-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-bold hover:bg-rose-100 transition"
              >
                <ArrowLeft size={14} /> انصراف از ویرایش
              </button>
            )}
          </div>

          <form onSubmit={handleSaveInvoice} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left and Right Main Panels */}
            {/* RIGHT PANEL - Items & Search (Spans 2 columns) */}
            <div className="lg:col-span-2 space-y-5">
              
              {/* Product selector grid tools */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
                  <ShoppingCart className="text-slate-500" size={16} />
                  <span className="text-xs font-extrabold text-slate-800">یافتن کالا و افزودن به ردیف‌های لیست فاکتور</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  
                  {/* Dynamic Typable Search Helper */}
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-[10px] font-black text-slate-500 block">۱. جستجو یا فیلتر اسامی کالاها</label>
                    <div className="relative">
                      <Search size={14} className="absolute right-3 top-3 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="کلمه کلیدی یا کد..."
                        value={itemSearchText}
                        onChange={(e) => {
                          setItemSearchText(e.target.value);
                          setCurrentItemId(''); // reset selected item if typing
                        }}
                        className="w-full bg-slate-50/70 text-right pr-9 border-0 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Dropdown containing filtered assets */}
                  <div className="md:col-span-8 space-y-1">
                    <label className="text-[10px] font-black text-slate-500 block">۲. انتخاب کالا از لیست انبار</label>
                    <select
                      value={currentItemId}
                      onChange={(e) => {
                        const itmId = e.target.value;
                        setCurrentItemId(itmId);
                        const match = items.find(i => i.id === itmId);
                        if (match) {
                          // Prefill price structures
                          setCurrentConsumerPrice(match.price);
                          setCurrentItemDiscountPct(0); // init discount at 0%
                        }
                      }}
                      className="w-full bg-slate-50 border-0 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800 font-sans"
                    >
                      <option value="">-- کلیک برای انتخاب کالا --</option>
                      {filteredProductsToChoose.map(i => (
                        <option key={i.id} value={i.id}>
                          {i.name} (کد: {i.code} | موجودی: {i.stock} {i.unit}) - قیمت: {i.price.toLocaleString()} ریال
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {currentItemId && (
                  <div className="bg-indigo-50/40 p-3 rounded-2xl border border-indigo-100/50 space-y-3.5 animate-slide-down">
                    <p className="text-[10px] text-indigo-800 font-bold flex items-center gap-1">
                      <Info size={12} />
                      تعدیل قیمت واحد، تیراژ و درصد تخفیفات محصول:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">تعداد درخواستی</label>
                        <input 
                          type="number"
                          min="1"
                          value={currentQty}
                          onChange={(e) => setCurrentQty(Math.max(1, Number(e.target.value)))}
                          className="w-full bg-white pr-2 border-0 rounded-xl py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800 font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">قیمت مصرف کننده (ریال)</label>
                        <input 
                          type="number"
                          min="0"
                          value={currentConsumerPrice}
                          onChange={(e) => setCurrentConsumerPrice(Number(e.target.value))}
                          className="w-full bg-white pr-2 border-0 rounded-xl py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800 font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">درصد تخفیف خط (%)</label>
                        <input 
                          type="number"
                          min="0"
                          max="100"
                          value={currentItemDiscountPct}
                          onChange={(e) => setCurrentItemDiscountPct(Math.min(100, Math.max(0, Number(e.target.value))))}
                          className="w-full bg-white pr-2 border-0 rounded-xl py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800 font-mono text-center"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-emerald-600 block">قیمت فروش محاسبه شده</label>
                        <div className="bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl text-xs font-mono font-black text-center">
                          {Math.round(currentConsumerPrice * (1 - currentItemDiscountPct / 100)).toLocaleString()} ریال
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-white/50 p-2.5 rounded-xl border border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-400">مجموع خط: </span>
                        <strong className="font-mono text-indigo-700">
                          {Math.round(currentQty * (currentConsumerPrice * (1 - currentItemDiscountPct / 100))).toLocaleString()} ریال
                        </strong>
                      </div>
                      <button
                        type="button"
                        onClick={handleRegisterProductLine}
                        className="bg-indigo-600 text-white rounded-xl px-5 py-1.5 text-xs font-black hover:bg-indigo-700 transition"
                      >
                        ✓ درج در اقلام فاکتور
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Selected items sheet */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                <span className="text-xs font-extrabold text-slate-800 block">سیاهه نهایی ردیف‌های اختصاص داده شده</span>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-450 font-bold border-b border-slate-100">
                        <th className="p-3">#</th>
                        <th className="p-3">شرح کالا / محصول</th>
                        <th className="p-3 text-center">تعداد</th>
                        <th className="p-3 text-left">قیمت مصرف کننده</th>
                        <th className="p-3 text-center">تخفیف کناف</th>
                        <th className="p-3 text-left">قیمت فروش نهایی</th>
                        <th className="p-3 text-left">جمع کل (ریال)</th>
                        <th className="p-3 text-center">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-slate-600 font-sans">
                      {selectedItems.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-12 text-slate-400 italic">
                            هیچ ردیفی انتخاب نشده است. کالای مد نظر را از ابزار بالای صفحه انتخاب نمایید.
                          </td>
                        </tr>
                      ) : (
                        selectedItems.map((line, idx) => {
                          const itemObj = items.find(i => i.id === line.itemId);
                          const rawConsumer = line.consumerPrice || line.price;
                          const pct = line.discountPercentage || 0;
                          return (
                            <tr key={idx} className="hover:bg-slate-50/50 transition">
                              <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                              <td className="p-3">
                                <div className="font-black text-slate-800">{itemObj?.name || 'کالای حسابرسی'}</div>
                                <div className="text-[9px] text-slate-400">کد ثبتی: {itemObj?.code || 'نامعلوم'}</div>
                              </td>
                              <td className="p-3 text-center font-mono font-bold">{line.quantity}</td>
                              <td className="p-3 text-left font-mono text-slate-400">{rawConsumer.toLocaleString()}</td>
                              <td className="p-3 text-center">
                                {pct > 0 ? (
                                  <span className="bg-rose-50 text-rose-600 text-[10px] px-2 py-0.5 rounded-full font-black">
                                    {pct}%
                                  </span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                              <td className="p-3 text-left font-mono font-bold text-indigo-800">{line.price.toLocaleString()}</td>
                              <td className="p-3 text-left font-mono font-bold text-slate-800">{line.total.toLocaleString()}</td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveInvoiceItem(idx)}
                                  className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {selectedItems.length > 0 && (
                  <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 flex flex-wrap justify-between items-center gap-4 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-slate-400 block font-semibold text-[10px]">خلاصه محاسبات اقلام فاکتور</span>
                      <span className="text-slate-500 font-semibold">
                        جمع کل کالایی: <span className="text-slate-800 font-bold font-mono">{totalConsumerSum.toLocaleString()}</span> ریال 
                        {totalItemDiscounts > 0 && <span className="text-rose-500 font-bold"> (مجموع تخفیفات: {totalItemDiscounts.toLocaleString()} -)</span>}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold">ارزش خالص پیش از عوارض: </span>
                      <strong className="font-mono text-indigo-700 text-sm">{subtotal.toLocaleString()} ریال</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Description box */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                <label className="text-xs font-semibold text-slate-500 block">شرح فاکتور / تبصره‌ها (برای چاپ روی فاکتور)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="مثال: کالاها بر اساس حواله انبار و سالم تحویل گردید. مهلت پرداخت عینا طبق توافق بالا می‌باشد."
                  rows={2}
                  className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* LEFT PANEL - Settings & Calculations (Spans 1 column) */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-5 h-fit">
              <div className="flex items-center gap-1.5 border-b border-slate-50 pb-2">
                <FileCheck className="text-slate-500" size={16} />
                <h3 className="font-extrabold text-slate-800 text-xs">تنظیمات نهایی، طرف حساب و تایید</h3>
              </div>

              {/* Invoice Basic Identifiers */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">شماره فاکتور</label>
                    <input
                      type="text"
                      required
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="w-full bg-slate-50 border-0 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 font-mono text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">تاریخ شمسی ثبت</label>
                    <input
                      type="text"
                      required
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="w-full bg-slate-50 border-0 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 font-mono text-center text-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400">سمت فاکتور</label>
                  <select
                    value={invoiceType}
                    onChange={(e) => setInvoiceType(e.target.value as 'sale' | 'purchase')}
                    className="w-full bg-slate-50 border-0 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800 font-sans font-bold"
                  >
                    <option value="sale">فاکتور فروش (درآمد و خروجی انبار)</option>
                    <option value="purchase">فاکتور خرید (هزینه و ورودی انبار)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400">انتخاب طرف حساب معامله <span className="text-rose-500">*</span></label>
                  <select
                    value={personId}
                    required
                    onChange={(e) => handleSelectPerson(e.target.value)}
                    className="w-full bg-slate-50 border-0 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800 font-sans"
                  >
                    <option value="">-- کلیک و انتخاب مشتری --</option>
                    {persons.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (شناسه: {p.code} | {p.nationalId || 'کدملی ندارد'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Populated Client Info Block */}
              {personId && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50 space-y-2 text-xs animate-slide-down">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 border-b border-slate-100 pb-1.5">
                    <User size={12} />
                    <span>مشخصات پیش‌فرض طرف حساب:</span>
                  </div>
                  <div className="text-[11px] space-y-1 text-slate-650 font-sans">
                    <div>شهر: <span className="font-black text-slate-800">{clientCity || '-'}</span></div>
                    <div>آدرس تحویل: <span className="text-slate-800 font-medium">{clientAddress || 'آدرسی ثبت نشده'}</span></div>
                    <div>تلفن تماس: <span className="font-mono text-slate-800">{clientPhone || 'بدون شماره'}</span></div>
                  </div>
                  
                  {/* Shipment type manager */}
                  <div className="space-y-1 pt-1">
                    <label className="text-[10px] font-black text-slate-500 block">نوع ارسال مرسوله</label>
                    <select
                      value={shipmentType}
                      onChange={(e) => setShipmentType(e.target.value)}
                      className="w-full bg-white border-slate-100 rounded-lg px-2 py-1 text-[11px] text-slate-800 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="ارسال مستقیم">ارسال مستقیم (پیک اختصاصی)</option>
                      <option value="باربری">باربری کامیونی</option>
                      <option value="تیپاکس">تیپاکس پیشتاز</option>
                      <option value="پست">پست جمهوری اسلامی</option>
                      <option value="حضوری">تحویل حضوری در واحد شادی آوران</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Status & payment configurations */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400">روش پرداخت تعهد شده</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-slate-50 border-0 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800"
                  >
                    <option value="100% نقد">پرداخت ۱۰۰٪ نقد</option>
                    <option value="100% چک">پرداخت ۱۰۰٪ چک راس</option>
                    <option value="50% نقد">پرداخت ۵۰٪ نقد مابقی چک</option>
                    <option value="30 % نقد">پرداخت ۳۰٪ نقد مابقی چک</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400">وضعیت فعلی سند فاکتور</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['پیش فاکتور', 'تایید شده', 'ارسال شده'] as const).map(st => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setInvoiceStatus(st)}
                        className={`text-[10px] font-bold py-1.5 px-0.5 rounded-lg border text-center transition ${
                          invoiceStatus === st 
                            ? 'bg-slate-900 border-slate-900 text-white shadow-sm' 
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cash level settings */}
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">تخفیف کلی فاکتور (ریال)</label>
                  <input
                    type="number"
                    min="0"
                    value={discount || ''}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    placeholder="۰"
                    className="w-full bg-slate-50 border-0 rounded-xl px-4 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 font-mono text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">نرخ مالیات بر ارزش افزوده (%)</label>
                  <input
                    type="number"
                    min="0"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    placeholder="۹"
                    className="w-full bg-slate-50 border-0 rounded-xl px-4 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 font-mono text-slate-800"
                  />
                </div>
              </div>

              {/* Calculations Box */}
              <div className="bg-slate-900 text-slate-250 p-4 rounded-2xl space-y-2.5 text-xs font-sans">
                <div className="flex justify-between">
                  <span className="text-slate-400">جمع کل کالاها:</span>
                  <span className="font-mono font-bold text-slate-100">{subtotal.toLocaleString()} ریال</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-rose-400">تخفیفات عمومی تجاری:</span>
                    <span className="font-mono text-rose-450">-{discount.toLocaleString()} ریال</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400 text-[11px]">مالیات بر ارزش افزوده ({taxRate}%):</span>
                  <span className="font-mono text-emerald-400">+{calculatedTax.toLocaleString()} ریال</span>
                </div>
                <div className="border-t border-white/10 pt-2 flex justify-between font-extrabold text-[13px] text-white">
                  <span>قابل پرداخت نهایی:</span>
                  <span className="font-mono text-emerald-300">{finalInvoiceTotal.toLocaleString()} ریال</span>
                </div>
                
                {editingInvoiceId && (
                  <div className="border-t border-dashed border-white/10 pt-1.5 text-[10px] text-amber-300 flex justify-between">
                    <span>مانده تعهد خالص فاکتور:</span>
                    <span>{finalInvoiceTotal.toLocaleString()} ریال</span>
                  </div>
                )}
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl text-xs shadow-md transition duration-200"
              >
                {editingInvoiceId ? '✓ بروزرسانی و اعمال اصلاحات نهایی' : '✓ تایید، ثبت در حسابرسی و صدور فاکتور'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUBVIEW 2: INVOICES REGISTER / LISTS */}
      {subView === 'invoice-list' && (
        <div className="space-y-6 animate-fade-in no-print bg-slate-50/20 p-1 rounded-2xl">
          
          {/* TAB HEADERS FOR STATUS SECTIONS */}
          <div className="flex border-b border-indigo-100/50 bg-white p-2.5 rounded-2xl shadow-sm gap-2">
            {[
              { id: 'all', title: 'همه فاکتورها', count: invoices.length },
              { id: 'پیش فاکتور', title: '✍️ پیش فاکتورها', count: invoices.filter(i => i.status === 'پیش فاکتور').length },
              { id: 'تایید شده', title: '✓ تایید شده‌ها', count: invoices.filter(i => i.status === 'تایید شده').length },
              { id: 'ارسال شده', title: '🚚 ارسال شده‌ها', count: invoices.filter(i => i.status === 'ارسال شده').length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterActiveStatus(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition duration-200 flex items-center gap-2 ${
                  filterActiveStatus === tab.id 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                <span>{tab.title}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  filterActiveStatus === tab.id ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* ADVANCED FILTERING & SEARCH PANEL */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
              <Filter size={15} className="text-slate-500" />
              <span>فیلترهای پیشرفته و ابزار جستجو</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* Fuzzy Text filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400">جستجوی آزاد (نام کلاینت، شماره فاکتور)</label>
                <div className="relative">
                  <Search className="absolute right-3 top-3 text-slate-400" size={14} />
                  <input
                    type="text"
                    placeholder="کویری خود را تایپ کنید..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="w-full bg-slate-50 text-right pr-9 border-0 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800"
                  />
                </div>
              </div>

              {/* Client dropdown Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400">فیلتر بر اساس طرف حساب</label>
                <select
                  value={filterPersonId}
                  onChange={(e) => setFilterPersonId(e.target.value)}
                  className="w-full bg-slate-50 border-0 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800"
                >
                  <option value="all">همه طرف حساب‌ها (بدون فیلتر)</option>
                  {persons.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Payment status filter "مانده" */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400">وضعیت مانده بدهی</label>
                <select
                  value={filterBalance}
                  onChange={(e) => setFilterBalance(e.target.value as any)}
                  className="w-full bg-slate-50 border-0 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800"
                >
                  <option value="all">همه وضعیت‌ها (تسویه‌شده و بدهکار)</option>
                  <option value="outstanding">🚨 تسویه نشده (دارای مانده بدهی)</option>
                  <option value="settled">💚 تسویه شده کامل (بدون مانده)</option>
                </select>
              </div>

              {/* Date Search */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400">فیلتر تاریخ شمسی</label>
                <input
                  type="text"
                  placeholder="مثال: 1405/03"
                  value={filterDateSearch}
                  onChange={(e) => setFilterDateSearch(e.target.value)}
                  className="w-full bg-slate-50 border-0 rounded-xl px-3 py-2 text-xs text-center focus:ring-1 focus:ring-indigo-500 font-mono text-slate-800"
                />
              </div>

            </div>
          </div>

          {/* STATS OVERVIEW DECK */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-100 flex justify-between items-center shadow-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block">تعداد کل فاکتورها</span>
                <span className="text-lg font-black font-sans text-slate-800">{matchedInvoicesFiltered.length} فاکتور</span>
              </div>
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <FileText size={18} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-100 flex justify-between items-center shadow-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block">مجموع مبلغ معاملات خالص</span>
                <span className="text-lg font-black font-mono text-indigo-700">
                  {matchedInvoicesFiltered.reduce((sum, i) => sum + i.total, 0).toLocaleString()} ریال
                </span>
              </div>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <Award size={18} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-100 flex justify-between items-center shadow-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block">کل مانده طلب دفتری</span>
                <span className="text-lg font-black font-mono text-rose-600">
                  {matchedInvoicesFiltered.reduce((sum, i) => sum + (i.remainingBalance ?? i.total), 0).toLocaleString()} ریال
                </span>
              </div>
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                <DollarSign size={18} />
              </div>
            </div>
          </div>

          {/* MAIN INVOICES LIST TABLE */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            {matchedInvoicesFiltered.length === 0 ? (
              <div className="p-16 text-center text-slate-400 space-y-2">
                <FileText size={48} className="mx-auto mb-2 opacity-30 text-indigo-500 animate-pulse" />
                <p className="text-sm font-extrabold text-slate-600">هیچ فاکتور منطبقی در پایگاه داده یافت نگردید.</p>
                <p className="text-xs text-slate-400">پارامترهای جستجو یا فیلترهای خود را تجدید نظر کنید.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs md:text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-[11px] font-black border-b border-slate-100">
                      <th className="p-4">شماره فاکتور</th>
                      <th className="p-4">تاریخ ثبت</th>
                      <th className="p-4">نام طرف حساب معامله</th>
                      <th className="p-4">روش تسویه تعهدی</th>
                      <th className="p-4">وضعیت سند</th>
                      <th className="p-4 text-left">مبلغ کل فاکتور</th>
                      <th className="p-4 text-left">مانده طلب فاکتور (ریال)</th>
                      <th className="p-4 text-center">عملیات اجرایی</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-650 font-sans">
                    {matchedInvoicesFiltered.map(inv => {
                      const person = persons.find(p => p.id === inv.personId);
                      const remBalance = inv.remainingBalance ?? inv.total;
                      const isSettled = remBalance <= 0;
                      
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/50 transition">
                          
                          {/* Invoice code & type */}
                          <td className="p-4 font-mono text-xs font-semibold text-slate-800">
                            <div>{inv.invoiceNumber}</div>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-black ${
                              inv.type === 'sale' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'
                            }`}>
                              {inv.type === 'sale' ? 'فروش' : 'خرید'}
                            </span>
                          </td>

                          {/* Date */}
                          <td className="p-4 font-mono text-xs">{inv.date}</td>

                          {/* Client name */}
                          <td className="p-4 font-bold text-slate-800">
                            <div>{person?.name || 'کلاینت نامعلوم'}</div>
                            <div className="text-[10px] text-slate-400">کد: {person?.code || '-'} | شهر: {person?.city || '-'}</div>
                          </td>

                          {/* Payment method */}
                          <td className="p-4 text-[11px] text-slate-550 font-medium">
                            {inv.paymentMethod || '۱۰۰٪ نقد'}
                          </td>

                          {/* Status Badge */}
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                              inv.status === 'پیش فاکتور' 
                                ? 'bg-amber-50 text-amber-600 border-amber-100'
                                : inv.status === 'تایید شده'
                                ? 'bg-sky-50 text-sky-600 border-sky-100'
                                : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                            }`}>
                              {inv.status || 'تایید شده'}
                            </span>
                          </td>

                          {/* Invoice overall sum */}
                          <td className="p-4 text-left font-bold font-mono text-slate-900 text-[13px]">
                            {inv.total.toLocaleString()}
                          </td>

                          {/* Remaining balance "مانده" */}
                          <td className="p-4 text-left">
                            {isSettled ? (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-md font-black">
                                ✓ تسویه کامل
                              </span>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="text-rose-600 font-extrabold font-mono text-[13px]">
                                  {remBalance.toLocaleString()}
                                </span>
                                <div className="text-[9px] text-slate-400">طلب دفتری</div>
                              </div>
                            )}
                          </td>

                          {/* Action Items */}
                          <td className="p-4">
                            <div className="flex justify-center gap-1">
                              
                              {/* Open detail for print */}
                              <button
                                onClick={() => setSelectedInvoice(inv)}
                                className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-xl transition"
                                title="نمایش و چاپ فاکتور"
                              >
                                <Printer size={15} />
                              </button>

                              {/* Trigger payment loader */}
                              {!isSettled && (
                                <button
                                  onClick={() => handleOpenPaymentModal(inv)}
                                  className="p-2 hover:bg-emerald-50 text-emerald-500 rounded-xl transition"
                                  title="ثبت دریافتی و تصفیه مالی"
                                >
                                  <DollarSign size={15} />
                                </button>
                              )}

                              {/* Edit/Modify */}
                              <button
                                onClick={() => handleStartEditInvoice(inv)}
                                className="p-2 hover:bg-amber-50 text-amber-600 rounded-xl transition"
                                title="ویرایش اطلاعات"
                              >
                                <Edit size={15} />
                              </button>

                              {/* Cancel/Delete */}
                              <button
                                onClick={() => handleDeleteInvoice(inv.id)}
                                className="p-2 hover:bg-rose-50 text-rose-500 rounded-xl transition"
                                title="حذف دائمی سند"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBVIEW 3: REVENUE ATTACHMENT */}
      {subView === 'revenue-new' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm max-w-2xl mx-auto no-print">
          <div className="border-b border-indigo-150 pb-3 mb-5">
            <h3 className="font-extrabold text-slate-800 text-base">ثبت و صدور درآمد متفرقه / خدمات شادی آوران</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">ثبت عایدات جانبی مانند بادکنک‌آرایی اختصاصی، کارمزد تالار یا خدمات واگذار شده.</p>
          </div>

          <form onSubmit={handleSaveRevenue} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 block font-sans">تاریخ کسب عایدات</label>
                <input
                  type="text"
                  required
                  value={revDate}
                  onChange={(e) => setRevDate(e.target.value)}
                  placeholder="۱۴۰۵/۰۳/۰۶"
                  className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-indigo-500 font-mono text-center text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 block font-sans">مجموع عایدات دریافتی (ریال) <span className="text-rose-500">*</span></label>
                <input
                  type="number"
                  required
                  min="1"
                  value={revAmount}
                  onChange={(e) => setRevAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="مثال: ۱۵۰۰۰۰۰"
                  className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 font-mono text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 block font-sans">دسته درآمد</label>
                <select
                  value={revCategory}
                  onChange={(e) => setRevCategory(e.target.value)}
                  className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-sans"
                >
                  <option value="درآمد خدمات و تشریفات">درآمد خدمات و تشریفات جشن</option>
                  <option value="فروش بادکنک‌آرایی">فروش بادکنک‌آرایی سفارشی</option>
                  <option value="درآمد کارمزد واسطه‌گری">درآمد کارمزد واسطه‌گری برون‌سپاری</option>
                  <option value="سایر درآمدهای غیرعملیاتی">سایر درآمدهای غیرعملیاتی متفرقه</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 block font-sans">انتخاب طرف حساب فرعی (اختیاری)</label>
                <select
                  value={revPersonId}
                  onChange={(e) => setRevPersonId(e.target.value)}
                  className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-sans"
                >
                  <option value="">-- متفرقه عبوری / بدون ثبت شخص --</option>
                  {persons.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 block font-sans">شرح تفصیلی واگذاری خدمت</label>
              <textarea
                value={revDesc}
                onChange={(e) => setRevDesc(e.target.value)}
                placeholder="توضیحات پیرامون انجام پروژه، تاریخ رزرو، نام جشن و ..."
                rows={3}
                className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 text-slate-800"
              />
            </div>

            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition shadow-md"
            >
              ✓ ثبت سند درآمد فرعی
            </button>
          </form>
        </div>
      )}

      {/* SUBVIEW 4: REVENUE REGISTER */}
      {subView === 'revenue-list' && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm no-print animate-fade-in">
          <div className="p-4 bg-slate-50 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-650">لیست درآمدهای جانبی و خدمات غیرکالایی میم بازی</h3>
          </div>

          {transactions.filter(t => t.type === 'revenue' && !t.code?.startsWith('TR-INV-')).length === 0 ? (
            <div className="p-16 text-center text-slate-400">
              <PlusCircle size={48} className="mx-auto mb-2 opacity-30 text-indigo-500" />
              <p className="text-xs font-bold text-slate-650">هیچ درآمد جانبی در سیستم یافت نشد.</p>
              <p className="text-[10px] text-slate-400 mt-1">کلیه درآمدها تابدین لحظه از طریق فاکتورهای تجاری حاصل شده‌اند.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs md:text-sm">
                <thead>
                  <tr className="bg-slate-50/70 text-slate-500 text-[11px] font-black border-b border-slate-100">
                    <th className="p-4">کد سند تراکنش</th>
                    <th className="p-4">تاریخ کسب</th>
                    <th className="p-4">دسته درآمد مرجع</th>
                    <th className="p-4">طرف حساب</th>
                    <th className="p-4">شرح تراکنش درآمد</th>
                    <th className="p-4 text-left">مجموع عایدی (ریال)</th>
                    <th className="p-4 text-center">حملات حذفی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-655 font-sans">
                  {transactions
                    .filter(t => t.type === 'revenue' && !t.code?.startsWith('TR-INV-'))
                    .map(tr => {
                      const person = persons.find(p => p.id === tr.personId);
                      return (
                        <tr key={tr.id} className="hover:bg-slate-50/50 transition">
                          <td className="p-4 font-mono text-xs text-indigo-600 font-bold">{tr.code}</td>
                          <td className="p-4 font-mono text-xs">{tr.date}</td>
                          <td className="p-4 font-black text-slate-700">{tr.category}</td>
                          <td className="p-4 font-bold text-slate-800">{person?.name || 'مشتری ناشناس عمومی'}</td>
                          <td className="p-4 text-[11px] text-slate-450">{tr.description}</td>
                          <td className="p-4 text-left font-black font-mono text-emerald-600">
                            {tr.amount.toLocaleString()}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleDeleteTransaction(tr.id)}
                              className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* DYNAMIC DIALOG 1: INTERACTIVE BILL RE-PAY LOGGER (وصول طلب فاکتور / تسویه مانده) */}
      {payingInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-xs no-print">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl space-y-5 animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="text-emerald-500" size={18} />
                <h3 className="font-extrabold text-slate-800 text-xs">ثبت وصول بدهی دفتری (تصفیه مانده)</h3>
              </div>
              <button 
                onClick={() => setPayingInvoice(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Display Invoice Info */}
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/50 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">کد فاکتور مرجع:</span>
                <span className="font-mono font-bold text-slate-850">{payingInvoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">بدهکار (خریدار):</span>
                <span className="font-bold text-slate-850">
                  {persons.find(p => p.id === payingInvoice.personId)?.name || 'ناشناخته'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">جمع کل بدهی اولیه:</span>
                <span className="font-mono font-bold text-slate-800">{payingInvoice.total.toLocaleString()} ریال</span>
              </div>
              <div className="flex justify-between border-t border-slate-200/50 pt-1.5 font-bold">
                <span className="text-amber-700">مانده بدهی تصفیه نشده:</span>
                <span className="font-mono text-rose-600">{(payingInvoice.remainingBalance ?? payingInvoice.total).toLocaleString()} ریال</span>
              </div>
            </div>

            <form onSubmit={handleSaveInvoicePayment} className="space-y-4 text-xs font-sans">
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 block">مبلغ پرداختی مشتری (ریال)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={paymentAmt}
                  onChange={(e) => setPaymentAmt(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2 font-mono text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 block">تاریخ شمسی عواید</label>
                <input
                  type="text"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2 font-mono text-center text-slate-800"
                />
              </div>

              {/* Payment instrument type Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 block">ابزار تسویه وصول ملخ</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'نقد', title: '💵 وصول نقدی' },
                    { id: 'چک', title: '✍️ دریافت برگه چک' }
                  ].map(x => (
                    <button
                      key={x.id}
                      type="button"
                      onClick={() => setPaymentType(x.id as any)}
                      className={`py-2 rounded-xl text-center font-bold text-[11px] transition ${
                        paymentType === x.id 
                          ? 'bg-emerald-600 text-white shadow-sm' 
                          : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {x.title}
                    </button>
                  ))}
                </div>
              </div>

              {paymentType === 'چک' && (
                <div className="border border-indigo-100 bg-indigo-50/20 p-3 rounded-xl space-y-2 animate-slide-down">
                  <p className="text-[10px] text-indigo-800 font-bold block">مشخصات برگه چک:</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      placeholder="نام بانک صادرکننده"
                      required
                      value={paymentBank}
                      onChange={(e) => setPaymentBank(e.target.value)}
                      className="bg-white border-slate-200 rounded-lg px-2.5 py-1 text-[11px]"
                    />
                    <input
                      type="text"
                      placeholder="شماره صیاد / سریال"
                      required
                      value={paymentSerial}
                      onChange={(e) => setPaymentSerial(e.target.value)}
                      className="bg-white border-slate-200 rounded-lg px-2.5 py-1 text-[11px] font-mono"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="سررسید چک (مثال: ۱۴۰۵/۰۵/۲۲)"
                    required
                    value={paymentDueDate}
                    onChange={(e) => setPaymentDueDate(e.target.value)}
                    className="w-full bg-white border-slate-200 rounded-lg px-2.5 py-1 text-[11px] font-mono text-center"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 block">توضیحات تراکنش تصفیه</label>
                <input
                  type="text"
                  value={paymentDesc}
                  onChange={(e) => setPaymentDesc(e.target.value)}
                  placeholder="مثال: تسویه قسط اول به حساب بانک ملی صادرکننده"
                  className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2 text-slate-800"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 rounded-xl text-xs shadow-md transition"
                >
                  ✓ ثبت دریافتی و کسر از مانده فاکتور
                </button>
                <button
                  type="button"
                  onClick={() => setPayingInvoice(null)}
                  className="bg-slate-100 text-slate-600 px-4 py-2.5 rounded-xl font-bold font-sans hover:bg-slate-200 transition"
                >
                  انصراف
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* DYNAMIC DIALOG 2: PRISTINE PRINT INVOICE MODAL */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-xs">
          
          <div className="bg-white rounded-3xl p-6 max-w-4xl w-full border border-slate-100 shadow-2xl space-y-6">
            
            {/* Action Bar (Not visible in printed layout) */}
            <div className="flex justify-between items-center bg-slate-50 px-4 py-3 -m-6 mb-4 rounded-t-3xl border-b border-slate-100 no-print">
              <div>
                <span className="font-extrabold text-sm text-slate-800">پیش نمایش فاکتور فروش رسمی تجاری</span>
                <span className="text-[10px] text-slate-400 block">آماده چاپ بر روی کاغذ A4 یا ذخیره‌سازی از طریق مرورگر</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePrintInvoice}
                  className="bg-slate-900 text-white text-xs font-black px-4 py-2 rounded-xl flex items-center gap-1.5 hover:bg-slate-800 transition"
                >
                  <Printer size={14} />
                  پرینت یا خروجی PDF
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="bg-slate-200 text-slate-700 text-xs font-black px-4 py-2 rounded-xl hover:bg-slate-300 transition"
                >
                  بستن پیش‌نمایش
                </button>
              </div>
            </div>

            {/* PRINT COMPLIANT INVOICE CORE LAYOUT */}
            <div id="print-invoice-area" className="bg-white p-2 text-slate-800 font-sans leading-relaxed text-xs">
              
              {/* Header Box */}
              <div className="border border-slate-300 p-4 rounded-xl grid grid-cols-12 gap-4 items-center">
                
                {/* Right block: Issuer identity */}
                <div className="col-span-8 text-right space-y-1">
                  <h1 className="text-lg font-black font-sans text-slate-900">شرکت شادی آوران (میم بازی)</h1>
                  <p className="text-[10px] text-slate-500 font-semibold">بزرگترین مجتمع تفریحی، کانون آراستگی جشن و تشریفات معتبر کشور</p>
                  <div className="text-[10px] text-slate-600 font-medium space-y-0.5 pt-1">
                    <div>آدرس دفتر مرکزی: <span className="font-semibold text-slate-850">کاشان، بلوار واجدی</span></div>
                    <div>شماره تلفن واحد معاملات: <span className="font-mono text-slate-850">09912624379</span></div>
                    <div>تارنمای رسمی: <span className="font-mono text-indigo-700">memebazi.com</span></div>
                  </div>
                </div>

                {/* Left/Center Block: Invoice Specs and Persian Date */}
                <div className="col-span-4 border-r border-slate-200 pr-4 text-right space-y-1 bg-slate-50/50 p-2.5 rounded-lg">
                  <div className="text-center font-black text-rose-700 text-sm border-b border-rose-100 pb-1">فاکتور فروش کالا و خدمات</div>
                  <div className="space-y-0.5 text-[10px] text-slate-600 font-semibold pt-1">
                    <div>شماره فاکتور: <span className="font-mono text-slate-850 font-black">{selectedInvoice.invoiceNumber}</span></div>
                    <div>تاریخ صدور شمسی: <span className="font-mono text-slate-850 font-black">{selectedInvoice.date}</span></div>
                    <div>نوع ترابری مکتوب: <span className="text-slate-800 font-black">
                      {persons.find(p => p.id === selectedInvoice.personId)?.shipmentType || 'ارسال مستقیم'}
                    </span></div>
                    <div>روش تسویه پرداخت: <span className="text-indigo-700 font-black">{selectedInvoice.paymentMethod || '۱۰۰٪ نقد'}</span></div>
                  </div>
                </div>

              </div>

              {/* Purchaser specifications client details */}
              {(() => {
                const clientObj = persons.find(p => p.id === selectedInvoice.personId);
                return (
                  <div className="border border-slate-300 rounded-xl p-4 mt-4 bg-slate-50/20">
                    <div className="border-b border-slate-200 pb-1.5 mb-2 flex items-center gap-1 font-bold text-slate-800 text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span>
                      <span>الف) مشخصات خریدار / دریافت‌کننده کالا و خدمات:</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>نام کامل حقیقی یا حقوقی: <strong className="text-slate-900 font-black">{clientObj?.name || 'ناشناخته'}</strong></div>
                      <div>شماره تماس خریدار: <strong className="font-mono text-slate-900">{clientObj?.phone || 'ثبت‌نشده'}</strong></div>
                      <div>شهر مقصد: <strong className="text-slate-900">{clientObj?.city || 'کاشان'}</strong></div>
                    </div>
                    <div className="mt-2 text-slate-700">
                      نشانی کامل تحویل‌گیرنده: <span className="font-semibold text-slate-900">{clientObj?.address || 'آدرس تحویل ثبت نشده'}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Invoice Lines Table */}
              <div className="border border-slate-300 rounded-xl overflow-hidden mt-4">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-extrabold text-[10px]">
                      <th className="p-2 text-center w-8">ردیف</th>
                      <th className="p-2">عنوان کالا / خدمات مورد معامله</th>
                      <th className="p-2 text-center">تعداد</th>
                      <th className="p-2 text-left">قیمت مصرف کننده (ریال)</th>
                      <th className="p-2 text-center">درصد تخفیف</th>
                      <th className="p-2 text-left">قیمت فروش واحد (ریال)</th>
                      <th className="p-2 text-left">قیمت کل فروش (ریال)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {selectedInvoice.items.map((line, blockIdx) => {
                      const itemObj = items.find(v => v.id === line.itemId);
                      const rawConsumer = line.consumerPrice || line.price;
                      const customPct = line.discountPercentage || 0;
                      return (
                        <tr key={blockIdx}>
                          <td className="p-2.5 text-center font-mono font-medium">{blockIdx + 1}</td>
                          <td className="p-2.5">
                            <strong className="text-slate-900 font-bold">{itemObj?.name || 'کالای مرجع'}</strong>
                            <div className="text-[9px] text-slate-400 font-mono">کد: {itemObj?.code || '-'}</div>
                          </td>
                          <td className="p-2.5 text-center font-mono font-black">{line.quantity}</td>
                          <td className="p-2.5 text-left font-mono text-slate-450">{rawConsumer.toLocaleString()}</td>
                          <td className="p-2.5 text-center font-bold font-mono text-rose-600">
                            {customPct > 0 ? `${customPct}%` : '-'}
                          </td>
                          <td className="p-2.5 text-left font-mono font-bold text-slate-900">{line.price.toLocaleString()}</td>
                          <td className="p-2.5 text-left font-mono font-black text-indigo-850">{line.total.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Bottom calculations summary */}
              {(() => {
                const totalConsumerInit = selectedInvoice.items.reduce((s, x) => s + ((x.consumerPrice || x.price) * x.quantity), 0);
                const totalDeductions = selectedInvoice.items.reduce((s, x) => {
                  const rawBase = x.consumerPrice || x.price;
                  return s + ((rawBase - x.price) * x.quantity);
                }, 0);
                const computedTaxValue = selectedInvoice.tax;
                const grandTotal = selectedInvoice.total;
                const outstandingBal = selectedInvoice.remainingBalance ?? grandTotal;
                const amountPaid = Math.max(0, grandTotal - outstandingBal);

                return (
                  <div className="grid grid-cols-12 gap-4 mt-4 items-start">
                    
                    {/* Notes block */}
                    <div className="col-span-7 border border-slate-300 rounded-xl p-3 text-[10px] space-y-1 bg-slate-50/30">
                      <p className="font-extrabold text-slate-800 block">توضیحات و شرایط کلی فاکتور:</p>
                      <p className="text-slate-600 font-medium">
                        {selectedInvoice.description || 'این فاکتور رسمی به استناد قوانین مالی شرکت شادی آوران صادر شده و معتبر است.'}
                      </p>
                      <div className="pt-2 text-[8px] text-slate-400 font-mono">
                        تاریخ پرینت سیستم: {new Date().toLocaleDateString('fa-IR')} | تراکنش: TR-{selectedInvoice.invoiceNumber}
                      </div>
                    </div>

                    {/* Total math breakdown */}
                    <div className="col-span-5 border border-slate-350 rounded-xl overflow-hidden text-[11px] font-sans font-bold">
                      <div className="bg-slate-50 p-2 border-b border-slate-200 flex justify-between font-normal text-slate-500">
                        <span>جمع کل مأخذ مصرف‌کننده:</span>
                        <span className="font-mono">{totalConsumerInit.toLocaleString()} ریال</span>
                      </div>
                      
                      {totalDeductions > 0 && (
                        <div className="p-2 border-b border-slate-200 flex justify-between text-rose-600">
                          <span>مجموع تخفیفات مکتوب اقلام:</span>
                          <span className="font-mono">-{totalDeductions.toLocaleString()} ریال</span>
                        </div>
                      )}

                      {selectedInvoice.discount > 0 && (
                        <div className="p-2 border-b border-slate-200 flex justify-between text-rose-600">
                          <span>تخفیف عمومی نقدی فاکتور:</span>
                          <span className="font-mono">-{selectedInvoice.discount.toLocaleString()} ریال</span>
                        </div>
                      )}

                      <div className="p-2 border-b border-slate-200 flex justify-between text-slate-500 font-normal">
                        <span>مالیات و عوارض تشریفات ({selectedInvoice.tax > 0 ? '۹٪' : '۰٪'}):</span>
                        <span className="font-mono text-indigo-700">+{computedTaxValue.toLocaleString()} ریال</span>
                      </div>

                      <div className="p-2 border-b border-slate-200 flex justify-between bg-slate-900 text-white font-extrabold text-xs">
                        <span>مبلغ نهایی معامله فاکتور:</span>
                        <span className="font-mono text-emerald-300">{grandTotal.toLocaleString()} ریال</span>
                      </div>

                      <div className="p-2 border-b border-slate-200 flex justify-between text-emerald-700">
                        <span>مجموع دریافتی تصفیه شده:</span>
                        <span className="font-mono font-black">{amountPaid.toLocaleString()} ریال</span>
                      </div>

                      <div className={`p-2 flex justify-between ${outstandingBal > 0 ? 'bg-rose-50 text-rose-700 font-black' : 'bg-emerald-50 text-emerald-800'}`}>
                        <span>مانده بدهی خالص دفتری (مانده):</span>
                        <span className="font-mono text-sm">{outstandingBal.toLocaleString()} ریال</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Receives List */}
              {(() => {
                const invoiceReceives = receives.filter(r => r.invoiceIds && r.invoiceIds.includes(selectedInvoice.id));
                if (invoiceReceives.length === 0) return null;
                return (
                  <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden p-3 bg-slate-50/20">
                    <h4 className="font-extrabold text-slate-800 text-[10px] pb-1.5 border-b border-slate-200 mb-2 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                      آمار تراکنش‌های دریافتی / وصول معوقه بابت این فاکتور:
                    </h4>
                    <div className="overflow-x-auto text-right">
                      <table className="w-full text-right text-[10px]">
                        <thead>
                          <tr className="text-slate-500 border-b border-slate-200">
                            <th className="pb-1 p-1 text-right">کد سند</th>
                            <th className="pb-1 p-1 text-right">تاریخ دریافت</th>
                            <th className="pb-1 p-1 text-right">جزئیات پرداخت</th>
                            <th className="pb-1 p-1 text-left">مبلغ وصولی (ریال)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          {invoiceReceives.map(rec => (
                            <tr key={rec.id} className="text-slate-705">
                              <td className="py-1 font-mono font-bold p-1">{rec.code}</td>
                              <td className="py-1 font-mono p-1">{rec.date}</td>
                              <td className="py-1 p-1 text-slate-500">
                                {rec.type} {rec.type === 'چک' ? `(بانک ${rec.bank || ''} - سررسید ${rec.dueDate || ''})` : ''}
                              </td>
                              <td className="py-1 font-bold font-mono text-emerald-600 text-left p-1">
                                {rec.amount.toLocaleString()} ریال
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-3 text-center text-[10px] text-slate-600 font-black pt-16 border-t border-slate-100 mt-6 pb-2">
                <div>مهر و امضای امور مالی شرکت شادی آوران</div>
                <div>تایید و تحویل مجری ارسال</div>
                <div>امضا و مهر خریدار (تحویل‌گیرنده سالم کالا)</div>
              </div>

            </div>

            {/* Modal action bar inside pop-up */}
            <div className="flex gap-2 justify-end pt-3 border-t border-slate-150 no-print">
              <button
                onClick={handlePrintInvoice}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs shadow-md transition"
              >
                <Printer size={14} /> پرینت / بارگذاری نسخه چاپی
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-5 py-2.5 rounded-xl text-xs transition animate-pulse"
              >
                بستن پنجره نمایش
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
