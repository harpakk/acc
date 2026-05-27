/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { dbService } from '../db';
import { Item, Category } from '../types';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  CheckCircle2, 
  Package, 
  Sparkles,
  Upload, 
  Tag, 
  Box, 
  Grid, 
  List, 
  Image as ImageIcon,
  FolderPlus,
  Coins,
  AlertCircle,
  Clock,
  ExternalLink,
  Layers,
  ChevronDown,
  X,
  Download
} from 'lucide-react';

interface ItemsProps {
  initialSubView: 'new' | 'list' | 'items-new' | 'items-list';
}

// Interactive Playful Preset avatars for board games when user doesn't upload a picture
const DEFAULT_PRESETS = [
  { id: 'preset_pocket', label: 'بازی جیبی / کارت بازی', icon: '🃏', color: 'from-amber-450 to-orange-500' },
  { id: 'preset_party', label: 'پارتی گیم / بازی گروهی', icon: '🥳', color: 'from-pink-500 to-rose-500' },
  { id: 'preset_board', label: 'برد گیم / بازی رومیزی', icon: '🎲', color: 'from-blue-500 to-indigo-600' },
  { id: 'preset_strategy', label: 'بازی استراتژیک', icon: '🏰', color: 'from-emerald-500 to-teal-600' },
  { id: 'preset_abstract', label: 'بازی انتزاعی', icon: '💎', color: 'from-purple-500 to-violet-600' },
  { id: 'preset_box', label: 'کارتن / جعبه عمومی', icon: '📦', color: 'from-slate-400 to-slate-600' }
];

