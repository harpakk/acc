/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { dbService } from '../db';
import { Formula, ProductionOrder, Item, FormulaInputItem } from '../types';
import { 
  Sparkles, 
  Search, 
  Trash2, 
  CheckCircle2, 
  Cpu, 
  Workflow, 
  Sliders, 
  AlertOctagon, 
  Hammer,
  Clock,
  CheckCircle
} from 'lucide-react';

interface ProductionProps {
  initialSubView: 'formula-new' | 'formula-list' | 'mrp' | 'order-list' | 'instruction-new' | 'instruction-list';
}

export default function Production({ initialSubView }: ProductionProps) {
  const [subView, setSubView] = useState(initialSubView);
  
  // Database state
  const [items, setItems] = useState<Item[]>([]);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);

  // Formula Form State
  const [formulaName, setFormulaName] = useState('');
  const [outItemId, setOutItemId] = useState('');
  const [outQty, setOutQty] = useState<number>(1);
  const [inputs, setInputs] = useState<FormulaInputItem[]>([]);
  const [formulaCost, setFormulaCost] = useState<number>(0);
  const [formulaDesc, setFormulaDesc] = useState('');

  // Selector help for Formula input ingredients
  const [ingredientId, setIngredientId] = useState('');
  const [ingredientQty, setIngredientQty] = useState<number>(1);

  // MRP System State
  const [mrpFormulaId, setMrpFormulaId] = useState('');
  const [mrpTargetQty, setMrpTargetQty] = useState<number>(10);

  // Instruction Form State
  const [orderNumber, setOrderNumber] = useState('');
  const [orderDate, setOrderDate] = useState('1405/03/05');
  const [instrFormulaId, setInstrFormulaId] = useState('');
  const [instrQty, setInstrQty] = useState<number>(1);
  const [instrDesc, setInstrDesc] = useState('');

  // Notifications
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    setSubView(initialSubView);
    loadData();
    resetForms();
  }, [initialSubView]);

  const loadData = () => {
    setItems(dbService.getItems());
    setFormulas(dbService.getFormulas());
    setOrders(dbService.getProductionOrders());
  };

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const resetForms = () => {
    setFormulaName('');
    setOutItemId('');
    setOutQty(1);
    setInputs([]);
    setFormulaCost(0);
    setFormulaDesc('');
    
    setOrderNumber(`PRD-1405-${Math.floor(Math.random() * 9000) + 1000}`);
    setOrderDate('1405/03/05');
    setInstrFormulaId('');
    setInstrQty(1);
    setInstrDesc('');
  };

  // Add sub-ingredient to the pending formula
  const handleAddIngredient = () => {
    if (!ingredientId || ingredientQty <= 0) return;
    
    const existsIdx = inputs.findIndex(i => i.itemId === ingredientId);
    if (existsIdx >= 0) {
      const copy = [...inputs];
      copy[existsIdx].quantity += ingredientQty;
      setInputs(copy);
    } else {
      setInputs([...inputs, { itemId: ingredientId, quantity: ingredientQty }]);
    }

    setIngredientId('');
    setIngredientQty(1);
  };

  const handleRemoveIngredient = (index: number) => {
    setInputs(inputs.filter((_, i) => i !== index));
  };

  const handleSaveFormula = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formulaName.trim() || !outItemId || inputs.length === 0) {
      alert('لطفا تمامی فیلدها و مخلفات فرمول قنادی را به درستی تعیین کنید.');
      return;
    }

    const newFormula: Formula = {
      id: `form_${Date.now()}`,
      name: formulaName.trim(),
      outputItemId: outItemId,
      outputQuantity: outQty,
      inputItems: inputs,
      cost: formulaCost,
      description: formulaDesc,
      createdAt: new Date().toISOString()
    };

    dbService.saveFormula(newFormula);
    showNotice('فرمول تولیدی جدید با موفقیت ثبت شد.');
    resetForms();
    loadData();
    setSubView('formula-list');
  };

  const handleSaveInstruction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!instrFormulaId || instrQty <= 0) return;

    const newOrder: ProductionOrder = {
      id: `po_${Date.now()}`,
      orderNumber,
      date: orderDate,
      formulaId: instrFormulaId,
      quantity: instrQty,
      status: 'pending',
      description: instrDesc.trim() || `دستور تولید شماره ${orderNumber}`,
      createdAt: new Date().toISOString()
    };

    dbService.saveProductionOrder(newOrder);
    showNotice('فرمان و دستور تولیدی با موفقیت صادر و ثبت شد.');
    resetForms();
    loadData();
    setSubView('instruction-list');
  };

  const handleCompleteOrder = (order: ProductionOrder) => {
    // Locate recipe formula
    const recipe = formulas.find(f => f.id === order.formulaId);
    if (!recipe) return;

    // Check inventory requirement
    let stockIsShort = false;
    const requiredItems: { item: Item; needed: number }[] = [];

    for (const input of recipe.inputItems) {
      const dbItem = items.find(i => i.id === input.itemId);
      if (!dbItem) {
        alert('ماده اولیه فرمول در انبار موجود تمایز ندارد!');
        return;
      }
      const totalIngredientNeeded = (input.quantity / recipe.outputQuantity) * order.quantity;
      requiredItems.push({ item: dbItem, needed: totalIngredientNeeded });

      if (dbItem.stock < totalIngredientNeeded) {
        stockIsShort = true;
      }
    }

    if (stockIsShort) {
      alert('خطا: موجودی انبار مواد خام اولیه برای اتمام این سفارش تولید کافی نیست! لطفا انبار کاهشی را اصلاح کنید.');
      return;
    }

    // Process materials reduction and final product addition
    requiredItems.forEach(req => {
      dbService.saveItem({
        ...req.item,
        stock: Math.max(0, req.item.stock - req.needed)
      });
    });

    const outputProduct = items.find(i => i.id === recipe.outputItemId);
    if (outputProduct) {
      dbService.saveItem({
        ...outputProduct,
        stock: outputProduct.stock + order.quantity
      });
    }

    // Update order status to completed
    dbService.saveProductionOrder({
      ...order,
      status: 'completed'
    });

    showNotice('دستور تولید تکمیل گردید! موجودی مواد اولیه کسر و کالا به انبار افزوده شد.');
    loadData();
  };

  const handleCancelOrder = (order: ProductionOrder) => {
    dbService.saveProductionOrder({
      ...order,
      status: 'cancelled'
    });
    showNotice('دستور تولید لغو گردید.');
    loadData();
  };

  const handleDeleteFormula = (id: string) => {
    if (confirm('آیا از حذف این فرمول ساخت اطمینان دارید؟')) {
      dbService.deleteFormula(id);
      loadData();
      showNotice('فرمول تولیدی به طور کامل حذف شد.');
    }
  };

  return (
    <div className="space-y-6 text-right animate-fade-in" dir="rtl">
      {/* Messages banner */}
      {notification && (
        <div className="fixed top-4 left-4 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl z-50 text-sm flex items-center gap-2">
          <CheckCircle2 size={18} />
          {notification}
        </div>
      )}

      {/* Screen Headers */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-4 text-slate-800">
        <div>
          <h2 className="text-2xl font-bold">بخش برنامه‌ریزی تولید و ساخت شادی آوران</h2>
          <p className="text-slate-400 text-xs mt-1">طراحی فرمولاسیون کیک و فرآورده ها، برآورد مواد خام و کارهای اجرایی</p>
        </div>
        <div className="mt-3 md:mt-0 flex flex-wrap gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
          <button 
            onClick={() => setSubView('formula-new')}
            className={`px-3 py-1.5 rounded-lg text-xs transition ${subView === 'formula-new' ? 'bg-white shadow text-slate-800 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
          >
            تعریف فرمول ساخت
          </button>
          <button 
            onClick={() => setSubView('formula-list')}
            className={`px-3 py-1.5 rounded-lg text-xs transition ${subView === 'formula-list' ? 'bg-white shadow text-slate-800 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
          >
            لیست فرمول ها
          </button>
          <button 
            onClick={() => setSubView('mrp')}
            className={`px-3 py-1.5 rounded-lg text-xs transition ${subView === 'mrp' ? 'bg-white shadow text-slate-800 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
          >
            نیاز سنجی مواد (MRP)
          </button>
          <button 
            onClick={() => setSubView('instruction-new')}
            className={`px-3 py-1.5 rounded-lg text-xs transition ${subView === 'instruction-new' ? 'bg-white shadow text-slate-800 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
          >
            دستور تولید جدید
          </button>
          <button 
            onClick={() => setSubView('instruction-list')}
            className={`px-3 py-1.5 rounded-lg text-xs transition ${subView === 'instruction-list' ? 'bg-white shadow text-slate-800 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
          >
            لیست دستورهای کار
          </button>
        </div>
      </div>

      {subView === 'formula-new' && (
        /* Create Recipe formula */
        <form onSubmit={handleSaveFormula} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm lg:col-span-2 space-y-6">
            <h3 className="font-bold text-slate-800 text-sm border-b pb-2">سند فرمول ساخت (آنالیز مواد اولیه)</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 block">نام فرمول ترکیبی <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formulaName}
                  onChange={(e) => setFormulaName(e.target.value)}
                  placeholder="مثال: فرمول پخت کیک اسفنجی"
                  className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 block">هزینه سربار جانبی به ازای هر واحد (ریال)</label>
                <input
                  type="number"
                  min="0"
                  value={formulaCost || ''}
                  onChange={(e) => setFormulaCost(Number(e.target.value))}
                  placeholder="مثال: ۵۰۰۰۰"
                  className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>

            {/* ingredient adding portal */}
            <div className="bg-slate-50 p-4 rounded-xl space-y-3">
              <span className="text-xs font-semibold text-slate-500 block">عناصر و مواد اولیه داخل فرمول</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={ingredientId}
                  onChange={(e) => setIngredientId(e.target.value)}
                  className="bg-white border-0 rounded-xl px-4 py-2 text-xs text-slate-700"
                >
                  <option value="">انتخاب ماده قمار...</option>
                  {items.map(itm => (
                    <option key={itm.id} value={itm.id}>{itm.name} ({itm.unit})</option>
                  ))}
                </select>

                <input
                  type="number"
                  min="1"
                  value={ingredientQty}
                  onChange={(e) => setIngredientQty(Math.max(1, Number(e.target.value)))}
                  placeholder="تعداد / مقدار ماده"
                  className="bg-white border-0 rounded-xl px-4 py-2 text-xs text-slate-700 font-mono"
                />
              </div>
              <button
                type="button"
                onClick={handleAddIngredient}
                className="w-full bg-slate-900 text-white rounded-xl py-1.5 text-xs font-bold hover:bg-slate-800 transition"
              >
                + درج عنصر در ترکیب فرمول
              </button>
            </div>

            {/* active listing ingredients of the formula */}
            <div className="space-y-2 text-xs">
              <span className="font-semibold text-slate-500 block">اقلام و فرآورده‌های تخصیص‌یافته:</span>
              {inputs.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">در حال حاضر هیچ ماده اولیه‌ای به فرمول اختصاص نیافته است.</div>
              ) : (
                <div className="bg-slate-50/50 p-3 rounded-xl divide-y divide-slate-100">
                  {inputs.map((inp, idx) => {
                    const itemObj = items.find(it => it.id === inp.itemId);
                    return (
                      <div key={idx} className="flex justify-between py-2 items-center text-slate-700">
                        <span>{itemObj?.name || 'ماده کالا'}</span>
                        <div className="flex items-center gap-3 font-mono">
                          <span>{inp.quantity} {itemObj?.unit}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveIngredient(idx)}
                            className="text-rose-500 hover:text-rose-600 font-bold"
                          >
                            حذف
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 block">دستورالعمل تولید (توضیحات)</label>
              <textarea
                value={formulaDesc}
                onChange={(e) => setFormulaDesc(e.target.value)}
                placeholder="شرح مراحل اختلاط مواد اولیه یا تم کاری..."
                rows={2}
                className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2 text-xs text-slate-700"
              />
            </div>
          </div>

          {/* Right outputs panel config */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm border-b pb-2">محصول خروجی نهایی</h3>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 block">انتخاب کالای خروجی <span className="text-rose-500">*</span></label>
              <select
                value={outItemId}
                required
                onChange={(e) => setOutItemId(e.target.value)}
                className="w-full bg-slate-50 border-0 rounded-xl px-3 py-2 text-xs text-slate-700"
              >
                <option value="">انتخاب کالا...</option>
                {items.map(itm => (
                  <option key={itm.id} value={itm.id}>{itm.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 block">میزان تولید خروجی استاندارد <span className="text-rose-500">*</span></label>
              <input
                type="number"
                required
                min="1"
                value={outQty}
                onChange={(e) => setOutQty(Math.max(1, Number(e.target.value)))}
                className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2 text-xs font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition duration-300"
            >
              ثبت نهایی و انطباق فرمول ساخت ✓
            </button>
          </div>
        </form>
      )}

      {subView === 'formula-list' && (
        /* Recipes Listing */
        <div className="bg-white rounded-2xl border border-slate-50 overflow-hidden shadow-sm">
          {formulas.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Sliders size={48} className="mx-auto mb-2 opacity-30 text-slate-500" />
              <p className="text-sm">هیچ فرمول تولیدی ثبت نشده است.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-xs font-bold">
                    <th className="p-4">عنوان ترکیب فرمول کیک / کالا</th>
                    <th className="p-4">محصول خروجی تولید</th>
                    <th className="p-4">تعداد عناصر اولیه</th>
                    <th className="p-4">مجموع سربارهای برآورد (ریال)</th>
                    <th className="p-4">تشریح</th>
                    <th className="p-4 text-center">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600 font-sans">
                  {formulas.map(form => {
                    const outItem = items.find(i => i.id === form.outputItemId);
                    return (
                      <tr key={form.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-4 font-semibold text-slate-800">{form.name}</td>
                        <td className="p-4 text-xs font-medium text-indigo-600">
                          {outItem?.name || 'کالا'} ({form.outputQuantity} {outItem?.unit})
                        </td>
                        <td className="p-4 text-xs font-mono text-slate-500">{form.inputItems.length} قلم</td>
                        <td className="p-4 text-xs font-mono text-slate-500">{form.cost.toLocaleString()}</td>
                        <td className="p-4 text-xs text-slate-400 max-w-xs truncate">{form.description}</td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleDeleteFormula(form.id)}
                            className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition"
                          >
                            <Trash2 size={16} />
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

      {subView === 'mrp' && (
        /* Needs Calculator MRP */
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Cpu size={18} className="text-indigo-600" />
              برنامه هوشمند نیازسنجی خام دیتابیس (MRP)
            </h3>
            <p className="text-slate-400 text-xs text-right">فرمولاسیون و حجم تولید مدنظر خود را مشخص کنید تا سامانه میزان کسری را در لحظه نسبت به انبار برآورد نماید.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-500 block font-semibold">انتخاب فرمول هدف قنادی</label>
                <select
                  value={mrpFormulaId}
                  onChange={(e) => setMrpFormulaId(e.target.value)}
                  className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2.5 text-xs text-slate-700"
                >
                  <option value="">انتخاب کنید...</option>
                  {formulas.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 block font-semibold">تعداد تولید مد نظر کارگاه (خروجی)</label>
                <input
                  type="number"
                  min="1"
                  value={mrpTargetQty}
                  onChange={(e) => setMrpTargetQty(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2.5 text-xs text-slate-700 font-mono"
                />
              </div>
            </div>
          </div>

          {mrpFormulaId && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
              <h4 className="font-bold text-slate-800 text-xs">نتایج برآورد و کسر مواد اولیه مورد نیاز</h4>
              
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b text-slate-600 font-bold">
                      <th className="p-3">عنوان ماده اولیه</th>
                      <th className="p-3">نیاز تجمعی کل</th>
                      <th className="p-3">موجودی کنونی مخبر انبار</th>
                      <th className="p-3">کسری نهایی</th>
                      <th className="p-3">وضعیت تامین نواری</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                    {(() => {
                      const selectedFormula = formulas.find(f => f.id === mrpFormulaId);
                      if (!selectedFormula) return null;

                      return selectedFormula.inputItems.map((inp, idx) => {
                        const itemObj = items.find(it => it.id === inp.itemId);
                        if (!itemObj) return null;

                        const totalNeeded = (inp.quantity / selectedFormula.outputQuantity) * mrpTargetQty;
                        const shortQuantity = Math.max(0, totalNeeded - itemObj.stock);
                        const isShort = shortQuantity > 0;

                        return (
                          <tr key={idx} className="hover:bg-slate-50/40">
                            <td className="p-3 font-semibold">{itemObj.name}</td>
                            <td className="p-3 font-mono">{totalNeeded.toLocaleString()} {itemObj.unit}</td>
                            <td className="p-3 font-mono text-slate-500">{itemObj.stock.toLocaleString()} {itemObj.unit}</td>
                            <td className={`p-3 font-mono font-bold ${isShort ? 'text-rose-600 animate-pulse' : 'text-emerald-600'}`}>
                              {isShort ? shortQuantity?.toLocaleString() + ' ' + itemObj.unit : 'بدون کسری ✓'}
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isShort ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-750'
                              }`}>
                                {isShort ? 'نیازمند شارژ فوری خرید کالا' : 'آماده به کار تولید'}
                              </span>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {subView === 'instruction-new' && (
        /* Launch manufacturing order */
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm max-w-2xl mx-auto">
          <h3 className="font-bold text-slate-800 text-sm border-b pb-2 mb-4">صدور فرمان و دستور تولید جدید</h3>

          <form onSubmit={handleSaveInstruction} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-500 block font-semibold">شماره حواله / شماره دستور کار</label>
                <input
                  type="text"
                  required
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2.5 text-xs font-mono text-center"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 block font-semibold">تاریخ اجرا</label>
                <input
                  type="text"
                  required
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2.5 text-xs font-mono text-center"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 block font-semibold">انتخاب فرمول قنادی هدف <span className="text-rose-500">*</span></label>
                <select
                  value={instrFormulaId}
                  required
                  onChange={(e) => setInstrFormulaId(e.target.value)}
                  className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2.5 text-xs text-slate-700"
                >
                  <option value="">یکی از فرمول‌ها را برگزینید...</option>
                  {formulas.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 block font-semibold">مقدار خروجی هدف جهت ساخت کیک/مایع <span className="text-rose-500">*</span></label>
                <input
                  type="number"
                  required
                  min="1"
                  value={instrQty}
                  onChange={(e) => setInstrQty(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2.5 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 block">دستورالعمل‌ها و شرح جانبی کارگران</label>
              <textarea
                value={instrDesc}
                onChange={(e) => setInstrDesc(e.target.value)}
                placeholder="شرح مواردی چون لزوم بسته‌بندی حائز اهمیت در توزیع و یا تم‌های مدنظر خروجی..."
                rows={3}
                className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2.5 text-xs text-slate-700"
              />
            </div>

            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow transition duration-300"
            >
              ابلاغ کارنامه تولید به کارگاه ✓
            </button>
          </form>
        </div>
      )}

      {subView === 'instruction-list' && (
        /* Orders List & Active Actions */
        <div className="bg-white rounded-2xl border border-slate-50 overflow-hidden shadow-sm text-xs">
          {orders.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Hammer size={48} className="mx-auto mb-2 opacity-30 text-slate-500" />
              <p className="text-sm">تاکنون هیچ دستور تولیدی صادر نگردیده است.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-bold p-4">
                    <th className="p-4">کد ارجاع دستور</th>
                    <th className="p-4">تاریخ ابلاغ</th>
                    <th className="p-4">فرمول قنادی مورد انتخاب</th>
                    <th className="p-4">حجم ساخت نهایی</th>
                    <th className="p-4">وضعیت پروسه</th>
                    <th className="p-4 text-center">انجام عملیات نهایی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                  {orders.map(order => {
                    const recipe = formulas.find(f => f.id === order.formulaId);
                    return (
                      <tr key={order.id} className="hover:bg-slate-50/40">
                        <td className="p-4 font-mono font-bold text-slate-800">{order.orderNumber}</td>
                        <td className="p-4 font-mono">{order.date}</td>
                        <td className="p-4 font-semibold">{recipe?.name || 'کیک تم تولد'}</td>
                        <td className="p-4 font-mono">{order.quantity} عدد</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            order.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                            order.status === 'cancelled' ? 'bg-slate-100 text-slate-500' :
                            'bg-amber-50 text-amber-700'
                          }`}>
                            {order.status === 'completed' ? 'تکمیل‌شده و انبارش کالا' :
                             order.status === 'cancelled' ? 'لغو شده' : 'در جریان آماده‌سازی'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {order.status === 'pending' || order.status === 'ongoing' ? (
                            <div className="inline-flex gap-1.5 justify-center">
                              <button
                                onClick={() => handleCompleteOrder(order)}
                                className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-2 py-1 rounded-lg text-[10px] font-bold transition duration-300 border border-emerald-100"
                              >
                                <CheckCircle size={12} /> تایید و تخلیه انبار
                              </button>
                              <button
                                onClick={() => handleCancelOrder(order)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-lg text-[10px] font-medium transition duration-300"
                              >
                                لغو تولید
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-bold block text-center">-</span>
                          )}
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
    </div>
  );
}
