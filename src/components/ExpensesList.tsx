import React, { useState, useEffect } from 'react';
import { Category, Expense } from '../types';
import { formatMoney, groupExpensesByMonth, getCurrencySymbol } from '../utils/finance';
import CategoryIcon from './CategoryIcon';
import { Plus, X, Calendar, Coins, Tag, CalendarClock, ChevronDown, ChevronRight, Trash2, Search, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LanguageCode, TRANSLATIONS, getLocalizedCategoryName, getReadableMonthLabelLocalized } from '../utils/translations';

interface ExpensesListProps {
  categories: Category[];
  expenses: Expense[];
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  onEditExpense: (expense: Expense) => void;
  currencyCode?: string;
  language?: LanguageCode;
}

export default function ExpensesList({
  categories,
  expenses,
  onAddExpense,
  onDeleteExpense,
  onEditExpense,
  currencyCode = 'RUB',
  language = 'RU'
}: ExpensesListProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Default to today's date
  const [description, setDescription] = useState('');

  // Edit Expense states
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Lock background scrolling when either the Add or Edit Expense modal is open
  useEffect(() => {
    const scrollContainer = document.querySelector('main');
    const isModalOpen = showAddModal || !!editingExpense;
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      if (scrollContainer) {
        scrollContainer.style.overflow = 'hidden';
      }
    } else {
      document.body.style.overflow = '';
      if (scrollContainer) {
        scrollContainer.style.overflow = '';
      }
    }
    return () => {
      document.body.style.overflow = '';
      if (scrollContainer) {
        scrollContainer.style.overflow = '';
      }
    };
  }, [showAddModal, editingExpense]);

  const findCategory = (catId: string) => {
    return categories.find(c => c.id === catId);
  };

  // Filter expenses by search query
  const filteredExpenses = expenses.filter(item => {
    const descMatch = item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const cat = findCategory(item.categoryId);
    const catMatch = cat ? cat.name.toLowerCase().includes(searchQuery.toLowerCase()) : false;
    return descMatch || catMatch;
  });

  // Group all filtered expenses by year-month
  const groups = groupExpensesByMonth(filteredExpenses);
  const monthKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a)); // Sort in descending order

  const toggleMonth = (monthKey: string) => {
    setCollapsedMonths(prev => ({
      ...prev,
      [monthKey]: !prev[monthKey]
    }));
  };

  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedValue = parseFloat(amount.toString().replace(',', '.'));
    const amountNum = parsedValue ? Math.round(parsedValue * 100) / 100 : 0;
    if (!amountNum || isNaN(amountNum) || amountNum <= 0) {
      alert(TRANSLATIONS[language].alertInputAmount);
      return;
    }
    if (!categoryId) {
      alert(TRANSLATIONS[language].alertInputCategory);
      return;
    }

    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      categoryId,
      amount: amountNum,
      date,
      description: description.trim() || TRANSLATIONS[language].noDescription
    };

    onAddExpense(newExpense);

    // Reset fields
    setAmount('');
    setCategoryId('');
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setShowAddModal(false);
  };

  const handleStartEditExpense = (item: Expense) => {
    setEditingExpense(item);
    setEditAmount(item.amount.toString());
    setEditCategoryId(item.categoryId);
    setEditDate(item.date);
    setEditDescription(item.description);
  };

  const handleEditExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedValue = parseFloat(editAmount.toString().replace(',', '.'));
    const amountNum = parsedValue ? Math.round(parsedValue * 100) / 100 : 0;
    if (!amountNum || isNaN(amountNum) || amountNum <= 0) {
      alert(TRANSLATIONS[language].alertInputAmount);
      return;
    }
    if (!editCategoryId) {
      alert(TRANSLATIONS[language].alertInputCategory);
      return;
    }

    const updatedExpense: Expense = {
      ...editingExpense!,
      categoryId: editCategoryId,
      amount: amountNum,
      date: editDate,
      description: editDescription.trim() || TRANSLATIONS[language].noDescription
    };

    onEditExpense(updatedExpense);
    setEditingExpense(null);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Page Title Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-bold font-display text-white">{TRANSLATIONS[language].navExpenses}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{TRANSLATIONS[language].expensesListDesc}</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddModal(true)}
          className="flex items-center bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-xs py-2 px-4 rounded-full shadow-lg shadow-indigo-500/20 border border-indigo-400/10 cursor-pointer"
        >
          <span>{TRANSLATIONS[language].addExpenseBtn}</span>
        </motion.button>
      </div>

      {/* Search Input bar (shown only if there is at least one transaction in general) */}
      {expenses.length > 0 && (
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={TRANSLATIONS[language].searchPlaceholder}
            className="w-full glass-input rounded-2xl pl-11 pr-10 py-3 text-sm font-sans placeholder-slate-500 focus:outline-none focus:border-indigo-500/40"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {/* Main Collapsible Monthly Expense List Group */}
      {expenses.length === 0 ? (
        <div className="glass-panel rounded-[32px] p-8 text-center text-slate-400 border border-white/10 space-y-2">
          <CalendarClock size={28} className="mx-auto text-slate-500" />
          <p className="text-sm font-medium">{TRANSLATIONS[language].noExpensesFound}</p>
          <p className="text-xs text-slate-500">{TRANSLATIONS[language].noExpensesFoundHelp}</p>
        </div>
      ) : monthKeys.length === 0 ? (
        <div className="glass-panel rounded-[32px] p-8 text-center text-slate-400 border border-white/10 space-y-2">
          <Search size={28} className="mx-auto text-slate-500" />
          <p className="text-sm font-medium">{TRANSLATIONS[language].noSearchResults}</p>
          <p className="text-xs text-slate-500">{TRANSLATIONS[language].noSearchResultsHelp}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {monthKeys.map(monthKey => {
            const monthExpenses = groups[monthKey];
            const isCollapsed = !!collapsedMonths[monthKey];
            const totalMonthlyAmount = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

            return (
              <div 
                key={monthKey} 
                className="glass-panel rounded-[32px] overflow-hidden border border-white/10 shadow-md flex flex-col"
              >
                {/* 1. Monthly Group Header Row (Interactive Toggle) */}
                <button
                  onClick={() => toggleMonth(monthKey)}
                  className="w-full flex items-center justify-between p-4 bg-slate-900/40 hover:bg-slate-900/60 transition-all text-left border-b border-white/5 select-none focus:outline-none cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-400">
                      {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                    </span>
                    <span className="font-semibold text-white/95 text-sm md:text-base font-display">
                      {getReadableMonthLabelLocalized(monthKey, language)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-200 text-sm md:text-base">
                      {formatMoney(totalMonthlyAmount, currencyCode)}
                    </span>
                  </div>
                </button>

                {/* 2. Group Expenses Roll-down with smooth scale-down/fade height */}
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="divide-y divide-white/10 bg-slate-950/20 max-h-[400px] overflow-y-auto">
                        {monthExpenses.map(item => {
                          const cat = findCategory(item.categoryId);
                          return (
                            <div 
                              key={item.id} 
                              className="p-4 flex items-start justify-between hover:bg-white/5 transition duration-150 group"
                            >
                              <div className="flex items-start space-x-3 max-w-[65%] md:max-w-[70%]">
                                <div className="p-2.5 rounded-xl bg-slate-800/80 text-indigo-400 shrink-0 mt-0.5">
                                  <CategoryIcon name={cat?.icon || 'HelpCircle'} size={16} />
                                </div>
                                <div className="truncate flex flex-col min-w-0">
                                  <p className="font-medium text-white/90 text-sm truncate" title={item.description}>
                                    {item.description}
                                  </p>
                                  <div className="flex flex-col items-start gap-1 mt-1">
                                    <span className="bg-slate-800/60 text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-medium leading-none block">
                                      {cat ? getLocalizedCategoryName(cat.name, language) : TRANSLATIONS[language].noCategory}
                                    </span>
                                    <span className="text-[10px] text-slate-400/80 font-mono flex items-center space-x-1 pl-0.5 mt-0.5">
                                      <Calendar size={10} className="text-slate-500 shrink-0" />
                                      <span>{item.date}</span>
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2 shrink-0 select-none">
                                <span className="font-mono font-bold text-red-400/90 text-sm whitespace-nowrap">
                                  -{formatMoney(item.amount, currencyCode)}
                                </span>
                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={() => handleStartEditExpense(item)}
                                    className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition duration-200 cursor-pointer"
                                    title={language === 'RU' ? 'Редактировать расход' : 'Edit Expense'}
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  <button
                                    onClick={() => onDeleteExpense(item.id)}
                                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition duration-200 cursor-pointer"
                                    title={TRANSLATIONS[language].deleteExpenseBtnTitle}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Float modal in micro glass glassmorphic layout */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-panel w-full max-w-sm rounded-[32px] p-6 relative z-10 space-y-4 overflow-hidden border border-white/10 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-base font-display">{TRANSLATIONS[language].newExpenseModalTitle}</h3>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 hover:bg-white/10 rounded-full transition duration-150 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddExpenseSubmit} className="space-y-4">
                {/* Amount input */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium flex items-center space-x-1 whitespace-nowrap truncate block">
                    <Coins size={13} />
                    <span>{TRANSLATIONS[language].expenseAmountInputLabel} ({getCurrencySymbol(currencyCode)})</span>
                  </label>
                  <input 
                    type="text"
                    inputMode="decimal"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-base font-mono"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>

                {/* Category select picker */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium flex items-center space-x-1 whitespace-nowrap truncate block">
                    <Tag size={13} />
                    <span>{TRANSLATIONS[language].categoryLabel}</span>
                  </label>
                  <select
                    required
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm appearance-none bg-slate-900"
                  >
                    <option value="" disabled className="text-slate-500">{TRANSLATIONS[language].chooseCategoryPlaceholder}</option>
                    {categories.map(cat => (
                       <option key={cat.id} value={cat.id} className="text-white bg-slate-900">
                        {getLocalizedCategoryName(cat.name, language)} ({TRANSLATIONS[language].limitLabel}: {formatMoney(cat.monthlyLimit, currencyCode)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pick Date */}
                <div className="space-y-1.5 min-w-0">
                  <label className="text-xs text-slate-400 font-medium flex items-center space-x-1 whitespace-nowrap truncate block">
                    <Calendar size={13} />
                    <span>{TRANSLATIONS[language].dateLabel}</span>
                  </label>
                  <input 
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full max-w-full glass-input rounded-xl px-3 py-2.5 text-sm font-mono cursor-pointer min-w-0"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium whitespace-nowrap truncate block">{TRANSLATIONS[language].expenseDescInputLabel}</label>
                  <input 
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm"
                    placeholder={TRANSLATIONS[language].expenseDescInputPlaceholder}
                  />
                </div>

                {/* Submit */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl py-2.5 text-xs font-semibold tracking-wider uppercase transition-colors shadow-lg shadow-indigo-500/25 flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <span>{TRANSLATIONS[language].addExpenseSubmitBtn}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Expense Modal */}
      <AnimatePresence>
        {editingExpense && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingExpense(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-panel w-full max-w-sm rounded-[32px] p-6 relative z-10 space-y-4 overflow-hidden border border-white/10 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-base font-display">
                  {language === 'RU' ? 'Редактировать расход' : 'Edit Expense'}
                </h3>
                <button 
                  onClick={() => setEditingExpense(null)}
                  className="p-1.5 hover:bg-white/10 rounded-full transition duration-150 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleEditExpenseSubmit} className="space-y-4">
                {/* Amount input */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium flex items-center space-x-1 whitespace-nowrap truncate block animate-none">
                    <Coins size={13} />
                    <span>{language === 'RU' ? 'Сумма расхода' : 'Expense Amount'} ({getCurrencySymbol(currencyCode)})</span>
                  </label>
                  <input 
                    type="text"
                    inputMode="decimal"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-base font-mono"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>

                {/* Category select picker */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium flex items-center space-x-1 whitespace-nowrap truncate block">
                    <Tag size={13} />
                    <span>{TRANSLATIONS[language].categoryLabel}</span>
                  </label>
                  <select
                    required
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm appearance-none bg-slate-900"
                  >
                    <option value="" disabled className="text-slate-500">{TRANSLATIONS[language].chooseCategoryPlaceholder}</option>
                    {categories.map(cat => (
                       <option key={cat.id} value={cat.id} className="text-white bg-slate-900">
                        {getLocalizedCategoryName(cat.name, language)} ({TRANSLATIONS[language].limitLabel}: {formatMoney(cat.monthlyLimit, currencyCode)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pick Date */}
                <div className="space-y-1.5 min-w-0">
                  <label className="text-xs text-slate-400 font-medium flex items-center space-x-1 whitespace-nowrap truncate block animate-none">
                    <Calendar size={13} />
                    <span>{TRANSLATIONS[language].dateLabel}</span>
                  </label>
                  <input 
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full max-w-full glass-input rounded-xl px-3 py-2.5 text-sm font-mono cursor-pointer min-w-0"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium whitespace-nowrap truncate block">{TRANSLATIONS[language].expenseDescInputLabel}</label>
                  <input 
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm"
                    placeholder={TRANSLATIONS[language].expenseDescInputPlaceholder}
                  />
                </div>

                {/* Submit */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl py-2.5 text-xs font-semibold tracking-wider uppercase transition-colors shadow-lg shadow-indigo-500/25 flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <span>{language === 'RU' ? 'Сохранить изменения' : 'Save Changes'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
