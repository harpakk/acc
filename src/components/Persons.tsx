/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../db';
import { Person } from '../types';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  UserCheck, 
  ShieldAlert, 
  Phone, 
  MapPin, 
  Upload, 
  Download, 
  Eye, 
  CreditCard, 
  Building, 
  Truck, 
  FileSpreadsheet, 
  AlertCircle, 
  RefreshCw, 
  CheckCircle2, 
  X, 
  Copy, 
  User, 
  FileText,
  Briefcase,
  Check
} from 'lucide-react';

interface PersonsProps {
  initialSubView: 'new' | 'list';
}

// Translations and values
const PERSON_TYPES: Record<string, string> = {
  customer: 'مشتری',
  supplier: 'تامین‌کننده',
  employee: 'پرسنل / کارمند',
  distributor: 'پخش‌کننده',
  store: 'فروشگاه',
  shareholder: 'سهام‌دار',
  other: 'متفرقه / غیره'
};

const SHIPMENT_TYPES: Record<string, string> = {
  delivery: 'باربری (حمل با کامیون)',
  direct: 'ارسال مستقیم اختصاصی',
  post: 'شرکت پست ملی',
  tipax: 'تیپاکس فوری',
  in_person: 'تحویل حضوری در محل',
  other: 'سایر / توافقی'
};

