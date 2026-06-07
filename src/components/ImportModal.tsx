import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { Category, Expense, AdditionalIncome } from '../types';
import { LanguageCode } from '../utils/translations';
import * as XLSX from 'xlsx';

interface ImportModalProps {
  onClose: () => void;
  onImport: (categories: Category[], expenses: Expense[], incomes: AdditionalIncome[]) => void;
  language: LanguageCode;
}

const TRANSLATIONS = {
  RU: {
    title: 'Импорт данных из файла',
    desc: 'Загрузите файл Excel (.xlsx) или CSV. Файл должен содержать следующие листы:',
    sheets: '1) Категории (Название, Лимит в месяц, Процент)\nОпционально: ID, Иконка, Остаток с прошлого месяца\n\n2) Расходы (Ссылка на категорию, Сумма, Дата)\nОпционально: ID, Комментарий\n\n3) Доходы (Дата, Сумма, Куда распределено)\nОпционально: ID, Тип выплата\n\n4) ДопДоходы (Дата, Сумма, Куда распределено)\nОпционально: ID, Источник',
    selectFile: 'Выбрать файл',
    importing: 'Загрузка...',
    errorMsg: 'Ошибка при чтении файла. Убедитесь, что листы и столбцы названы верно.',
  },
  EN: {
    title: 'Import Data from File',
    desc: 'Upload an Excel (.xlsx) or CSV file. The file must contain the following sheets:',
    sheets: '1) Categories (Name, Monthly Limit, Percentage)\nOptional: ID, Icon, Rollover from Previous Month\n\n2) Expenses (Category ID, Amount, Date)\nOptional: ID, Description\n\n3) Incomes (Date, Amount, Distributed To)\nOptional: ID, Type\n\n4) Additional Incomes (Date, Amount, Distributed To)\nOptional: ID, Source',
    selectFile: 'Select File',
    importing: 'Importing...',
    errorMsg: 'Error reading file. Make sure sheets and columns are named correctly.',
  }
};

export const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImport, language }) => {
  const t = TRANSLATIONS[language];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const parseString = (val: any) => val !== undefined && val !== null ? String(val) : '';
  const parseNumber = (val: any) => parseFloat(String(val).replace(',', '.')) || 0;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });

        // Parse Categories
        const catSheetName = wb.SheetNames.find(n => n.toLowerCase() === 'категории' || n.toLowerCase() === 'categories');
        const categories: Category[] = [];
        if (catSheetName) {
          const ws = wb.Sheets[catSheetName];
          const data: any[] = XLSX.utils.sheet_to_json(ws);
          data.forEach(row => {
            categories.push({
              id: parseString(row['ID'] || row['id'] || `cat-${Math.random()}`),
              name: parseString(row['Название'] || row['name']),
              icon: parseString(row['Иконка'] || row['icon'] || 'ShoppingCart'),
              monthlyLimit: parseNumber(row['Лимит в месяц'] || row['monthlyLimit']),
              rolloverPreviousMonth: parseNumber(row['Остаток с прошлого месяца'] || row['rolloverPreviousMonth']),
              percentage: parseNumber(row['Процент (в % или долях)'] || row['Процент'] || row['percentage']),
            });
          });
        }

        // Parse Expenses
        const expSheetName = wb.SheetNames.find(n => n.toLowerCase() === 'расходы' || n.toLowerCase() === 'expenses');
        const expenses: Expense[] = [];
        if (expSheetName) {
          const ws = wb.Sheets[expSheetName];
          const data: any[] = XLSX.utils.sheet_to_json(ws);
          data.forEach(row => {
            expenses.push({
              id: parseString(row['ID'] || row['id'] || `exp-${Math.random()}`),
              categoryId: parseString(row['Ссылка на категорию'] || row['categoryId']),
              amount: parseNumber(row['Сумма'] || row['amount']),
              date: parseString(row['Дата'] || row['date']),
              description: parseString(row['Комментарий'] || row['description']),
            });
          });
        }

        // Parse Incomes
        const incomes: AdditionalIncome[] = [];
        const incSheetName = wb.SheetNames.find(n => n.toLowerCase() === 'доходы' || n.toLowerCase() === 'incomes');
        if (incSheetName) {
          const ws = wb.Sheets[incSheetName];
          const data: any[] = XLSX.utils.sheet_to_json(ws);
          data.forEach(row => {
            const rawDist = row['Куда распределено'] || row['distributedTo'];
            let dist: string[] = [];
            if (typeof rawDist === 'string' && rawDist.trim() !== '') {
              dist = rawDist.split(',').map(s => s.trim());
            } else if (typeof rawDist === 'number') {
              dist = [String(rawDist)];
            }
            incomes.push({
              id: parseString(row['ID'] || row['id'] || `inc-${Math.random()}`),
              amount: parseNumber(row['Сумма'] || row['amount']),
              date: parseString(row['Дата'] || row['date']),
              description: parseString(row['Тип выплата'] || row['description']),
              distributedTo: dist,
              type: 'primary',
            });
          });
        }

        // Parse Add Incomes
        const addIncSheetName = wb.SheetNames.find(n => n.toLowerCase() === 'допдоходы' || n.toLowerCase() === 'addincomes');
        if (addIncSheetName) {
          const ws = wb.Sheets[addIncSheetName];
          const data: any[] = XLSX.utils.sheet_to_json(ws);
          data.forEach(row => {
            const rawDist = row['Куда распределено'] || row['distributedTo'];
            let dist: string[] = [];
            if (typeof rawDist === 'string' && rawDist.trim() !== '') {
              dist = rawDist.split(',').map(s => s.trim());
            } else if (typeof rawDist === 'number') {
              dist = [String(rawDist)];
            }
            incomes.push({
              id: parseString(row['ID'] || row['id'] || `addinc-${Math.random()}`),
              amount: parseNumber(row['Сумма'] || row['amount']),
              date: parseString(row['Дата'] || row['date']),
              description: parseString(row['Источник'] || row['description']),
              distributedTo: dist,
              type: 'additional',
            });
          });
        }

        onImport(categories, expenses, incomes);
        setIsProcessing(false);
      } catch (err) {
        console.error(err);
        setError(t.errorMsg);
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      setError(t.errorMsg);
      setIsProcessing(false);
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="glass-panel w-full max-w-lg rounded-[32px] p-6 relative z-10 border border-white/10 shadow-2xl space-y-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-white">
            <FileSpreadsheet size={20} className="text-emerald-400" />
            <h3 className="font-bold text-base font-display">{t.title}</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full transition duration-150 text-slate-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="text-sm text-slate-300 space-y-2">
          <p>{t.desc}</p>
          <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5 overflow-x-auto">
            <pre className="text-xs font-mono text-slate-400 whitespace-pre-wrap">{t.sheets}</pre>
          </div>
        </div>

        {error && (
          <div className="flex items-start space-x-2 text-rose-400 bg-rose-500/10 p-3 rounded-xl text-sm">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <div className="pt-2">
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl transition duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload size={18} />
            <span>{isProcessing ? t.importing : t.selectFile}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
