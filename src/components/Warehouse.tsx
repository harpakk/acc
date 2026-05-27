/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { dbService } from '../db';
import { WarehouseVoucher, Item, WarehouseItem } from '../types';
import { 
  Plus, 
  Search, 
  Trash2, 
  CheckCircle2, 
  Archive, 
  RefreshCw, 
  Layers, 
  AlertTriangle,
  ClipboardCheck
} from 'lucide-react';

interface WarehouseProps {
  initialSubView: 'voucher-new' | 'voucher-list' | 'stock-status' | 'all-warehouses' | 'audit';
}

export default function Warehouse({ initialSubView }: WarehouseProps) {
  const [subView, setSubView] = useState(initialSubView);

  // Db State
  const [items, setItems] = useState<Item[]>([]);
  const [vouchers, setVouchers] = useState<WarehouseVoucher[]>([]);

  // Voucher Form State
  const [voucherNumber, setVoucherNumber] = useState('');
  const [date, setDate] = useState('1405/03/05');
  const [type, setType] = useState<'receipt' | 'dispatch'>('receipt'); // رسید (receipt) یا حواله (dispatch)
  const [selectedItems, setSelectedItems] = useState<WarehouseItem[]>([]);
  const [description, setDescription] = useState('');

  // Selector helpers
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedQty, setSelectedQty] = useState<number>(1);

  // Audit Sheet State
  const [auditQuantities, setAuditQuantities] = useState<{ [itemId: string]: number }>({});

  // Notices
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    setSubView(initialSubView);
    loadData();
    resetForm();
  }, [initialSubView]);

  const loadData = () => {
    const loadedItems = dbService.getItems();
    setItems(loadedItems);
    setVouchers(dbService.getWarehouseVouchers());

    // Initialize audit quantities with current DB values
    const auditObj: { [itemId: string]: number } = {};
    loadedItems.forEach(i => {
      auditObj[i.id] = i.stock;
    });
    setAuditQuantities(auditObj);
  };

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const resetForm = () => {
    setVoucherNumber(`WHV-1405-${Math.floor(Math.random() * 9000) + 1000}`);
    setDate('1405/03/05');
    setType('receipt');
    setSelectedItems([]);
    setDescription('');
    setSelectedItemId('');
    setSelectedQty(1);
  };

  const handleAddItemToVoucher = () => {
    if (!selectedItemId || selectedQty <= 0) return;

    const existsIdx = selectedItems.findIndex(i => i.itemId === selectedItemId);
    if (existsIdx >= 0) {
      const copy = [...selectedItems];
      copy[existsIdx].quantity += selectedQty;
      setSelectedItems(copy);
    } else {
      setSelectedItems([...selectedItems, { itemId: selectedItemId, quantity: selectedQty }]);
    }

    setSelectedItemId('');
    setSelectedQty(1);
  };

  const handleRemoveVoucherItem = (idx: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== idx));
  };

  const handleSaveVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      alert('باید حداقل یک قلم کالا در حواله درج گردد.');
      return;
    }

    const newVoucher: WarehouseVoucher = {
      id: `whv_${Date.now()}`,
      voucherNumber,
      date,
      type,
      items: selectedItems,
      description: description.trim() || `سند ${type === 'receipt' ? 'رسید ورود' : 'حواله خروج'} انبار کالا`,
      createdAt: new Date().toISOString()
    };

    // 1. Save voucher record
    dbService.saveWarehouseVoucher(newVoucher);

    // 2. Adjust physical item counts in the database
    selectedItems.forEach(vi => {
      const itObj = items.find(i => i.id === vi.itemId);
      if (itObj) {
        const delta = type === 'receipt' ? vi.quantity : -vi.quantity;
        dbService.saveItem({
          ...itObj,
          stock: Math.max(0, itObj.stock + delta)
        });
      }
    });

    showNotice(`حواله انبار با موفقیت صادر شد و کنترل موجودی انطباق یافت.`);
    resetForm();
    loadData();
    setSubView('voucher-list');
  };

  // Perform Physical Audit Sync
  const handleSaveAudit = () => {
    items.forEach(itm => {
      const physicalCount = auditQuantities[itm.id];
      if (physicalCount !== undefined && physicalCount !== itm.stock) {
        // Adjust stock in db
        dbService.saveItem({
          ...itm,
          stock: physicalCount
        });

        // Save a virtual adjustments log as a transaction waste/revenue
        const diff = physicalCount - itm.stock;
        dbService.saveTransaction({
          id: `tr_audit_adjust_${Date.now()}_${itm.id}`,
          code: `AUD-${Math.floor(Math.random() * 9000) + 1000}`,
          date: '1405/03/05',
          type: diff < 0 ? 'waste' : 'revenue',
          category: diff < 0 ? 'کسری انبارگردانی' : 'سرریز انبارگردانی',
          amount: Math.abs(diff) * itm.cost,
          itemId: itm.id,
          quantity: Math.abs(diff),
          description: `کشف مغایرت انبارگردانی برای کالای ${itm.name}. تنظیم موجودی از ${itm.stock} به ${physicalCount}`,
          createdAt: new Date().toISOString()
        });
      }
    });

    showNotice('نتایج انبارگردانی فیزیکی اعمال شد و مغایرت‌ها برطرف شد ✓');
    loadData();
    setSubView('stock-status');
  };

  const handleAuditQtyChange = (itemId: string, val: string) => {
    const qty = val === '' ? 0 : Number(val);
    setAuditQuantities({
      ...auditQuantities,
      [itemId]: qty
    });
  };

  const handleDeleteVoucher = (id: string) => {
    if (confirm('آیا از حذف این سند انبارداری مطمئن هستید؟ توجه: موجودی کالاها اصلاح معکوس نخواهد شد.')) {
      dbService.deleteWarehouseVoucher(id);
      loadData();
      showNotice('حواله با موفقیت از سیستم حذف گردید.');
    }
  };

  return (
    <div className="space-y-6 text-right animate-fade-in text-xs text-slate-800" dir="rtl">
      {/* Messages */}
      {notification && (
        <div className="fixed top-4 left-4 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl z-50 text-xs flex items-center gap-2">
          <CheckCircle2 size={18} />
          {notification}
        </div>
      )}

      {/* Ribbon title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-2xl font-bold">سامانه انبارداری و انبارگردانی شادی آوران</h2>
          <p className="text-slate-400 text-xs mt-1">مدیریت ورود و خروج مواد اولیه، انبارگردانی نوبتی و حواله جات</p>
        </div>
        <div className="mt-3 md:mt-0 flex flex-wrap gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
          <button 
            onClick={() => setSubView('voucher-new')}
            className={`px-3 py-1.5 rounded-lg text-xs transition ${subView === 'voucher-new' ? 'bg-white shadow text-slate-800 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
          >
            حواله جدید
          </button>
          <button 
            onClick={() => setSubView('voucher-list')}
            className={`px-3 py-1.5 rounded-lg text-xs transition ${subView === 'voucher-list' ? 'bg-white shadow text-slate-800 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
          >
            رسید و حواله های انبار
          </button>
          <button 
            onClick={() => setSubView('stock-status')}
            className={`px-3 py-1.5 rounded-lg text-xs transition ${subView === 'stock-status' ? 'bg-white shadow text-slate-800 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
          >
            موجودی کالا
          </button>
          <button 
            onClick={() => setSubView('all-warehouses')}
            className={`px-3 py-1.5 rounded-lg text-xs transition ${subView === 'all-warehouses' ? 'bg-white shadow text-slate-800 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
          >
            موجودی تمام انبار ها
          </button>
          <button 
            onClick={() => setSubView('audit')}
            className={`px-3 py-1.5 rounded-lg text-xs transition ${subView === 'audit' ? 'bg-white shadow text-slate-800 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
          >
            انبار گردانی فیزیکی
          </button>
        </div>
      </div>

      {subView === 'voucher-new' && (
        /* Issue new warehouse voucher */
        <form onSubmit={handleSaveVoucher} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm lg:col-span-2 space-y-6">
            <h3 className="font-bold text-slate-800 text-sm border-b pb-2">ثبت خطوط سند انبار (حواله / رسید مجزا)</h3>

            {/* ingredient adding portal */}
            <div className="bg-slate-50 p-4 rounded-xl space-y-3">
              <span className="text-xs font-semibold text-slate-500 block">انتخاب کالای ارسالی / دریافتی انبار</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="bg-white border-0 rounded-xl px-4 py-2.5 text-xs text-slate-700"
                >
                  <option value="">کالای مورد نظر...</option>
                  {items.map(itm => (
                    <option key={itm.id} value={itm.id}>{itm.name} (موجودی: {itm.stock})</option>
                  ))}
                </select>

                <input
                  type="number"
                  min="1"
                  value={selectedQty}
                  onChange={(e) => setSelectedQty(Math.max(1, Number(e.target.value)))}
                  placeholder="مقدار"
                  className="bg-white border-0 rounded-xl px-4 py-2.5 text-xs text-slate-700 font-mono"
                />
              </div>
              <button
                type="button"
                onClick={handleAddItemToVoucher}
                className="w-full bg-slate-900 text-white rounded-xl py-1.5 text-xs font-bold hover:bg-slate-800 transition"
              >
                + درج کالا در لیست خطوط حواله
              </button>
            </div>

            {/* Lists */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-150 font-bold pb-2">
                    <th className="pb-2">عنوان کالا</th>
                    <th className="pb-2">واحد</th>
                    <th className="pb-2 font-mono">تعداد تراکنش شده</th>
                    <th className="pb-2 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-600 font-sans">
                  {selectedItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-slate-400">
                        لیست اقلام حواله انباشته خالی است. ابتدا یک کالا از دریچه بالا اضافه بفرمایید.
                      </td>
                    </tr>
                  ) : (
                    selectedItems.map((line, index) => {
                      const itemObj = items.find(i => i.id === line.itemId);
                      return (
                        <tr key={index}>
                          <td className="py-2.5 font-semibold text-slate-700">{itemObj?.name || 'کالا'}</td>
                          <td className="py-2.5 text-slate-400">{itemObj?.unit}</td>
                          <td className="py-2.5 font-mono text-indigo-650">{line.quantity}</td>
                          <td className="py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveVoucherItem(index)}
                              className="text-rose-500 hover:bg-rose-50 p-1 rounded-lg transition"
                            >
                              حذف کالا
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
              <label className="text-xs font-semibold text-slate-500 block">شرح انبارداری</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="توضیحات لازم اعم از نام تحویل دهنده کالا یا راننده حمل..."
                rows={2}
                className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2 text-xs text-slate-700"
              />
            </div>
          </div>

          {/* Left panel specifications selection */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm border-b pb-2">پیکربندی هویت سند انبار</h3>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 block">شماره حواله / رسید</label>
              <input
                type="text"
                required
                value={voucherNumber}
                onChange={(e) => setVoucherNumber(e.target.value)}
                className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2 text-xs font-mono text-center"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 block">تاریخ سند</label>
              <input
                type="text"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2 text-xs font-mono text-center"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 block">نوع تراکنش انبارداری</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'receipt' | 'dispatch')}
                className="w-full bg-slate-50 border-0 rounded-xl px-3 py-2 text-xs text-slate-700 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="receipt">رسید انبار (ور ورود و بارگیری کالا)</option>
                <option value="dispatch">حواله انبار (خروج و تخلیه مواد)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition duration-300 shadow"
            >
              صدور نهایی برگ سند انبارداری ✓
            </button>
          </div>
        </form>
      )}

      {subView === 'voucher-list' && (
        /* Vouchers logging */
        <div className="bg-white rounded-2xl border border-slate-50 overflow-hidden shadow-sm">
          {vouchers.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Archive size={48} className="mx-auto mb-2 opacity-30 text-slate-500" />
              <p className="text-sm">سند انبارداری برای این کارتابل ثبت نشده است.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right p-4">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-bold text-xs">
                    <th className="p-4">شماره حواله / رسید</th>
                    <th className="p-4">تاریخ کارنامه</th>
                    <th className="p-4">نوع عملیات</th>
                    <th className="p-4 font-mono">اقلام و حجم کالا</th>
                    <th className="p-4">توضیحات و شرح واقعه</th>
                    <th className="p-4 text-center">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                  {vouchers.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50/40">
                      <td className="p-4 font-mono font-bold text-indigo-750">{v.voucherNumber}</td>
                      <td className="p-4 font-mono">{v.date}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          v.type === 'receipt' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {v.type === 'receipt' ? 'رسید ورود' : 'حواله خروج'}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-xs text-slate-500">
                        {v.items.length} کالا
                      </td>
                      <td className="p-4 text-xs text-slate-400 max-w-xs truncate">{v.description}</td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleDeleteVoucher(v.id)}
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg"
                        >
                          حذف سند
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {subView === 'stock-status' && (
        /* Present stock list with warning flags */
        <div className="bg-white rounded-2xl border border-slate-50 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-bold p-4">
                  <th className="p-4 text-center">رده کالا</th>
                  <th className="p-4">کد کالا</th>
                  <th className="p-4">عنوان کالا / ماده اولیه</th>
                  <th className="p-4">واحد شمارش</th>
                  <th className="p-4 text-left">موجودی مجاز انباشت</th>
                  <th className="p-4 text-left">سطح هشدار بحران</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 font-sans">
                {items.map(itm => (
                  <tr key={itm.id} className="hover:bg-slate-50/30">
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 text-[10px] rounded-lg font-bold ${
                        itm.code.startsWith('M-') ? 'bg-emerald-50 text-emerald-750' : 'bg-blue-50 text-blue-750'
                      }`}>
                        {itm.code.startsWith('M-') ? 'ماده اولیه' : 'کالای خروجی'}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-xs">{itm.code}</td>
                    <td className="p-4 font-semibold text-slate-800">{itm.name}</td>
                    <td className="p-4 text-slate-400">{itm.unit}</td>
                    <td className={`p-4 text-left font-mono font-bold text-sm ${itm.stock <= 20 ? 'text-rose-600 animate-pulse' : 'text-slate-800'}`}>
                      {itm.stock.toLocaleString()}
                    </td>
                    <td className="p-4 text-left">
                      {itm.stock <= 20 ? (
                        <span className="flex items-center gap-1 text-xs text-rose-500 font-bold">
                          <AlertTriangle size={12} />
                          رو به اتمام!
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-500 font-medium">ذخیره کافی</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subView === 'all-warehouses' && (
        /* Breakdown stock allocation across virtual and active zones */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Warehouse 1 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-150 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b pb-2">
              <Layers size={16} className="text-indigo-600" />
              انبار مرکزی شادی آوران (طرح الف)
            </h3>
            <p className="text-[10px] text-slate-450">محل قرارگیری آرد، حلب شکر و ملزومات کارگاه عمده</p>
            <div className="space-y-2 text-[10px]">
              {items.map(i => (
                <div key={i.id} className="flex justify-between border-b border-dashed pb-1.5 text-slate-650">
                  <span>{i.name}:</span>
                  <span className="font-mono font-semibold">{Math.ceil(i.stock * 0.7)} {i.unit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Warehouse 2 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-150 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b pb-2">
              <Layers size={16} className="text-amber-600" />
              انبار فرعی آشپزخانه و تالار (بخش ب)
            </h3>
            <p className="text-[10px] text-slate-450">محل تجمیع فوری مواد اولیه دپوی پخت کیک روزانه</p>
            <div className="space-y-2 text-[10px]">
              {items.map(i => (
                <div key={i.id} className="flex justify-between border-b border-dashed pb-1.5 text-slate-650">
                  <span>{i.name}:</span>
                  <span className="font-mono font-semibold">{Math.floor(i.stock * 0.2)} {i.unit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Warehouse 3 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-150 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b pb-2">
              <Layers size={16} className="text-emerald-600" />
              انبار مجازی سفارشات آماده توزیع
            </h3>
            <p className="text-[10px] text-slate-450">کیک قنادی فوندانت و ملزومات تم پستی مشتری</p>
            <div className="space-y-2 text-[10px]">
              {items.map(i => (
                <div key={i.id} className="flex justify-between border-b border-dashed pb-1.5 text-slate-650">
                  <span>{i.name}:</span>
                  <span className="font-mono font-semibold">{Math.floor(i.stock * 0.1)} {i.unit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {subView === 'audit' && (
        /* Inventory Auditing physical reconciling checklist */
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <ClipboardCheck size={18} className="text-emerald-600" />
              فرم جامع و سراسری انبارگردانی فیزیکی
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">آخرین دوره: مهرگان ۱۴۰۵</span>
          </div>
          <p className="text-slate-400 text-xs text-right">مقادیر شمارش شده فیزیکی را بدون فاصله در فیلد مربوط وارد کنید. مغایرت‌ها به صورت آنی محاسبه و به عنوان کسری یا انباشت اصلاح دیتابیسی می‌شوند.</p>

          <div className="overflow-x-auto text-[11px]">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-slate-50 border-b text-slate-700 font-bold">
                  <th className="p-3">عنوان کالا</th>
                  <th className="p-3">موجودی فعلی در سیستم</th>
                  <th className="p-3 text-left">موجودی شمارش‌شده فیزیکی</th>
                  <th className="p-3 text-left">تفاوت مغایرت انبار</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                {items.map(itm => {
                  const currentSystemVal = itm.stock;
                  const currentPhysicalVal = auditQuantities[itm.id] ?? currentSystemVal;
                  const diff = currentPhysicalVal - currentSystemVal;

                  return (
                    <tr key={itm.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold">{itm.name}</td>
                      <td className="p-3 font-mono text-slate-500">{currentSystemVal.toLocaleString()} {itm.unit}</td>
                      <td className="p-3 text-left">
                        <input
                          type="number"
                          value={currentPhysicalVal === undefined ? '' : currentPhysicalVal}
                          onChange={(e) => handleAuditQtyChange(itm.id, e.target.value)}
                          className="w-32 bg-slate-50 border-0 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-teal-500 text-left font-mono font-bold text-xs"
                        />
                      </td>
                      <td className={`p-3 text-left font-bold font-mono text-xs ${
                        diff < 0 ? 'text-rose-600' : diff > 0 ? 'text-emerald-600' : 'text-slate-400'
                      }`}>
                        {diff < 0 ? `کسری: ${Math.abs(diff)}` : diff > 0 ? `اضافی: +${diff}` : 'منطبق'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button
              onClick={handleSaveAudit}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2 rounded-xl text-xs shadow-md transition"
            >
              تایید مغایرت‌ها و ثبت نهایی اصلاح ترازبندی
            </button>
            <button
              onClick={loadData}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium px-4 py-2 rounded-xl text-xs transition"
            >
              بازنشانی مقادیر عددی
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
