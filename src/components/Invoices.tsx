/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { dbService } from '../db';
import { Invoice, InvoiceItem, Item, Person, Transaction } from '../types';
import { Plus, Search, Trash2, Printer, FileText, CheckCircle2, ShoppingCart, User, PlusCircle } from 'lucide-react';

interface InvoicesProps {
  initialSubView: 'invoice-new' | 'invoice-list' | 'revenue-new' | 'revenue-list';
}

export default function Invoices({ initialSubView }: InvoicesProps) {
  const [subView, setSubView] = useState(initialSubView);
  
  // Data State
  const [items, setItems] = useState<Item[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Invoice Form State
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('1405/03/05');
  const [personId, setPersonId] = useState('');
  const [invoiceType, setInvoiceType] = useState<'sale' | 'purchase'>('sale');
  const [selectedItems, setSelectedItems] = useState<InvoiceItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(9); // 9% base vat
  const [description, setDescription] = useState('');

  // Item selector helpers
  const [currentItemId, setCurrentItemId] = useState('');
  const [currentQty, setCurrentQty] = useState<number>(1);
  const [currentPrice, setCurrentPrice] = useState<number>(0);

  // Revenue Form State
  const [revDate, setRevDate] = useState('1405/03/05');
  const [revAmount, setRevAmount] = useState<number | ''>('');
  const [revPersonId, setRevPersonId] = useState('');
  const [revCategory, setRevCategory] = useState('درآمد خدمات و تشریفات');
  const [revDesc, setRevDesc] = useState('');

  // UI state
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    setSubView(initialSubView);
    loadData();
    // Auto generate invoice number
    setInvoiceNumber(`INV-1405-${Math.floor(Math.random() * 90000) + 10000}`);
  }, [initialSubView]);

  const loadData = () => {
    setItems(dbService.getItems());
    setPersons(dbService.getPersons());
    setInvoices(dbService.getInvoices());
    setTransactions(dbService.getTransactions());
  };

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Item addition to local invoice payload
  const handleAddItemToInvoice = () => {
    if (!currentItemId) return;
    const itemObj = items.find(i => i.id === currentItemId);
    if (!itemObj) return;

    // Check if item already exists in selectedItems
    const existsIndex = selectedItems.findIndex(i => i.itemId === currentItemId);
    const resolvedPrice = currentPrice || (invoiceType === 'sale' ? itemObj.price : itemObj.cost);

    if (existsIndex >= 0) {
      const copy = [...selectedItems];
      copy[existsIndex].quantity += currentQty;
      copy[existsIndex].total = copy[existsIndex].quantity * copy[existsIndex].price;
      setSelectedItems(copy);
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          itemId: currentItemId,
          quantity: currentQty,
          price: resolvedPrice,
          total: currentQty * resolvedPrice
        }
      ]);
    }

    // Reset simple selector fields
    setCurrentItemId('');
    setCurrentQty(1);
    setCurrentPrice(0);
  };

  const handleRemoveInvoiceItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  // Math totals
  const subtotal = selectedItems.reduce((sum, item) => sum + item.total, 0);
  const calculatedTax = Math.round((subtotal - discount) * (taxRate / 100));
  const finalInvoiceTotal = Math.max(0, subtotal - discount + calculatedTax);

  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personId || selectedItems.length === 0) {
      alert('باید طرف حساب و حداقل یک کالا انتخاب شود.');
      return;
    }

    const newInvoice: Invoice = {
      id: `inv_${Date.now()}`,
      invoiceNumber,
      date: invoiceDate,
      personId,
      type: invoiceType,
      items: selectedItems,
      discount,
      tax: calculatedTax,
      total: finalInvoiceTotal,
      description: description.trim() || `ثبت فاکتور رسمی ${invoiceType === 'sale' ? 'فروش' : 'خرید'} به شماره ${invoiceNumber}`,
      createdAt: new Date().toISOString()
    };

    // 1. Save invoice
    dbService.saveInvoice(newInvoice);

    // 2. Adjust inventory levels & create corresponding cash logs implicitly
    selectedItems.forEach(lineItem => {
      const itm = items.find(i => i.id === lineItem.itemId);
      if (itm) {
        const delta = invoiceType === 'sale' ? -lineItem.quantity : lineItem.quantity;
        dbService.saveItem({
          ...itm,
          stock: Math.max(0, itm.stock + delta)
        });
      }
    });

    // 3. Keep in transaction records
    dbService.saveTransaction({
      id: `tr_inv_${Date.now()}`,
      code: `TR-${invoiceNumber}`,
      date: invoiceDate,
      type: invoiceType === 'sale' ? 'revenue' : 'expense',
      category: invoiceType === 'sale' ? 'فروش کالا' : 'خرید مواد اولیه',
      amount: finalInvoiceTotal,
      personId,
      description: `تسویه فاکتور شماره ${invoiceNumber} غیابی`,
      createdAt: new Date().toISOString()
    });

    showNotice(`فاکتور ${invoiceType === 'sale' ? 'فروش' : 'خرید'} با موفقیت صادر شد و انبار بروزرسانی گردید.`);
    
    // Reset Form
    setSelectedItems([]);
    setDiscount(0);
    setDescription('');
    setInvoiceNumber(`INV-1405-${Math.floor(Math.random() * 90000) + 10000}`);
    loadData();
    setSubView('invoice-list');
  };

  const handleSaveRevenue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revAmount || Number(revAmount) <= 0) return;

    const newRev: Transaction = {
      id: `tr_rev_${Date.now()}`,
      code: `REV-${Math.floor(Math.random() * 9000) + 1000}`,
      date: revDate,
      type: 'revenue',
      category: revCategory,
      amount: Number(revAmount),
      personId: revPersonId || undefined,
      description: revDesc.trim() || `ثبت درآمد متفرقه بابت ${revCategory}`,
      createdAt: new Date().toISOString()
    };

    dbService.saveTransaction(newRev);
    showNotice('سند درآمد جدید با موفقیت در سیستم ثبت گردید.');
    setRevAmount('');
    setRevDesc('');
    loadData();
    setSubView('revenue-list');
  };

  const handleDeleteInvoice = (id: string) => {
    if (confirm('آیا از حذف این فاکتور مطمئن هستید؟ توجه: موجودی انبار بازگردانده نخواهد شد.')) {
      dbService.deleteInvoice(id);
      loadData();
      showNotice('فاکتور انتخاب شده حذف شد');
    }
  };

  const handleDeleteTransaction = (id: string) => {
    if (confirm('آیا از حذف این تراکنش درآمد مطمئن هستید؟')) {
      dbService.deleteTransaction(id);
      loadData();
      showNotice('درآمد ثبت شده از پایگاه داده حذف گردید');
    }
  };

  const formatPrice = (p: number) => p.toLocaleString() + ' ریال';

  return (
    <div className="space-y-6 text-right animate-fade-in" dir="rtl">
      {/* Notifications */}
      {notification && (
        <div className="fixed top-4 left-4 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl z-50 text-sm flex items-center gap-2">
          <CheckCircle2 size={18} />
          {notification}
        </div>
      )}

      {/* Ribbon Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">مدیریت بخش فروش و درآمدها</h2>
          <p className="text-slate-400 text-xs mt-1">صداقت اطلاعات ستون اصلی حسابداری پایدار در شادی آوران</p>
        </div>
        <div className="mt-3 md:mt-0 flex flex-wrap gap-1.5">
          <button 
            onClick={() => setSubView('invoice-new')}
            className={`px-3 py-1.5 rounded-xl text-xs transition duration-240 ${
              subView === 'invoice-new' ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            فاکتور جدید +
          </button>
          <button 
            onClick={() => setSubView('invoice-list')}
            className={`px-3 py-1.5 rounded-xl text-xs transition duration-240 ${
              subView === 'invoice-list' ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            دفتر فاکتور ها
          </button>
          <button 
            onClick={() => setSubView('revenue-new')}
            className={`px-3 py-1.5 rounded-xl text-xs transition duration-240 ${
              subView === 'revenue-new' ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            درآمد جدید +
          </button>
          <button 
            onClick={() => setSubView('revenue-list')}
            className={`px-3 py-1.5 rounded-xl text-xs transition duration-240 ${
              subView === 'revenue-list' ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            لیست درآمد ها
          </button>
        </div>
      </div>

      {subView === 'invoice-new' && (
        /* Invoice Entry */
        <form onSubmit={handleSaveInvoice} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm lg:col-span-2 space-y-6">
            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-50 pb-2">ثبت خطوط خرید / فروش کالا</h3>

            {/* Quick selectors */}
            <div className="bg-slate-50 p-4 rounded-xl space-y-3">
              <span className="text-xs font-semibold text-slate-500 block">افزودن کالا به اقلام فاکتور</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  value={currentItemId}
                  onChange={(e) => {
                    setCurrentItemId(e.target.value);
                    const itm = items.find(i => i.id === e.target.value);
                    if (itm) setCurrentPrice(invoiceType === 'sale' ? itm.price : itm.cost);
                  }}
                  className="bg-white border-0 rounded-xl px-4 py-2.5 text-xs text-slate-700"
                >
                  <option value="">انتخاب یک کالا...</option>
                  {items.map(i => (
                    <option key={i.id} value={i.id}>{i.name} (موجودی: {i.stock})</option>
                  ))}
                </select>

                <input
                  type="number"
                  min="1"
                  value={currentQty}
                  onChange={(e) => setCurrentQty(Math.max(1, Number(e.target.value)))}
                  placeholder="تعداد"
                  className="bg-white border-0 rounded-xl px-4 py-2.5 text-xs text-slate-700 font-mono"
                />

                <input
                  type="number"
                  min="0"
                  value={currentPrice || ''}
                  onChange={(e) => setCurrentPrice(Number(e.target.value))}
                  placeholder="قیمت توافقی واحد (ریال)"
                  className="bg-white border-0 rounded-xl px-4 py-2.5 text-xs text-slate-700 font-mono"
                />
              </div>
              <button
                type="button"
                onClick={handleAddItemToInvoice}
                className="w-full bg-slate-900 text-white rounded-xl py-2 text-xs font-bold hover:bg-slate-800 transition"
              >
                + درج این قلم کالا در جدول فاکتور
              </button>
            </div>

            {/* Selected items sheet */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100 font-bold pb-2">
                    <th className="pb-2">عنوان کالا</th>
                    <th className="pb-2">تعداد</th>
                    <th className="pb-2">قیمت واحد</th>
                    <th className="pb-2 text-left">مجموع خط</th>
                    <th className="pb-2 text-center">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-600 font-sans">
                  {selectedItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400">
                        لیست اقلام خالی است. ابتدا یک کالا از کادر بالای صفحه اضافه کنید.
                      </td>
                    </tr>
                  ) : (
                    selectedItems.map((line, index) => {
                      const itemObj = items.find(i => i.id === line.itemId);
                      return (
                        <tr key={index}>
                          <td className="py-2.5 font-medium text-slate-700">{itemObj?.name || 'کالای نامشخص'}</td>
                          <td className="py-2.5 font-mono">{line.quantity}</td>
                          <td className="py-2.5 font-mono">{line.price.toLocaleString()}</td>
                          <td className="py-2.5 text-left font-mono font-semibold">{line.total.toLocaleString()}</td>
                          <td className="py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveInvoiceItem(index)}
                              className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition"
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

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 block">شرح فاکتور</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="توضیحات تکمیلی پیرامون فاکتور اعم از بیعانه، موعد تحویل و غیره"
                rows={2}
                className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2.5 text-xs text-slate-700"
              />
            </div>
          </div>

          {/* Side Checkout info */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-50 pb-2">تنظیمات نهایی و صدور فاکتور</h3>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 block">شماره فاکتور</label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 block">تاریخ ثبت فاکتور</label>
              <input
                type="text"
                required
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-indigo-500 font-mono text-center"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 block">نوع تراکنش</label>
              <select
                value={invoiceType}
                onChange={(e) => setInvoiceType(e.target.value as 'sale' | 'purchase')}
                className="w-full bg-slate-50 border-0 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-700"
              >
                <option value="sale">فروش کالا (درآمدزا)</option>
                <option value="purchase">خرید کالا (هزینه‌زا)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 block">انتخاب خریدار / فروشنده <span className="text-rose-500">*</span></label>
              <select
                value={personId}
                required
                onChange={(e) => setPersonId(e.target.value)}
                className="w-full bg-slate-50 border-0 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-700"
              >
                <option value="">انتخاب یک شخص...</option>
                {persons.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 block">تخفیف نقدی فاکتور (ریال)</label>
              <input
                type="number"
                min="0"
                value={discount || ''}
                onChange={(e) => setDiscount(Number(e.target.value))}
                placeholder="۰"
                className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 block">نرخ مالیات بر ارزش افزوده (%)</label>
              <input
                type="number"
                min="0"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                placeholder="۹"
                className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>

            {/* Calculations Panel */}
            <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl space-y-2 text-xs font-sans">
              <div className="flex justify-between">
                <span>جمع کل اقلام:</span>
                <span className="font-mono">{subtotal.toLocaleString()} ریال</span>
              </div>
              <div className="flex justify-between">
                <span>تخفیف مالی:</span>
                <span className="font-mono text-rose-400">-{discount.toLocaleString()} ریال</span>
              </div>
              <div className="flex justify-between">
                <span>مالیات ارزش افزوده ({taxRate}%):</span>
                <span className="font-mono text-emerald-400">+{calculatedTax.toLocaleString()} ریال</span>
              </div>
              <div className="border-t border-white/10 pt-2 flex justify-between font-bold text-sm text-white">
                <span>مبلغ قابل پرداخت فاکتور:</span>
                <span className="font-mono text-emerald-300">{finalInvoiceTotal.toLocaleString()} ریال</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition duration-300"
            >
              ثبت نهایی و تایید فاکتور انبار ✓
            </button>
          </div>
        </form>
      )}

      {subView === 'invoice-list' && (
        /* Invoices Register */
        <div className="bg-white rounded-2xl border border-slate-50 overflow-hidden shadow-sm">
          {invoices.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <FileText size={48} className="mx-auto mb-2 opacity-30 text-slate-500" />
              <p className="text-sm">هیچ فاکتوری در دیتابیس ثبت نشده است.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-xs font-bold">
                    <th className="p-4">شماره فاکتور</th>
                    <th className="p-4">تاریخ</th>
                    <th className="p-4">طرف حساب</th>
                    <th className="p-4">نوع</th>
                    <th className="p-4 text-left">مجموع فاکتور (ریال)</th>
                    <th className="p-4 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600 font-sans">
                  {invoices.map(inv => {
                    const person = persons.find(p => p.id === inv.personId);
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-4 font-mono text-xs">{inv.invoiceNumber}</td>
                        <td className="p-4 font-mono text-xs">{inv.date}</td>
                        <td className="p-4 font-medium text-slate-700">{person?.name || 'کد ناشناخته'}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.type === 'sale' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {inv.type === 'sale' ? 'فروش' : 'خرید'}
                          </span>
                        </td>
                        <td className="p-4 text-left font-bold font-mono text-slate-800">
                          {inv.total.toLocaleString()}
                        </td>
                        <td className="p-4">
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              className="p-1.5 hover:bg-slate-100 text-indigo-600 rounded-lg transition"
                              title="نمایش فاکتور"
                            >
                              <FileText size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteInvoice(inv.id)}
                              className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition"
                              title="حذف فاکتور"
                            >
                              <Trash2 size={16} />
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
      )}

      {subView === 'revenue-new' && (
        /* Revenue Custom Addition */
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm max-w-2xl mx-auto">
          <h3 className="font-bold text-slate-800 text-base mb-4 border-b border-rose-50 pb-2">ثبت درآمد متفرقه / خدمات شادی آوران</h3>
          <form onSubmit={handleSaveRevenue} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 block">تاریخ کسب درآمد</label>
                <input
                  type="text"
                  required
                  value={revDate}
                  onChange={(e) => setRevDate(e.target.value)}
                  placeholder="۱۴۰۵/۰۳/۰۵"
                  className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 font-mono text-center"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 block">مبلغ درآمد (ریال) <span className="text-rose-500">*</span></label>
                <input
                  type="number"
                  required
                  min="1"
                  value={revAmount}
                  onChange={(e) => setRevAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="مثال: ۱۵۰۰۰۰۰"
                  className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 block">دسته درآمد</label>
                <select
                  value={revCategory}
                  onChange={(e) => setRevCategory(e.target.value)}
                  className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2.5 text-xs text-slate-700"
                >
                  <option value="درآمد خدمات و تشریفات">درآمد خدمات و تشریفات جشن</option>
                  <option value="فروش بادکنک‌آرایی">فروش بادکنک‌آرایی سفارشی</option>
                  <option value="درآمد کارمزد واسطه‌گری">درآمد کارمزد واسطه‌گری تالار</option>
                  <option value="سایر درآمدهای غیرعملیاتی">سایر درآمدهای غیرعملیاتی</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 block">پرداخت‌کننده (شخص)</label>
                <select
                  value={revPersonId}
                  onChange={(e) => setRevPersonId(e.target.value)}
                  className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2.5 text-xs text-slate-700"
                >
                  <option value="">انتخاب شخص (اختیاری)</option>
                  {persons.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 block">شرح یا توضیحات درآمد</label>
              <textarea
                value={revDesc}
                onChange={(e) => setRevDesc(e.target.value)}
                placeholder="جزئیات واگذاری کارخدماتی یا فاکتور نقدی خدمات متمایز"
                rows={3}
                className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 text-slate-700"
              />
            </div>

            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition shadow-md"
            >
              ثبت درآمد جدید
            </button>
          </form>
        </div>
      )}

      {subView === 'revenue-list' && (
        /* Other revenues records */
        <div className="bg-white rounded-2xl border border-slate-50 overflow-hidden shadow-sm">
          {transactions.filter(t => t.type === 'revenue').length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <PlusCircle size={48} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">هیچ سند مالی درآمدی در سیستم ثبت نشده است.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-xs font-bold">
                    <th className="p-4">کد ارجاع</th>
                    <th className="p-4">تاریخ</th>
                    <th className="p-4">دسته درآمد</th>
                    <th className="p-4 font-mono font-medium">مشتری</th>
                    <th className="p-4">تشریح سند</th>
                    <th className="p-4 text-left">مبلغ (ریال)</th>
                    <th className="p-4 text-center">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {transactions
                    .filter(t => t.type === 'revenue')
                    .map(tr => {
                      const person = persons.find(p => p.id === tr.personId);
                      return (
                        <tr key={tr.id} className="hover:bg-slate-50/50 transition">
                          <td className="p-4 font-mono text-xs text-indigo-600">{tr.code}</td>
                          <td className="p-4 font-mono text-xs">{tr.date}</td>
                          <td className="p-4 font-semibold text-xs text-slate-500">{tr.category}</td>
                          <td className="p-4 font-medium text-slate-700">{person?.name || '-'}</td>
                          <td className="p-4 text-xs text-slate-400">{tr.description}</td>
                          <td className="p-4 text-left font-bold font-mono text-emerald-600">
                            {tr.amount.toLocaleString()}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleDeleteTransaction(tr.id)}
                              className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition"
                            >
                              <Trash2 size={15} />
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

      {/* traditional print invoice Modal component */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 max-w-3xl w-full border border-slate-100 shadow-2xl space-y-6">
            <div className="border-b border-slate-100 pb-4 flex justify-between items-center bg-slate-50 -m-6 p-6 rounded-t-3xl">
              <div className="text-right">
                <span className="font-bold text-lg text-slate-800">حسابداری و تالار شادی آوران</span>
                <span className="text-xs text-slate-400 block">فاکتور رسمی تجاری</span>
              </div>
              <div className="text-left font-mono text-xs text-slate-600 space-y-0.5">
                <div>شماره: {selectedInvoice.invoiceNumber}</div>
                <div>تاریخ: {selectedInvoice.date}</div>
              </div>
            </div>

            {/* Customer specs */}
            <div className="bg-indigo-50/40 p-4 rounded-2xl border border-indigo-100/50 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="text-right space-y-1">
                <span className="text-slate-400 block font-semibold">مشخصات طرف معامله:</span>
                <span className="font-bold text-slate-800">
                  {persons.find(p => p.id === selectedInvoice.personId)?.name || 'ناشناخته'}
                </span>
                <span className="text-slate-500 block">
                  تلفن: {persons.find(p => p.id === selectedInvoice.personId)?.phone || 'ثبت‌نشده'}
                </span>
              </div>
              <div className="text-right sm:text-left space-y-1 sm:border-r sm:border-slate-200/60 sm:pr-4">
                <span className="text-slate-400 block font-semibold">شرح آدرس:</span>
                <span className="text-slate-600">
                  {persons.find(p => p.id === selectedInvoice.personId)?.address || 'آدرس ثبت‌نشده'}
                </span>
              </div>
            </div>

            {/* Table */}
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="p-3">ردیف</th>
                  <th className="p-3">عنوان کالا</th>
                  <th className="p-3">تعداد</th>
                  <th className="p-3 text-left">مبلغ واحد</th>
                  <th className="p-3 text-left">مجموع کل (ریال)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 font-sans">
                {selectedInvoice.items.map((itm, i) => {
                  const itmObj = items.find(it => it.id === itm.itemId);
                  return (
                    <tr key={i}>
                      <td className="p-3 font-mono">{i + 1}</td>
                      <td className="p-3 font-medium text-slate-800">{itmObj?.name || 'کالا'}</td>
                      <td className="p-3 font-mono">{itm.quantity}</td>
                      <td className="p-3 text-left font-mono">{itm.price.toLocaleString()}</td>
                      <td className="p-3 text-left font-bold font-mono">{itm.total.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Bottom Total summary */}
            <div className="flex justify-end pt-4 border-t border-slate-150">
              <div className="w-64 space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>تخفیف:</span>
                  <span className="font-mono">{selectedInvoice.discount.toLocaleString()} ریال</span>
                </div>
                <div className="flex justify-between text-slate-500 font-semibold">
                  <span>مالیات ارزش افزوده:</span>
                  <span className="font-mono">+{selectedInvoice.tax.toLocaleString()} ریال</span>
                </div>
                <div className="flex justify-between text-sm text-slate-800 font-bold border-t border-slate-200 pt-2">
                  <span>کل فاکتور نهایی:</span>
                  <span className="font-mono text-emerald-600">{selectedInvoice.total.toLocaleString()} ریال</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] text-slate-400 font-sans border-t border-slate-100 pt-4">
              <span>امضای دفتر شادی آوران</span>
              <span>مهر حسابداری</span>
              <span>امضا و تایید تحویل‌گیرنده</span>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium px-4 py-2 rounded-xl text-xs transition duration-300"
              >
                <Printer size={14} /> چاپ فاکتور
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium px-4 py-2 rounded-xl text-xs transition duration-300"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
