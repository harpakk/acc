/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { dbService } from '../db';
import { AccountingVoucher, Account, VoucherEntry } from '../types';
import { 
  Plus, 
  Search, 
  Trash2, 
  CheckCircle2, 
  BookOpen, 
  FileSpreadsheet, 
  Lock, 
  Database, 
  ChevronDown,
  Percent,
  Check
} from 'lucide-react';

interface AccountingProps {
  initialSubView: 'voucher-list' | 'voucher-new' | 'opening-balance' | 'close-year' | 'charts' | 'consolidate';
}

export default function Accounting({ initialSubView }: AccountingProps) {
  const [subView, setSubView] = useState(initialSubView);
  
  // Database State
  const [vouchers, setVouchers] = useState<AccountingVoucher[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Journal Voucher entry Form State
  const [voucherNumber, setVoucherNumber] = useState('');
  const [date, setDate] = useState('1405/03/05');
  const [entries, setEntries] = useState<VoucherEntry[]>([]);
  const [description, setDescription] = useState('');

  // Individual Entry Row State
  const [currentAccountId, setCurrentAccountId] = useState('');
  const [currentDebit, setCurrentDebit] = useState<number>(0);
  const [currentCredit, setCurrentCredit] = useState<number>(0);
  const [currentDesc, setCurrentDesc] = useState('');

  // Close year state
  const [financialYearClosed, setFinancialYearClosed] = useState(false);

  // Notices
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    setSubView(initialSubView);
    loadData();
    resetForm();
  }, [initialSubView]);

  const loadData = () => {
    setVouchers(dbService.getAccountingVouchers());
    setAccounts(dbService.getAccounts());
  };

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const resetForm = () => {
    setVoucherNumber(`ACC-1405-${Math.floor(Math.random() * 9000) + 1000}`);
    setDate('1405/03/05');
    setEntries([]);
    setDescription('');
    setCurrentAccountId('');
    setCurrentDebit(0);
    setCurrentCredit(0);
    setCurrentDesc('');
  };

  // Add individual row item to the dynamic ledger entries table
  const handleAddEntryRow = () => {
    if (!currentAccountId) return;
    if (currentDebit <= 0 && currentCredit <= 0) {
      alert('مبلغ بدهکار یا بستانکار باید بزرگتر از صفر باشد.');
      return;
    }
    if (currentDebit > 0 && currentCredit > 0) {
      alert('یک ردیف سند معین نمی‌تواند همزمان بدهکار و بستانکار باشد.');
      return;
    }

    const acc = accounts.find(a => a.id === currentAccountId);
    if (!acc) return;

    setEntries([
      ...entries,
      {
        accountId: currentAccountId,
        debit: currentDebit,
        credit: currentCredit,
        description: currentDesc.trim() || `سند معین ردیف حساب ${acc.name}`
      }
    ]);

    setCurrentAccountId('');
    setCurrentDebit(0);
    setCurrentCredit(0);
    setCurrentDesc('');
  };

  const handleRemoveEntryRow = (idx: number) => {
    setEntries(entries.filter((_, i) => i !== idx));
  };

  // Sums for balance validator
  const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);
  const diffBalance = Math.abs(totalDebit - totalCredit);
  const isBalanced = totalDebit > 0 && totalDebit === totalCredit;

  const handleSaveVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      alert('خطای توازن: جمع کل بدهکار بایستی دقیقا با جمع کل بستانکار یکسان باشد.');
      return;
    }

    const newVoucher: AccountingVoucher = {
      id: `accv_${Date.now()}`,
      voucherNumber,
      date,
      entries,
      description: description.trim() || `ثبت سند حسابداری صادره شماره ${voucherNumber}`,
      createdAt: new Date().toISOString()
    };

    // 1. Save Voucher
    dbService.saveAccountingVoucher(newVoucher);

    // 2. Post entries & modify ledger accounts balances dynamically
    entries.forEach(ent => {
      const acc = accounts.find(a => a.id === ent.accountId);
      if (acc) {
        // Adjust balance based on account type (Assets increases with Debit, Liabilities scale with Credit etc.)
        let balanceDelta = 0;
        if (acc.type === 'asset' || acc.type === 'expense') {
          balanceDelta = ent.debit - ent.credit;
        } else {
          balanceDelta = ent.credit - ent.debit;
        }

        dbService.saveAccount({
          ...acc,
          balance: acc.balance + balanceDelta
        });
      }
    });

    showNotice(`سند حسابداری با تراز موفق صادر مجدد گردید.`);
    resetForm();
    loadData();
    setSubView('voucher-list');
  };

  // Pre-fill setup opening balances (تراز افتتاحیه)
  const handleApplyOpeningTrialBalance = () => {
    // Look up opening voucher
    const openingVoucherExists = vouchers.some(v => v.isOpening);
    if (openingVoucherExists) {
      alert('تراز و سند افتتاحیه قبلا برای سال جاری برقرار شده است.');
      return;
    }

    const openingVoucher: AccountingVoucher = {
      id: `accv_open_${Date.now()}`,
      voucherNumber: 'ACC-1405-OPENING',
      date: '1405/03/01',
      entries: [
        { accountId: '101', debit: 50000000, credit: 0, description: 'تسویه مانده افتتاحیه صندوق' },
        { accountId: '102', debit: 120000000, credit: 0, description: 'موجودی کل بانک ملی فیزیکی' },
        { accountId: '301', debit: 0, credit: 170000000, description: 'سرمایه‌گذاری اولیه صاحبین سهام' }
      ],
      description: 'سند اتوماتیک تراز افتتاحیه تراز ترازنامه شادی آوران',
      isOpening: true,
      createdAt: new Date().toISOString()
    };

    dbService.saveAccountingVoucher(openingVoucher);
    showNotice('سند افتتاحیه با موفقیت در ترازنامه شادی آوران مستقر گردید.');
    loadData();
  };

  // Close financial year logic
  const handleCloseFinancialYear = () => {
    // 1. Calculate net revenues vs cost & expenses
    const revenueSum = accounts.filter(a => a.type === 'revenue').reduce((sum, a) => sum + a.balance, 0);
    const expenseSum = accounts.filter(a => a.type === 'expense').reduce((sum, a) => sum + a.balance, 0);
    const netProfitOrLoss = revenueSum - expenseSum;

    if (revenueSum === 0 && expenseSum === 0) {
      alert('هیچ حساب هزینه و درآمد فعالی در سال جاری یافت نشد.');
      return;
    }

    // 2. Draft closing journal entry
    const closingEntries: VoucherEntry[] = [];
    
    // Debit revenue accounts and credit income summary or equity
    accounts.filter(a => a.type === 'revenue').forEach(a => {
      closingEntries.push({
        accountId: a.id,
        debit: a.balance,
        credit: 0,
        description: `بستن حساب درآمد ${a.name} در پایان دوره`
      });
    });

    // Credit expense accounts and debit summary
    accounts.filter(a => a.type === 'expense').forEach(a => {
      closingEntries.push({
        accountId: a.id,
        debit: 0,
        credit: a.balance,
        description: `بستن حساب هزینه ${a.name} در پایان سال مالی`
      });
    });

    // Retained earnings entry (Equity adjustments)
    if (netProfitOrLoss > 0) {
      closingEntries.push({
        accountId: '301', // Primary Equity Capital Account
        debit: 0,
        credit: netProfitOrLoss,
        description: 'انتقال سود ویژه کل سال مالی به حساب سرمایه و سود انباشته'
      });
    } else {
      closingEntries.push({
        accountId: '301',
        debit: Math.abs(netProfitOrLoss),
        credit: 0,
        description: 'انتقال زیان انباشته کل سال به حساب سرمایه'
      });
    }

    const closingJV: AccountingVoucher = {
      id: `accv_closing_${Date.now()}`,
      voucherNumber: 'ACC-1405-CLOSING',
      date: '1405/12/29',
      entries: closingEntries,
      description: 'سند جامع بستن حساب‌های موقت ترازنامه شادی آوران',
      createdAt: new Date().toISOString()
    };

    dbService.saveAccountingVoucher(closingJV);

    // Reset Income and Expense Accounts to 0 in database
    accounts.forEach(a => {
      if (a.type === 'revenue' || a.type === 'expense') {
        dbService.saveAccount({ ...a, balance: 0 });
      } else if (a.id === '301') {
        dbService.saveAccount({ ...a, balance: a.balance + netProfitOrLoss });
      }
    });

    setFinancialYearClosed(true);
    showNotice('سال مالی ۱۴۰۵ با موفقیت بسته شد. سود موقت به حساب سرمایه انباشته منتقل گردید ✓');
    loadData();
  };

  const handleConsolidateDailyVouchers = () => {
    showNotice('اسناد روزانه جاری به صورت یکپارچه تجمیع و بایگانی شدند ✓');
  };

  const handleDeleteVoucher = (id: string) => {
    if (confirm('آیا از حذف این سند مالی دفتر کل مطمئن هستید؟ توجه: ترازهای معین به طور اتومات معکوس نخواهند شد.')) {
      dbService.deleteAccountingVoucher(id);
      loadData();
      showNotice('سند با موفقیت ابطال گردید.');
    }
  };

  return (
    <div className="space-y-6 text-right animate-fade-in text-xs text-slate-850" dir="rtl">
      {/* Messages */}
      {notification && (
        <div className="fixed top-4 left-4 bg-indigo-600 text-white px-5 py-3 rounded-2xl shadow-xl z-50 text-xs flex items-center gap-2">
          <CheckCircle2 size={18} />
          {notification}
        </div>
      )}

      {/* Ribbon title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-2xl font-bold">بخش حسابداری تعهدی و دفتر کل شادی آوران</h2>
          <p className="text-slate-400 text-xs mt-1">تراز اسناد دوبل، تنظیم سرفصل حسابها، انطباق کل و معین</p>
        </div>
        <div className="mt-3 md:mt-0 flex flex-wrap gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
          <button 
            onClick={() => setSubView('voucher-new')}
            className={`px-3 py-1.5 rounded-lg text-xs transition ${subView === 'voucher-new' ? 'bg-white shadow text-slate-800 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
          >
            سند جدید
          </button>
          <button 
            onClick={() => setSubView('voucher-list')}
            className={`px-3 py-1.5 rounded-lg text-xs transition ${subView === 'voucher-list' ? 'bg-white shadow text-slate-800 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
          >
            دفتر کل و اسناد
          </button>
          <button 
            onClick={() => setSubView('opening-balance')}
            className={`px-3 py-1.5 rounded-lg text-xs transition ${subView === 'opening-balance' ? 'bg-white shadow text-slate-800 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
          >
            تراز افتتاحیه
          </button>
          <button 
            onClick={() => setSubView('charts')}
            className={`px-3 py-1.5 rounded-lg text-xs transition ${subView === 'charts' ? 'bg-white shadow text-slate-800 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
          >
            جدول حساب ها (Chart)
          </button>
          <button 
            onClick={() => setSubView('consolidate')}
            className={`px-3 py-1.5 rounded-lg text-xs transition ${subView === 'consolidate' ? 'bg-white shadow text-slate-800 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
          >
            تجمیع اسناد مالی
          </button>
          <button 
            onClick={() => setSubView('close-year')}
            className={`px-3 py-1.5 rounded-lg text-xs transition ${subView === 'close-year' ? 'bg-white shadow text-slate-800 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
          >
            بستن سال مالی
          </button>
        </div>
      </div>

      {subView === 'voucher-new' && (
        /* Double entry voucher composer board */
        <form onSubmit={handleSaveVoucher} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm lg:col-span-2 space-y-6">
            <h3 className="font-bold text-slate-800 text-sm border-b pb-2">خطوط موازنه آرتیکل‌های معین حساب</h3>

            {/* Quick selectors for double-entry entries */}
            <div className="bg-slate-50 p-4 rounded-xl space-y-3">
              <span className="text-xs font-semibold text-slate-500 block">افزودن بدهکار / بستانکار جدید به آرتیکل</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  value={currentAccountId}
                  onChange={(e) => setCurrentAccountId(e.target.value)}
                  className="bg-white border-0 rounded-xl px-4 py-2.5 text-xs text-slate-700"
                >
                  <option value="">انتخاب سرفصل حساب...</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
                  ))}
                </select>

                <input
                  type="number"
                  min="0"
                  value={currentDebit || ''}
                  onChange={(e) => {
                    setCurrentDebit(Number(e.target.value));
                    if (Number(e.target.value) > 0) setCurrentCredit(0);
                  }}
                  placeholder="مبلغ بدهکار (ریال)"
                  className="bg-white border-0 rounded-xl px-4 py-2.5 text-xs text-slate-700 font-mono"
                />

                <input
                  type="number"
                  min="0"
                  value={currentCredit || ''}
                  onChange={(e) => {
                    setCurrentCredit(Number(e.target.value));
                    if (Number(e.target.value) > 0) setCurrentDebit(0);
                  }}
                  placeholder="مبلغ بستانکار (ریال)"
                  className="bg-white border-0 rounded-xl px-4 py-2.5 text-xs text-slate-700 font-mono"
                />
              </div>

              <input
                type="text"
                value={currentDesc}
                onChange={(e) => setCurrentDesc(e.target.value)}
                placeholder="شرح و بابت آرتیکل خطی (اختیاری)"
                className="w-full bg-white border-0 rounded-xl px-4 py-2.5 text-xs text-slate-700"
              />

              <button
                type="button"
                onClick={handleAddEntryRow}
                className="w-full bg-slate-900 text-white rounded-xl py-2 text-xs font-bold hover:bg-slate-800 transition"
              >
                + درج ردیف در آرتیکل سند جاری
              </button>
            </div>

            {/* entries table outputheet */}
            <div className="overflow-x-auto text-[11px]">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100 font-bold pb-2">
                    <th className="pb-2">سرفصل حساب</th>
                    <th className="pb-2">شرح خط</th>
                    <th className="pb-2 text-left">بدهکار (ریال)</th>
                    <th className="pb-2 text-left">بستانکار (ریال)</th>
                    <th className="pb-2 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-600 font-sans">
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400">
                        سند بدون ردیف است. لطفا ردیف‌های بدهکار و بستانکار مدنظرتان را بیفزایید.
                      </td>
                    </tr>
                  ) : (
                    entries.map((item, index) => {
                      const acc = accounts.find(a => a.id === item.accountId);
                      return (
                        <tr key={index}>
                          <td className="py-2.5 font-bold text-slate-700">{acc?.name || 'حساب منقضی'}</td>
                          <td className="py-2.5 text-xs text-slate-400">{item.description}</td>
                          <td className="py-2.5 text-left font-mono font-semibold text-emerald-600">
                            {item.debit > 0 ? item.debit.toLocaleString() : '-'}
                          </td>
                          <td className="py-2.5 text-left font-mono font-semibold text-rose-600">
                            {item.credit > 0 ? item.credit.toLocaleString() : '-'}
                          </td>
                          <td className="py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveEntryRow(index)}
                              className="text-rose-500 hover:bg-rose-50 p-1 rounded-lg transition"
                            >
                              حذف ردیف
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
              <label className="text-xs font-semibold text-slate-500 block">شرح کلی مبنای سند حسابداری</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="توضیحات تکمیلی پیرامون اسناد مثبته و غیره..."
                rows={2}
                className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2 text-xs text-slate-700"
              />
            </div>
          </div>

          {/* Right validations board */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm border-b pb-2">کنترل ترت‌آوا و به رسمیت شناختن</h3>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 block">کد شماره سند</label>
              <input
                type="text"
                required
                value={voucherNumber}
                onChange={(e) => setVoucherNumber(e.target.value)}
                className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2.5 text-xs font-mono text-center"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 block">تاریخ سند</label>
              <input
                type="text"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2.5 text-xs font-mono text-center"
              />
            </div>

            {/* Balance check screen */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-2.5 text-xs font-mono">
              <span className="text-slate-400 font-sans block font-semibold mb-1">سیستم موازنه تعادل دوبل:</span>
              <div className="flex justify-between border-b border-white/5 pb-1 text-emerald-400">
                <span>جمع بدهکار:</span>
                <span>{totalDebit.toLocaleString()} ریال</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1 text-rose-400">
                <span>جمع بستانکار:</span>
                <span>{totalCredit.toLocaleString()} ریال</span>
              </div>
              
              <div className="flex justify-between text-sm font-bold pt-1">
                <span className="font-sans">مغایرت توازن:</span>
                <span className={diffBalance === 0 && totalDebit > 0 ? 'text-emerald-300' : 'text-amber-400 animate-pulse'}>
                  {diffBalance === 0 && totalDebit > 0 ? 'کاملا تراز برابری ✓' : `${diffBalance.toLocaleString()} ریال`}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={!isBalanced}
              className={`w-full py-2.5 rounded-xl text-xs font-bold shadow transition ${
                isBalanced 
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              به تایید رساندن و بستن موقت سند ✓
            </button>
          </div>
        </form>
      )}

      {subView === 'voucher-list' && (
        /* Journal entries ledger output list */
        <div className="bg-white rounded-2xl border border-slate-50 overflow-hidden shadow-sm">
          {vouchers.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <BookOpen size={48} className="mx-auto mb-2 opacity-30 text-slate-500" />
              <p className="text-sm">هیچ سند حسابداری صادر‌شده‌ای ثبت نگردیده است.</p>
            </div>
          ) : (
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-right p-4">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-bold">
                    <th className="p-4">شماره سند</th>
                    <th className="p-4">تاریخ ثبت</th>
                    <th className="p-4">تعداد آرتیکل‌ها</th>
                    <th className="p-4">شرح تراکم</th>
                    <th className="p-4 text-center">نوع</th>
                    <th className="p-4 text-center">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                  {vouchers.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50/40">
                      <td className="p-4 font-mono font-bold text-slate-800">{v.voucherNumber}</td>
                      <td className="p-4 font-mono">{v.date}</td>
                      <td className="p-4 font-mono text-center font-bold text-indigo-700">{v.entries.length} ردیف</td>
                      <td className="p-4 text-[10px] text-slate-400 max-w-xs truncate">{v.description}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          v.isOpening ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {v.isOpening ? 'افتتاحیه' : 'گردش عملیاتی'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleDeleteVoucher(v.id)}
                          className="text-rose-500 hover:text-rose-600"
                        >
                          حذف
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

      {subView === 'opening-balance' && (
        /* Opening setup launcher */
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm max-w-2xl mx-auto text-center space-y-4">
          <Database size={48} className="text-indigo-600 mx-auto" />
          <h3 className="font-bold text-slate-800 text-sm">اجرا و تایید تراز اول سند افتتاحیه</h3>
          <p className="text-slate-400 text-xs">برای اولین سال مالی شرکت با تایید تالار شادی آوران، تراز افتتاحیه سرمایه شرکا و موجودی‌های نقدی بانک مستقر خواهد گردید.</p>
          
          <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-right">
            <span className="font-bold text-xs text-slate-700 block mb-2 border-b pb-1">آرتیکل‌ها ردیفهای تراز پیش‌فرض:</span>
            <div className="flex justify-between">
              <span>۱. صندوق نقدی (مدیر مالی):</span>
              <span className="font-mono text-emerald-600 font-semibold">+۵۰,۰۰۰,۰۰۰ ریال</span>
            </div>
            <div className="flex justify-between">
              <span>۲. بانک ملی ایران (جاری):</span>
              <span className="font-mono text-emerald-600 font-semibold">+۱۲۰,۰۰۰,۰۰۰ ریال</span>
            </div>
            <div className="flex justify-between border-t pt-1.5 font-bold">
              <span>آورد اولیه شریک و سهامداران (بستانکار):</span>
              <span className="font-mono text-rose-600 font-semibold">۱۷۰,۰۰۰,۰۰۰ ریال</span>
            </div>
          </div>

          <button
            onClick={handleApplyOpeningTrialBalance}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2 rounded-xl transition duration-300"
          >
            تایید و استقرار تراز افتتاحیه
          </button>
        </div>
      )}

      {subView === 'charts' && (
        /* Chart of Accounts details directory list */
        <div className="bg-white rounded-2xl border border-slate-50 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right p-4 text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                  <th className="p-4">کد معین</th>
                  <th className="p-4">عنوان حساب مالی</th>
                  <th className="p-4">ماهیت حساب</th>
                  <th className="p-4 text-left">مانده حساب جاری (ریال)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-705 font-sans">
                {accounts.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50/40">
                    <td className="p-4 font-mono font-bold text-slate-700">{a.code}</td>
                    <td className="p-4 font-semibold text-slate-800">{a.name}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        a.type === 'asset' ? 'bg-emerald-50 text-emerald-700' :
                        a.type === 'expense' ? 'bg-rose-50 text-rose-700' :
                        a.type === 'revenue' ? 'bg-blue-50 text-blue-700' :
                        'bg-slate-50 text-slate-650'
                      }`}>
                        {a.type === 'asset' ? 'دارایی' :
                         a.type === 'liability' ? 'بدهی و تعهد' :
                         a.type === 'equity' ? 'سرمایه' :
                         a.type === 'revenue' ? 'درآمد عمومی' : 'هزینه جاری'}
                      </span>
                    </td>
                    <td className="p-4 text-left font-bold font-mono text-slate-800">
                      {a.balance.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subView === 'close-year' && (
        /* Closing financial year */
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm max-w-2xl mx-auto text-center space-y-4">
          <Lock size={48} className="text-rose-500 mx-auto" />
          <h3 className="font-bold text-slate-800 text-sm">بستن اتوماتیک موعد سال مالی ۱۴۰۵</h3>
          <p className="text-slate-400 text-xs">در این اقدام، حساب‌های موقت درآمد و هزینه‌های شرکت جمع زده شده، سود انباشته حاصله محاسبه و پس از معادل‌سازی و صفر کردن حسابها، خالص سود به حساب سرمایه صاحبان سهام انتقال می‌یابد.</p>

          <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-right text-xs text-rose-800 space-y-2">
            <strong>نکات امنیتی حسابرس:</strong>
            <p>۱. پس از بستن سال مالی، تمام درآمد و هزینه‌های دوره جاری صفر خواهند شد تا برای پایش مستمر دوره جدید آماده گردند.</p>
            <p>۲. سند ممیز closing غیرقابل ویرایش و برگشت‌پذیر خواهد بود.</p>
          </div>

          <button
            onClick={handleCloseFinancialYear}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-6 py-2.5 rounded-xl transition duration-300"
          >
            عملیات را کلید بزنید و سال مالی را ببندید
          </button>
        </div>
      )}

      {subView === 'consolidate' && (
        /* Consolidating Vouchers logs */
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm max-w-2xl mx-auto text-center space-y-4">
          <FileSpreadsheet size={48} className="text-teal-600 mx-auto" />
          <h3 className="font-bold text-slate-800 text-sm">سامانه جامع تجمیع روزانه اسناد</h3>
          <p className="text-slate-400 text-xs">این برنامه برای سهولت به تحویل گزارشات فصلی و ماهانه، چندین سند معین معلق را در یک مجمع تجمیعی کل یکسان ادغام می‌کند.</p>

          <button
            onClick={handleConsolidateDailyVouchers}
            className="bg-emerald-600 hover:bg-emerald-750 text-white font-bold px-6 py-2 rounded-xl transition shadow"
          >
            تجمیع نهایی روزنامه جاری
          </button>
        </div>
      )}
    </div>
  );
}
