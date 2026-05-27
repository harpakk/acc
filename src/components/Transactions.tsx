/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { dbService } from '../db';
import { Transaction, Person, Item, Receive, Invoice } from '../types';
import { 
  Plus, 
  Search, 
  Trash2, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Settings, 
  AlertTriangle,
  Flame,
  CreditCard,
  UserCheck,
  Calendar,
  FileText,
  Image as ImageIcon,
  Filter,
  Upload,
  Building2,
  Eye,
  X,
  ChevronDown,
  Clock,
  Check,
  AlertCircle
} from 'lucide-react';

const getPersianMonthName = (monthStr: string) => {
  const m = parseInt(monthStr, 10);
  const months = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
  ];
  return months[m - 1] || `ماه ${monthStr}`;
};

interface TransactionsProps {
  initialSubView: 'receive-new' | 'receive-list' | 'payment-new' | 'payment-list' | 'expense-new' | 'expense-list' | 'waste-new' | 'waste-list';
}

export default function Transactions({ initialSubView }: TransactionsProps) {
  const [subView, setSubView] = useState(initialSubView);
  
  // DB States
  const [persons, setPersons] = useState<Person[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [receives, setReceives] = useState<Receive[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // Generic and Shared Form State
  const [date, setDate] = useState('1405/03/05');
  const [amount, setAmount] = useState<number | ''>('');
  const [personId, setPersonId] = useState('');
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  // Rich Receives State
  const [invoiceIds, setInvoiceIds] = useState<string[]>([]);
  const [receiveType, setReceiveType] = useState<'نقد' | 'چک'>('نقد');
  const [pic, setPic] = useState<string>('');
  
  // Check details
  const [dueDate, setDueDate] = useState('1405/03/05');
  const [checkId, setCheckId] = useState('');
  const [checkSerial, setCheckSerial] = useState('');
  const [checkSeries, setCheckSeries] = useState('');
  const [accountOwner, setAccountOwner] = useState('');
  const [bank, setBank] = useState('');
  const [inquiryStatus, setInquiryStatus] = useState('در انتظار استعلام');
  const [checkStatus, setCheckStatus] = useState<'پاس شده' | 'موعد نرسیده' | 'برگشت'>('موعد نرسیده');

  // Receives List Filters & Tabs
  const [receiveTab, setReceiveTab] = useState<'all' | 'checks'>('all');
  const [sortBy, setSortBy] = useState<'dueDateAsc' | 'dueDateDesc' | 'createdAsc' | 'amountDesc'>('dueDateAsc');
  const [filterPerson, setFilterPerson] = useState('');
  const [filterBank, setFilterBank] = useState('');
  const [filterCheckStatus, setFilterCheckStatus] = useState<'all' | 'پاس شده' | 'موعد نرسیده' | 'برگشت'>('all');
  const [searchCheckQuery, setSearchCheckQuery] = useState('');

  // Image zoom modal
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // UI status
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    setSubView(initialSubView);
    loadData();
    resetForm();
  }, [initialSubView]);

  const loadData = () => {
    setPersons(dbService.getPersons());
    setItems(dbService.getItems());
    setTransactions(dbService.getTransactions());
    setReceives(dbService.getReceives());
    setInvoices(dbService.getInvoices());
  };

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const resetForm = () => {
    setDate('1405/03/05');
    setAmount('');
    setPersonId('');
    setItemId('');
    setQuantity('');
    setCategory('');
    setDescription('');
    
    // Reset rich states
    setInvoiceIds([]);
    setReceiveType('نقد');
    setPic('');
    setDueDate('1405/03/05');
    setCheckId('');
    setCheckSerial('');
    setCheckSeries('');
    setAccountOwner('');
    setBank('');
    setInquiryStatus('در انتظار استعلام');
    setCheckStatus('موعد نرسیده');
  };

  // Convert uploaded image file to base64 URL
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('حجم فایل نباید بیشتر از ۲ مگابایت باشد.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPic(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Dedicated Save Receive Handler (Cash / Checks)
  const handleSaveReceive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personId) {
      alert('لطفاً طرف حساب دریافت‌کننده را انتخاب کنید.');
      return;
    }
    const resolvedAmount = Number(amount || 0);
    if (resolvedAmount <= 0) {
      alert('مبلغ دریافت باید بیشتر از صفر ریال باشد.');
      return;
    }

    const recCode = `REC-${Math.floor(Math.random() * 90000) + 10000}`;
    const recId = `rec_${Date.now()}`;

    const newReceive: Receive = {
      id: recId,
      code: recCode,
      personId,
      invoiceIds: invoiceIds.length > 0 ? invoiceIds : undefined,
      amount: resolvedAmount,
      date,
      pic: pic || undefined,
      type: receiveType,
      createdAt: new Date().toISOString()
    };

    if (receiveType === 'چک') {
      newReceive.dueDate = dueDate;
      newReceive.checkId = checkId || undefined;
      newReceive.checkSerial = checkSerial || undefined;
      newReceive.checkSeries = checkSeries || undefined;
      newReceive.accountOwner = accountOwner || undefined;
      newReceive.bank = bank || undefined;
      newReceive.inquiryStatus = inquiryStatus;
      newReceive.status = checkStatus;
    }

    // Save to Receives Table
    dbService.saveReceive(newReceive);

    // Also register standard transaction for financial statistics compatibility
    const personObj = persons.find(p => p.id === personId);
    const invoicesCount = invoiceIds.length;
    const invText = invoicesCount > 0 
      ? ` بابت تسویه فاکتور فروش (تعداد: ${invoicesCount})`
      : '';
    const detailsSuffix = receiveType === 'چک'
      ? ` (چک بانک ${bank || ''} به شماره ${checkSerial || ''} - سررسید ${dueDate})`
      : ' (دریافت نقدی)';

    const newTr: Transaction = {
      id: `tr_${Date.now()}`,
      code: recCode,
      date,
      type: 'receive',
      category: receiveType === 'چک' ? 'دریافت اسناد معوق (چک)' : 'دریافت نقدی صندوق',
      amount: resolvedAmount,
      personId,
      description: `دریافت مالی از ${personObj?.name || 'مشتری'}${invText}${detailsSuffix}`.trim(),
      createdAt: new Date().toISOString()
    };
    dbService.saveTransaction(newTr);

    showNotice(`سند دریافت با موفقیت ثبت گردیده و در معین شخص اعمال شد.`);
    resetForm();
    loadData();
    setSubView('receive-list');
  };

  // Standard payments, expenses, wastes
  const handleSave = (e: React.FormEvent, type: Transaction['type']) => {
    e.preventDefault();
    
    let resolvedAmount = Number(amount || 0);
    let resolvedCategory = category;

    if (type === 'payment') resolvedCategory = category || 'پرداخت تسویه مطالبات';
    if (type === 'expense') resolvedCategory = category || 'هزینه جاری عمومی';
    
    if (type === 'waste') {
      resolvedCategory = 'ضایعات مواد اولیه تولید';
      const itObj = items.find(i => i.id === itemId);
      if (itObj && quantity) {
        resolvedAmount = Number(quantity) * itObj.cost;
      }
    }

    if (type !== 'waste' && resolvedAmount <= 0) {
      alert('مبلغ باید بیشتر از صفر باشد.');
      return;
    }

    const trCode = `${type.toUpperCase().substring(0,3)}-${Math.floor(Math.random() * 90000) + 10000}`;

    const newTr: Transaction = {
      id: `tr_${Date.now()}`,
      code: trCode,
      date,
      type,
      category: resolvedCategory,
      amount: resolvedAmount,
      personId: personId || undefined,
      itemId: itemId || undefined,
      quantity: quantity ? Number(quantity) : undefined,
      description: description.trim() || `ثبت سند ${type} به کد ارجاع ${trCode}`,
      createdAt: new Date().toISOString()
    };

    dbService.saveTransaction(newTr);

    if (type === 'waste' && itemId && quantity) {
      const itObj = items.find(i => i.id === itemId);
      if (itObj) {
        dbService.saveItem({
          ...itObj,
          stock: Math.max(0, itObj.stock - Number(quantity))
        });
      }
    }

    showNotice(`سند با موفقیت ثبت شد.`);
    resetForm();
    loadData();

    if (type === 'payment') setSubView('payment-list');
    else if (type === 'expense') setSubView('expense-list');
    else if (type === 'waste') setSubView('waste-list');
  };

  const handleDelete = (id: string) => {
    if (confirm('آیا از حذف این سند مالی اطمینان دارید؟')) {
      dbService.deleteTransaction(id);
      loadData();
      showNotice('سند مالی حذف شد');
    }
  };

  const handleDeleteReceive = (id: string) => {
    if (confirm('آیا از حذف این سند دریافت اطمینان دارید؟ این عمل معادل معین را نیز اصلاح می‌کند.')) {
      const rec = receives.find(r => r.id === id);
      if (rec) {
        dbService.deleteReceive(id);
        const linkedTr = transactions.find(t => t.code === rec.code);
        if (linkedTr) {
          dbService.deleteTransaction(linkedTr.id);
        }
        loadData();
        showNotice('سند دریافت مالی حذف شد');
      }
    }
  };

  // Inline status check update
  const handleUpdateCheckStatus = (rec: Receive, newStatus: Receive['status']) => {
    const updated = { ...rec, status: newStatus };
    dbService.saveReceive(updated);
    
    // Also update description of standard transaction to reflect state change
    const linkedTr = transactions.find(t => t.code === rec.code);
    if (linkedTr) {
      const baseDesc = linkedTr.description.split(' - وضعیت:')[0];
      dbService.saveTransaction({
        ...linkedTr,
        description: `${baseDesc} - وضعیت: [${newStatus}]`
      });
    }

    loadData();
    showNotice(`وضعیت چک به "${newStatus}" تغییر یافت.`);
  };

  // Filter lists inside subView mapping
  const invoicesOfSelectedPerson = invoices.filter(inv => inv.personId === personId && inv.type === 'sale');

  const filteredGeneralList = transactions.filter(t => {
    if (subView === 'payment-list') return t.type === 'payment';
    if (subView === 'expense-list') return t.type === 'expense';
    if (subView === 'waste-list') return t.type === 'waste';
    return false;
  });

  // Receives and Checks logic filtering
  const filteredReceives = receives.filter(r => {
    if (receiveTab === 'checks') {
      if (r.type !== 'چک') return false;
      
      // Filter by check status
      if (filterCheckStatus !== 'all' && r.status !== filterCheckStatus) return false;
      
      // Filter by bank search
      if (filterBank && !r.bank?.toLowerCase().includes(filterBank.toLowerCase())) return false;
      
      // Search checks fields
      if (searchCheckQuery) {
        const query = searchCheckQuery.toLowerCase();
        const matchesQuery = 
          r.checkId?.toLowerCase().includes(query) ||
          r.checkSerial?.toLowerCase().includes(query) ||
          r.checkSeries?.toLowerCase().includes(query) ||
          r.accountOwner?.toLowerCase().includes(query);
        if (!matchesQuery) return false;
      }
    }

    // Shared filters
    if (filterPerson && r.personId !== filterPerson) return false;

    return true;
  });

  // Apply Receives/Checks Sorting
  const sortedReceives = [...filteredReceives].sort((a, b) => {
    if (receiveTab === 'checks') {
      if (sortBy === 'dueDateAsc') {
        return (a.dueDate || '').localeCompare(b.dueDate || '');
      }
      if (sortBy === 'dueDateDesc') {
        return (b.dueDate || '').localeCompare(a.dueDate || '');
      }
    }
    if (sortBy === 'createdAsc') {
      return a.createdAt.localeCompare(b.createdAt);
    }
    if (sortBy === 'amountDesc') {
      return b.amount - a.amount;
    }
    return 0;
  });

  // Calculate stats for checks
  const totalChequeValue = receives.filter(r => r.type === 'چک').reduce((acc, cr) => acc + cr.amount, 0);
  const pendingCheques = receives.filter(r => r.type === 'چک' && r.status === 'موعد نرسیده');
  const clearedCheques = receives.filter(r => r.type === 'چک' && r.status === 'پاس شده');
  const bouncedCheques = receives.filter(r => r.type === 'چک' && r.status === 'برگشت');

  const pendingValue = pendingCheques.reduce((acc, cr) => acc + cr.amount, 0);
  const clearedValue = clearedCheques.reduce((acc, cr) => acc + cr.amount, 0);
  const bouncedValue = bouncedCheques.reduce((acc, cr) => acc + cr.amount, 0);

  // Auto-fill amount based on selected invoices
  const handleAutoFillInvoicesTotal = () => {
    const total = invoiceIds.reduce((sum, id) => {
      const inv = invoices.find(i => i.id === id);
      return sum + (inv ? inv.total : 0);
    }, 0);
    setAmount(total);
  };

  const toggleInvoiceSelection = (invId: string) => {
    setInvoiceIds(prev => 
      prev.includes(invId) ? prev.filter(id => id !== invId) : [...prev, invId]
    );
  };

  return (
    <div className="space-y-6 text-right animate-fade-in" dir="rtl">
      {/* Pop notifications */}
      {notification && (
        <div className="fixed bottom-6 left-6 bg-slate-900 border border-slate-800 text-emerald-400 px-6 py-4 rounded-2xl shadow-2xl z-50 text-xs font-sans flex items-center gap-3 animate-slide-up">
          <CheckCircle2 size={18} className="text-emerald-500 animate-bounce" />
          <span className="font-medium text-slate-100">{notification}</span>
        </div>
      )}

      {/* Image viewer Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50" onClick={() => setSelectedImage(null)}>
          <div className="relative bg-white max-w-2xl w-full rounded-2xl p-2 shadow-2xl overflow-hidden animate-zoom-in" onClick={(e) => e.stopPropagation()}>
            <button className="absolute top-4 right-4 bg-slate-900/60 hover:bg-slate-950 text-white rounded-full p-2 transition cursor-pointer" onClick={() => setSelectedImage(null)}>
              <X size={18} />
            </button>
            <img src={selectedImage} referrerPolicy="no-referrer" alt="سند پیوست" className="w-full h-auto rounded-xl object-contain max-h-[80vh]" />
          </div>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center border-b border-slate-100 pb-5 gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-805 tracking-tight">
            {subView === 'receive-new' && 'ثبت سند دریافت جدید'}
            {subView === 'receive-list' && 'دفتر دریافت و اسناد وصولی'}
            {subView === 'payment-new' && 'پرداخت جدید'}
            {subView === 'payment-list' && 'لیست پرداخت ها'}
            {subView === 'expense-new' && 'هزینه جدید'}
            {subView === 'expense-list' && 'لیست هزینه ها'}
            {subView === 'waste-new' && 'ضایعات جدید'}
            {subView === 'waste-list' && 'لیست ضایعات'}
          </h2>
          <p className="text-slate-405 text-xs mt-1 font-medium font-sans">امور خزانه‌داری، دریافت نقد، اسناد چک تضمینی و حسابداری معین شادی آوران</p>
        </div>
        <div className="flex flex-wrap gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
          <button 
            onClick={() => setSubView('receive-new')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${subView === 'receive-new' ? 'bg-white shadow-md text-slate-900' : 'text-slate-500 hover:text-slate-750'}`}
          >
            <Plus size={14} />
            + دریافت جدید
          </button>
          <button 
            onClick={() => { setSubView('receive-list'); setReceiveTab('all'); }}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${subView === 'receive-list' && receiveTab === 'all' ? 'bg-white shadow-md text-slate-900' : 'text-slate-500 hover:text-slate-750'}`}
          >
            لیست دریافت‌ها
          </button>
          <button 
            onClick={() => { setSubView('receive-list'); setReceiveTab('checks'); }}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${subView === 'receive-list' && receiveTab === 'checks' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500 hover:text-indigo-650'}`}
          >
            <CreditCard size={14} className="text-indigo-505" />
            بخش ویژه چک‌ها ({receives.filter(r => r.type === 'چک').length})
          </button>
          <span className="w-px h-6 bg-slate-200 self-center mx-1"></span>
          <button 
            onClick={() => setSubView('payment-new')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${subView === 'payment-new' ? 'bg-white shadow-md text-slate-900' : 'text-slate-500 hover:text-slate-750'}`}
          >
            + پرداخت جدید
          </button>
          <button 
            onClick={() => setSubView('payment-list')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${subView === 'payment-list' ? 'bg-white shadow-md text-slate-900' : 'text-slate-500 hover:text-slate-750'}`}
          >
            لیست پرداخت‌ها
          </button>
          <button 
            onClick={() => setSubView('expense-new')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${subView === 'expense-new' ? 'bg-white shadow-md text-slate-900' : 'text-slate-500 hover:text-slate-755'}`}
          >
            + هزینه
          </button>
          <button 
            onClick={() => setSubView('expense-list')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${subView === 'expense-list' ? 'bg-white shadow-md text-slate-900' : 'text-slate-500 hover:text-slate-755'}`}
          >
            لیست هزینه‌ها
          </button>
          <button 
            onClick={() => setSubView('waste-new')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${subView === 'waste-new' ? 'bg-white shadow-md text-slate-900' : 'text-slate-500 hover:text-slate-755'}`}
          >
            + ضایعات
          </button>
          <button 
            onClick={() => setSubView('waste-list')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${subView === 'waste-list' ? 'bg-white shadow-md text-slate-900' : 'text-slate-500 hover:text-slate-755'}`}
          >
            لیست ضایعات
          </button>
        </div>
      </div>

      {/* --- RENDER 1: RICH RECEIVE CREATE FORM --- */}
      {subView === 'receive-new' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm max-w-4xl mx-auto space-y-6">
          <div className="border-b border-slate-50 pb-4">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              مشخصات سند دریافت وجه / اسناد چک بانکی
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">اطلاعات دریافتی را با دقت وارد کنید. اسناد دریافتی مستقیم بر مانده معین حساب اشخاص و گزارش ترازنامه تاثیرگذار است.</p>
          </div>

          <form onSubmit={handleSaveReceive} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Option 1: Selector of Client Person */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 block">شخص طرف حساب دریافت‌شونده <span className="text-rose-500">*</span></label>
                <select
                  value={personId}
                  required
                  onChange={(e) => {
                    setPersonId(e.target.value);
                    setInvoiceIds([]); // Reset selected invoices
                  }}
                  className="w-full bg-slate-50 border border-transparent focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:bg-white focus:ring-4 focus:ring-indigo-100 outline-none transition"
                >
                  <option value="">طرف حساب را انتخاب کنید...</option>
                  {persons.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code}) - {p.city}</option>
                  ))}
                </select>
              </div>

              {/* Option 2: Date of collection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 block">تاریخ وثوق و دریافت سند</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    placeholder="۱۴۰۵/۰۳/۰۵"
                    className="w-full bg-slate-50 border border-transparent focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs font-mono text-center focus:bg-white focus:ring-4 focus:ring-indigo-100 outline-none transition"
                  />
                  <Calendar size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                </div>
              </div>

              {/* Type Selection cash vs cheque */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 block">نوع مدرک دریافت شده <span className="text-rose-500">*</span></label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setReceiveType('نقد')}
                    className={`py-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${receiveType === 'نقد' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${receiveType === 'نقد' ? 'bg-emerald-400' : 'bg-slate-300'}`}></span>
                    نقد / فیش واریز نقدی
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceiveType('چک')}
                    className={`py-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${receiveType === 'چک' ? 'bg-indigo-650 border-indigo-650 text-white' : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'}`}
                  >
                    <CreditCard size={13} />
                    چک بانکی (صیاد / ضمانتی)
                  </button>
                </div>
              </div>

              {/* Amount field */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-500">مبلغ نهایی دریافت (ریال) <span className="text-rose-500">*</span></label>
                  {invoiceIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleAutoFillInvoicesTotal}
                      className="text-[10px] text-indigo-600 hover:underline font-bold"
                    >
                      مساوی جمع فاکتورهای انتخابی ({(invoiceIds.reduce((sum, id) => sum + (invoices.find(i => i.id === id)?.total || 0), 0)).toLocaleString()} ریال)
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-50 border border-transparent focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-slate-805 font-mono font-bold focus:bg-white focus:ring-4 focus:ring-indigo-100 outline-none transition"
                    placeholder="ریال وارد کنید"
                  />
                  {amount !== '' && (
                    <span className="absolute left-3 top-3.5 text-[10px] text-slate-405 font-bold">
                      {Number(amount).toLocaleString()} ریال
                    </span>
                  )}
                </div>
              </div>

            </div>

            {/* Invoices List checkbox area (Conditional on person selected) */}
            <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                  <FileText size={13} className="text-slate-500" />
                  انتساب فاکتور(های) مرتبط (اختیاری)
                </h4>
                {personId && invoicesOfSelectedPerson.length > 0 && (
                  <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">
                    {invoicesOfSelectedPerson.length} فاکتور فروش یافت شد
                  </span>
                )}
              </div>

              {!personId ? (
                <p className="text-[11px] text-slate-400">لطفاً ابتدا شخص طرف حساب دریافتی را انتخاب کنید تا فاکتورهای وی نمایش داده شود.</p>
              ) : invoicesOfSelectedPerson.length === 0 ? (
                <p className="text-[11px] text-slate-450 italic">هیچ فاکتور فروشی در پایگاه داده برای این شخص ثبت نشده است.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                  {invoicesOfSelectedPerson.map(inv => {
                    const isSelected = invoiceIds.includes(inv.id);
                    return (
                      <div 
                        key={inv.id}
                        onClick={() => toggleInvoiceSelection(inv.id)}
                        className={`p-3 rounded-xl border transition cursor-pointer flex items-start gap-2.5 ${isSelected ? 'bg-white border-indigo-500 shadow-sm ring-2 ring-indigo-50' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // Handled by outer div onClick
                          className="mt-0.5 h-3.5 w-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 pointer-events-none"
                        />
                        <div className="space-y-0.5 text-right font-sans">
                          <p className="text-xs font-black text-slate-800">فاکتور #{inv.invoiceNumber}</p>
                          <p className="text-[10px] text-slate-405">مورخ: {inv.date}</p>
                          <p className="text-[11px] text-indigo-650 font-mono font-black">{inv.total.toLocaleString()} ریال</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* --- CHECK DETAILS FORM (CONDITIONAL ON TYPE === 'چک') --- */}
            {receiveType === 'چک' && (
              <div className="p-5 bg-indigo-50/40 rounded-2xl border border-indigo-100/60 space-y-4 animate-slide-down">
                <div className="border-b border-indigo-100/50 pb-2 flex items-center justify-between">
                  <h4 className="text-xs font-black text-indigo-800 flex items-center gap-1.5">
                    <CreditCard size={14} />
                    سربرگ جزئیات چک دریافتنی صیاد / عادی
                  </h4>
                  <span className="text-[10px] font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">امانت امین شادی آوران</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Bank name */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-indigo-700">نام بانک صادرکننده چک <span className="text-rose-500">*</span></label>
                    <select
                      value={bank}
                      required={receiveType === 'چک'}
                      onChange={(e) => setBank(e.target.value)}
                      className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-350 transition"
                    >
                      <option value="">انتخاب بانک صادرکننده...</option>
                      <option value="ملی">بانک ملی ایران</option>
                      <option value="صادرات">بانک صادرات ایران</option>
                      <option value="ملت">بانک ملت</option>
                      <option value="تجارت">بانک تجارت</option>
                      <option value="سپه">بانک سپه</option>
                      <option value="پاسارگاد">بانک پاسارگاد</option>
                      <option value="پارسیان">بانک پارسیان</option>
                      <option value="سامان">بانک سامان</option>
                      <option value="کشاورزی">بانک کشاورزی</option>
                      <option value="مسکن">بانک مسکن</option>
                      <option value="کارآفرین">بانک کارآفرین</option>
                      <option value="توسعه تعاون">بانک توسعه تعاون</option>
                      <option value="سایر">سایر مؤسسات مالی و اعتباری</option>
                    </select>
                  </div>

                  {/* Due date */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-indigo-700">تاریخ سررسید چک <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required={receiveType === 'چک'}
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      placeholder="۱۴۰۵/۰۳/۰۵"
                      className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-2 text-xs font-mono text-center text-slate-800 outline-none focus:ring-2 focus:ring-indigo-355 transition"
                    />
                  </div>

                  {/* Account Drawer */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-indigo-700">صاحب حساب (صادر کننده چک) <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required={receiveType === 'چک'}
                      value={accountOwner}
                      onChange={(e) => setAccountOwner(e.target.value)}
                      placeholder="نام کامل نویسنده سند"
                      className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-350 transition"
                    />
                  </div>

                  {/* Check ID صیاد */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-indigo-700">شناسه ۱۶ رقمی چک صیاد</label>
                    <input
                      type="text"
                      value={checkId}
                      onChange={(e) => setCheckId(e.target.value)}
                      placeholder="مثال: ۴۴۸۹۸۶۵۶۳۲۶۵۱۲۹۸"
                      className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-2 text-xs font-mono text-center text-slate-800 outline-none focus:ring-2 focus:ring-indigo-350 transition"
                    />
                  </div>

                  {/* Serial */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-indigo-700">شماره سریال چک <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required={receiveType === 'چک'}
                      value={checkSerial}
                      onChange={(e) => setCheckSerial(e.target.value)}
                      placeholder="مثال: ۷۴۵۸۹۶"
                      className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-2 text-xs font-mono text-center text-slate-850 outline-none focus:ring-2 focus:ring-indigo-350 transition"
                    />
                  </div>

                  {/* Series */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-indigo-700">سری چک (حرف و دو رقم بابت کج)</label>
                    <input
                      type="text"
                      value={checkSeries}
                      onChange={(e) => setCheckSeries(e.target.value)}
                      placeholder="مثال: الف/۴۵"
                      className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-2 text-xs font-mono text-center text-slate-850 outline-none focus:ring-2 focus:ring-indigo-350 transition"
                    />
                  </div>

                  {/* Inquiry check status */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-indigo-700">قالب ثبتی وضعیت استعلام بانک مرکزی</label>
                    <select
                      value={inquiryStatus}
                      onChange={(e) => setInquiryStatus(e.target.value)}
                      className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-350 transition"
                    >
                      <option value="در انتظار استعلام">در انتظار استعلام حساب</option>
                      <option value="سفید (معتبر - فاقد هرگونه بدهی و برگشتی)">سفید (معتبر تام)</option>
                      <option value="زرد (ریسک متوسط - ۱ چک برگشتی)">زرد (ریسک متوسط)</option>
                      <option value="قرمز (ریسک بسیار بالا - فاقد اعتبار)">قرمز (فاقد اعتبار)</option>
                    </select>
                  </div>

                  {/* Clearance status */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-indigo-700">وضعیت فعلی چک</label>
                    <select
                      value={checkStatus}
                      onChange={(e) => setCheckStatus(e.target.value as any)}
                      className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-2 text-xs text-slate-855 outline-none focus:ring-2 focus:ring-indigo-350 transition animate-pulse"
                    >
                      <option value="موعد نرسیده">موعد نرسیده/امانی نزد صندوق</option>
                      <option value="پاس شده">پاس شده (واریز به حساب بانک)</option>
                      <option value="برگشت">برگشت خورده (مفتوح)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Pic Attachment */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 block">پیوست تصویر روی چک یا فیش واریزی (اختیاری)</label>
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200">
                <div className="flex items-center gap-3 cursor-pointer bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm text-xs font-bold text-slate-600 hover:bg-slate-50 relative shrink-0">
                  <Upload size={14} className="text-slate-450" />
                  <span>انتخاب تصویر فایل...</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
                {pic ? (
                  <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-xl border border-slate-100">
                    <img src={pic} alt="پیش‌نمایش" className="w-10 h-10 rounded-lg object-cover cursor-pointer border border-slate-100" onClick={() => setSelectedImage(pic)} />
                    <div className="text-right">
                      <p className="text-[11px] font-bold text-emerald-600">پیوست آماده ثبت</p>
                      <button type="button" onClick={() => setPic('')} className="text-[10px] text-rose-500 hover:underline">حذف عکس</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-405">تصویری انتخاب نشده است. حداکثر حجم مجاز ۲ مگابایت صادر می‌شود.</p>
                )}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-xl text-xs transition shadow-lg shadow-emerald-600/10 cursor-pointer"
              >
                ثبت قطعی سند دریافت در سیستم معین و دفاتر مالی ✓
              </button>
            </div>
          </form>
        </div>
      )}


      {/* --- RENDER 2: RECEIVES & CHEQUES LIST VIEW --- */}
      {subView === 'receive-list' && (
        <div className="space-y-6">
          
          {/* STATS DECK - ONLY FOR CHEQUES VIEW */}
          {receiveTab === 'checks' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-down">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold">کل ارزش اسناد چک دریافتی</p>
                  <p className="text-lg font-mono font-black text-slate-800 mt-1">{totalChequeValue.toLocaleString()} <span className="text-[9px] text-slate-500 font-sans font-normal">ریال</span></p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-600">
                  <CreditCard size={18} />
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-orange-500 font-bold">چک‌های معوق (سررسید نشده)</p>
                  <p className="text-lg font-mono font-black text-orange-600 mt-1">{pendingValue.toLocaleString()} <span className="text-[9px] text-slate-500 font-sans">ریال</span></p>
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5">تعداد: {pendingCheques.length} برگ</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-xl border border-orange-100 text-orange-550">
                  <Clock size={18} />
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-emerald-500 font-bold">چک‌های وصول‌شده (پاس شده)</p>
                  <p className="text-lg font-mono font-black text-emerald-600 mt-1">{clearedValue.toLocaleString()} <span className="text-[9px] text-slate-500 font-sans">ریال</span></p>
                  <p className="text-[10px] text-slate-405 font-sans mt-0.5">تعداد: {clearedCheques.length} برگ</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-550">
                  <Check size={18} />
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-rose-500 font-bold">چک‌های برگشتی (بلاک شده)</p>
                  <p className="text-lg font-mono font-black text-rose-600 mt-1">{bouncedValue.toLocaleString()} <span className="text-[9px] text-slate-500 font-sans">ریال</span></p>
                  <p className="text-[10px] text-slate-405 font-sans mt-0.5">تعداد: {bouncedCheques.length} برگ</p>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-rose-500 animate-pulse">
                  <AlertCircle size={18} />
                </div>
              </div>
            </div>

            {/* NEW FUTURE RECEIVE CHEQUES & BOUNCED CHEQUES DETAILED SECTION */}
            {(() => {
              const pendingChequesList = receives.filter(r => r.type === 'چک' && r.status === 'موعد نرسیده');
              const bouncedChequesList = receives.filter(r => r.type === 'چک' && r.status === 'برگشت');

              // Month breakdown calculation
              const monthGroups: { [key: string]: { amount: number; count: number; monthName: string; year: string } } = {};
              pendingChequesList.forEach(c => {
                if (c.dueDate) {
                  const parts = c.dueDate.split('/');
                  if (parts.length >= 2) {
                    const year = parts[0];
                    const month = parts[1];
                    const key = `${year}/${month}`;
                    if (!monthGroups[key]) {
                      monthGroups[key] = {
                        amount: 0,
                        count: 0,
                        monthName: getPersianMonthName(month),
                        year
                      };
                    }
                    monthGroups[key].amount += c.amount;
                    monthGroups[key].count += 1;
                  }
                }
              });

              // Sort monthGroups by year/month key asc
              const sortedMonths = Object.keys(monthGroups).sort().map(key => ({
                monthKey: key,
                ...monthGroups[key]
              }));

              return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 animate-fade-in text-right" dir="rtl">
                  {/* Column 1: Outstanding/Pending Checks (موعد نرسیده) */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-xs font-black text-slate-800 flex items-center gap-2">
                        <Clock size={16} className="text-amber-500" />
                        طرح تفصیلی چک‌های معوق (سررسید نشده / موعد نرسیده)
                      </h3>
                      <span className="text-xs bg-amber-50 text-amber-700 px-3 py-1 rounded-full font-black">
                        {pendingValue.toLocaleString()} ریال
                      </span>
                    </div>

                    {sortedMonths.length > 0 ? (
                      <div className="space-y-3">
                        <p className="text-[11px] text-slate-450 font-bold">مجموع سررسیدها به تفکیک ماه شمسی:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {sortedMonths.map(m => (
                            <div key={m.monthKey} className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 flex flex-col justify-between">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-slate-700">{m.monthName} {m.year}</span>
                                <span className="text-[9px] bg-slate-200 text-slate-650 px-1.5 py-0.5 rounded font-black font-mono">{m.count} برگ چک</span>
                              </div>
                              <div className="mt-2 text-left">
                                <span className="text-xs font-black font-mono text-indigo-700">{m.amount.toLocaleString()} <span className="text-[9px] font-sans text-slate-400 font-normal">ریال</span></span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic font-medium py-3 text-center">هیچ چک سررسید نشده‌ای یافت نشد.</p>
                    )}

                    {/* Pending list */}
                    <div className="space-y-2 pt-2">
                      <p className="text-[11px] text-slate-455 font-bold">برگه‌های چک موعد نرسیده:</p>
                      <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                        {pendingChequesList.length > 0 ? (
                          pendingChequesList.map(c => {
                            const p = persons.find(per => per.id === c.personId);
                            return (
                              <div key={c.id} className="bg-amber-50/30 p-3 rounded-xl border border-amber-100/40 flex items-center justify-between hover:bg-amber-50/60 transition duration-150">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-black text-slate-800">بانک {c.bank}</span>
                                    <span className="text-[9px] font-mono bg-slate-100 text-slate-500 px-1 py-0.2 rounded">صیاد: {c.checkId || 'عادی'}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-505">
                                    سریال: {c.checkSerial} | طرف حساب: <span className="font-bold text-slate-705">{p?.name || '-'}</span>
                                  </div>
                                </div>
                                <div className="text-left font-mono space-y-0.5">
                                  <p className="text-xs font-black text-indigo-650">{c.amount.toLocaleString()} ریال</p>
                                  <p className="text-[9px] text-slate-455 flex items-center justify-end gap-1 font-bold">
                                    <Calendar size={10} className="text-slate-400" />
                                    موعد: {c.dueDate}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-xs text-slate-405 italic text-center py-2">موردی یافت نشد.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Bounced Checks & Summary (برگشتی) */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-xs font-black text-slate-800 flex items-center gap-2">
                        <AlertCircle size={16} className="text-rose-500 animate-pulse" />
                        سیاهه اسناد واخواست‌شده و برگشت‌خورده
                      </h3>
                      <span className="text-xs bg-rose-50 text-rose-700 px-3 py-1 rounded-full font-black">
                        {bouncedValue.toLocaleString()} ریال
                      </span>
                    </div>

                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                      {bouncedChequesList.length > 0 ? (
                        bouncedChequesList.map(c => {
                          const p = persons.find(per => per.id === c.personId);
                          return (
                            <div key={c.id} className="bg-rose-50/30 p-3 rounded-xl border border-rose-100/50 flex items-center justify-between hover:bg-rose-55/40 transition duration-150">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-black text-rose-800">بانک {c.bank}</span>
                                  <span className="text-[9px] font-mono bg-rose-100 text-rose-700 px-1 py-0.2 rounded">برگشت خورده</span>
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  سریال: {c.checkSerial} | واگذارنده: <span className="font-bold text-slate-750">{p?.name || '-'}</span>
                                </div>
                              </div>
                              <div className="text-left font-mono space-y-0.5">
                                <p className="text-xs font-black text-rose-600">{c.amount.toLocaleString()} ریال</p>
                                <p className="text-[9px] text-slate-440 flex items-center justify-end gap-1 font-bold">
                                  <Calendar size={10} className="text-slate-400" />
                                  سررسید: {c.dueDate}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 scale-95">
                          <CheckCircle2 size={36} className="text-emerald-500 mb-2" />
                          <p className="text-xs font-bold text-slate-650">عدم وجود چک برگشتی واخواست‌شده</p>
                          <p className="text-[10px] text-slate-400 mt-1">کلیه تعهدات به موقع تسویه و پرداخت گردیده است.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
            </>
          )}

          {/* DYNAMIC SEARCH & FILTER PANEL */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-3 border-b border-slate-50 pb-3">
              <h4 className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <Filter size={14} className="text-indigo-600" />
                جعبه فیلترها و مرتب‌سازی و جستجوی آنی
              </h4>
              <button 
                onClick={() => {
                  setFilterPerson('');
                  setFilterBank('');
                  setFilterCheckStatus('all');
                  setSearchCheckQuery('');
                  setSortBy('dueDateAsc');
                }}
                className="text-[10px] text-rose-500 hover:underline text-right font-bold font-sans cursor-pointer"
              >
                پاک کردن تمتم حالت‌های فیلتر
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Filter 1: Person selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-450 block">فیلتر طرف حساب معین</label>
                <select
                  value={filterPerson}
                  onChange={(e) => setFilterPerson(e.target.value)}
                  className="w-full bg-slate-50 border-0 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                >
                  <option value="">همه مشتریان و اشخاص...</option>
                  {persons.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {receiveTab === 'checks' ? (
                <>
                  {/* Filter 2: Bank (cheque only) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-450 block">جستجوی نام بانک صادر کننده</label>
                    <input
                      type="text"
                      value={filterBank}
                      onChange={(e) => setFilterBank(e.target.value)}
                      placeholder="مثال: ملی، ملت"
                      className="w-full bg-slate-50 border-0 rounded-xl px-3 py-2 text-xs outline-none font-sans"
                    />
                  </div>

                  {/* Filter 3: Local check status */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-450 block">فیلتر وضعیت برگه چک</label>
                    <select
                      value={filterCheckStatus}
                      onChange={(e) => setFilterCheckStatus(e.target.value as any)}
                      className="w-full bg-slate-50 border-0 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                    >
                      <option value="all">همه وضعیت‌ها</option>
                      <option value="موعد نرسیده">موعد نرسیده</option>
                      <option value="پاس شده">وصول شده (پاس شده)</option>
                      <option value="برگشت">برگشت خورده</option>
                    </select>
                  </div>

                  {/* Filter 4: Sorting check */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-450 block">مرتب‌سازی چک‌ها</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="w-full bg-slate-50 border-0 rounded-xl px-3 py-2 text-xs text-indigo-650 font-bold outline-none"
                    >
                      <option value="dueDateAsc">موعود سررسید (نزدیک‌تر به دورتر) A-Z</option>
                      <option value="dueDateDesc">موعود سررسید (دورتر به نزدیک‌تر) Z-A</option>
                      <option value="createdAsc">تاریخ ثبت پرونده معین (نزولی)</option>
                      <option value="amountDesc">مبلغ چک (سنگین‌ترین به سبک‌ترین)</option>
                    </select>
                  </div>
                </>
              ) : (
                <div className="sm:col-span-3 bg-indigo-50/10 p-2 rounded-xl flex items-center justify-center border border-indigo-150 text-[11px] text-indigo-600">
                  فیلترهای اختصاصی، مرتب‌سازی‌های سررسید و نمودارهای سلامت صیاد در بخش ویژه چک‌ها فعال می‌باشند. دکمه آیکون چک را کلیک کنید.
                </div>
              )}
            </div>

            {/* Quick search input (checks only) */}
            {receiveTab === 'checks' && (
              <div className="relative">
                <input
                  type="text"
                  value={searchCheckQuery}
                  onChange={(e) => setSearchCheckQuery(e.target.value)}
                  placeholder="جستجوی سریع شناسه ۱۶ رقمی صیاد، شماره سریال چک یا نام صادرکننده چک..."
                  className="w-full bg-slate-50 border-0 rounded-xl pr-10 pl-4 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none font-sans"
                />
                <Search size={14} className="absolute right-3.5 top-3.5 text-slate-400" />
              </div>
            )}
          </div>

          {/* LIST TABLES DYNAMIC OR BLANK */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            {sortedReceives.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <AlertTriangle className="mx-auto mb-3 opacity-30 text-slate-500" size={54} />
                <p className="text-sm font-bold">هیچ رکورد دریافتی یا چک تضمینی واجد شرایط فیلتر یافت نشد.</p>
                <p className="text-xs text-slate-400 mt-1">تراکنش ثبت کنید یا پارامترهای بالا را تعدیل نمایید.</p>
              </div>
            ) : receiveTab === 'all' ? (
              
              /* --- ALL RECEIVES TABLE --- */
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-xs font-bold">
                      <th className="p-4">کد مرجع</th>
                      <th className="p-4">تاریخ وثوق</th>
                      <th className="p-4">طرف حساب</th>
                      <th className="p-4">نوع</th>
                      <th className="p-4">پیوست</th>
                      <th className="p-4">فاکتورها</th>
                      <th className="p-4">بانک / مشخصه</th>
                      <th className="p-4 text-left">مبلغ دریافت (ریال)</th>
                      <th className="p-4 text-center text-rose-500">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 font-sans">
                    {sortedReceives.map(r => {
                      const person = persons.find(p => p.id === r.personId);
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/50 transition">
                          <td className="p-4 font-mono text-xs text-slate-700 font-bold">{r.code}</td>
                          <td className="p-4 font-mono text-xs">{r.date}</td>
                          <td className="p-4 font-bold text-slate-800">{person?.name || '-'}</td>
                          <td className="p-4 text-xs font-bold">
                            {r.type === 'چک' ? (
                              <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">چک</span>
                            ) : (
                              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">نقدی</span>
                            )}
                          </td>
                          <td className="p-4">
                            {r.pic ? (
                              <button 
                                onClick={() => setSelectedImage(r.pic!)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                                title="مشاهده تصویر سند"
                              >
                                <ImageIcon size={13} />
                              </button>
                            ) : (
                              <span className="text-slate-350 text-xs italic">-</span>
                            )}
                          </td>
                          <td className="p-4 text-xs">
                            {r.invoiceIds && r.invoiceIds.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {r.invoiceIds.map(id => {
                                  const inv = invoices.find(i => i.id === id);
                                  return (
                                    <span key={id} className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                      #{inv?.invoiceNumber || 'نامعلوم'}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-slate-350 italic text-[11px]">آزاد / علی‌الحساب</span>
                            )}
                          </td>
                          <td className="p-4 text-xs">
                            {r.type === 'چک' ? (
                              <span className="font-bold text-slate-700">بانک {r.bank} ({r.checkSerial})</span>
                            ) : (
                              <span className="text-slate-400">واریز باجه صندوق</span>
                            )}
                          </td>
                          <td className="p-4 text-left font-black font-mono text-xs text-emerald-600">
                            {r.amount.toLocaleString()} ریال
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleDeleteReceive(r.id)}
                              className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              
              /* --- DEDICATED CHEQUES SECTION --- */
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead>
                    <tr className="bg-indigo-50/50 border-b border-indigo-100 text-indigo-900 text-xs font-black">
                      <th className="p-4">شناسه صیاد</th>
                      <th className="p-4">شماره سریال</th>
                      <th className="p-4">سررسید چک</th>
                      <th className="p-4">طرف حساب</th>
                      <th className="p-4">بانک</th>
                      <th className="p-4 font-sans text-[11px]">صاحب حساب اصلی / صادرکننده</th>
                      <th className="p-4 text-left">مبلغ سند (ریال)</th>
                      <th className="p-4 text-center">وضعیت صحت سنجی</th>
                      <th className="p-4 text-center">تغییر وضعیت چک</th>
                      <th className="p-4 text-center text-rose-500">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 font-sans">
                    {sortedReceives.map(c => {
                      const person = persons.find(p => p.id === c.personId);
                      
                      // Status colors
                      let statusBadge = '';
                      if (c.status === 'پاس شده') statusBadge = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                      else if (c.status === 'موعد نرسیده') statusBadge = 'bg-amber-100 text-amber-800 border-amber-200';
                      else if (c.status === 'برگشت') statusBadge = 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse';

                      // Inquiry colors
                      let inquiryBadge = 'text-slate-500 bg-slate-100';
                      if (c.inquiryStatus?.includes('سفید')) inquiryBadge = 'text-emerald-700 bg-emerald-50 border border-emerald-100';
                      else if (c.inquiryStatus?.includes('زرد')) inquiryBadge = 'text-amber-700 bg-amber-50 border border-amber-100';
                      else if (c.inquiryStatus?.includes('قرمز')) inquiryBadge = 'text-rose-700 bg-rose-50 border border-rose-100';

                      return (
                        <tr key={c.id} className="hover:bg-indigo-50/10 transition">
                          <td className="p-4 font-mono text-xs text-indigo-950 font-bold whitespace-nowrap">
                            {c.checkId || 'فاقد کلاسه صیادی'}
                          </td>
                          <td className="p-4 font-mono text-xs">{c.checkSerial} {c.checkSeries && <span className="text-slate-400 font-sans">({c.checkSeries})</span>}</td>
                          <td className="p-4 font-mono text-xs text-slate-900 font-black">{c.dueDate}</td>
                          <td className="p-4 font-bold text-slate-805 truncate max-w-[120px]">{person?.name || '-'}</td>
                          <td className="p-4 text-xs font-bold text-indigo-700">
                             بانک {c.bank}
                          </td>
                          <td className="p-4 text-xs text-slate-500 font-medium">{c.accountOwner || '-'}</td>
                          <td className="p-4 text-left font-black font-mono text-xs text-indigo-700 whitespace-nowrap">
                            {c.amount.toLocaleString()} ریال
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${inquiryBadge}`}>
                              {c.inquiryStatus || 'استعلام نشده'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            {/* Fast status switcher toggle buttons */}
                            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                              <button
                                onClick={() => handleUpdateCheckStatus(c, 'پاس شده')}
                                className={`px-2 py-1 rounded-md text-[9px] font-bold transition cursor-pointer ${c.status === 'پاس شده' ? 'bg-white shadow text-emerald-600' : 'text-slate-500 hover:text-slate-800'}`}
                                title="وصول چک"
                              >
                                وصول دفتری
                              </button>
                              <button
                                onClick={() => handleUpdateCheckStatus(c, 'موعد نرسیده')}
                                className={`px-2 py-1 rounded-md text-[9px] font-bold transition cursor-pointer ${c.status === 'موعد نرسیده' ? 'bg-white shadow text-amber-600' : 'text-slate-500 hover:text-slate-800'}`}
                                title="در جریان وصول"
                              >
                                معوق
                              </button>
                              <button
                                onClick={() => handleUpdateCheckStatus(c, 'برگشت')}
                                className={`px-2 py-1 rounded-md text-[9px] font-bold transition cursor-pointer ${c.status === 'برگشت' ? 'bg-white shadow text-rose-600' : 'text-slate-500 hover:text-slate-800'}`}
                                title="برگشت زدن چک"
                              >
                                واخواست (برگشت)
                              </button>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleDeleteReceive(c.id)}
                              className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition"
                            >
                              <Trash2 size={13} />
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
        </div>
      )}

      {/* --- GENERAL TRANSACTION LISTS (PAYMENT, EXPENSE, WASTE) - UNTOUCHED, SECURING BACKWARD STABILITY --- */}
      {subView.endsWith('-list') && subView !== 'receive-list' && (
        <div className="bg-white rounded-2xl border border-slate-50 overflow-hidden shadow-sm">
          {filteredGeneralList.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-sans">
              <AlertTriangle className="mx-auto mb-2 opacity-30 text-slate-500" size={48} />
              <p className="text-sm">سند یا اطلاعاتی در این بخش یافت نشد.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-xs font-bold">
                    <th className="p-4">کد مرجع</th>
                    <th className="p-4">تاریخ تراکنش</th>
                    <th className="p-4">طرف حساب</th>
                    {subView === 'expense-list' && <th className="p-4">طبقه‌بندی هزینه</th>}
                    {subView === 'waste-list' && <th className="p-4">ماده منهدم شده</th>}
                    {subView === 'waste-list' && <th className="p-4">مقدار ضایع</th>}
                    <th className="p-4">شرح بابت</th>
                    <th className="p-4 text-left">مبلغ کل (ریال)</th>
                    <th className="p-4 text-center">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600 font-sans">
                  {filteredGeneralList.map(t => {
                    const person = persons.find(p => p.id === t.personId);
                    const item = items.find(i => i.id === t.itemId);
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/50 transition opacity-90">
                        <td className="p-4 font-mono text-xs text-slate-700 font-bold">{t.code}</td>
                        <td className="p-4 font-mono text-xs">{t.date}</td>
                        <td className="p-4 font-bold text-slate-800">{person?.name || '-'}</td>
                        {subView === 'expense-list' && (
                          <td className="p-4 font-bold text-xs text-rose-600 font-sans">{t.category}</td>
                        )}
                        {subView === 'waste-list' && (
                          <td className="p-4 font-bold text-slate-800">{item?.name || '-'}</td>
                        )}
                        {subView === 'waste-list' && (
                          <td className="p-4 font-mono text-xs">{t.quantity} {item?.unit}</td>
                        )}
                        <td className="p-4 text-xs text-slate-400 max-w-xs truncate">{t.description}</td>
                        <td className="p-4 text-left font-black font-mono text-xs text-rose-600">
                          {t.amount.toLocaleString()} ریال
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition"
                          >
                            <Trash2 size={13} />
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

      {/* --- GENERAL CREATION FORM (PAYMENT, EXPENSE, WASTE) - UNTOUCHED FOR GENERAL COMPATIBILITY --- */}
      {subView.endsWith('-new') && subView !== 'receive-new' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm max-w-2xl mx-auto">
          <form 
            onSubmit={(e) => {
              const type = subView.split('-')[0] as Transaction['type'];
              handleSave(e, type);
            }} 
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 block">تاریخ تراکنش مالی</label>
                <input
                  type="text"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-mono text-center focus:bg-white outline-none transition"
                />
              </div>

              {subView !== 'waste-new' ? (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 block">مبلغ مالی (ریال) <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="مثال: ۱۵۰۰۰۰۰"
                    className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-mono focus:bg-white outline-none transition"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 block">مقدار/تعداد ضایع شده <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="تعداد ماده خام تلف‌شده"
                    className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-mono focus:bg-white outline-none transition"
                  />
                </div>
              )}

              {subView.startsWith('payment') && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 block">
                    شخص پرداخت‌شونده (همکار/پرسنل) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={personId}
                    required
                    onChange={(e) => setPersonId(e.target.value)}
                    className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2.5 text-xs text-slate-705 outline-none focus:bg-white transition"
                  >
                    <option value="">انتخاب یک شخص...</option>
                    {persons.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                    ))}
                  </select>
                </div>
              )}

              {subView.startsWith('expense') && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 block">طبقه‌بندی سرفصل هزینه</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2.5 text-xs text-slate-705 outline-none focus:bg-white transition"
                  >
                    <option value="">سایر هزینه‌های اداری تشکیلاتی</option>
                    <option value="هزینه حقوق و دستمزد کارکنان">هزینه حقوق و دستمزد کارکنان</option>
                    <option value="کرایه حمل و ترابری کالاها">کرایه حمل و ترابری کالاها</option>
                    <option value="ملزومات اداری و دفتری">ملزومات اداری و دفتری</option>
                    <option value="هزینه تبلیغات و بازاریابی">هزینه تبلیغات و بازاریابی</option>
                    <option value="اجاره‌بهای سالن و دفتر شرکت">اجاره‌بهای سالن و دفتر شرکت</option>
                  </select>
                </div>
              )}

              {subView.startsWith('waste') && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 block">کالا یا ماده اولیه تباه شده <span className="text-rose-500">*</span></label>
                  <select
                    value={itemId}
                    required
                    onChange={(e) => setItemId(e.target.value)}
                    className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2.5 text-xs text-slate-705 outline-none focus:bg-white transition"
                  >
                    <option value="">کالا را انتخاب کنید...</option>
                    {items.map(i => (
                      <option key={i.id} value={i.id}>{i.name} (موجودی: {i.stock})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 block">توضیحات و شرح برگی</label>
              <textarea
                value={description}
                required
                onChange={(e) => setDescription(e.target.value)}
                placeholder="توضیح کافی پیرامون جزئیات تراکنش به عنوان شرح سند ثبت معین..."
                rows={3}
                className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:bg-white transition"
              />
            </div>

            <button
              type="submit"
              className="bg-slate-900 hover:bg-slate-950 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition shadow-md cursor-pointer"
            >
              ثبت نهایی سند پرداخت معین
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
