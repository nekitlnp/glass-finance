import React, { useState } from 'react';
import { Category, AdditionalIncome } from '../types';
import { formatMoney, getCurrencySymbol, todayLocalISO } from '../utils/finance';
import CategoryIcon from './CategoryIcon';
import { Plus, Trash2, Calendar, Coins, ListFilter, Sparkles, Check, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { LanguageCode, TRANSLATIONS, getLocalizedCategoryName } from '../utils/translations';

interface IncomeListProps {
  categories: Category[];
  incomes: AdditionalIncome[];
  onAddIncome: (income: AdditionalIncome) => void;
  onDeleteIncome: (id: string) => void;
  currencyCode?: string;
  language?: LanguageCode;
}

export default function IncomeList({
  categories,
  incomes,
  onAddIncome,
  onDeleteIncome,
  currencyCode = 'RUB',
  language = 'RU'
}: IncomeListProps) {
  // Tabs controller: 'primary' = Основной доход, 'additional' = Доп. доход
  const [incomeType, setIncomeType] = useState<'primary' | 'additional'>('primary');

  // Form states
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayLocalISO());
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  const parsedValue = parseFloat(amount.toString().replace(',', '.'));
  const amountNum = parsedValue ? Math.round(parsedValue * 100) / 100 : 0;

  const handleCategoryToggle = (catId: string) => {
    setSelectedCategoryIds(prev => 
      prev.includes(catId) 
        ? prev.filter(id => id !== catId) 
        : [...prev, catId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amountNum || amountNum <= 0) {
      alert(TRANSLATIONS[language].alertInputIncomeAmount);
      return;
    }

    if (categories.length === 0) {
      alert(language === 'RU' ? 'Пожалуйста, создайте сначала хотя бы одну категорию бюджетов!' : 'Please create at least one budget category first!');
      return;
    }

    let distributedTo: string[] = [];
    if (incomeType === 'primary') {
      distributedTo = categories.map(c => c.id);
    } else {
      if (selectedCategoryIds.length === 0) {
        alert(language === 'RU' ? 'Пожалуйста, выберите хотя бы одну категорию для распределения дополнительного дохода!' : 'Please select at least one category to distribute the additional income!');
        return;
      }
      distributedTo = [...selectedCategoryIds];
    }

    const newIncome: AdditionalIncome = {
      id: `inc-${Date.now()}`,
      amount: amountNum,
      description: description.trim() || TRANSLATIONS[language].noDescription,
      date,
      distributedTo,
      type: incomeType
    };

    onAddIncome(newIncome);

    // Reset Form
    setAmount('');
    setDescription('');
    setDate(todayLocalISO());
    setSelectedCategoryIds([]);
  };

  const getCategoryDetails = (idOrName: string) => {
    const cat = categories.find(c => c.id === idOrName || c.name === idOrName);
    return {
      name: cat ? getLocalizedCategoryName(cat.name, language) : TRANSLATIONS[language].noCategoryAlternative,
      icon: cat ? cat.icon : 'HelpCircle',
      percentage: cat ? (cat.percentage ?? 0) : 0
    };
  };

  const sortedIncomes = [...incomes].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Add Income Glassmorphic Form Card */}
      <motion.div 
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-[32px] p-6 relative overflow-hidden shadow-xl border border-white/10"
      >
        <div className="absolute -right-16 -bottom-16 w-32 h-32 rounded-full bg-emerald-500/10 blur-xl pointer-events-none" />
        
        <h3 className="font-bold text-white text-base font-display flex items-center space-x-2 pb-1">
          <Sparkles className="text-emerald-400" size={18} />
          <span>{language === 'RU' ? 'Внесение доходов' : 'Add Income'}</span>
        </h3>

        {/* Dynamic Dual Tab Selectors */}
        <div className="grid grid-cols-2 p-1 bg-slate-950/60 rounded-xl border border-white/5 my-4">
          <button
            type="button"
            onClick={() => setIncomeType('primary')}
            className={`py-2 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${incomeType === 'primary' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            {language === 'RU' ? 'Основной доход' : 'Primary Income'}
          </button>
          <button
            type="button"
            onClick={() => setIncomeType('additional')}
            className={`py-2 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${incomeType === 'additional' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            {language === 'RU' ? 'Доп. доход' : 'Add. Income'}
          </button>
        </div>
        
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          {incomeType === 'primary' 
            ? (language === 'RU'
              ? 'Основной доход распределяется по всем категориям на основе установленных в Обзоре процентных долей бюджетов.'
              : 'Primary income is automatically shared across all budget categories according to their set custom percentage weights.')
            : (language === 'RU'
              ? 'Дополнительный доход делит зачисленную сумму поровну среди выбранных вами категорий.'
              : 'Additional income splits the credit amount equally among selected categories.')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Amount & Date */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium flex items-center space-x-1 whitespace-nowrap truncate block">
                <Coins size={13} />
                <span>{TRANSLATIONS[language].incomeAmountInputLabel} ({getCurrencySymbol(currencyCode)})</span>
              </label>
              <input 
                type="text"
                inputMode="decimal"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-2.5 text-sm font-mono"
                placeholder={TRANSLATIONS[language].incomeAmountInputPlaceholder}
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <label className="text-xs text-slate-400 font-medium flex items-center space-x-1 whitespace-nowrap truncate block">
                <Calendar size={13} />
                <span>{TRANSLATIONS[language].dateOfDepositLabel}</span>
              </label>
              <input 
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full max-w-full glass-input rounded-xl px-3 py-2.5 text-sm font-mono cursor-pointer min-w-0"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium whitespace-nowrap truncate block">{TRANSLATIONS[language].sourceInputLabel}</label>
            <input 
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full glass-input rounded-xl px-4 py-2.5 text-sm"
              placeholder={TRANSLATIONS[language].sourceInputPlaceholder}
            />
          </div>

          {/* 2. Interactive percentage allocation live preview tagging section */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-semibold flex items-center space-x-1 whitespace-nowrap truncate block">
              <ListFilter size={13} className="text-indigo-400" />
              <span>{language === 'RU' ? 'Схема распределения бюджета' : 'Budget allocation pattern'}</span>
            </label>

            {incomeType === 'primary' ? (
              // Primary Income Auto-Distribution Preview (Vertical list, each category on its own row)
              <div className="flex flex-col gap-2 mt-1.5 opacity-90">
                {categories.map(cat => {
                  const percentage = cat.percentage ?? 0;
                  const allocatedPreview = amountNum * (percentage / 100);
                  return (
                    <div
                      key={cat.id}
                      className="p-3 rounded-2xl border bg-slate-900/60 border-white/5 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <div className="p-1.5 rounded-lg text-xs bg-slate-800 text-slate-400">
                          <CategoryIcon name={cat.icon} size={14} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-semibold text-white/90 truncate">
                            {getLocalizedCategoryName(cat.name, language)}
                          </span>
                          <span className="text-[10px] text-indigo-400 font-mono font-medium mt-0.5">
                            {percentage}%
                          </span>
                        </div>
                      </div>

                      <div className="text-right truncate pl-1">
                        <span className="font-mono font-bold text-[11px] text-emerald-400 block">
                          +{formatMoney(allocatedPreview, currencyCode)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Additional Income Manual equal split category list: each on its own vertical row ("в отдельной строке. Оставить возможность выбора категории")
              <div className="space-y-2 mt-1.5">
                <div className="text-[10px] text-indigo-300 font-mono flex items-center space-x-1">
                  <Info size={11} />
                  <span>
                    {language === 'RU' 
                      ? 'Выберите категории. Доп. доход будет разделен между ними поровну:' 
                      : 'Select categories. Additional income will be split equally between them:'}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {categories.map(cat => {
                    const isSelected = selectedCategoryIds.includes(cat.id);
                    const kCount = selectedCategoryIds.length;
                    const isAllocated = isSelected && kCount > 0;
                    
                    const dynamicPercentage = isAllocated ? Math.round(100 / kCount) : 0;
                    const allocatedPreview = isAllocated ? (amountNum / kCount) : 0;
                    
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategoryToggle(cat.id)}
                        className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all duration-200 cursor-pointer w-full ${isSelected ? 'bg-indigo-500/15 border-indigo-500/50 shadow-md scale-[0.99]' : 'bg-slate-900/60 border-white/5 hover:border-white/10'}`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                          <div className={`p-1.5 rounded-lg text-xs shrink-0 ${isSelected ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}>
                            <CategoryIcon name={cat.icon} size={14} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className={`text-[11px] font-bold block truncate ${isSelected ? 'text-white font-semibold' : 'text-slate-300'}`}>
                              {getLocalizedCategoryName(cat.name, language)}
                            </span>
                            {isAllocated ? (
                              <span className="text-[10px] text-indigo-400 font-mono font-medium mt-0.5">
                                {dynamicPercentage}%
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono text-slate-500 uppercase mt-0.5 font-medium">
                                {language === 'RU' ? 'не выбрано' : 'unselected'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 shrink-0">
                          {isAllocated && (
                            <span className="font-mono font-bold text-[11px] text-emerald-400">
                              +{formatMoney(allocatedPreview, currencyCode)}
                            </span>
                          )}
                          <div className={`w-4 h-4 rounded-full border shrink-0 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-500 border-indigo-400 text-white' : 'border-white/10'}`}>
                            {isSelected && <Check size={10} strokeWidth={3} />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2.5 text-xs font-semibold tracking-wider uppercase transition-colors shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Plus size={14} />
              <span>{TRANSLATIONS[language].distributeIncomeSubmitBtn}</span>
            </button>
          </div>
        </form>
      </motion.div>

      {/* 3. Income Ledger Section */}
      <h3 className="text-lg font-semibold text-white/90 font-display px-1">
        {TRANSLATIONS[language].incomeHistoryTitle}
      </h3>

      {sortedIncomes.length === 0 ? (
        <div className="glass-panel rounded-[32px] p-8 text-center text-slate-400 border border-white/10 shadow-lg">
          <Coins className="mx-auto text-slate-500 mb-2" size={24} />
          <p className="text-sm font-medium">{TRANSLATIONS[language].noIncomeHistory}</p>
          <p className="text-xs text-slate-500 mt-1">{TRANSLATIONS[language].noIncomeHistoryHelp}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedIncomes.map(item => {
            const isPrimary = item.type === 'primary';
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={item.id}
                className="glass-panel p-6 rounded-[32px] border border-white/10 relative overflow-hidden shadow-xl"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5 select-text min-w-0 flex-1 pr-4">
                    <h4 className="font-semibold text-white/90 text-sm leading-tight break-words">{item.description}</h4>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono select-none">
                      <span className="flex items-center space-x-1">
                        <Calendar size={11} className="text-slate-500" />
                        <span>{item.date}</span>
                      </span>
                      <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full ${isPrimary ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                        {isPrimary 
                          ? (language === 'RU' ? 'Основной' : 'Primary') 
                          : (language === 'RU' ? 'Доп. доход' : 'Add. Income')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2.5">
                    <span className="font-mono text-emerald-400 font-bold text-base">
                      +{formatMoney(item.amount, currencyCode)}
                    </span>
                    <button
                      onClick={() => onDeleteIncome(item.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition duration-200 cursor-pointer"
                      title={TRANSLATIONS[language].deleteIncomeBtnTitle}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Categories allocation readout */}
                <div className="mt-4 pt-3.5 border-t border-white/5 space-y-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    {TRANSLATIONS[language].distributionSharesPrefix(item.distributedTo.length)}
                  </span>
                  
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {item.distributedTo.map(catId => {
                      const details = getCategoryDetails(catId);
                      
                      let sharePercentage = 0;
                      let catShare = 0;

                      if (isPrimary) {
                        sharePercentage = details.percentage;
                        catShare = item.amount * (sharePercentage / 100);
                      } else {
                        const len = Math.max(1, item.distributedTo.length);
                        sharePercentage = Math.round(100 / len);
                        catShare = item.amount / len;
                      }

                      return (
                        <div 
                          key={catId}
                          className="flex items-center space-x-1.5 bg-slate-900/60 border border-emerald-500/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-300"
                        >
                          <CategoryIcon name={details.icon} size={11} className="text-indigo-400" />
                          <span className="font-medium text-[11px] text-white/80 shrink-0">{details.name} ({sharePercentage}%)</span>
                          <span className="text-emerald-400 font-mono font-bold text-[11px]">
                            +{formatMoney(catShare, currencyCode)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