export default function Items({ initialSubView }: ItemsProps) {
  // Convert parent subview string to local views
  const normalizedView = (initialSubView === 'new' || initialSubView === 'items-new') ? 'new' : 'list';
  
  const [subView, setSubView] = useState<'new' | 'list'>(normalizedView);
  const [displayMode, setDisplayMode] = useState<'grid' | 'table'>('grid');
  
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form Fields
  const [itemId, setItemId] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [unitText, setUnitText] = useState('عدد'); // Default unit to "عدد" (pieces) for board games
  const [price, setPrice] = useState<number | ''>(''); // Sale price (Rial)
  const [cost, setCost] = useState<number | ''>('');  // Purchase cost (Rial)
  const [stock, setStock] = useState<number | ''>(''); // Initial stock
  const [category, setCategory] = useState('برد گیم'); // Default category
  const [numberInBox, setNumberInBox] = useState<number | ''>(''); // تعداد در کارتن
  const [pic, setPic] = useState(''); // Base64 or Preset ID

  // Inline Category Creator Utility
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState('');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    const freshView = (initialSubView === 'new' || initialSubView === 'items-new') ? 'new' : 'list';
    setSubView(freshView);
    loadData();
  }, [initialSubView]);

  const loadData = () => {
    const rawItems = dbService.getItems();
    setItems(rawItems);
    
    const rawCats = dbService.getCategories();
    setCategories(rawCats);
  };

  // Preset Selector Auto-setter
  const selectPreset = (presetId: string) => {
    setPic(presetId);
  };

  // Convert uploaded image to base64 string
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 900000) {
        alert('حجم عکس انتخاب شده بالا است (حدمجاز: ۹۰۰ کیلوبایت). لطفاً تصویر کوچکتری انتخاب کنید تا سرعت هماهنگ‌سازی ابری حفظ شود.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPic(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Quick In-place Category creation
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newCategoryName.trim();
    if (!cleanName) return;

    // Check duplicate
    const exists = categories.some(c => c.name.toLowerCase() === cleanName.toLowerCase());
    if (exists) {
      setCategoryError('این دسته‌بندی در حال حاضر وجود دارد.');
      return;
    }

    const newCat: Category = {
      id: `cat_${Date.now()}`,
      name: cleanName,
      createdAt: new Date().toISOString()
    };

    const updatedCategories = dbService.saveCategory(newCat);
    setCategories(updatedCategories);
    setCategory(cleanName); // auto select new category
    setNewCategoryName('');
    setCategoryError('');
    setShowCategoryModal(false);
    showNotice(`دسته‌بندی جدید "${cleanName}" با موفقیت ذخیره شد`);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newItem: Item = {
      id: itemId || `item_${Date.now()}`,
      name: name.trim(),
      code: code.trim() || `ITM-${Math.floor(Math.random() * 90000) + 10000}`,
      unit: unitText.trim() || 'عدد',
      price: price === '' ? 0 : Number(price),
      cost: cost === '' ? 0 : Number(cost),
      stock: stock === '' ? 0 : Number(stock),
      category: category,
      numberInBox: numberInBox === '' ? 0 : Number(numberInBox),
      pic: pic || 'preset_box',
      createdAt: new Date().toISOString()
    };

    dbService.saveItem(newItem);
    showNotice(itemId ? 'کالا با موفقیت ویرایش شد' : 'کالای جدید با موفقیت ثبت و بر روی بستر کلود بارگذاری شد');
    resetForm();
    loadData();
    setSubView('list');
  };

  const handleEdit = (itm: Item) => {
    setItemId(itm.id);
    setName(itm.name);
    setCode(itm.code);
    setUnitText(itm.unit || 'عدد');
    setPrice(itm.price || '');
    setCost(itm.cost || '');
    setStock(itm.stock || '');
    setCategory(itm.category || 'برد گیم');
    setNumberInBox(itm.numberInBox || '');
    setPic(itm.pic || '');
    setSubView('new');
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmId) {
      dbService.deleteItem(deleteConfirmId);
      loadData();
      showNotice('کالا با موفقیت حذف گردید');
      setDeleteConfirmId(null);
    }
  };

  const handleDownloadCatalog = () => {
    if (items.length === 0) {
      alert('هیچ کالایی برای دانلود وجود ندارد.');
      return;
    }

    // Generate list of items HTML inside separate template bounds
    const itemsHtml = items.map(itm => {
      let picHtml = '';
      if (itm.pic && itm.pic.startsWith('data:image')) {
        picHtml = `<img class="item-img" src="${itm.pic}" alt="${itm.name}" referrerpolicy="no-referrer" />`;
      } else {
        const presetsMap: Record<string, { emoji: string, hexStart: string, hexEnd: string }> = {
          'preset_pocket': { emoji: '🃏', hexStart: '#f59e0b', hexEnd: '#d97706' },
          'preset_party': { emoji: '🥳', hexStart: '#ec4899', hexEnd: '#e11d48' },
          'preset_board': { emoji: '🎲', hexStart: '#3b82f6', hexEnd: '#4f46e5' },
          'preset_strategy': { emoji: '🏰', hexStart: '#10b981', hexEnd: '#0f766e' },
          'preset_abstract': { emoji: '💎', hexStart: '#a855f7', hexEnd: '#6d28d9' },
          'preset_box': { emoji: '📦', hexStart: '#94a3b8', hexEnd: '#475569' }
        };
        const found = presetsMap[itm.pic || 'preset_box'] || { emoji: '🎲', hexStart: '#6366f1', hexEnd: '#3b82f6' };
        picHtml = `<div class="preset-avatar" style="background: linear-gradient(135deg, ${found.hexStart}, ${found.hexEnd}); color: white;">${found.emoji}</div>`;
      }

      const priceNum = itm.price || 0;
      const priceTomanVal = Math.floor(priceNum / 10);
      const priceTomanStr = priceTomanVal ? priceTomanVal.toLocaleString() + ' تومان' : 'رایگان / رایزنی';

      return `
      <div class="card">
        <div class="image-container">
          <span class="badge">${itm.category || 'برد گیم'}</span>
          ${picHtml}
        </div>
        <div class="content">
          <div>
            <div class="title-row">
              <span class="title">${itm.name}</span>
              <span class="code">${itm.code || '-'}</span>
            </div>
            
            <div class="specs">
              <div class="spec-item">
                <span>تعداد در کارتن:</span>
                <strong>${itm.numberInBox || 1} عدد</strong>
              </div>
              <div class="spec-item">
                <span>واحد شمارش:</span>
                <strong>${itm.unit || 'عدد'}</strong>
              </div>
              <div class="spec-item">
                <span>موجودی انبار:</span>
                <strong>${itm.stock.toLocaleString()} ${itm.unit || 'عدد'}</strong>
              </div>
            </div>
          </div>
          
          <div class="price-section">
            <div class="price-label">قیمت فروش مصرف‌کننده:</div>
            <div class="price-value">${priceTomanStr}</div>
            <div class="price-rial">${priceNum.toLocaleString()} ریال</div>
          </div>
        </div>
      </div>`;
    }).join('\n');

    const htmlContent = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>دفترچه کاتالوگ محصولات شادی آوران</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;700;900&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Vazirmatn', system-ui, -apple-system, sans-serif;
    }
    
    body {
      background-color: #f8fafc;
      color: #1e293b;
      padding: 40px 20px;
      direction: rtl;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 25px;
      border-bottom: 2px solid #e2e8f0;
    }
    
    header h1 {
      font-size: 28px;
      font-weight: 900;
      color: #4f46e5;
      margin-bottom: 8px;
    }
    
    header p {
      font-size: 14px;
      color: #64748b;
    }
    
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
    }
    
    .card {
      background: white;
      border-radius: 16px;
      border: 1px solid #f1f5f9;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
      transition: transform 0.2s, box-shadow 0.2s;
      display: flex;
      flex-direction: column;
    }
    
    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }
    
    .image-container {
      height: 180px;
      background-color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      position: relative;
      border-bottom: 1px solid #f1f5f9;
    }
    
    .item-img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: 12px;
    }
    
    .preset-avatar {
      width: 80px;
      height: 80px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 44px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.08);
    }
    
    .badge {
      position: absolute;
      top: 12px;
      right: 12px;
      background: rgba(255, 255, 255, 0.9);
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 700;
      color: #4f46e5;
      border: 1px solid #e2e8f0;
      backdrop-filter: blur(4px);
    }
    
    .content {
      padding: 20px;
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    
    .title-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
      gap: 10px;
    }
    
    .title {
      font-size: 16px;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.4;
      max-width: 75%;
    }
    
    .code {
      font-family: monospace;
      font-size: 11px;
      color: #94a3b8;
      background: #f8fafc;
      padding: 2px 6px;
      border-radius: 4px;
      word-break: keep-all;
    }
    
    .specs {
      margin-bottom: 16px;
    }
    
    .spec-item {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #64748b;
      margin-bottom: 6px;
    }
    
    .spec-item strong {
      color: #334155;
    }
    
    .price-section {
      margin-top: auto;
      padding-top: 12px;
      border-top: 1px solid #f1f5f9;
    }
    
    .price-label {
      font-size: 11px;
      color: #64748b;
      margin-bottom: 4px;
    }
    
    .price-value {
      font-size: 18px;
      font-weight: 700;
      color: #059669;
    }
    
    .price-rial {
      font-size: 11px;
      color: #94a3b8;
      font-family: monospace;
    }
    
    footer {
      text-align: center;
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #94a3b8;
    }
    
    @media print {
      body {
        background-color: white;
        padding: 0;
      }
      .card {
        box-shadow: none;
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>کاتالوگ محصولات و بردگیم‌های شادی آوران</h1>
      <p>سیستم یکپارچه حسابداری و مدیریت مالی تفریحی | تاریخ گزارش: ${new Date().toLocaleDateString('fa-IR')} (${new Date().toISOString().slice(0, 10)})</p>
    </header>
    
    <div class="grid">
      ${itemsHtml}
    </div>
    
    <footer>
      <p>طراحی شده به صورت کاملاً آفلاین توسط سیستم حسابداری پاد ابری شادی آوران</p>
    </footer>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `catalog-shadi-avaran-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotice('کاتالوگ کامل کالاها با تصاویر با موفقیت دانلود شد');
  };

  const resetForm = () => {
    setItemId('');
    setName('');
    setCode('');
    setUnitText('عدد');
    setPrice('');
    setCost('');
    setStock('');
    setCategory('برد گیم');
    setNumberInBox('');
    setPic('');
  };

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const filteredItems = items.filter(itm => {
    const matchesSearch = 
      itm.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (itm.code && itm.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (itm.category && itm.category.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (selectedCategoryFilter === 'all') {
      return matchesSearch;
    }
    return matchesSearch && itm.category === selectedCategoryFilter;
  });

  // Toman Display Conversion Helper
  const toToman = (rialAmount: number | string) => {
    if (!rialAmount) return '۰ تومان';
    const num = Number(rialAmount);
    const toman = Math.floor(num / 10);
    return `${toman.toLocaleString()} تومان`;
  };

  // Helper to render Avatar Icon
  const renderItemPic = (itm: Item) => {
    if (!itm.pic) {
      return (
        <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center text-lg">
          📦
        </div>
      );
    }

    if (itm.pic.startsWith('data:image')) {
      return (
        <img 
          src={itm.pic} 
          alt={itm.name} 
          className="w-12 h-12 rounded-xl object-cover ring-2 ring-slate-100 shadow-sm"
          referrerPolicy="no-referrer"
        />
      );
    }

    // Is preset
    const presetObj = DEFAULT_PRESETS.find(p => p.id === itm.pic);
    const emoji = presetObj ? presetObj.icon : '🎲';
    const bgGrad = presetObj ? presetObj.color : 'from-indigo-500 to-blue-500';

    return (
      <div className={`w-12 h-12 bg-gradient-to-br ${bgGrad} text-white rounded-xl flex items-center justify-center text-2xl shadow-sm ring-2 ring-white/10`}>
        {emoji}
      </div>
    );
  };

  // Helper to render large Avatar Preview inside form
  const renderLargePreview = () => {
    if (!pic) {
      return (
        <div className="w-24 h-24 border border-dashed border-slate-200 bg-slate-50 text-slate-400 rounded-2xl flex flex-col items-center justify-center text-xs">
          <ImageIcon size={22} className="text-slate-355 mb-1" />
          <span>بدون تصویر</span>
        </div>
      );
    }

    if (pic.startsWith('data:image')) {
      return (
        <div className="relative group w-24 h-24">
          <img 
            src={pic} 
            alt="پیش‌نمایش" 
            className="w-24 h-24 rounded-2xl object-cover ring-4 ring-slate-100 hover:scale-105 transition"
            referrerPolicy="no-referrer"
          />
          <button 
            type="button"
            onClick={() => setPic('')}
            className="absolute -top-1.5 -left-1.5 bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-full shadow-lg transition"
          >
            <X size={12} />
          </button>
        </div>
      );
    }

    // Is preset
    const presetObj = DEFAULT_PRESETS.find(p => p.id === pic);
    const emoji = presetObj ? presetObj.icon : '🎲';
    const bgGrad = presetObj ? presetObj.color : 'from-indigo-500 to-blue-500';

    return (
      <div className="relative group">
        <div className={`w-24 h-24 bg-gradient-to-br ${bgGrad} text-white rounded-2xl flex items-center justify-center text-4xl shadow-md ring-4 ring-slate-50`}>
          {emoji}
        </div>
        <button 
          type="button"
          onClick={() => setPic('')}
          className="absolute -top-1.5 -left-1.5 bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-full shadow-lg transition"
        >
          <X size={12} />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6 text-right animate-fade-in" dir="rtl">
      {/* Alert Notification */}
      {notification && (
        <div className="fixed top-4 left-4 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl z-50 text-sm flex items-center gap-2 font-medium">
          <CheckCircle2 size={18} />
          {notification}
        </div>
      )}

      {/* Screen Headers */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            {subView === 'new' ? (itemId ? 'ویرایش کالا / برد گیم' : 'ثبت کالا و خدمات جدید بازی') : 'مدیریت و فصاحت کالاها (کالاها)'}
          </h2>
          <p className="text-slate-400 text-xs mt-1 font-sans">
            {subView === 'new' ? 'ثبت بارکد، تصویر شاخص، تعداد در کارتن و ویژگی‌های کالا' : 'کاتالوگ یکپارچه بردگیم‌ها، بازی‌های جیبی و تفریحی شادی آوران'}
          </p>
        </div>
        
        <div className="mt-4 lg:mt-0 flex flex-wrap gap-2.5 font-sans">
          {subView === 'list' && (
            <button
              onClick={handleDownloadCatalog}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-500/10 flex items-center gap-1.5 transition duration-300 cursor-pointer"
              title="دانلود کاتالوگ زیبا حاوی تصاویر و قیمت‌ها جهت ارائه به مشتریان"
            >
              <Download size={14} />
              <span>دانلود کاتالوگ (HTML)</span>
            </button>
          )}
          <button
            onClick={() => { setSubView('list'); resetForm(); }}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition duration-300 ${
              subView === 'list' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-505/10' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
            }`}
          >
            لیست کالا ها
          </button>
          <button
            onClick={() => { setSubView('new'); resetForm(); }}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition duration-300 ${
              subView === 'new' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-505/10' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
            }`}
          >
            کالای جدید +
          </button>
        </div>
      </div>

      {subView === 'new' ? (
        /* Form View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Main Attributes Form */}
          <div className="col-span-1 lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-md font-bold text-slate-850 flex items-center gap-2 border-b border-slate-50 pb-3">
              <Sparkles className="text-indigo-600" size={16} />
              <span>مشخصات شناسنامه‌ای کالا</span>
            </h3>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">نام کالا (برد گیم / محصول) <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: بردگیم استوژیت پلاس"
                    className="w-full bg-slate-50 focus:bg-white border border-slate-100 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 transition duration-300 text-slate-700 font-sans font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">کد سیستمی (بارکد / شناسه فنی)</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="مثال: ITM-90212"
                    className="w-full bg-slate-50 focus:bg-white border border-slate-100 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 transition duration-300 text-slate-700 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">دسته‌بندی اصلی کالا <span className="text-rose-500">*</span></label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-slate-50 focus:bg-white border border-slate-100 rounded-xl pr-4 pl-8 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 transition duration-300 text-slate-700 font-sans font-medium appearance-none cursor-pointer"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                      <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                        <ChevronDown size={14} />
                      </span>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setShowCategoryModal(true)}
                      className="px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center border border-indigo-100/50 transition"
                      title="ایجاد دسته‌بندی جدید در جا"
                    >
                      <FolderPlus size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">تعداد در کارتن (نمونه عمده) <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={numberInBox}
                    onChange={(e) => setNumberInBox(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="مثال: ۲۴"
                    className="w-full bg-slate-50 focus:bg-white border border-slate-100 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 transition duration-300 text-slate-700 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">واحد شمارشی <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={unitText}
                    onChange={(e) => setUnitText(e.target.value)}
                    placeholder="کیلوگرم، عدد، جعبه، بسته"
                    className="w-full bg-slate-50 focus:bg-white border border-slate-100 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 transition duration-300 text-slate-700 font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">موجودی فیزیکی اولیه در انبار <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="۰"
                    className="w-full bg-slate-50 focus:bg-white border border-slate-100 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 transition duration-300 text-slate-700 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">قیمت تمام‌شده / خرید کالا (ریال)</label>
                  <input
                    type="number"
                    min="0"
                    value={cost}
                    onChange={(e) => setCost(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="مثال: ۲۵۰۰۰۰۰"
                    className="w-full bg-slate-50 focus:bg-white border border-slate-100 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 transition duration-300 text-slate-700 font-mono"
                  />
                  {cost !== '' && (
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      معادل: {toToman(cost)}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">قیمت فروش مصرف‌کننده (ریال) <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="مثال: ۴۰۰۰۰۰۰"
                    className="w-full bg-slate-50 focus:bg-white border border-slate-100 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 transition duration-300 text-slate-700 font-mono"
                  />
                  {price !== '' && (
                    <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                      معادل: {toToman(price)}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-4 flex gap-2">
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-md transition duration-300"
                >
                  {itemId ? 'اعمال تغییرات کالا' : 'ذخیره و همگام‌سازی کالا'}
                </button>
                <button
                  type="button"
                  onClick={() => { setSubView('list'); resetForm(); }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-6 py-2.5 rounded-xl text-xs transition duration-300"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>

          {/* Picture selection side panel */}
          <div className="col-span-1 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-850 flex items-center gap-2 border-b border-slate-50 pb-3">
                <ImageIcon className="text-indigo-600" size={16} />
                <span>تصویر یا آیکون کالا</span>
              </h3>

              <div className="flex flex-col items-center py-2 space-y-4">
                {/* Visual Avatar preview container */}
                {renderLargePreview()}

                <div className="w-full text-center">
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-150 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition">
                    <Upload size={14} />
                    <span>بارگذاری تصویر دلخواه</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      className="hidden" 
                    />
                  </label>
                  <p className="text-[9px] text-slate-400 mt-1">فرمت‌های رایج تصویر تا سقف ۹۰۰ کیلوبایت</p>
                </div>
              </div>

              <div className="border-t border-slate-50 pt-4 space-y-2">
                <span className="text-xs font-bold text-slate-500 block">یا انتخاب از طرح‌های آیکون پیشنهادی:</span>
                <div className="grid grid-cols-2 gap-2">
                  {DEFAULT_PRESETS.map((pst) => (
                    <button
                      key={pst.id}
                      type="button"
                      onClick={() => selectPreset(pst.id)}
                      className={`p-2 bg-slate-50 border rounded-xl font-sans text-xs flex items-center gap-1.5 text-right cursor-pointer hover:bg-slate-100 hover:border-slate-355 transition ${
                        pic === pst.id ? 'border-indigo-500 ring-2 ring-indigo-505/10 bg-indigo-50/20 text-indigo-805' : 'border-slate-100 text-slate-600'
                      }`}
                    >
                      <span className="text-xl shrink-0">{pst.icon}</span>
                      <span className="truncate text-[10px] font-semibold">{pst.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 text-[10px] text-amber-700 flex gap-2 items-start mt-4">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                ذخیره تصاویر دلخواه در پایگاه داده ابری فایربیس کامپکت شده و به صورت آنلاین بین مرورگر شما و کلود هماهنگ خواهد شد.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* List View */
        <div className="space-y-4 font-sans">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search inputs and Category Filters */}
            <div className="w-full flex-1 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  placeholder="جست‌وجو در عنوان، شناسه یا دسته‌بندی کالا..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50/70 border-0 rounded-xl pr-10 pl-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 transition duration-300 text-slate-700"
                />
              </div>

              {/* Dynamic Category Filter */}
              <div className="relative min-w-[150px]">
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="w-full bg-slate-50/70 border-0 rounded-xl pr-4 pl-8 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 transition duration-300 text-slate-700 cursor-pointer appearance-none text-right font-medium"
                >
                  <option value="all">همه دسته‌بندی‌ها</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
                <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                  <ChevronDown size={14} />
                </span>
              </div>
            </div>

            {/* View Mode Pickers */}
            <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-xl self-end md:self-auto shrink-0">
              <button
                onClick={() => setDisplayMode('grid')}
                className={`p-1.5 rounded-lg transition ${
                  displayMode === 'grid' ? 'bg-white text-indigo-650 shadow-sm' : 'text-slate-400 hover:text-slate-605'
                }`}
                title="نمایش ویترینی / گرید منو"
              >
                <Grid size={16} />
              </button>
              <button
                onClick={() => setDisplayMode('table')}
                className={`p-1.5 rounded-lg transition ${
                  displayMode === 'table' ? 'bg-white text-indigo-650 shadow-sm' : 'text-slate-400 hover:text-slate-605'
                }`}
                title="نمایش لیستی زرد"
              >
                <List size={16} />
              </button>
            </div>
          </div>

          {/* Catalog Layout logic */}
          {filteredItems.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-50 shadow-sm text-slate-400">
              <Package size={48} className="mx-auto mb-3 opacity-30 text-indigo-200" />
              <p className="text-sm font-semibold">محصولی در این بخش یافت نشد.</p>
              <p className="text-xs text-slate-355 mt-1">با زدن کلید «کالای جدید» اولین کالا یا بازی خود را اضافه کنید.</p>
            </div>
          ) : displayMode === 'grid' ? (
            /* Premium Bento/Grid Cards Catalog */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredItems.map(itm => (
                <div key={itm.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md hover:border-slate-200/80 transition duration-300 flex flex-col group relative">
                  {/* Category Badge absolute */}
                  <span className="absolute top-3 right-3 z-10 px-2.5 py-1 bg-white/90 backdrop-blur-md text-indigo-750 border border-slate-50 font-sans text-[9px] font-extrabold rounded-lg shadow-sm">
                    {itm.category || 'بدون دسته‌بندی'}
                  </span>

                  {/* Card Thumbnail Area with presets style */}
                  <div className="h-36 bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden shrink-0 border-b border-slate-50">
                    <div className="absolute inset-0 bg-radial-at-t from-transparent via-transparent to-black/5 opacity-40"></div>
                    {/* Visual box shadow scaling */}
                    <div className="transform group-hover:scale-110 duration-500 transition">
                      {renderItemPic(itm)}
                    </div>
                  </div>

                  {/* Main specs card body */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3 font-sans">
                    <div className="space-y-1">
                      <div className="flex justify-between items-start gap-1">
                        <h4 className="font-extrabold text-slate-800 text-xs tracking-tight line-clamp-1 group-hover:text-indigo-650 transition">
                          {itm.name}
                        </h4>
                        <span className="text-[9px] text-slate-400 font-mono font-medium shrink-0">
                          {itm.code}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        <Box size={12} className="text-slate-350" />
                        <span>تعداد در کارتن:</span>
                        <strong className="text-slate-650 font-mono text-[11px] font-semibold">{itm.numberInBox || '۱'} عدد</strong>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        <Layers size={12} className="text-slate-350" />
                        <span>موجودی انبار:</span>
                        <strong className={`font-mono text-[11px] ${(itm.stock || 0) <= 20 ? 'text-rose-600 font-extrabold' : 'text-slate-650 font-semibold'}`}>
                          {(itm.stock || 0).toLocaleString()} {itm.unit || 'عدد'}
                        </strong>
                      </div>
                    </div>

                    {/* Price in Rial and Toman */}
                    <div className="pt-2 border-t border-slate-50 flex flex-col">
                      <span className="text-[10px] text-slate-400 leading-none">قیمت مصرف‌کننده</span>
                      <strong className="text-emerald-600 text-xs font-bold font-mono mt-1">
                        {toToman(itm.price || 0)}
                      </strong>
                      <span className="text-[8px] text-slate-350 font-mono">
                        {(itm.price || 0).toLocaleString()} ریال
                      </span>
                    </div>

                    {/* Actions Panel on bottom hover overlay */}
                    <div className="pt-2.5 border-t border-slate-50 flex justify-end gap-1.5">
                      <button
                        onClick={() => handleEdit(itm)}
                        className="p-2 hover:bg-slate-55 flex-1 max-w-[40px] text-indigo-600 rounded-xl transition border border-slate-50 hover:border-slate-100 flex items-center justify-center cursor-pointer"
                        title="ویرایش محصول"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(itm.id)}
                        className="p-2 hover:bg-rose-50 flex-1 max-w-[40px] text-rose-500 rounded-xl transition border border-slate-50 hover:border-rose-100/50 flex items-center justify-center cursor-pointer"
                        title="حذف کالا"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Traditional tabular catalog with extra parameters */
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-[10px] font-bold uppercase">
                      <th className="p-4 text-center w-16">نمایه</th>
                      <th className="p-4">کد کالا</th>
                      <th className="p-4">عنوان محصول / کالا</th>
                      <th className="p-4">دسته‌بندی</th>
                      <th className="p-4 text-center">تعداد عمده (کارتن)</th>
                      <th className="p-4 text-left">موجودی فیزیکی</th>
                      <th className="p-4 text-left">قیمت خرید (ریال)</th>
                      <th className="p-4 text-left">قیمت مصرف‌کننده (تومان)</th>
                      <th className="p-4 text-center">عملیات مدیریت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-650 font-sans font-medium text-xs">
                    {filteredItems.map(itm => (
                      <tr key={itm.id} className="hover:bg-slate-50/40 transition">
                        <td className="p-4 flex justify-center">
                          <div className="scale-75 shrink-0">
                            {renderItemPic(itm)}
                          </div>
                        </td>
                        <td className="p-4 font-mono text-slate-500 text-[11px]">{itm.code || '-'}</td>
                        <td className="p-4 font-extrabold text-slate-800 text-xs">{itm.name}</td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-slate-50 border border-slate-100 text-slate-600 rounded-lg text-[10px] font-bold">
                            {itm.category || 'برد گیم'}
                          </span>
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-[11px] text-slate-700">{itm.numberInBox || '۱'} عدد</td>
                        <td className={`p-4 text-left font-bold font-mono text-[11px] ${itm.stock <= 20 ? 'text-rose-600 font-extrabold' : 'text-slate-700'}`}>
                          {itm.stock.toLocaleString()} <span className="text-[10px] text-slate-400 font-sans mr-0.5">{itm.unit || 'عدد'}</span>
                        </td>
                        <td className="p-4 text-left font-mono text-slate-400">{(itm.cost || 0).toLocaleString()}</td>
                        <td className="p-4 text-left text-emerald-600 font-extrabold font-sans">
                          <div className="flex flex-col text-left">
                            <span className="text-xs font-bold">{toToman(itm.price || 0)}</span>
                            <span className="text-[8px] font-mono text-slate-400 font-medium">({(itm.price || 0).toLocaleString()} ریال)</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-center gap-1.5">
                            <button
                              onClick={() => handleEdit(itm)}
                              className="p-1 px-2.5 hover:bg-slate-100 text-indigo-600 border border-slate-50 rounded-lg transition"
                              title="ویرایش کالا"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(itm.id)}
                              className="p-1 px-2.5 hover:bg-rose-50 text-rose-600 border border-slate-50 rounded-lg transition"
                              title="حذف کالا"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Beautiful Geometric pop-up for rapid Category creation */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            onClick={() => setShowCategoryModal(false)}
          ></div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-sm w-full p-6 relative z-10 animate-scale-up text-right">
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-50 pb-3">
              <FolderPlus size={18} className="text-indigo-650" />
              <span>ایجاد دسته‌بندی جدید بازی</span>
            </h3>
            
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block">عنوان دسته‌بندی جدید</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="مثال: بازی استراتژیک، خانوادگی"
                  value={newCategoryName}
                  onChange={(e) => {
                    setNewCategoryName(e.target.value);
                    setCategoryError('');
                  }}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs text-slate-700 font-sans focus:ring-2 focus:ring-indigo-500"
                />
                {categoryError && (
                  <p className="text-[9px] text-rose-500 font-bold">{categoryError}</p>
                )}
              </div>

              <div className="flex gap-2 pt-2 justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  ذخیره دسته‌بندی
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryModal(false);
                    setNewCategoryName('');
                    setCategoryError('');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Exquisite Non-Iframe Sandboxed Modal for Safe Deletion */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            onClick={() => setDeleteConfirmId(null)}
          ></div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-sm w-full p-6 relative z-10 animate-scale-up text-right">
            <div className="flex items-center gap-3 text-rose-600 mb-3 border-b border-slate-50 pb-3">
              <div className="p-2 bg-rose-50 rounded-xl">
                <Trash2 size={20} />
              </div>
              <h3 className="text-sm font-extrabold text-slate-800">تأییدیه حذف محصول</h3>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed mb-6 font-sans">
              آیا از حذف این کالا اطمینان کافی دارید؟ توجه داشته باشید که فاکتورها، رسیدهای انبار و اسناد حسابداری ثبت‌شده پیشین مربوط به این کالا در ترازنامه مالی جهت حفظ زنجیره معین حفظ خواهند شد.
            </p>

            <div className="flex gap-2 justify-end font-sans">
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition duration-200"
              >
                بله، کاملاً حذف شود
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl cursor-pointer transition duration-200"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