export default function Persons({ initialSubView }: PersonsProps) {
  const [subView, setSubView] = useState<'new' | 'list' | 'csv'>(initialSubView);
  const [persons, setPersons] = useState<Person[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  
  // Basic Form fields
  const [personId, setPersonId] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<string>('customer');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');

  // Additional Form fields
  const [nationalId, setNationalId] = useState('');
  const [anotherNumber, setAnotherNumber] = useState('');
  const [company, setCompany] = useState('');
  const [economicCode, setEconomicCode] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [shipmentType, setShipmentType] = useState<string>('other');
  const [cardNumber, setCardNumber] = useState('');
  const [shabaNumber, setShabaNumber] = useState('');
  const [pic, setPic] = useState<string>('');
  const [description, setDescription] = useState('');

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // CSV Import States
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvRawRows, setCsvRawRows] = useState<string[][]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [hasHeaderRow, setHasHeaderRow] = useState(true);
  const [columnMappings, setColumnMappings] = useState<Record<string, number>>({
    name: -1,
    phone: -1,
    city: -1,
    code: -1,
    type: -1,
    nationalId: -1,
    address: -1,
    anotherNumber: -1,
    company: -1,
    economicCode: -1,
    registrationNumber: -1,
    branchCode: -1,
    shipmentType: -1,
    cardNumber: -1,
    shabaNumber: -1,
    description: -1,
  });

  useEffect(() => {
    if (initialSubView === 'new') {
      setSubView('new');
    } else {
      setSubView('list');
    }
    loadPersons();
  }, [initialSubView]);

  const loadPersons = () => {
    setPersons(dbService.getPersons());
  };

  const showNotice = (msg: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
    showNotice(`سند با موفقیت در کلیپ‌بورد کپی شد: ${fieldName}`, 'info');
  };

  // Profile Image uploading
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) { // Limit size representation
        showNotice('اندازه تصویر انتخابی بیش از حد بزرگ است (حداکثر ۸۰۰ کیلوبایت مجاز است)', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPic(reader.result as string);
        showNotice('تصویر پروفایل طرف حساب با موفقیت بارگذاری شد', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showNotice('درج نام خانوادگی یا نام شرکت الزامی است', 'error');
      return;
    }
    if (!phone.trim()) {
      showNotice('درج شماره تلفن تماس الزامی است', 'error');
      return;
    }
    if (!city.trim()) {
      showNotice('درج نام شهر الزامی است', 'error');
      return;
    }

    const newPerson: Person = {
      id: personId || `person_${Date.now()}`,
      name: name.trim(),
      code: code.trim() || String(Math.floor(Math.random() * 90000) + 10000),
      type,
      phone: phone.trim(),
      address: address.trim(),
      city: city.trim(),
      createdAt: new Date().toISOString(),

      // Extended fields
      nationalId: nationalId.trim() || undefined,
      anotherNumber: anotherNumber.trim() || undefined,
      company: company.trim() || undefined,
      economicCode: economicCode.trim() || undefined,
      registrationNumber: registrationNumber.trim() || undefined,
      branchCode: branchCode.trim() || undefined,
      shipmentType: shipmentType || undefined,
      cardNumber: cardNumber.trim() || undefined,
      shabaNumber: shabaNumber.trim() || undefined,
      pic: pic || undefined,
      description: description.trim() || undefined
    };

    dbService.savePerson(newPerson);
    showNotice(personId ? 'مشخصات طرف حساب با موفقیت ویرایش مالی شد' : 'طرف حساب جدید با موفقیت در پایگاه داده ثبت گردید');
    resetForm();
    loadPersons();
    setSubView('list');
  };

  const handleEdit = (p: Person) => {
    setPersonId(p.id);
    setName(p.name);
    setCode(p.code);
    setType(p.type || 'customer');
    setPhone(p.phone);
    setAddress(p.address || '');
    setCity(p.city);

    // Extended fields state hydrate
    setNationalId(p.nationalId || '');
    setAnotherNumber(p.anotherNumber || '');
    setCompany(p.company || '');
    setEconomicCode(p.economicCode || '');
    setRegistrationNumber(p.registrationNumber || '');
    setBranchCode(p.branchCode || '');
    setShipmentType(p.shipmentType || 'other');
    setCardNumber(p.cardNumber || '');
    setShabaNumber(p.shabaNumber || '');
    setPic(p.pic || '');
    setDescription(p.description || '');

    setSubView('new');
    setSelectedPerson(null);
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmId) {
      dbService.deletePerson(deleteConfirmId);
      loadPersons();
      showNotice('کارت حسابداری طرف حساب با موفقیت حذف گردید');
      setDeleteConfirmId(null);
      setSelectedPerson(null);
    }
  };

  const resetForm = () => {
    setPersonId('');
    setName('');
    setCode('');
    setType('customer');
    setPhone('');
    setAddress('');
    setCity('');

    setNationalId('');
    setAnotherNumber('');
    setCompany('');
    setEconomicCode('');
    setRegistrationNumber('');
    setBranchCode('');
    setShipmentType('other');
    setCardNumber('');
    setShabaNumber('');
    setPic('');
    setDescription('');
  };

  const filteredPersons = persons.filter(p => {
    const matchesSearch = 
      p.name.includes(searchQuery) || 
      p.code.includes(searchQuery) || 
      p.phone.includes(searchQuery) || 
      (p.company && p.company.includes(searchQuery)) ||
      (p.city && p.city.includes(searchQuery));
    const matchesFilter = typeFilter === 'all' || p.type === typeFilter;
    return matchesSearch && matchesFilter;
  });

  // ========== CSV Parsing Implementation ==========
  const parseCSV = (text: string): string[][] => {
    const lines = text.split(/\r?\n/);
    return lines
      .map(line => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      })
      .filter(row => row.length > 0 && row.some(cell => cell !== ''));
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const parsedRows = parseCSV(text);
        if (parsedRows.length > 0) {
          setCsvRawRows(parsedRows);
          // Set initial default column headers
          const firstRow = parsedRows[0];
          setCsvHeaders(firstRow);
          
          // Auto map common columns
          const initialMappings = { ...columnMappings };
          firstRow.forEach((colName, index) => {
            const normalized = colName.toLowerCase().replace(/\s+/g, '');
            if (normalized.includes('name') || normalized.includes('نام') || normalized.includes('نام خانوادگی') || normalized.includes('fullname')) {
              initialMappings.name = index;
            } else if (normalized.includes('phone') || normalized.includes('تلفن') || normalized.includes('تماس') || normalized.includes('همراه') || normalized.includes('موبایل')) {
              initialMappings.phone = index;
            } else if (normalized.includes('city') || normalized.includes('شهر') || normalized.includes('استان')) {
              initialMappings.city = index;
            } else if (normalized.includes('code') || normalized.includes('کدمعین') || normalized.includes('کداشخاص')) {
              initialMappings.code = index;
            } else if (normalized.includes('company') || normalized.includes('شرکت') || normalized.includes('کمپانی')) {
              initialMappings.company = index;
            } else if (normalized.includes('type') || normalized.includes('نوع') || normalized.includes('دسته')) {
              initialMappings.type = index;
            } else if (normalized.includes('address') || normalized.includes('آدرس') || normalized.includes('نشانی')) {
              initialMappings.address = index;
            } else if (normalized.includes('national') || normalized.includes('ملی') || normalized.includes('شناسه')) {
              initialMappings.nationalId = index;
            } else if (normalized.includes('card') || normalized.includes('کارت')) {
              initialMappings.cardNumber = index;
            } else if (normalized.includes('shaba') || normalized.includes('شبا')) {
              initialMappings.shabaNumber = index;
            }
          });
          setColumnMappings(initialMappings);
          showNotice('فایل اکسل/CSV دریافت شد. لطفاً ستون‌ها را انتساب دهید.', 'info');
        } else {
          showNotice('قالب فایل تعریف شده معتبر یا حاوی داده نیست', 'error');
        }
      };
      reader.readAsText(file, 'UTF-8');
    }
  };

  const getMappedValue = (row: string[], mappingIndex: number): string => {
    if (mappingIndex === undefined || mappingIndex === null || mappingIndex < 0 || mappingIndex >= row.length) return '';
    return row[mappingIndex] || '';
  };

  // Convert raw rows depending on mappings
  const getParsedCsvItems = (): Person[] => {
    if (csvRawRows.length === 0) return [];
    const startIndex = hasHeaderRow ? 1 : 0;
    const itemsToProcess = csvRawRows.slice(startIndex);
    
    return itemsToProcess.map((row, i) => {
      // Basic fields
      const pName = getMappedValue(row, columnMappings.name);
      const pPhone = getMappedValue(row, columnMappings.phone);
      const pCity = getMappedValue(row, columnMappings.city) || 'تهران'; // Fallback
      const pCode = getMappedValue(row, columnMappings.code) || String(10000 + i + Math.floor(Math.random() * 5000));
      const pType = getMappedValue(row, columnMappings.type) || 'customer';

      return {
        id: `person_csv_${Date.now()}_${i}`,
        name: pName,
        phone: pPhone,
        city: pCity,
        code: pCode,
        type: pType,
        address: getMappedValue(row, columnMappings.address),
        nationalId: getMappedValue(row, columnMappings.nationalId),
        anotherNumber: getMappedValue(row, columnMappings.anotherNumber),
        company: getMappedValue(row, columnMappings.company),
        economicCode: getMappedValue(row, columnMappings.economicCode),
        registrationNumber: getMappedValue(row, columnMappings.registrationNumber),
        branchCode: getMappedValue(row, columnMappings.branchCode),
        shipmentType: getMappedValue(row, columnMappings.shipmentType) || 'other',
        cardNumber: getMappedValue(row, columnMappings.cardNumber),
        shabaNumber: getMappedValue(row, columnMappings.shabaNumber),
        description: getMappedValue(row, columnMappings.description),
        createdAt: new Date().toISOString()
      };
    });
  };

  const handleBatchImport = () => {
    if (columnMappings.name < 0 || columnMappings.phone < 0 || columnMappings.city < 0) {
      showNotice('جهت واردات موفق، انتساب سه فیلد نام کامل، تلفن تماس و شهر به ستون‌های مربوطه اجباری است', 'error');
      return;
    }

    const parsedList = getParsedCsvItems();
    const validParsedList = parsedList.filter(p => p.name.trim() && p.phone.trim());

    if (validParsedList.length === 0) {
      showNotice('هیچ طرف حساب معتبری با نام و شماره تلفن در پیش‌نمایش یافت نشد', 'error');
      return;
    }

    // Save batch sequence
    validParsedList.forEach(p => {
      dbService.savePerson(p);
    });

    showNotice(`تعداد ${validParsedList.length} طرف حساب به صورت همزمان بارگذاری و سازمان‌دهی شدند`);
    setCsvFile(null);
    setCsvRawRows([]);
    loadPersons();
    setSubView('list');
  };

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      {/* Visual notification */}
      {notification && (
        <div className={`fixed top-4 left-4 ${
          notification.type === 'error' ? 'bg-rose-600' : 
          notification.type === 'info' ? 'bg-indigo-600' : 'bg-emerald-600'
        } text-white px-5 py-3 rounded-2xl shadow-xl z-50 text-sm flex items-center gap-2 animate-bounce`}>
          {notification.type === 'error' ? <AlertCircle size={18} /> : 
           notification.type === 'info' ? <RefreshCw className="animate-spin" size={17} /> : <CheckCircle2 size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Bar Dashboard Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-slate-100 pb-4 gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800">
            {subView === 'new' ? (personId ? 'ویرایش مشخصات طرف حساب' : 'تعریف شخص جدید') : 
             subView === 'csv' ? 'واردات انبوه اشخاص (CSV File)' : 'لیست اشخاص و طرف‌های حساب'}
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            {subView === 'new' ? 'ثبت مشخصات مشتریان، تامین‌کنندگان، نمایندگان و پرسنل شادی آوران' : 
             subView === 'csv' ? 'بارگذاری با فایل CSV جهت ایجاد یا ثبت گروهی حساب مشتریان به صورت اتوماتیک' :
             'مدیریت و مشاهده تمامی همکاران تجاری شادی آوران به همراه جزئیات کامل حساب‌ها'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setSubView('list'); resetForm(); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition duration-300 flex items-center gap-1.5 cursor-pointer ${
              subView === 'list' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
            }`}
          >
            <User size={14} />
            <span>لیست اشخاص ({persons.length})</span>
          </button>
          <button
            onClick={() => { setSubView('new'); resetForm(); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition duration-300 flex items-center gap-1.5 cursor-pointer ${
              subView === 'new' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
            }`}
          >
            <Plus size={14} />
            <span>شخص جدید +</span>
          </button>
          <button
            onClick={() => { setSubView('csv'); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition duration-300 flex items-center gap-1.5 cursor-pointer ${
              subView === 'csv' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
            }`}
          >
            <FileSpreadsheet size={14} />
            <span>وارد گروهی (CSV)</span>
          </button>
        </div>
      </div>

      {subView === 'new' ? (
        /* ======================== ADD/EDIT FORM ======================== */
        <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-100 shadow-sm max-w-4xl mx-auto">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="flex flex-col md:flex-row items-center gap-6 pb-6 border-b border-slate-100">
              {/* Picture Upload Area */}
              <div className="relative group">
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center relative transition group-hover:bg-slate-100">
                  {pic ? (
                    <img src={pic} alt="پیش‌نمایش تصویر" className="w-full h-full object-cover" referrerpolicy="no-referrer" />
                  ) : (
                    <div className="text-center p-3 text-slate-400">
                      <Upload size={22} className="mx-auto mb-1 opacity-70" />
                      <span className="text-[10px] font-bold block">تصویر طرف حساب</span>
                    </div>
                  )}
                  {pic && (
                    <button
                      type="button"
                      onClick={() => setPic('')}
                      className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded-lg transition shadow cursor-pointer"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 text-[10px] font-black text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 px-3 py-1 rounded-lg block mx-auto transition cursor-pointer"
                >
                  {pic ? 'تغییر تصویر' : 'بارگذاری عکس'}
                </button>
              </div>

              {/* Essential Fields Row */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 block">نام خانوادگی / نام شرکت خانوادگی <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: کارگاه توزیع اسباب‌بازی و بردگیم پارسی"
                    className="w-full bg-slate-50/70 border border-slate-100 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white transition duration-300 text-slate-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 block">تلفن همراه تفصیلی <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="مثال: 09123456789"
                    className="w-full bg-slate-50/70 border border-slate-100 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white transition duration-300 text-slate-700 font-mono left-align"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 block">شهر سکونت تجاری / شهر فعالیت <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="مثال: تهران"
                    className="w-full bg-slate-50/70 border border-slate-100 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white transition duration-300 text-slate-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 block">انتخاب تفصیلی نقش معین <span className="text-rose-500">*</span></label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-slate-50/70 border border-slate-100 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white transition duration-300 text-slate-700 font-black cursor-pointer"
                  >
                    {Object.entries(PERSON_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Expanded Field Modules */}
            <div className="space-y-6">
              {/* Module 1: Corporate/Identity info */}
              <div className="bg-slate-50/30 p-5 rounded-2xl border border-slate-100/50 space-y-4">
                <div className="flex items-center gap-1.5 text-indigo-600 font-black text-xs border-b border-slate-150 pb-2">
                  <Building size={14} />
                  <span>اطلاعات تفصیلی هویتی و ثبت شرکتی (اختیاری)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">کد کل مشتری (پیشنهادی دستی)</label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="مانند: 10405"
                      className="w-full bg-white border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">کد یا شناسه ملی (اشخاص حقیقی و حقوقی)</label>
                    <input
                      type="text"
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                      placeholder="کد ۱۰ رقمی یا شناسه ۱۱ رقمی ملی"
                      className="w-full bg-white border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">تلفن تماس فرعی (تماس دوم)</label>
                    <input
                      type="text"
                      value={anotherNumber}
                      onChange={(e) => setAnotherNumber(e.target.value)}
                      placeholder="شماره تماس دوم یا نمابر"
                      className="w-full bg-white border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 font-mono text-left"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">نام کامل شرکت تابعه/وابسته</label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="مانند: شادی گستر نوین"
                      className="w-full bg-white border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-700"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">شاخص کد اقتصادی تعاملی</label>
                    <input
                      type="text"
                      value={economicCode}
                      onChange={(e) => setEconomicCode(e.target.value)}
                      placeholder="۱۲ رقمی اقتصادی"
                      className="w-full bg-white border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">شماره ثبت قانونی شرکت</label>
                    <input
                      type="text"
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                      placeholder="شماره ثبت رسمی شرکت"
                      className="w-full bg-white border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 font-mono"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">کد شعبه مبداً/اصلی</label>
                    <input
                      type="text"
                      value={branchCode}
                      onChange={(e) => setBranchCode(e.target.value)}
                      placeholder="مانند: 201"
                      className="w-full bg-white border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Module 2: Finance & Bank Accounts */}
              <div className="bg-slate-50/30 p-5 rounded-2xl border border-slate-100/50 space-y-4">
                <div className="flex items-center gap-1.5 text-emerald-600 font-black text-xs border-b border-slate-150 pb-2">
                  <CreditCard size={14} />
                  <span>اطلاعات تفصیلی بانکی و تسویه مطالبات (اختیاری)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">شماره کارت بانکی همکار تجاری</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="مانند: ۶۰۳۷۹۹۷۹۸۸۸۸۷۷۷۷"
                      maxLength={19}
                      className="w-full bg-white border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 font-mono text-left"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">شماره شناسه شبا (شروع با IR)</label>
                    <input
                      type="text"
                      value={shabaNumber}
                      onChange={(e) => setShabaNumber(e.target.value)}
                      placeholder="IR120170000000123456789012"
                      className="w-full bg-white border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 font-mono text-left"
                    />
                  </div>
                </div>
              </div>

              {/* Module 3: Logistics Logistics & Description */}
              <div className="bg-slate-50/30 p-5 rounded-2xl border border-slate-100/50 space-y-4">
                <div className="flex items-center gap-1.5 text-amber-600 font-black text-xs border-b border-slate-150 pb-2">
                  <Truck size={14} />
                  <span>برنامه‌ریزی لجستیک حمل و نقل و آدرس مرסولات (اختیاری)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">نوع ارسال پیش‌فرض مرسولات کالا</label>
                    <select
                      value={shipmentType}
                      onChange={(e) => setShipmentType(e.target.value)}
                      className="w-full bg-white border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 font-black cursor-pointer"
                    >
                      {Object.entries(SHIPMENT_TYPES).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">جزئیات کامل نشانی خیابانی و پلاک</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="خیابان اصلی، کوچه، پلاک، واحد ثبت"
                      className="w-full bg-white border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-700"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">یادداشت اختصاصی معین یا توضیحات تکمیلی</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="در این قسمت نکات تکمیلی نظیر حداکثر سقف اعتبار دفتری یا رفتار مشتری را وارد نمایید..."
                    rows={2}
                    className="w-full bg-white border border-slate-250 rounded-xl px-3.5 py-2 text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex gap-2 justify-end border-t border-slate-50">
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-md shadow-emerald-500/10 cursor-pointer transition duration-300"
              >
                {personId ? 'ذخیره دفتری تغییرات' : 'ثبت قطعی طرف حساب'}
              </button>
              <button
                type="button"
                onClick={() => { setSubView('list'); resetForm(); }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-6 py-2.5 rounded-xl text-xs transition duration-300 cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </form>
        </div>
      ) : subView === 'csv' ? (
        /* ======================== CSV IMPORT SCREEN ======================== */
        <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-100 shadow-sm max-w-4xl mx-auto space-y-6">
          <div className="border-2 border-dashed border-slate-200 hover:border-indigo-500 bg-slate-50/50 p-6 rounded-2xl text-center transition">
            <Upload size={36} className="mx-auto mb-3 text-slate-400" />
            <h4 className="text-sm font-bold text-slate-700">بارگذاری فایل CSV لیست اشخاص</h4>
            <p className="text-[10px] text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
              لطفاً فایل اکسل دارای فرمت `.csv` یا خروجی سیستم‌های حسابداری دیگر خود را برای پردازش ستونی شادی آوران انتخاب کنید.
            </p>
            <input
              type="file"
              accept=".csv"
              ref={csvInputRef}
              onChange={handleCsvFileUpload}
              className="hidden"
            />
            <button
              onClick={() => csvInputRef.current?.click()}
              className="mt-4 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span>{csvFile ? 'انتخاب فایل دیگر...' : 'انتخاب فایل CSV'}</span>
            </button>
            {csvFile && (
              <div className="mt-3 text-xs text-indigo-600 font-bold block bg-indigo-50/50 border border-indigo-100/30 px-3 py-1.5 rounded-lg max-w-xs mx-auto">
                فایل انتخابی: {csvFile.name} (حجم: {(csvFile.size / 1024).toFixed(1)} کیلوبایت)
              </div>
            )}
          </div>

          {csvRawRows.length > 0 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Check className="text-emerald-500" size={18} />
                  <span className="text-xs font-bold text-slate-800">برنامه‌ریزی تطبیق و انتساب فیلدها معین</span>
                </div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasHeaderRow}
                    onChange={(e) => setHasHeaderRow(e.target.checked)}
                    className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>ردیف اول فایل ستون نام هدر است</span>
                </label>
              </div>

              {/* Mapper Grid Panel */}
              <div className="bg-slate-50/40 p-4 rounded-2xl border border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-rose-600 block flex items-center gap-1">
                    <span>۱. نام و نام خانوادگی تفصیلی</span>
                    <span className="text-[9px] font-medium bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded-full">اجباری</span>
                  </label>
                  <select
                    value={columnMappings.name}
                    onChange={(e) => setColumnMappings({ ...columnMappings, name: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-700"
                  >
                    <option value={-1}>پیدا کردن ستون نام ...</option>
                    {csvHeaders.map((h, idx) => (
                      <option key={idx} value={idx}>{h || `ستون ${idx + 1}`}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-rose-600 block flex items-center gap-1">
                    <span>۲. شماره تلفن همراه اصلی</span>
                    <span className="text-[9px] font-medium bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded-full">اجباری</span>
                  </label>
                  <select
                    value={columnMappings.phone}
                    onChange={(e) => setColumnMappings({ ...columnMappings, phone: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-700"
                  >
                    <option value={-1}>پیدا کردن ستون تلفن ...</option>
                    {csvHeaders.map((h, idx) => (
                      <option key={idx} value={idx}>{h || `ستون ${idx + 1}`}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-rose-600 block flex items-center gap-1">
                    <span>۳. شهر سکونت / کاربری</span>
                    <span className="text-[9px] font-medium bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded-full">اجباری</span>
                  </label>
                  <select
                    value={columnMappings.city}
                    onChange={(e) => setColumnMappings({ ...columnMappings, city: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-700"
                  >
                    <option value={-1}>پیدا کردن ستون شهر ...</option>
                    {csvHeaders.map((h, idx) => (
                      <option key={idx} value={idx}>{h || `ستون ${idx + 1}`}</option>
                    ))}
                  </select>
                </div>

                {/* Optional maps fields */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">۴. کداشخاص یا کدمعین</label>
                  <select
                    value={columnMappings.code}
                    onChange={(e) => setColumnMappings({ ...columnMappings, code: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-700"
                  >
                    <option value={-1}>تولید اتفاقی / انتخاب ستون</option>
                    {csvHeaders.map((h, idx) => (
                      <option key={idx} value={idx}>{h || `ستون ${idx + 1}`}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">۵. دسته / نقش (مشتری، پرسنل..)</label>
                  <select
                    value={columnMappings.type}
                    onChange={(e) => setColumnMappings({ ...columnMappings, type: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-700"
                  >
                    <option value={-1}>انتخاب از ستون / پیش‌فرض مشتری</option>
                    {csvHeaders.map((h, idx) => (
                      <option key={idx} value={idx}>{h || `ستون ${idx + 1}`}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">۶. آدرس کامل نشانی</label>
                  <select
                    value={columnMappings.address}
                    onChange={(e) => setColumnMappings({ ...columnMappings, address: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-700"
                  >
                    <option value={-1}>مفتوح / بدون تطبیق</option>
                    {csvHeaders.map((h, idx) => (
                      <option key={idx} value={idx}>{h || `ستون ${idx + 1}`}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">۷. نام ثبت شرکت تابعه</label>
                  <select
                    value={columnMappings.company}
                    onChange={(e) => setColumnMappings({ ...columnMappings, company: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-700"
                  >
                    <option value={-1}>مفتوح</option>
                    {csvHeaders.map((h, idx) => (
                      <option key={idx} value={idx}>{h || `ستون ${idx + 1}`}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">۸. کد یا شناسه ملی تفضیلی</label>
                  <select
                    value={columnMappings.nationalId}
                    onChange={(e) => setColumnMappings({ ...columnMappings, nationalId: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-700"
                  >
                    <option value={-1}>مفتوح</option>
                    {csvHeaders.map((h, idx) => (
                      <option key={idx} value={idx}>{h || `ستون ${idx + 1}`}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">۹. شماره کارت بانکی اصلی</label>
                  <select
                    value={columnMappings.cardNumber}
                    onChange={(e) => setColumnMappings({ ...columnMappings, cardNumber: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-700"
                  >
                    <option value={-1}>مفتوح</option>
                    {csvHeaders.map((h, idx) => (
                      <option key={idx} value={idx}>{h || `ستون ${idx + 1}`}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Data Live preview row */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block">پیش‌نمایش خروجی اشخاص ثبت شونده (۱۰ ردیف نخست)</span>
                <div className="bg-slate-55 rounded-xl border border-slate-100 overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-150 text-slate-500">
                        <th className="p-3">کد معین</th>
                        <th className="p-3">نام کامل</th>
                        <th className="p-3">شماره تماس</th>
                        <th className="p-3">نقش معین</th>
                        <th className="p-3">استان/شهر</th>
                        <th className="p-3">شرکت</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600 bg-white">
                      {getParsedCsvItems().slice(0, 10).map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-mono text-emerald-600 font-bold">{p.code}</td>
                          <td className="p-3 font-bold text-slate-800">{p.name || 'بدون نام (نامعتبر)'}</td>
                          <td className="p-3 font-mono">{p.phone || 'بدون شماره تماس'}</td>
                          <td className="p-3">
                            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-[9px] font-extrabold">
                              {PERSON_TYPES[p.type] || p.type || 'مشتری'}
                            </span>
                          </td>
                          <td className="p-3">{p.city}</td>
                          <td className="p-3 text-slate-400">{p.company || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Commit buttons */}
              <div className="flex gap-2 justify-end border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={handleBatchImport}
                  className="bg-indigo-600 hover:bg-slate-900 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-1 shadow cursor-pointer transition duration-250"
                >
                  <CheckCircle2 size={14} />
                  <span>تأیید و ثبت گروهی ({getParsedCsvItems().length} نفر)</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setCsvRawRows([]); setCsvFile(null); }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer transition"
                >
                  پاکسازی فایل
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ======================== LIST VIEW ======================== */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-2xl border border-slate-50 shadow-sm">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                <Search size={18} />
              </span>
              <input
                type="text"
                placeholder="جست‌وجو در نام، شرکت، کد معین، شهر یا تلفن..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border-0 rounded-xl pr-10 pl-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 transition duration-300 text-slate-700 font-medium"
              />
            </div>
            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-slate-50 border-0 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 transition duration-300 text-slate-700 font-black cursor-pointer"
              >
                <option value="all">فیلتر بر اساس همه نقش‌ها</option>
                {Object.entries(PERSON_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-50 shadow-sm overflow-hidden">
            {filteredPersons.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <ShieldAlert size={48} className="mx-auto mb-2 opacity-30 text-rose-500 animate-pulse-subtle" />
                <p className="text-sm font-bold text-slate-600">هیچ طرف حسابی یافت نشد.</p>
                <p className="text-xs text-slate-400 mt-1">با کلیک روی دکمه شخص جدید نسبت به تعریف طرف حساب اقدام کنید.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-xs font-extrabold uppercase">
                      <th className="p-4">کد معین</th>
                      <th className="p-4">نام کامل خانواده / شرکت</th>
                      <th className="p-4">نقش تجاری</th>
                      <th className="p-4">شهر تجاری</th>
                      <th className="p-4"><span className="flex items-center gap-1.5"><Phone size={14} /> تلفن تماس اصلی</span></th>
                      <th className="p-4">شرکت تابعه</th>
                      <th className="p-4 text-left">اقدامات تفصیلی</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                    {filteredPersons.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition cursor-pointer" onClick={() => setSelectedPerson(p)}>
                        <td className="p-4 font-mono text-xs text-indigo-600 font-bold">{p.code}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center font-bold text-[10px] text-white" style={{
                              background: p.pic ? 'none' : 'linear-gradient(135deg, #a855f7, #6d28d9)'
                            }}>
                              {p.pic ? (
                                <img src={p.pic} alt={p.name} className="w-full h-full object-cover" referrerpolicy="no-referrer" />
                              ) : p.name.slice(0, 1)}
                            </div>
                            <span className="font-bold text-slate-800">{p.name}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                            p.type === 'customer' ? 'bg-emerald-50 text-emerald-700' :
                            p.type === 'supplier' ? 'bg-amber-50 text-amber-700' :
                            p.type === 'employee' ? 'bg-blue-50 text-blue-700' :
                            p.type === 'distributor' ? 'bg-purple-50 text-purple-700' :
                            p.type === 'store' ? 'bg-pink-50 text-pink-700' :
                            p.type === 'shareholder' ? 'bg-teal-50 text-teal-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {PERSON_TYPES[p.type] || p.type || 'سایر'}
                          </span>
                        </td>
                        <td className="p-4 text-xs font-bold text-slate-700">{p.city || 'تهران'}</td>
                        <td className="p-4 font-mono text-xs text-slate-500">{p.phone}</td>
                        <td className="p-4 text-slate-400 font-bold">{p.company || '-'}</td>
                        <td className="p-4 text-left" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex gap-1">
                            <button
                              onClick={() => setSelectedPerson(p)}
                              title="مشاهده پرونده کامل"
                              className="p-1.5 hover:bg-slate-100 text-indigo-500 rounded-lg transition"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => handleEdit(p)}
                              title="ویرایش پرونده"
                              className="p-1.5 hover:bg-slate-100 text-teal-600 rounded-lg transition"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              title="حذف حساب"
                              className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================== PROFILE DETAILS MODAL ======================== */}
      {selectedPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            onClick={() => setSelectedPerson(null)}
          ></div>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-10 animate-scale-up font-sans text-right relative">
            
            {/* Header profile background color */}
            <div className="h-28 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 rounded-t-3xl relative">
              <button 
                onClick={() => setSelectedPerson(null)} 
                className="absolute top-4 left-4 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition shadow-sm cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Profile Avatar / Floating image area */}
            <div className="px-6 pb-6 relative -mt-12">
              <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-right">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white bg-slate-100 shadow-md">
                    {selectedPerson.pic ? (
                      <img src={selectedPerson.pic} alt={selectedPerson.name} className="w-full h-full object-cover" referrerpolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-white font-black text-2xl select-none">
                        {selectedPerson.name.slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800">{selectedPerson.name}</h3>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-extrabold shadow-sm">
                        نوع: {PERSON_TYPES[selectedPerson.type] || selectedPerson.type || 'مشتری'}
                      </span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold font-mono">
                        کدال: {selectedPerson.code}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 font-sans font-black">
                  <button
                    onClick={() => handleEdit(selectedPerson)}
                    className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl flex items-center gap-1 transition cursor-pointer"
                  >
                    <Edit2 size={13} />
                    <span>ویرایش پرونده</span>
                  </button>
                  <button
                    onClick={() => handleDelete(selectedPerson.id)}
                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-1 transition cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>حذف حساب</span>
                  </button>
                </div>
              </div>

              {/* Advanced info display grid */}
              <div className="mt-5 space-y-6">
                
                {/* Panel 1: Identity Base */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1 bg-slate-50/50 p-3 rounded-xl border border-slate-100/30">
                    <span className="text-[10px] text-slate-400 block font-bold">شماره تلفن همراه اصلی:</span>
                    <div className="flex justify-between items-center font-mono">
                      <span className="text-xs text-slate-800 font-extrabold">{selectedPerson.phone}</span>
                      <button 
                        onClick={() => handleCopy(selectedPerson.phone, 'تلفن اصلی')}
                        className="text-slate-400 hover:text-indigo-600 transition p-1 cursor-pointer"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 bg-slate-50/50 p-3 rounded-xl border border-slate-100/30">
                    <span className="text-[10px] text-slate-400 block font-bold">شماره تماس دوم / تفصیلی:</span>
                    <div className="flex justify-between items-center font-mono">
                      <span className="text-xs text-slate-800 font-bold">{selectedPerson.anotherNumber || 'ثبت‌نشده'}</span>
                      {selectedPerson.anotherNumber && (
                        <button 
                          onClick={() => handleCopy(selectedPerson.anotherNumber!, 'تلفن دوم')}
                          className="text-slate-400 hover:text-indigo-600 transition p-1 cursor-pointer"
                        >
                          <Copy size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 bg-slate-50/50 p-3 rounded-xl border border-slate-100/30">
                    <span className="text-[10px] text-slate-400 block font-bold">شهر اقامت / فعالیت:</span>
                    <span className="text-xs text-slate-800 font-black block">{selectedPerson.city || 'تهران'}</span>
                  </div>

                  <div className="space-y-1 bg-slate-50/50 p-3 rounded-xl border border-slate-100/30">
                    <span className="text-[10px] text-slate-400 block font-bold">نوع پیش‌فرض ترابری لجستیک:</span>
                    <div className="flex items-center gap-1.5 text-xs text-slate-800 font-bold">
                      <Truck size={12} className="text-amber-500" />
                      <span>{SHIPMENT_TYPES[selectedPerson.shipmentType || 'other'] || 'سایر / توافقی'}</span>
                    </div>
                  </div>
                </div>

                {/* Panel 2: Register & Business credentials */}
                <div className="bg-slate-50/30 p-4 border border-slate-100 rounded-2xl space-y-3">
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 font-extrabold border-b border-slate-100 pb-1.5">
                    <Building size={13} className="text-indigo-500" />
                    <span>شناسنامه مالی و شماره‌های ثبتی قانونی</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">کد یا شناسه ملی:</span>
                      <span className="text-xs text-slate-700 font-mono block mt-0.5">{selectedPerson.nationalId || 'فاقد کدملی'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">نام شرکت تابعه:</span>
                      <span className="text-xs text-slate-700 block mt-0.5">{selectedPerson.company || 'شخص حقیقی'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">کد اقتصادی:</span>
                      <span className="text-xs text-slate-700 font-mono block mt-0.5">{selectedPerson.economicCode || 'ثبت‌نشده'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">شماره ثبت رسمی:</span>
                      <span className="text-xs text-slate-700 font-mono block mt-0.5">{selectedPerson.registrationNumber || 'ثبت‌نشده'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">کد شعبه شرکت:</span>
                      <span className="text-xs text-slate-700 font-mono block mt-0.5">{selectedPerson.branchCode || 'شعبه مرکزی (بومی)'}</span>
                    </div>
                  </div>
                </div>

                {/* Panel 3: Financial Bank details */}
                <div className="bg-slate-50/30 p-4 border border-slate-100 rounded-2xl space-y-3">
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 font-extrabold border-b border-slate-100 pb-1.5">
                    <CreditCard size={13} className="text-emerald-500" />
                    <span>حساب‌ها و شماره اطلاعات بانکی تسویه</span>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <span className="text-[9px] text-slate-400 block font-bold">شماره شانزده رقمی کارت بانکی:</span>
                        <span className="text-xs text-slate-700 font-mono block mt-0.5">{selectedPerson.cardNumber || 'فاقد اطلاعات کارت'}</span>
                      </div>
                      {selectedPerson.cardNumber && (
                        <button
                          onClick={() => handleCopy(selectedPerson.cardNumber!, 'شماره کارت')}
                          className="px-2.5 py-1 text-[9px] font-black bg-emerald-50 text-emerald-700 rounded-lg shrink-0 transition hover:bg-emerald-100 cursor-pointer"
                        >
                          کپی شماره کارت
                        </button>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <span className="text-[9px] text-slate-400 block font-bold">شناسه شبا بانکی اصلی:</span>
                        <span className="text-xs text-slate-700 font-mono block mt-0.5">{selectedPerson.shabaNumber || 'فاقد اطلاعات شبا'}</span>
                      </div>
                      {selectedPerson.shabaNumber && (
                        <button
                          onClick={() => handleCopy(selectedPerson.shabaNumber!, 'کد شبا')}
                          className="px-2.5 py-1 text-[9px] font-black bg-emerald-50 text-emerald-700 rounded-lg shrink-0 transition hover:bg-emerald-100 cursor-pointer"
                        >
                          کپی شبا (IR)
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Logistics & notes address */}
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold mb-1">نشانی دقیق مرسوله لجستیک:</span>
                  <div className="p-3 bg-slate-50 text-xs text-slate-700 font-bold rounded-xl border border-slate-100 flex items-start gap-1.5">
                    <MapPin size={14} className="text-sky-500 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{selectedPerson.address || 'آدرس جغرافیایی ثبت نگردیده است.'}</p>
                  </div>
                </div>

                {/* Additional description */}
                {selectedPerson.description && (
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold mb-1">توضیحات و رفتار مالی معین:</span>
                    <div className="p-3 bg-slate-50 text-xs text-slate-600 rounded-xl border border-slate-100 flex items-start gap-1.5">
                      <FileText size={14} className="text-slate-400 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">{selectedPerson.description}</p>
                    </div>
                  </div>
                )}
                
                <div className="text-[10px] text-slate-400 text-left">
                  درج پرونده در سیستم: {new Date(selectedPerson.createdAt).toLocaleString('fa-IR')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================== SECURE REMOVE DIALOG ======================== */}
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
              <h3 className="text-sm font-extrabold text-slate-800">تأییدیه حذف طرف حساب مالی</h3>
            </div>
            
            <p className="text-xs text-slate-550 leading-relaxed mb-6 font-bold">
              آیا از حذف این طرف حساب از شبکه حسابداری اطمینان کامل دارید؟ توجه داشته باشید که اسناد معین، فاکتورهای فروش و اسناد تفصیلی صادر شده در گذشته به نام این شخص جهت ثبات ترازنامه دفتری حفظ می‌گردند.
            </p>

            <div className="flex gap-2 justify-end font-sans">
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition duration-200"
              >
                بله، پرونده حذف گردد
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl cursor-pointer transition duration-200"
              >
                انصراف دفتری
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
