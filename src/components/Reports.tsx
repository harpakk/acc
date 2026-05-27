/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { dbService } from '../db';
import { Account, AccountingVoucher, VoucherEntry } from '../types';
import { 
  TrendingUp, 
  Search, 
  Printer, 
  FileCheck2, 
  PieChart, 
  Layers, 
  ArrowUpRight, 
  ArrowDownLeft 
} from 'lucide-react';

interface ReportsProps {
  initialSubView: 'balance' | 'profit-loss' | 'capital' | 'review';
}

export default function Reports({ initialSubView }: ReportsProps) {
  const [subView, setSubView] = useState(initialSubView);
  
  // Db elements state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [vouchers, setVouchers] = useState<AccountingVoucher[]>([]);

  // Account review filter selector state
  const [reviewAccountId, setReviewAccountId] = useState('');

  useEffect(() => {
    setSubView(initialSubView);
    loadData();
  }, [initialSubView]);

  const loadData = () => {
    setAccounts(dbService.getAccounts());
    setVouchers(dbService.getAccountingVouchers());
  };

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
    </div>
  );
}
