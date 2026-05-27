/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { dbService } from '../db';
import { Account, AccountingVoucher, VoucherEntry, Person, Invoice, Receive } from '../types';
import { 
  TrendingUp, 
  Search, 
  Printer, 
  FileCheck2, 
  PieChart, 
  Layers, 
  ArrowUpRight, 
  ArrowDownLeft,
  UserCheck,
  FileText,
  CreditCard,
  ChevronLeft
} from 'lucide-react';

interface ReportsProps {
  initialSubView: 'balance' | 'profit-loss' | 'capital' | 'review' | 'statement';
}

export default function Reports({ initialSubView }: ReportsProps) {
  const [subView, setSubView] = useState(initialSubView);
  
  // Db elements state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [vouchers, setVouchers] = useState<AccountingVoucher[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [receives, setReceives] = useState<Receive[]>([]);

  // Account review filter selector state
  const [reviewAccountId, setReviewAccountId] = useState('');
  
  // Statement person state
  const [selectedPersonId, setSelectedPersonId] = useState('');

  useEffect(() => {
    setSubView(initialSubView);
    loadData();
  }, [initialSubView]);

  const loadData = () => {
    setAccounts(dbService.getAccounts());
    setVouchers(dbService.getAccountingVouchers());
    setPersons(dbService.getPersons());
    setInvoices(dbService.getInvoices());
    setReceives(dbService.getReceives());
  };

  const handlePrintStatement = () => {
    const originalContent = document.getElementById('print-statement-area');
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

  const getInvoiceRemaining = (inv: Invoice) => inv.remainingBalance !== undefined ? inv.remainingBalance : inv.total;

  const getPersonDebtDetails = (personId: string) => {
    const personInvoices = invoices.filter(inv => inv.personId === personId && inv.type === 'sale');
    const personReceives = receives.filter(r => r.personId === personId);
    
    const totalInvoiced = personInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalRemaining = personInvoices.reduce((sum, inv) => sum + getInvoiceRemaining(inv), 0);
    const totalReceived = personReceives.reduce((sum, r) => sum + r.amount, 0);

    return {
      personInvoices,
      personReceives,
      totalInvoiced,
      totalRemaining,
      totalReceived
    };
  };

  const debtors = persons.map(p => {
    const details = getPersonDebtDetails(p.id);
    return {
      person: p,
      ...details
    };
  }).filter(d => d.totalRemaining > 0);

  // Calculations
  const assetAccounts = accounts.filter(a => a.type === 'asset');
  const totalAssets = assetAccounts.reduce((sum, a) => sum + a.balance, 0);

  const liabilityAccounts = accounts.filter(a => a.type === 'liability');
  const totalLiabilities = liabilityAccounts.reduce((sum, a) => sum + a.balance, 0);

  const equityAccounts = accounts.filter(a => a.type === 'equity');
  const totalEquity = equityAccounts.reduce((sum, a) => sum + a.balance, 0);

  // Income statement calculations
  const revenueAccounts = accounts.filter(a => a.type === 'revenue');
  const totalRevenues = revenueAccounts.reduce((sum, a) => sum + a.balance, 0);

  const expenseAccounts = accounts.filter(a => a.type === 'expense');
  const totalExpenses = expenseAccounts.reduce((sum, a) => sum + a.balance, 0);

  const netIncome = totalRevenues - totalExpenses;

  // Capital Statement calculation
  const startingCapital = totalEquity; // simplified model for representation
  const finalCapital = startingCapital + netIncome;

  return (
    <div className="space-y-6 text-right animate-fade-in text-xs text-slate-800" dir="rtl">
      {/* Tab select headers */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-2xl font-bold">بخش گزارشات مالی تفصیلی شادی آوران</h2>
          <p className="text-slate-400 text-xs mt-1">ترازبندی دارایی‌ها و تعهدات، صورت‌های برآوردی سود و بهر‌وری</p>
        </div>
        <div className="mt-3 md:mt-0 flex flex-wrap gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
          <button 
            onClick={() => setSubView('balance')}
            className={`px-3 py-1.5 rounded-lg text-xs transition ${subView === 'balance' ? 'bg-white shadow text-slate-800 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
          >
            ترازنامه سالانه
          </button>
          <button 
            onClick={() => setSubView('profit-loss')}
            className={`px-3 py-1.5 rounded-lg text-xs transition ${subView === 'profit-loss' ? 'bg-white shadow text-slate-800 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
          >
            صورت سود و زیان (P&L)
          </button>
          <button 
            onClick={() => setSubView('capital')}
            className={`px-3 py-1.5 rounded-lg text-xs transition ${subView === 'capital' ? 'bg-white shadow text-slate-800 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
          >
            صورتحساب سرمایه
          </button>
          <button 
            onClick={() => setSubView('review')}
            className={`px-3 py-1.5 rounded-lg text-xs transition ${subView === 'review' ? 'bg-white shadow text-slate-800 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
          >
            مرور جامع حساب ها
          </button>
          <button 
            onClick={() => setSubView('statement')}
            className={`px-3 py-1.5 rounded-lg text-xs transition ${subView === 'statement' ? 'bg-white shadow text-slate-800 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
          >
            صورتحساب تفصیلی اشخاص
          </button>
        </div>
      </div>

      {subView === 'balance' && (
        /* Balance Sheet Dynamic Sheet */
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <FileCheck2 size={16} className="text-indigo-600" />
                ترازنامه کل یکپارچه شادی آوران
              </h3>
              <button onClick={() => window.print()} className="flex items-center gap-1.5 bg-slate-50 border px-3 py-1.5 rounded-lg text-[10px] hover:bg-slate-100 font-semibold text-slate-600 transition">
                <Printer size={12} /> چاپ ترازنامه
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Assets Section */}
              <div className="space-y-3">
                <h4 className="font-bold text-emerald-700 text-xs bg-emerald-50 rounded-lg p-2">دارایی‌ها (بدهکار):</h4>
                <div className="divide-y divide-slate-100 bg-slate-50/50 rounded-xl p-4 space-y-2">
                  {assetAccounts.map(a => (
                    <div key={a.id} className="flex justify-between pb-1 pt-1">
                      <span className="font-semibold">{a.name} ({a.code})</span>
                      <span className="font-mono">{a.balance.toLocaleString()} ریال</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold pt-3 text-slate-800 border-t">
                    <span>جمع کل دارایی‌ها:</span>
                    <span className="font-mono text-emerald-600">{totalAssets.toLocaleString()} ریال</span>
                  </div>
                </div>
              </div>

              {/* Liabilities and Equities Section */}
              <div className="space-y-6">
                {/* Liabilities */}
                <div className="space-y-3">
                  <h4 className="font-bold text-rose-700 text-xs bg-rose-50 rounded-lg p-2">بدهی‌ها و تعهدات مالی:</h4>
                  <div className="divide-y divide-slate-100 bg-slate-50/50 rounded-xl p-4 space-y-2">
                    {liabilityAccounts.length === 0 ? (
                      <div className="text-slate-400 py-3 text-center">هیچ تعهد یا بدهی ثبت‌شده‌ای وجود ندارد. ✓</div>
                    ) : (
                      liabilityAccounts.map(a => (
                        <div key={a.id} className="flex justify-between pb-1 pt-1">
                          <span className="font-semibold">{a.name} ({a.code})</span>
                          <span className="font-mono">{a.balance.toLocaleString()} ریال</span>
                        </div>
                      ))
                    )}
                    <div className="flex justify-between font-bold pt-3 text-slate-800 border-t">
                      <span>جمع کل بدهی‌ها:</span>
                      <span className="font-mono text-rose-600">{totalLiabilities.toLocaleString()} ریال</span>
                    </div>
                  </div>
                </div>

                {/* Equities */}
                <div className="space-y-3">
                  <h4 className="font-bold text-indigo-700 text-xs bg-indigo-50 rounded-lg p-2">حقوق صاحبان سهام و سرمایه:</h4>
                  <div className="divide-y divide-slate-100 bg-slate-50/50 rounded-xl p-4 space-y-2">
                    {equityAccounts.map(a => (
                      <div key={a.id} className="flex justify-between pb-1 pt-1">
                        <span className="font-semibold">{a.name} ({a.code})</span>
                        <span className="font-mono">{a.balance.toLocaleString()} ریال</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-bold pt-3 text-slate-850 border-t">
                      <span>جمع ارزش حقوق صاحبان سهام:</span>
                      <span className="font-mono text-indigo-700">{totalEquity.toLocaleString()} ریال</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* General Formula verification screen */}
            <div className="bg-indigo-950 text-white rounded-2xl p-4 mt-4 flex flex-col sm:flex-row justify-between items-center text-xs">
              <span className="font-semibold">تراز کل دارایی ها با مجموع تعهدات و حقوق سرمایه:</span>
              <div className="font-mono font-bold flex gap-4 mt-2 sm:mt-0 text-emerald-400">
                <span>دارایی‌ها: {totalAssets.toLocaleString()}</span>
                <span>=</span>
                <span>بدهی و سرمایه: {(totalLiabilities + totalEquity).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {subView === 'profit-loss' && (
        /* Income statement */
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <PieChart size={16} className="text-amber-500" />
              صورت سود و زیان (سنج برآورد تجمعی) شادی آوران
            </h3>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 bg-slate-50 border px-3 py-1.5 rounded-lg text-[10px] text-slate-650 font-semibold transition">
              <Printer size={12} /> چاپ صورت حساب
            </button>
          </div>

          <div className="max-w-2xl mx-auto divide-y divide-slate-150 p-4 bg-slate-55/40 rounded-2xl space-y-4">
            {/* Revenues */}
            <div className="space-y-2 pb-2">
              <span className="font-bold text-emerald-700 block">۱. فروش و درآمدهای عملیاتی:</span>
              {revenueAccounts.map(a => (
                <div key={a.id} className="flex justify-between text-xs pr-4 text-slate-700">
                  <span>{a.name}</span>
                  <span className="font-mono">{a.balance.toLocaleString()} ریال</span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-2 text-slate-850 border-t border-dashed">
                <span>مجموع فرآورده ناخالص دروری ها:</span>
                <span className="font-mono text-emerald-600">{totalRevenues.toLocaleString()} ریال</span>
              </div>
            </div>

            {/* Expenses */}
            <div className="space-y-2 pt-4 pb-2">
              <span className="font-bold text-rose-700 block">۲. هزینه‌های جاری و تشریفاتی اداری:</span>
              {expenseAccounts.map(a => (
                <div key={a.id} className="flex justify-between text-xs pr-4 text-slate-700">
                  <span>{a.name}</span>
                  <span className="font-mono">{(a.balance).toLocaleString()} ریال</span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-2 text-slate-850 border-t border-dashed">
                <span>کل مخارج و کاتهای کسر شده:</span>
                <span className="font-mono text-rose-600">{(totalExpenses).toLocaleString()} ریال</span>
              </div>
            </div>

            {/* Financial balance result */}
            <div className="pt-4 flex justify-between font-extrabold text-sm border-t-2">
              <span>خالص سود ویژه (زیان) دوره معین:</span>
              <span className={`font-mono ${netIncome >= 0 ? 'text-emerald-600' : 'text-rose-600 animate-pulse'}`}>
                {netIncome.toLocaleString()} ریال
              </span>
            </div>
          </div>
        </div>
      )}

      {subView === 'capital' && (
        /* Capital Equity Changes Statement */
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Layers size={16} className="text-teal-650" />
              صورت تغییرات در حقوق سرمایه اولیه و ویژه
            </h3>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 bg-slate-50 border px-3 py-1.5 rounded-lg text-[10px] text-slate-650 transition font-semibold">
              <Printer size={12} /> چاپ صورتحساب سرمایه
            </button>
          </div>

          <div className="max-w-2xl mx-auto divide-y divide-slate-100 p-4 bg-slate-50/50 rounded-2xl space-y-4">
            <div className="flex justify-between text-xs pb-1 text-slate-700">
              <span>مانده حساب سرمایه در ابتدای سال مالی ۱۴۰۵:</span>
              <span className="font-mono font-semibold">{startingCapital.toLocaleString()} ریال</span>
            </div>
            
            <div className="flex justify-between text-xs pt-3 pb-1 text-slate-700">
              <span>اضافه‌شدن خالص سود کسب‌شده دوره جاری:</span>
              <span className="font-mono text-emerald-600 font-bold">+{netIncome.toLocaleString()} ریال</span>
            </div>

            <div className="flex justify-between font-extrabold text-sm pt-4">
              <span>حقوق سهامداران و سرمایه انتهای دوره شادی آوران:</span>
              <span className="font-mono text-indigo-700">{finalCapital.toLocaleString()} ریال</span>
            </div>
          </div>
        </div>
      )}

      {subView === 'review' && (
        /* Explorer account reviews ledger logs */
        <div className="space-y-4 animate-fade-in text-xs text-slate-800">
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
            <span className="font-bold shrink-0 text-slate-650">انتخاب سرفصل معین حساب جهت مرور جزئیات:</span>
            <select
              value={reviewAccountId}
              onChange={(e) => setReviewAccountId(e.target.value)}
              className="bg-slate-50 border-0 rounded-xl px-4 py-2 text-xs text-slate-750 focus:ring-1 focus:ring-indigo-500 w-full md:w-64"
            >
              <option value="">انتخاب کنید...</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
              ))}
            </select>
          </div>

          {reviewAccountId && (
            <div className="bg-white rounded-2xl border border-slate-50 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-bold p-3">
                      <th className="p-3">شماره سند مبدا</th>
                      <th className="p-3">تاریخ</th>
                      <th className="p-3">شرح آرتیکل ردیف</th>
                      <th className="p-3 text-left">مبلغ ورود (بدهکار)</th>
                      <th className="p-3 text-left">مبلغ خروج (بستانکار)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                    {(() => {
                      let entriesMatched = 0;
                      return vouchers.map(v => {
                        return v.entries
                          .filter(e => e.accountId === reviewAccountId)
                          .map((ent, entIdx) => {
                            entriesMatched++;
                            return (
                              <tr key={`${v.id}-${entIdx}`} className="hover:bg-slate-50/20">
                                <td className="p-3 font-mono font-bold">{v.voucherNumber}</td>
                                <td className="p-3 font-mono">{v.date}</td>
                                <td className="p-3 text-slate-450 text-[10px]">{ent.description}</td>
                                <td className="p-3 text-left font-mono font-semibold text-emerald-600">
                                  {ent.debit > 0 ? ent.debit.toLocaleString() : '-'}
                                </td>
                                <td className="p-3 text-left font-mono font-semibold text-rose-600">
                                  {ent.credit > 0 ? ent.credit.toLocaleString() : '-'}
                                </td>
                              </tr>
                            );
                          });
                      });

                      if (entriesMatched === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-400">آرتیکلی منطبق با این معین ثبت نشده است.</td>
                          </tr>
                        );
                      }
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {subView === 'statement' && (
        <div className="space-y-4 animate-fade-in text-xs text-slate-800">
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center no-print">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-705">جستجو و فیلتر اشخاص:</span>
              <select
                value={selectedPersonId}
                onChange={(e) => setSelectedPersonId(e.target.value)}
                className="bg-slate-50 border-0 rounded-xl px-4 py-2 text-xs text-slate-755 focus:ring-1 focus:ring-indigo-500 font-bold"
              >
                <option value="">-- انتخاب طرف حساب (مشاهده همه بدهکاران) --</option>
                {persons.map(p => {
                  const details = getPersonDebtDetails(p.id);
                  return (
                    <option key={p.id} value={p.id}>
                      {p.name} (کد: {p.code}) {details.totalRemaining > 0 ? `| بدهی: ${details.totalRemaining.toLocaleString()} ریال` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
            {selectedPersonId && (
              <div className="flex gap-2">
                <button
                  onClick={handlePrintStatement}
                  className="bg-white text-slate-900 border border-slate-200 text-xs font-black px-4 py-2 rounded-xl flex items-center gap-1.5 hover:bg-slate-100 transition cursor-pointer"
                >
                  <Printer size={14} />
                  چاپ یا خروجی PDF صورتحساب
                </button>
                <button
                  onClick={() => setSelectedPersonId('')}
                  className="bg-slate-100 text-slate-600 text-xs font-bold px-4 py-2 rounded-xl hover:bg-slate-200 transition cursor-pointer"
                >
                  بازگشت به لیست بدهکاران
                </button>
              </div>
            )}
          </div>

          {!selectedPersonId ? (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm animate-fade-in">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 font-sans">لیست اشخاص بدهکار (مانده بدهی بزرگتر از صفر ریال)</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">مجموع مانده فاکتورهای تسویه نشده هر فرد</p>
                </div>
                <span className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-[10px] font-bold font-sans">
                  تعداد بدهکاران: {debtors.length} نفر
                </span>
              </div>

              {debtors.length === 0 ? (
                <div className="p-16 text-center text-slate-400">
                  <UserCheck size={48} className="mx-auto mb-2 opacity-30 text-emerald-500" />
                  <p className="text-xs font-bold text-slate-700">خوشبختانه هیچ بدهی معوقه‌ای یافت نشد!</p>
                  <p className="text-[10px] text-slate-400 mt-1">امور مالی شرکت با تمامی اشخاص در توازن کامل قرار دارد.</p>
                </div>
              ) : (
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-right pb-1">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-bold p-3">
                        <th className="p-3">کد شخص</th>
                        <th className="p-3">نام و مشخصات شخص</th>
                        <th className="p-3">تلفن تماس</th>
                        <th className="p-3">شهر</th>
                        <th className="p-3 text-left">مجموع فروش</th>
                        <th className="p-3 text-left">مجموع دریافتی</th>
                        <th className="p-3 text-left">مانده بدهی کل</th>
                        <th className="p-3 text-center">صورتحساب تفصیلی</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                      {debtors.map(d => (
                        <tr key={d.person.id} className="hover:bg-slate-50/20">
                          <td className="p-3 font-mono font-bold text-slate-550">{d.person.code}</td>
                          <td className="p-3 font-bold text-slate-800">{d.person.name}</td>
                          <td className="p-3 font-mono">{d.person.phone}</td>
                          <td className="p-3">{d.person.city}</td>
                          <td className="p-3 text-left font-mono">{d.totalInvoiced.toLocaleString()} ریال</td>
                          <td className="p-3 text-left font-mono text-emerald-600">{d.totalReceived.toLocaleString()} ریال</td>
                          <td className="p-3 text-left font-mono font-bold text-rose-600">{d.totalRemaining.toLocaleString()} ریال</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => setSelectedPersonId(d.person.id)}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 px-3 py-1.5 rounded-xl text-[10px] font-bold shadow-xs transition cursor-pointer"
                            >
                              مشاهده ریز صورتحساب
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            (() => {
              const selectedPerson = persons.find(p => p.id === selectedPersonId);
              if (!selectedPerson) return null;
              const { personInvoices, personReceives, totalInvoiced, totalRemaining, totalReceived } = getPersonDebtDetails(selectedPersonId);
              return (
                <div id="print-statement-area" className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6 text-xs text-slate-800 leading-relaxed font-sans">
                  {/* Title area */}
                  <div className="border border-slate-300 p-5 rounded-xl grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-8 text-right space-y-1">
                      <h1 className="text-base font-black text-slate-900 font-sans">صورتحساب مالی و معین تفصیلی طرف حساب</h1>
                      <p className="text-[10px] text-slate-500 font-semibold">شرکت شادی آوران (میم بازی) - سیستم سازمان‌یافته مالی یکپارچه ابری</p>
                      <p className="text-[10px] text-slate-400">آدرس: کاشان، بلوار واجدی | تلفن دفتر مرکزی: ۰۳۱۵۵۰۰۰۰۰۰</p>
                    </div>
                    <div className="col-span-4 text-left space-y-1 border-r border-slate-200 pr-4">
                      <div><span className="font-semibold text-slate-500 text-[10px]">تاریخ گزارش:</span> <span className="font-mono font-bold">۱۴۰۵/۰۳/۰۵</span></div>
                      <div><span className="font-semibold text-slate-500 text-[10px]">کد طرف حساب:</span> <span className="font-mono font-bold">{selectedPerson.code}</span></div>
                      <div><span className="font-semibold text-slate-500 text-[10px]">نوع معامله:</span> <span className="font-bold text-indigo-600">ریالی مشتری</span></div>
                    </div>
                  </div>

                  {/* Person Profile */}
                  <div>
                    <h4 className="font-bold text-slate-800 border-b border-slate-150 pb-1.5 mb-2.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                      مشخصات هویتی و ثبتی طرف حساب
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-y-2.5 gap-x-4 bg-slate-50/55 p-3.5 rounded-xl border border-slate-100">
                      <div><span className="text-slate-400 font-medium">نام کامل حقیقی/حقوقی:</span> <span className="font-bold text-slate-900">{selectedPerson.name}</span></div>
                      <div><span className="text-slate-400 font-medium">شماره همراه/ثابت:</span> <span className="font-mono font-bold text-slate-800">{selectedPerson.phone}</span></div>
                      <div><span className="text-slate-400 font-medium">شهر سکونت:</span> <span className="font-bold text-slate-800">{selectedPerson.city}</span></div>
                      {selectedPerson.nationalId && <div><span className="text-slate-400 font-medium">کد ملی / شناسه ملی:</span> <span className="font-mono font-bold text-slate-800">{selectedPerson.nationalId}</span></div>}
                      {selectedPerson.company && <div><span className="text-slate-400 font-medium">شرکت متبوع:</span> <span className="font-semibold text-slate-800">{selectedPerson.company}</span></div>}
                      {selectedPerson.address && <div className="md:col-span-3"><span className="text-slate-400 font-medium font-sans">نشانی دقیق پستی:</span> <span className="text-slate-800">{selectedPerson.address}</span></div>}
                    </div>
                  </div>

                  {/* Scorecards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 text-center">
                      <span className="text-slate-400 font-semibold block mb-0.5">مجموع فاکتورهای فروش</span>
                      <span className="font-mono font-extrabold text-slate-800 text-sm">{totalInvoiced.toLocaleString()} <span className="text-[10px] font-normal font-sans">ریال</span></span>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 text-center">
                      <span className="text-emerald-700 font-semibold block mb-0.5">کل وصولی‌های با فاکتور</span>
                      <span className="font-mono font-extrabold text-emerald-850 text-sm">+{totalReceived.toLocaleString()} <span className="text-[10px] font-normal font-sans">ریال</span></span>
                    </div>
                    <div className="bg-rose-50 rounded-xl p-4 border border-rose-100 text-center ring-2 ring-rose-500/10">
                      <span className="text-rose-700 font-bold block mb-0.5 animate-pulse">مانده کل بدهی فعلی</span>
                      <span className="font-mono font-black text-rose-800 text-base">{totalRemaining.toLocaleString()} <span className="text-[10px] font-normal font-sans">ریال</span></span>
                    </div>
                  </div>

                  {/* Invoices List */}
                  <div>
                    <h4 className="font-bold text-slate-800 border-b border-slate-150 pb-1.5 mb-2.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                      ۱. لیست فاکتورهای فروش صادر شده
                    </h4>
                    <div className="border border-slate-150 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-right">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-150 p-2 text-[11px]">
                            <th className="p-2">شماره فاکتور</th>
                            <th className="p-2">تاریخ صدور</th>
                            <th className="p-2">شرایط پرداخت</th>
                            <th className="p-2">وضعیت فاکتور</th>
                            <th className="p-2 text-left">مجموع فاکتور</th>
                            <th className="p-2 text-left">مانده فاکتور (ریال)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                          {personInvoices.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-4 text-center text-slate-400">هیچ فاکتور فروش فعالی برای این مشتری صادر نشده است.</td>
                            </tr>
                          ) : (
                            personInvoices.map(inv => (
                              <tr key={inv.id} className="hover:bg-slate-50/10">
                                <td className="p-2 font-mono font-bold text-slate-800">{inv.invoiceNumber}</td>
                                <td className="p-2 font-mono">{inv.date}</td>
                                <td className="p-2 font-medium">{inv.paymentMethod || 'نامشخص'}</td>
                                <td className="p-2 font-medium">
                                  <span className={`text-[10px] font-semibold ${inv.status === 'پیش فاکتور' ? 'text-amber-500' : 'text-slate-700'}`}>
                                    {inv.status || 'تایید شده'}
                                  </span>
                                </td>
                                <td className="p-2 text-left font-mono">{inv.total.toLocaleString()} ریال</td>
                                <td className="p-2 text-left font-mono font-bold text-rose-600">{getInvoiceRemaining(inv).toLocaleString()} ریال</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Receives List */}
                  <div>
                    <h4 className="font-bold text-slate-800 border-b border-slate-150 pb-1.5 mb-2.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                      ۲. لیست اسناد وصولی و دریافتی‌ها
                    </h4>
                    <div className="border border-slate-150 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-right">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-150 p-2 text-[11px]">
                            <th className="p-2">کد سند دریافت</th>
                            <th className="p-2">تاریخ دریافت</th>
                            <th className="p-2">نوع دریافت</th>
                            <th className="p-2">مشخصات سند / چک بانکی</th>
                            <th className="p-2 text-left">مبلغ وصول شده (ریال)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-705 font-sans">
                          {personReceives.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-4 text-center text-slate-400">هیچ پرداخت یا سند وصولی برای این مشتری ثبت نشده است.</td>
                            </tr>
                          ) : (
                            personReceives.map(rec => (
                              <tr key={rec.id} className="hover:bg-slate-50/10">
                                <td className="p-2 font-mono font-bold text-slate-800">{rec.code}</td>
                                <td className="p-2 font-mono">{rec.date}</td>
                                <td className="p-2 font-semibold text-slate-700">{rec.type}</td>
                                <td className="p-2 font-sans text-slate-500 text-[10px]">
                                  {rec.type === 'چک' ? (
                                    <span>چک بانک {rec.bank} (سریال: {rec.checkSerial}) | موعد: {rec.dueDate} | وضعیت: {rec.status || 'موعد نرسیده'}</span>
                                  ) : (
                                    <span>وصول نقدی فیزیکی صندوق</span>
                                  )}
                                </td>
                                <td className="p-2 text-left font-mono font-extrabold text-emerald-600">+{rec.amount.toLocaleString()} ریال</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Signatures */}
                  <div className="grid grid-cols-2 text-center text-[10px] text-slate-500 font-bold pt-16 border-t border-slate-150 mt-8 pb-1.5">
                    <div>مهر و امضای امور مالی شرکت شادی آوران (میم بازی)</div>
                    <div>امضا و تایید صحت حساب طرف معامله</div>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}
    </div>
  );
}
