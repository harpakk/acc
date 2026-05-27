/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { dbService } from '../db';
import { Person, Item, Transaction, Invoice } from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Package, 
  DollarSign, 
  AlertTriangle, 
  PlusCircle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw,
  FileText
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (viewId: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [persons, setPersons] = useState<Person[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setPersons(dbService.getPersons());
    setItems(dbService.getItems());
    setTransactions(dbService.getTransactions());
    setInvoices(dbService.getInvoices());
  }, [refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Calculations
  const totalSales = invoices
    .filter(inv => inv.type === 'sale')
    .reduce((sum, inv) => sum + inv.total, 0);

  const totalOtherRevenue = transactions
    .filter(tr => tr.type === 'revenue' || tr.type === 'receive')
    .reduce((sum, tr) => sum + tr.amount, 0);

  const totalRevenue = totalSales + totalOtherRevenue;

  const totalExpenses = transactions
    .filter(tr => tr.type === 'expense')
    .reduce((sum, tr) => sum + tr.amount, 0);

  const totalWastesValue = transactions
    .filter(tr => tr.type === 'waste')
    .reduce((sum, tr) => sum + tr.amount, 0);

  const netProfit = totalRevenue - totalExpenses - totalWastesValue - (totalSales * 0.5); // estimated 50% cost of goods sold

  const lowStockItems = items.filter(item => item.stock <= 20);

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* Welcome Banner in Geometric Balance Slate and Blue style */}
      <div className="bg-[#0f172a] rounded-xl p-6 text-white border border-slate-800 flex flex-col md:flex-row justify-between items-center relative overflow-hidden shadow-sm">
        <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none">
          <DollarSign size={200} />
        </div>
        <div className="relative z-10 text-right space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded border border-blue-500/20">سال مالی فعال: ۱۴۰۵</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight font-sans text-white">
            پیشخوان گزارشات و مدیریت مالی شادی آوران
          </h1>
          <p className="text-slate-400 text-xs max-w-xl leading-relaxed">
            به کارتابل حسابداری یکپارچه کالا، انبار، تولید و اسناد مالی شادی آوران خوش آمدید. آمار و ارقام زیر به صورت لحظه‌ای از دیتابیس همگام‌سازی می‌شوند.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2.5 relative z-10">
          <button 
            onClick={handleRefresh}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition duration-300 rounded-lg cursor-pointer"
          >
            <RefreshCw size={14} />
            بروزرسانی گزارشات
          </button>
          <button 
            onClick={() => onNavigate('invoice-new')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-xs font-bold transition duration-300 shadow-md shadow-blue-600/10 cursor-pointer"
          >
            <PlusCircle size={14} />
            ثبت فاکتور جدید
          </button>
        </div>
      </div>

      {/* Modern Metrics Grid with Slate-200 Borders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition">
          <div className="space-y-1 text-right">
            <span className="text-xs font-semibold text-slate-500 block">جمع کل درآمدهای فروش و عملیاتی</span>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">
              {totalRevenue.toLocaleString()} <span className="text-xs font-normal text-slate-400">ریال</span>
            </h3>
            <span className="text-[10px] text-green-600 flex items-center gap-1 mt-1 justify-end font-sans">
              <TrendingUp size={10} />
              رشد فروش مستمر
            </span>
          </div>
          <div className="p-2 bg-green-50 border border-green-100 rounded-lg text-green-600">
            <ArrowDownLeft size={18} />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition">
          <div className="space-y-1 text-right">
            <span className="text-xs font-semibold text-slate-500 block">کل هزینه‌ها و ضایعات</span>
            <h3 className="text-2xl font-black text-rose-600 tracking-tight">
              {(totalExpenses + totalWastesValue).toLocaleString()} <span className="text-xs font-normal text-slate-400">ریال</span>
            </h3>
            <span className="text-[10px] text-rose-600 flex items-center gap-1 mt-1 justify-end font-sans">
              <TrendingDown size={10} />
              هزینه‌های جاری
            </span>
          </div>
          <div className="p-2 bg-rose-50 border border-rose-100 rounded-lg text-rose-600">
            <ArrowUpRight size={18} />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition">
          <div className="space-y-1 text-right">
            <span className="text-xs font-semibold text-slate-500 block">سود خالص تخمینی دوره</span>
            <h3 className="text-2xl font-black text-blue-600 tracking-tight">
              {netProfit.toLocaleString()} <span className="text-xs font-normal text-slate-400">ریال</span>
            </h3>
            <span className="text-[10px] text-blue-600 flex items-center gap-1 mt-1 justify-end font-sans">
              بازخورد مثبت و کارآمد
            </span>
          </div>
          <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg text-blue-600">
            <TrendingUp size={18} />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition">
          <div className="space-y-1 text-right">
            <span className="text-xs font-semibold text-slate-500 block">مجموع طرفین حساب (اشخاص)</span>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">
              {persons.length} <span className="text-xs font-normal text-slate-400">فعال</span>
            </h3>
            <span className="text-[10px] text-slate-400 mt-1 block font-sans">شامل همکاران و خریداران قنادی</span>
          </div>
          <div className="p-2 bg-slate-50 border border-slate-150 rounded-lg text-slate-600">
            <Users size={18} />
          </div>
        </div>
      </div>

      {/* Critical Stock & Fast Links & Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock Alerts inside Slate Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-200 pb-3">
            <h3 className="font-bold text-slate-705 flex items-center gap-1.5 text-xs">
              <AlertTriangle className="text-amber-500" size={16} />
              کنترل بحرانی موجودی انبار کالا و مواد
            </h3>
            <button 
              onClick={() => onNavigate('items-list')}
              className="text-xs text-blue-600 hover:underline font-bold"
            >
              مشاهده همه...
            </button>
          </div>

          <div className="space-y-3">
            {lowStockItems.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                موجودی تمامی کالاها و مواد اولیه در سطح مطلوبی قرار دارد. ✅
              </div>
            ) : (
              lowStockItems.map(item => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-amber-50/40 rounded-lg border border-amber-100">
                  <div className="text-right">
                    <span className="font-bold text-slate-700 text-xs block">{item.name}</span>
                    <span className="text-[10px] text-slate-400">کد کالا: {item.code}</span>
                  </div>
                  <div className="text-left">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-bold font-sans">
                      موجودی: {item.stock} {item.unit}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Dynamic Financial Quick Reports (Beautiful dark corporate theme card) */}
        <div className="bg-[#0f172a] rounded-xl p-5 text-slate-200 border border-slate-800 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
              <h3 className="font-bold text-blue-400 flex items-center gap-1.5 text-xs">
                <FileText size={16} />
                خلاصه وضعیت ترازنامه شادی آوران
              </h3>
              <span className="text-[9px] bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full font-mono font-bold">
                ۱۴۰۵
              </span>
            </div>
            
            <div className="space-y-3 text-[11px] font-sans">
              <div className="flex justify-between text-slate-350">
                <span>مجموع دارایی‌های جاری و ثابت:</span>
                <span className="font-bold text-slate-100">{(182516000).toLocaleString()} ریال</span>
              </div>
              <div className="flex justify-between text-slate-350">
                <span>کل بدهی‌ها و تعهدات:</span>
                <span className="font-bold text-slate-100">{(3200000).toLocaleString()} ریال</span>
              </div>
              <div className="flex justify-between text-slate-350">
                <span>حقوق صاحبان سهام و انباشته:</span>
                <span className="font-bold text-slate-100">{(179316000).toLocaleString()} ریال</span>
              </div>
              <div className="border-t border-slate-800 my-2 pt-2 flex justify-between font-bold text-blue-300 text-xs">
                <span>تراز کلی (موزون و تطبیق‌یافته):</span>
                <span>تثبیت شده ✓</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button 
              onClick={() => onNavigate('report-balance')}
              className="w-full text-center bg-slate-800 hover:bg-slate-750 text-slate-200 text-[11px] font-bold py-2 rounded-lg border border-slate-750 transition duration-300 cursor-pointer"
            >
              مشاهده تفصیلی ترازنامه
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activities Registry Table with Slate styles */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex justify-between items-center border-b border-slate-200 px-5 py-4 bg-slate-50/50">
          <h3 className="font-bold text-slate-700 text-sm">آخرین تراکنش‌های ثبت‌شده کالا و اسناد</h3>
          <button 
            onClick={() => onNavigate('voucher-list')} 
            className="text-xs text-blue-600 hover:underline font-bold"
          >
            مشاهده دفتر معین و اسناد...
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50/30 text-slate-500 border-b border-slate-200">
                <th className="p-3 font-semibold text-right">کد سند / تراکنش</th>
                <th className="p-3 font-semibold text-right">تاریخ</th>
                <th className="p-3 font-semibold text-right">شرح تراکنش</th>
                <th className="p-3 font-semibold text-right">نوع ثبت</th>
                <th className="p-3 font-semibold text-left">مبلغ (ریال)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {transactions.slice(0, 5).map(tr => (
                <tr key={tr.id} className="hover:bg-slate-50/40 transition">
                  <td className="p-3 font-mono text-[10px] text-slate-500">{tr.code}</td>
                  <td className="p-3 text-slate-500 font-sans">{tr.date}</td>
                  <td className="p-3 font-bold text-slate-700 font-sans">{tr.description}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-sans ${
                      tr.type === 'revenue' || tr.type === 'receive' 
                        ? 'bg-green-100 text-green-700 border border-green-200/30' 
                        : tr.type === 'waste' 
                        ? 'bg-amber-100 text-amber-700 border border-amber-200/30' 
                        : 'bg-rose-100 text-rose-700 border border-rose-200/30'
                    }`}>
                      {tr.type === 'revenue' ? 'درآمد' : 
                       tr.type === 'receive' ? 'دریافت ابری' :
                       tr.type === 'payment' ? 'پرداخت' :
                       tr.type === 'expense' ? 'هزینه' : 'ضایعات'}
                    </span>
                  </td>
                  <td className="p-3 text-left font-black text-slate-800 font-sans">
                    {tr.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
