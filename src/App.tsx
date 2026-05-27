/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth, dbService } from './db';
import Dashboard from './components/Dashboard';
import Persons from './components/Persons';
import Items from './components/Items';
import Invoices from './components/Invoices';
import Transactions from './components/Transactions';
import Production from './components/Production';
import Warehouse from './components/Warehouse';
import Accounting from './components/Accounting';
import Reports from './components/Reports';
import Logo from './components/Logo';

import { 
  Home, 
  Users, 
  ArrowRightLeft, 
  ShoppingBag, 
  Coins, 
  TrendingDown, 
  Wrench, 
  Warehouse as WhIcon, 
  BookMarked, 
  BarChart3, 
  Menu, 
  X,
  Sparkles,
  ChevronLeft,
  DollarSign
} from 'lucide-react';

type MainViewType = 'dashboard' | 'persons' | 'items' | 'invoices' | 'transactions' | 'production' | 'warehouse' | 'accounting' | 'reports';

export default function App() {
  const [view, setView] = useState<MainViewType>('dashboard');
  const [subView, setSubView] = useState<any>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isHydrating, setIsHydrating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Run the required testConnection check
    dbService.testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);

      if (currentUser) {
        const personsData = localStorage.getItem('shadi_avaran_persons');
        const itemsData = localStorage.getItem('shadi_avaran_items');
        const hasLocalData = personsData !== null || itemsData !== null;
        if (!hasLocalData) {
          setIsHydrating(true);
        }
        try {
          await dbService.hydrateFromFirestore();
        } catch (error) {
          console.error("Hydration error:", error);
        } finally {
          setIsHydrating(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Auth error:", err);
      setAuthError(err.message || String(err));
    }
  };

  // Helper to switch view instantly
  const navigateTo = (main: MainViewType, sub: string) => {
    setView(main);
    setSubView(sub);
    setMobileMenuOpen(false);
  };

  const navGroups = [
    {
      title: 'اشخاص',
      icon: <Users size={16} />,
      items: [
        { label: 'شخص جدید', action: () => navigateTo('persons', 'persons-new') },
        { label: 'لیست اشخاص', action: () => navigateTo('persons', 'persons-list') }
      ]
    },
    {
      title: 'دریافت و پرداخت',
      icon: <ArrowRightLeft size={16} />,
      items: [
        { label: 'دریافت جدید', action: () => navigateTo('transactions', 'receive-new') },
        { label: 'لیست دریافت‌ها', action: () => navigateTo('transactions', 'receive-list') },
        { label: 'پرداخت جدید', action: () => navigateTo('transactions', 'payment-new') },
        { label: 'لیست پرداخت‌ها', action: () => navigateTo('transactions', 'payment-list') }
      ]
    },
    {
      title: 'کالاها و خدمات',
      icon: <ShoppingBag size={16} />,
      items: [
        { label: 'کالای جدید', action: () => navigateTo('items', 'items-new') },
        { label: 'لیست کالاها', action: () => navigateTo('items', 'items-list') }
      ]
    },
    {
      title: 'فروش و درآمد',
      icon: <Coins size={16} />,
      items: [
        { label: 'فاکتور جدید فروش', action: () => navigateTo('invoices', 'invoices-new') },
        { label: 'لیست فاکتورها', action: () => navigateTo('invoices', 'invoices-list') },
        { label: 'ثبت درآمد جدید', action: () => navigateTo('invoices', 'revenue-new') },
        { label: 'لیست درآمدها', action: () => navigateTo('invoices', 'revenue-list') }
      ]
    },
    {
      title: 'مخارج و ضایعات',
      icon: <TrendingDown size={16} />,
      items: [
        { label: 'هزینه جدید', action: () => navigateTo('transactions', 'expense-new') },
        { label: 'لیست هزینه‌ها', action: () => navigateTo('transactions', 'expense-list') },
        { label: 'ضایعات جدید', action: () => navigateTo('transactions', 'waste-new') },
        { label: 'لیست ضایعات', action: () => navigateTo('transactions', 'waste-list') }
      ]
    },
    {
      title: 'کارگاه تولید کالا',
      icon: <Wrench size={16} />,
      items: [
        { label: 'فرمول تولید (فرمولاسیون)', action: () => navigateTo('production', 'formula-new') },
        { label: 'لیست فرمول‌های تولید', action: () => navigateTo('production', 'formula-list') },
        { label: 'نیازسنجی مواد (MRP)', action: () => navigateTo('production', 'mrp') },
        { label: 'دستور تولید جدید', action: () => navigateTo('production', 'instruction-new') },
        { label: 'لیست دستورهای تولید', action: () => navigateTo('production', 'instruction-list') }
      ]
    },
    {
      title: 'انبارداری',
      icon: <WhIcon size={16} />,
      items: [
        { label: 'صدور حواله انبار جدید', action: () => navigateTo('warehouse', 'voucher-new') },
        { label: 'رسید و حواله‌های انبار', action: () => navigateTo('warehouse', 'voucher-list') },
        { label: 'موجودی انبار کالا', action: () => navigateTo('warehouse', 'stock-status') },
        { label: 'موجودی تمام انبارها', action: () => navigateTo('warehouse', 'all-warehouses') },
        { label: 'انبارگردانی فیزیکی دوره', action: () => navigateTo('warehouse', 'audit') }
      ]
    },
    {
      title: 'حسابداری دفتر کل',
      icon: <BookMarked size={16} />,
      items: [
        { label: 'سند دوبل روزنامه جدید', action: () => navigateTo('accounting', 'voucher-new') },
        { label: 'لیست اسناد و ثبت کل', action: () => navigateTo('accounting', 'voucher-list') },
        { label: 'استقرار تراز افتتاحیه', action: () => navigateTo('accounting', 'opening-balance') },
        { label: 'جدول حساب‌ها (Chart)', action: () => navigateTo('accounting', 'charts') },
        { label: 'تجمیع آرتیکل‌های مالی', action: () => navigateTo('accounting', 'consolidate') },
        { label: 'بستن اتومات سال مالی', action: () => navigateTo('accounting', 'close-year') }
      ]
    },
    {
      title: 'گزارشات آماری',
      icon: <BarChart3 size={16} />,
      items: [
        { label: 'ترازنامه مالی ردیفی', action: () => navigateTo('reports', 'balance') },
        { label: 'صورت سود و زیان (P&L)', action: () => navigateTo('reports', 'profit-loss') },
        { label: 'صورتحساب سرمایه سهام', action: () => navigateTo('reports', 'capital') },
        { label: 'مرور جامع دفاتر معین', action: () => navigateTo('reports', 'review') }
      ]
    }
  ];

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 text-right" dir="rtl">
        <div className="bg-[#1e293b] p-8 rounded-2xl shadow-xl max-w-sm w-full border border-slate-800 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center animate-pulse">
              <Sparkles className="text-white animate-spin" size={32} />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white">نرم‌افزار جامع حسابداری شادی آوران</h1>
            <p className="text-xs text-slate-400 font-medium font-sans">در حال بررسی اطلاعات ورود...</p>
          </div>
          <div className="flex justify-center pt-2">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 text-right" dir="rtl">
        <div className="bg-[#1e293b] p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-800 space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl"></div>

          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <Logo size="lg" className="justify-center" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-white tracking-tight font-sans">سیستم حسابداری پاد ابری شادی آوران</h1>
              <p className="text-xs text-slate-400 font-bold font-sans">بوردگیم، بازی‌های کارتی، جیبی و تفریحات تعاملی</p>
            </div>
          </div>

          <div className="border-t border-slate-850 pt-6 space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed text-center font-sans">
              جهت ورود ایمن به حساب کاربری و همگام‌سازی حساب معین با پایگاه داده کلود پیشرفته، لطفاً با ایمیل گوگل خود وارد شوید.
            </p>

            {authError && (
              <div className="p-3 bg-red-500/15 border border-red-500/20 text-red-400 rounded-xl text-xs text-center font-bold font-sans">
                خطا در احراز هویت: {authError}
              </div>
            )}

            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 hover:bg-slate-100 transition font-bold text-sm py-3.5 rounded-xl shadow-md cursor-pointer font-sans"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5.04c1.67 0 3.19.58 4.38 1.69l3.27-3.27C17.67 1.54 14.98 1 12 1 7.35 1 3.37 3.65 1.39 7.56l3.85 3C6.18 7.37 8.82 5.04 12 5.04z" />
                <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.44c-.28 1.48-1.12 2.73-2.38 3.58l3.69 2.87c2.16-1.99 3.74-4.92 3.74-8.55z" strokeWidth="0" />
                <path fill="#FBBC05" d="M5.24 14.56c-.24-.72-.38-1.5-.38-2.31s.14-1.59.38-2.31l-3.85-3C.56 8.52 0 10.19 0 12s.56 3.48 1.39 5.06l3.85-3z" />
                <path fill="#34A853" d="M12 23c3.24 0 5.97-1.08 7.96-2.91l-3.69-2.87c-1.02.69-2.33 1.1-3.96 1.1-3.18 0-5.82-2.33-6.76-5.52l-3.85 3C3.37 20.35 7.35 23 12 23z" />
              </svg>
              <span>ورود با حساب گوگل (Google Account)</span>
            </button>
          </div>

          <div className="text-center pt-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase font-mono">Cloud Secure Architecture</span>
          </div>
        </div>
      </div>
    );
  }

  if (isHydrating) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 text-right" dir="rtl">
        <div className="bg-[#1e293b] p-8 rounded-2xl shadow-xl max-w-sm w-full border border-slate-800 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center animate-pulse">
              <Sparkles className="text-white animate-bounce" size={32} />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white">در حال همگام‌سازی ابری...</h1>
            <p className="text-xs text-slate-400 font-medium font-sans">سیستم در حال دریافت اطلاعات مالی از پایگاه داده کلود می‌باشد.</p>
          </div>
          <div className="flex justify-center pt-2">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="app_root" className="min-h-screen bg-[#f8fafc] text-[#1e293b] flex flex-col lg:flex-row text-right" dir="rtl">
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex w-64 bg-[#0f172a] text-slate-300 shrink-0 flex-col border-l border-slate-850 shadow-sm overflow-y-auto">
        {/* Shadi Avaran Logo in Geometric Balance style */}
        <div className="p-5 flex items-center gap-3 bg-[#1e293b] border-b border-slate-800/30">
          <Logo size="md" />
        </div>

        {/* Home Navigation button */}
        <div className="px-3 py-3 border-b border-slate-800/40 bg-[#0c1220]/25">
          <button
            onClick={() => navigateTo('dashboard', 'dashboard')}
            className={`w-full flex items-center justify-between px-4 py-2 rounded-md transition font-bold text-xs ${
              view === 'dashboard' ? 'bg-blue-550/10 text-blue-400 border border-blue-500/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Home size={15} />
              <span>پیشخوان و مدیریت کل</span>
            </div>
            <ChevronLeft size={13} className={view === 'dashboard' ? 'opacity-100' : 'opacity-30'} />
          </button>
        </div>

        {/* Dynamic Groups Navigation */}
        <div className="flex-1 px-2 py-4 space-y-3 text-xs custom-scrollbar">
          {navGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="space-y-0.5">
              <span className="px-3 py-1 text-[10px] font-semibold text-slate-500 uppercase block tracking-wider font-sans">
                {group.title}
              </span>
              <div className="space-y-0.5">
                {group.items.map((sub, itemIndex) => {
                  const targetSubView = sub.action.toString().match(/'[^']+'/g)?.[1]?.replace(/'/g, '') || '';
                  const viewMatches = sub.action.toString().match(/'([^']+)',\s*'([^']+)'/);
                  const belongsToView = viewMatches ? viewMatches[1] : '';
                  const isActive = view === belongsToView && subView === targetSubView;
                  
                  return (
                    <button
                      key={itemIndex}
                      onClick={sub.action}
                      className={`w-full text-right px-4 py-1.5 rounded-md transition font-medium block ${
                        isActive 
                          ? 'text-blue-450 bg-blue-500/10 font-bold border-r-2 border-blue-500' 
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {sub.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* User Profile & Logout section at the bottom of sidebar to match Geometric Balance bg-[#0c1220] */}
        <div className="mt-auto p-4 border-t border-slate-800 bg-[#0c1220] text-xs flex flex-col gap-3">
          <div className="flex items-center gap-3">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 rounded-full ring-2 ring-slate-800" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center font-bold text-white text-xs">
                {(user.displayName || user.email || 'U').substring(0, 1).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col truncate">
              <p className="text-slate-200 font-extrabold truncate text-[11px] font-sans">{user.displayName || 'کاربر سیستم'}</p>
              <p className="text-slate-500 text-[9px] truncate font-mono">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut(auth)}
            className="w-full text-center py-2 bg-slate-850 hover:bg-red-950/40 hover:text-red-400 text-slate-400 font-bold rounded-lg transition font-sans cursor-pointer text-[10px]"
          >
            خروج از سیستم
          </button>
        </div>
      </aside>

      {/* Mobile Bar */}
      <header className="lg:hidden bg-[#0f172a] text-white p-4 flex items-center justify-between border-b border-slate-800 shadow-md">
        <Logo size="sm" />
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 hover:bg-[#1e293b] rounded-xl transition"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-[#0f172a] text-slate-300 p-6 overflow-y-auto space-y-6">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <span className="font-black text-white text-lg">لیست منو فصول شادی آوران</span>
            <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-[#1e293b] rounded-xl">
              <X size={20} />
            </button>
          </div>

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              navigateTo('dashboard', 'dashboard');
            }}
            className="w-full flex items-center gap-3 px-4 py-3 bg-blue-600 text-white font-bold rounded-xl text-xs"
          >
            <Home size={16} />
            پیشخوان و مدیریت کل
          </button>

          {navGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="space-y-1 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 px-4 block">{group.title}</span>
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {group.items.map((sub, itemIndex) => (
                  <button
                    key={itemIndex}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      sub.action();
                    }}
                    className="text-right py-2 px-3 bg-slate-800/40 hover:bg-slate-800 rounded-xl text-[11px] text-slate-300 transition"
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Mobile User Profile & log out at the bottom of mobile drawer */}
          <div className="border-t border-slate-800 pt-4 flex flex-col gap-3 text-xs">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ''} className="w-9 h-9 rounded-full ring-2 ring-blue-500/20" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center font-bold text-white text-xs">
                  {(user.displayName || user.email || 'U').substring(0, 1).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0 text-right">
                <p className="text-slate-200 font-extrabold truncate text-[11px] font-sans">{user.displayName || 'کاربر سیستم'}</p>
                <p className="text-slate-400 text-[9px] truncate font-mono">{user.email}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                signOut(auth);
              }}
              className="w-full text-center py-2.5 bg-slate-800 hover:bg-slate-700/60 text-red-400 font-bold rounded-xl transition font-sans cursor-pointer"
            >
              خروج از حساب کاربری
            </button>
          </div>
        </div>
      )}

      {/* Main Panel Content with Fluid Wrapper */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Dynamic Section rendering views */}
        {view === 'dashboard' && (
          <Dashboard 
            onNavigate={(id) => {
              if (id === 'items-list') navigateTo('items', 'items-list');
              else if (id === 'report-balance') navigateTo('reports', 'balance');
              else if (id === 'voucher-list') navigateTo('accounting', 'voucher-list');
              else navigateTo('dashboard', 'dashboard');
            }} 
          />
        )}
        {view === 'persons' && <Persons initialSubView={subView as any} />}
        {view === 'items' && <Items initialSubView={subView as any} />}
        {view === 'invoices' && <Invoices initialSubView={subView as any} />}
        {view === 'transactions' && <Transactions initialSubView={subView as any} />}
        {view === 'production' && <Production initialSubView={subView as any} />}
        {view === 'warehouse' && <Warehouse initialSubView={subView as any} />}
        {view === 'accounting' && <Accounting initialSubView={subView as any} />}
        {view === 'reports' && <Reports initialSubView={subView as any} />}
      </main>
    </div>
  );
}
