import React, { useState, useEffect } from 'react';
import { Category, Expense, AdditionalIncome, CategoryWithCalculations } from '../types';
import { formatMoney, calculateCategoriesForMonth, getCurrencySymbol } from '../utils/finance';
import CategoryIcon, { AVAILABLE_ICONS } from './CategoryIcon';
import { Info, Plus, Pencil, X, Save, FolderPlus, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LanguageCode, TRANSLATIONS, getLocalizedCategoryName } from '../utils/translations';

interface BudgetOverviewProps {
  categories: Category[];
  expenses: Expense[];
  incomes: AdditionalIncome[];
  currentMonth: string;
  onUpdateCategories: (categories: Category[]) => void;
  currencyCode?: string;
  language?: LanguageCode;
}

export default function BudgetOverview({
  categories,
  expenses,
  incomes,
  currentMonth,
  onUpdateCategories,
  currencyCode = 'RUB',
  language = 'RU'
}: BudgetOverviewProps) {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  
  // State for adding a new category
  const [newCatName, setNewCatName] = useState('');
  const [newCatLimit, setNewCatLimit] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('ShoppingCart');

  // State for updating values of an existing category
  const [editName, setEditName] = useState('');
  const [editLimit, setEditLimit] = useState('');
  const [editIcon, setEditIcon] = useState('');

  // Lock scrolling when category forms (Add/Edit modals) are shown
  useEffect(() => {
    const isModalOpen = showAddCategory || editingCategory !== null;
    const scrollContainer = document.querySelector('main');
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
  }, [showAddCategory, editingCategory]);

  // 1. Calculate and derive values for all categories in the active month
  const categoriesWithCalculations = calculateCategoriesForMonth(
    categories,
    expenses,
    incomes,
    currentMonth
  );

  // 2. Compute aggregate balances
  const totalLimit = categoriesWithCalculations.reduce((sum, c) => sum + c.monthlyLimit, 0);
  const totalRollover = categoriesWithCalculations.reduce((sum, c) => sum + c.rolloverPreviousMonth, 0);
  const totalExpenses = categoriesWithCalculations.reduce((sum, c) => sum + c.currentExpenses, 0);
  const totalAdditional = categoriesWithCalculations.reduce((sum, c) => sum + c.currentAdditional, 0);
  
  // Общий суммарный баланс (Остаток_Всего по всем категориям)
  const totalRemainingBalance = categoriesWithCalculations.reduce((sum, c) => sum + c.totalRemaining, 0);

  // Total allocated percentage across categories
  const totalPercentage = categories.reduce((sum, c) => sum + (c.percentage ?? 0), 0);

  const handleEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setEditName(cat.name);
    setEditLimit((cat.percentage ?? 0).toString());
    setEditIcon(cat.icon || 'ShoppingCart');
  };

  const handleSaveCategoryEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    if (!editName.trim()) return;

    const parsedEdit = parseFloat(editLimit.toString().replace(',', '.'));
    const percentageNum = parsedEdit ? Math.round(parsedEdit * 100) / 100 : 0;

    const updated = categories.map(cat => {
      if (cat.id === editingCategory.id) {
        return {
          ...cat,
          name: editName.trim(),
          percentage: percentageNum,
          icon: editIcon
        };
      }
      return cat;
    });

    onUpdateCategories(updated);
    setEditingCategory(null);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const parsedNew = parseFloat(newCatLimit.toString().replace(',', '.'));
    const percentageNum = parsedNew ? Math.round(parsedNew * 100) / 100 : 0;

    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: newCatName.trim(),
      icon: newCatIcon,
      monthlyLimit: 0,
      rolloverPreviousMonth: 0,
      percentage: percentageNum
    };

    onUpdateCategories([...categories, newCat]);
    
    // Reset form states
    setNewCatName('');
    setNewCatLimit('');
    setShowAddCategory(false);
  };

  const handleDeleteCategory = (id: string) => {
    if (confirm(TRANSLATIONS[language].confirmDeleteCategory)) {
      const filtered = categories.filter(c => c.id !== id);
      onUpdateCategories(filtered);
      if (editingCategory?.id === id) {
        setEditingCategory(null);
      }
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Блок общего суммарного баланса в шапке */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-[32px] p-8 relative overflow-hidden shadow-2xl"
      >
        {/* Decorative backdrop glow for balance card */}
        <div className="absolute -right-16 -top-16 w-36 h-36 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-36 h-36 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-2">
          <span className="text-xs font-medium tracking-widest text-slate-400 uppercase">
            {TRANSLATIONS[language].totalRemainingBalance}
          </span>
          <div className="flex items-baseline space-x-2">
            <h1 className={`text-3xl md:text-4xl font-bold font-display tracking-tight transition-colors duration-300 ${totalRemainingBalance < 0 ? 'text-red-400' : 'text-white'}`}>
              {formatMoney(totalRemainingBalance, currencyCode)}
            </h1>
          </div>
          
          <div className="pt-4 mt-4 border-t border-white/10 grid grid-cols-2 gap-4 text-xs">
             <div className="space-y-1">
              <span className="text-slate-400 whitespace-nowrap block">{TRANSLATIONS[language].monthlyLimits}</span>
              <p className="font-semibold text-white/90 whitespace-nowrap">{formatMoney(totalLimit, currencyCode)}</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 whitespace-nowrap block">{TRANSLATIONS[language].additionalIncome}</span>
              <p className="font-semibold text-emerald-400 whitespace-nowrap">+{formatMoney(totalAdditional, currencyCode)}</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 whitespace-nowrap block">{TRANSLATIONS[language].monthlyExpenses}</span>
              <p className="font-semibold text-red-400/90 whitespace-nowrap">-{formatMoney(totalExpenses, currencyCode)}</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 whitespace-nowrap block">{TRANSLATIONS[language].previousPeriodRoll}</span>
              <p className={`font-semibold whitespace-nowrap ${totalRollover < 0 ? 'text-red-400' : 'text-slate-300'}`}>
                {totalRollover >= 0 ? '+' : ''}{formatMoney(totalRollover, currencyCode)}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. Заголовок секции категорий и кнопка добавления */}
      <div className="flex items-center justify-between px-1">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white/90 font-display flex items-center space-x-2">
            <span>{TRANSLATIONS[language].categorySummaryHeader}</span>
            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono font-normal">
              {categories.length}
            </span>
          </h2>
          <div className="text-[10px] text-slate-400 font-mono">
            {language === 'RU' ? 'Доля распределения:' : 'Allocated share:'}{' '}
            <span className={`font-semibold ${totalPercentage !== 100 ? 'text-indigo-400' : 'text-emerald-400'}`}>
              {totalPercentage}%
            </span>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddCategory(true)}
          className="flex items-center space-x-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-full border border-indigo-500/20 transition-all duration-200 cursor-pointer"
        >
          <Plus size={14} />
          <span>{TRANSLATIONS[language].addCategoryButton}</span>
        </motion.button>
      </div>

      {/* 3. Список категорий в стиле Deck-карточек */}
      <div className="space-y-4">
        {categoriesWithCalculations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel rounded-3xl p-8 text-center border border-white/5 space-y-4 bg-slate-900/10 backdrop-blur-xl"
          >
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-950/80 flex items-center justify-center text-indigo-400 border border-white/5">
              <FolderPlus size={18} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-white/95 font-display">
                {language === 'RU' ? 'Категории отсутствуют' : 'No Categories Found'}
              </p>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto font-sans">
                {language === 'RU' 
                  ? 'Кажется, ваша база данных пуста. Добавьте первую финансовую категорию, чтобы начать распределение бюджета и учет расходов.' 
                  : 'It seems your database is empty. Add your first financial category to start allocating limits, incomes, and expenses.'}
              </p>
            </div>
            <button
              onClick={() => setShowAddCategory(true)}
              className="py-2.5 px-4 mx-auto font-semibold text-xs rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white border border-indigo-400 transition duration-150 cursor-pointer shadow-lg shadow-indigo-500/10 flex items-center justify-center space-x-1.5 focus:outline-none"
            >
              <Plus size={13} />
              <span>{TRANSLATIONS[language].addCategoryButton}</span>
            </button>
          </motion.div>
        ) : categoriesWithCalculations.map((cat, index) => {
          const hasIncome = cat.currentAdditional > 0;
          const isNegative = cat.totalRemaining < 0;

          // Определение подсветки в зависимости от логических правил
          let customBorderClass = 'border-white/5';
          let glowBackground = 'bg-slate-900/60';
          let badgeText = '';

          if (isNegative) {
            customBorderClass = 'border-red-500/20';
            glowBackground = 'bg-red-950/20 shadow-[inset_0_0_20px_rgba(239,68,68,0.05)]';
          } else if (hasIncome) {
            customBorderClass = 'border-emerald-500/20';
            glowBackground = 'bg-emerald-950/20 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]';
            badgeText = `+${formatMoney(cat.currentAdditional, currencyCode)}`;
          }

          const totalCatLimit = cat.monthlyLimit + cat.currentAdditional;
          const pct = Math.min(100, (cat.currentExpenses / Math.max(1, totalCatLimit)) * 100);

          return (
            <motion.div
              layoutId={`cat-card-${cat.id}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              key={cat.id}
              className={`glass-panel rounded-[32px] p-5 ${glowBackground} border ${customBorderClass} relative overflow-hidden transition-all duration-300`}
            >
              {/* Highlight background elements */}
              {hasIncome && (
                <div className="absolute right-0 top-0 w-24 h-24 rounded-full bg-emerald-500/5 blur-xl pointer-events-none" />
              )}
              {isNegative && (
                <div className="absolute right-0 top-0 w-24 h-24 rounded-full bg-red-500/5 blur-xl pointer-events-none" />
              )}

              {/* 1. HEADER ROW: Icon + title and Edit button */}
              <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
                <div className="flex items-center space-x-3 min-w-0 max-w-[85%]">
                  <div className={`p-2.5 rounded-xl shrink-0 ${isNegative ? 'bg-red-500/10 text-red-400' : hasIncome ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800/80 text-indigo-400'}`}>
                    <CategoryIcon name={cat.icon} size={18} />
                  </div>
                  <h3 className="font-bold text-white text-sm truncate font-display">
                    {getLocalizedCategoryName(cat.name, language)}
                    <span className="text-indigo-400 font-mono text-xs ml-1.5 font-semibold">({cat.percentage ?? 0}%)</span>
                  </h3>
                </div>
                <button 
                  onClick={() => handleEditCategory(cat)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition duration-150 cursor-pointer shrink-0"
                  title={TRANSLATIONS[language].editCategoryTitle}
                >
                  <Pencil size={13} />
                </button>
              </div>

              {/* 2. MAIN KPI PANEL: Residual Balance (Big) and progress visualizer */}
              <div className="py-4 space-y-3.5">
                <div className="flex items-baseline justify-between animate-fade-in">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{TRANSLATIONS[language].remainingTotal}</span>
                  <div className={`text-xl font-black font-mono tracking-tight ${isNegative ? 'text-red-400' : 'text-emerald-400'}`}>
                    {formatMoney(cat.totalRemaining, currencyCode)}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">{TRANSLATIONS[language].expensesLabel}: {formatMoney(cat.currentExpenses, currencyCode)}</span>
                    <span className={`${pct >= 90 ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>{pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${isNegative ? 'bg-red-500' : pct >= 90 ? 'bg-rose-500' : 'bg-indigo-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* 3. GRID OF THE FOUR INPUT VARIABLES FOR THE COMPLETE FORMULA IN A VERTICAL CELL LAYOUT */}
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-3 border-t border-white/10">
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-2.5 flex flex-col items-start justify-center">
                  <span className="text-[10px] text-slate-400 font-medium">{TRANSLATIONS[language].limitLabel}</span>
                  <span className="font-bold text-white/95 font-mono text-[11px] mt-0.5 select-all truncate max-w-full">
                    {formatMoney(cat.monthlyLimit, currencyCode)}
                  </span>
                </div>

                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-2.5 flex flex-col items-start justify-center">
                  <span className="text-[10px] text-slate-400 font-medium">{TRANSLATIONS[language].pastLabel}</span>
                  <span className={`font-bold font-mono text-[11px] mt-0.5 select-all truncate max-w-full ${cat.rolloverPreviousMonth < 0 ? 'text-red-400' : cat.rolloverPreviousMonth > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {cat.rolloverPreviousMonth > 0 ? '+' : ''}{formatMoney(cat.rolloverPreviousMonth, currencyCode)}
                  </span>
                </div>

                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-2.5 flex flex-col items-start justify-center">
                  <span className="text-[10px] text-slate-400 font-medium">{TRANSLATIONS[language].additionalLabel}</span>
                  <span className={`font-bold font-mono text-[11px] mt-0.5 select-all truncate max-w-full ${cat.currentAdditional > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {cat.currentAdditional > 0 ? '+' : ''}{formatMoney(cat.currentAdditional, currencyCode)}
                  </span>
                </div>

                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-2.5 flex flex-col items-start justify-center">
                  <span className="text-[10px] text-slate-400 font-medium">{TRANSLATIONS[language].freeLabel}</span>
                  <span className="font-bold font-mono text-[11px] mt-0.5 select-all truncate max-w-full text-indigo-300">
                    {formatMoney(cat.remaining, currencyCode)}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Modal - Edit Category Limits & Rollover */}
      <AnimatePresence>
        {editingCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingCategory(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-panel w-full max-w-sm rounded-[32px] p-6 relative z-10 space-y-5 overflow-hidden border border-white/10 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-base font-display">{TRANSLATIONS[language].editCategoryModalTitle}</h3>
                <button 
                  onClick={() => setEditingCategory(null)}
                  className="p-1.5 hover:bg-white/10 rounded-full transition duration-150 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="text-sm bg-white/5 border border-white/10 p-4 rounded-2xl text-slate-300 flex items-center space-x-2.5">
                <CategoryIcon name={editIcon} size={18} className="text-indigo-400" />
                <span className="font-semibold text-white truncate">{getLocalizedCategoryName(editName || editingCategory.name, language)}</span>
              </div>

              <form onSubmit={handleSaveCategoryEdit} className="space-y-4">
                {/* Category Name Input */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">{TRANSLATIONS[language].categoryNameInputLabel}</label>
                  <input 
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm"
                    placeholder={TRANSLATIONS[language].categoryNameInputPlaceholder}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium whitespace-nowrap truncate block">{TRANSLATIONS[language].monthlyLimitInputLabel}</label>
                  <input 
                    type="text"
                    inputMode="decimal"
                    required
                    value={editLimit}
                    onChange={(e) => setEditLimit(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm font-mono"
                    placeholder="e.g. 30"
                  />
                  <p className="text-[10px] text-slate-400 leading-normal">
                    {language === 'RU' ? 'Укажите процентную долю от всех доходов за месяц.' : 'Enter percentage share from all monthly incomes.'}
                  </p>
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="text-xs text-slate-400 font-medium whitespace-nowrap truncate block">
                    {language === 'RU' ? 'Иконка' : 'Icon'}
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {AVAILABLE_ICONS.map(item => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setEditIcon(item)}
                        className={`p-2.5 rounded-xl border flex items-center justify-center transition cursor-pointer ${editIcon === item ? 'bg-indigo-500/20 border-indigo-400 text-indigo-400' : 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-white'}`}
                      >
                        <CategoryIcon name={item} size={16} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1 bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-xs">
                  <div className="text-slate-300 flex justify-between">
                    <span>{language === 'RU' ? 'Текущий лимит:' : 'Current limit:'}</span>
                    <span className="font-bold text-white font-mono">{formatMoney(editingCategory.monthlyLimit, currencyCode)}</span>
                  </div>
                  <div className="text-slate-300 flex justify-between mt-1.5">
                    <span>{language === 'RU' ? 'Прошлый ролловер:' : 'Past rollover:'}</span>
                    <span className={`font-bold font-mono ${editingCategory.rolloverPreviousMonth < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {editingCategory.rolloverPreviousMonth >= 0 ? '+' : ''}{formatMoney(editingCategory.rolloverPreviousMonth, currencyCode)}
                    </span>
                  </div>
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(editingCategory.id)}
                    className="w-1/3 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 rounded-xl py-2.5 text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer"
                  >
                    {TRANSLATIONS[language].deleteBtn}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl py-2.5 text-xs font-semibold tracking-wider uppercase transition-colors shadow-lg shadow-indigo-500/25 flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Save size={14} />
                    <span>{TRANSLATIONS[language].saveBtn}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal - Add Category */}
      <AnimatePresence>
        {showAddCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddCategory(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-panel w-full max-w-sm rounded-[32px] p-6 relative z-10 space-y-4 overflow-hidden border border-white/10 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-base font-display">{TRANSLATIONS[language].newCategoryModalTitle}</h3>
                <button 
                  onClick={() => setShowAddCategory(false)}
                  className="p-1.5 hover:bg-white/10 rounded-full transition duration-150 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddCategory} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium whitespace-nowrap truncate block">{TRANSLATIONS[language].categoryNameInputLabel}</label>
                  <input 
                    type="text"
                    required
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm"
                    placeholder={TRANSLATIONS[language].categoryNameInputPlaceholder}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium whitespace-nowrap truncate block">{TRANSLATIONS[language].limitInputLabel}</label>
                  <input 
                    type="text"
                    inputMode="decimal"
                    required
                    value={newCatLimit}
                    onChange={(e) => setNewCatLimit(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm font-mono"
                    placeholder="e.g. 25"
                  />
                  <p className="text-[10px] text-slate-400 leading-normal">
                    {language === 'RU' ? 'Процентная доля бюджета (суммарно должно быть около 100%).' : 'Percentage share of the total budget (should sum near 100%).'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium whitespace-nowrap truncate block">{TRANSLATIONS[language].chooseIconLabel}</label>
                  <div className="grid grid-cols-6 gap-2 pt-1">
                    {AVAILABLE_ICONS.map(item => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setNewCatIcon(item)}
                        className={`p-2.5 rounded-xl border flex items-center justify-center transition cursor-pointer ${newCatIcon === item ? 'bg-indigo-500/20 border-indigo-400 text-indigo-400' : 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-white'}`}
                      >
                        <CategoryIcon name={item} size={18} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl py-2.5 text-xs font-semibold tracking-wider uppercase transition-colors shadow-lg shadow-indigo-500/25 flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>{TRANSLATIONS[language].addCategorySubmitBtn}</span>
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
