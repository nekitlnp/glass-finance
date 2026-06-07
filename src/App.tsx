import React, { useState, useEffect, useRef } from 'react';
import { Category, Expense, AdditionalIncome } from './types';
import { loadState, saveState, INITIAL_CATEGORIES } from './mockData';
import BudgetOverview from './components/BudgetOverview';
import ExpensesList from './components/ExpensesList';
import IncomeList from './components/IncomeList';
import { ImportModal } from './components/ImportModal';
import { OnboardingGuide } from './components/OnboardingGuide';
import { 
  PiggyBank, 
  TrendingDown, 
  TrendingUp, 
  Calendar, 
  Wallet,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  X,
  Settings,
  Globe,
  Sun,
  Moon,
  Tv,
  CheckCircle2,
  Cloud,
  Database,
  RefreshCw,
  Upload,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatMoney, calculateCategoriesForMonth, getCurrencySymbol } from './utils/finance';
import { LanguageCode, TRANSLATIONS, getMonthLocalizedName } from './utils/translations';

interface ToastType {
  id: string;
  message: string;
  type: 'warning' | 'info' | 'success';
}

type ThemeMode = 'dark' | 'light' | 'system';

export default function App() {
  // 1. Core Reactive States
  const [categories, setCategories] = useState<Category[]>(() => loadState().categories);
  const [expenses, setExpenses] = useState<Expense[]>(() => loadState().expenses);
  const [incomes, setIncomes] = useState<AdditionalIncome[]>(() => loadState().incomes);
  const [currentMonth, setCurrentMonth] = useState(() => loadState().currentMonth);
  
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    try {
      const savedTheme = localStorage.getItem('glass_finance_theme_mode') as ThemeMode;
      return (savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'system') ? savedTheme : 'dark';
    } catch {
      return 'dark';
    }
  });
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>(() => {
    try {
      const savedTheme = localStorage.getItem('glass_finance_theme_mode') as ThemeMode;
      if (savedTheme === 'light') return 'light';
      if (savedTheme === 'system') {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        return mediaQuery.matches ? 'dark' : 'light';
      }
      return 'dark';
    } catch {
      return 'dark';
    }
  });

  // Google Sheets integration state tracking
  const [scriptUrl, setScriptUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('glass_finance_google_sheet_url') || '';
    } catch {
      return '';
    }
  });

  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    try {
      const onboardingCompleted = localStorage.getItem('glass_finance_onboarding_completed') === 'true';
      const urlConfigured = !!localStorage.getItem('glass_finance_google_sheet_url');
      return !onboardingCompleted && !urlConfigured;
    } catch {
      return true;
    }
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'pending' | 'success'>('idle');
  const [hasUserModified, setHasUserModified] = useState(false);
  const syncSuccessTimeoutRef = useRef<any>(null);

  const markUserModified = () => {
    setHasUserModified(true);
    setIsInitialLoad(false);
    if (scriptUrl.length > 5 && (scriptUrl.startsWith('http') || scriptUrl.startsWith('https'))) {
      setSyncStatus('pending');
    }
  };

  const isSyncConfigured = scriptUrl.length > 5 && (scriptUrl.startsWith('http://') || scriptUrl.startsWith('https://'));

  // Load from Sheets
  const fetchFromSheets = async (showToastOnSuccess = false, targetUrl?: string) => {
    const activeUrl = targetUrl || scriptUrl;
    const isUrlValid = activeUrl.length > 5 && (activeUrl.startsWith('http://') || activeUrl.startsWith('https://'));
    if (!isUrlValid) return;
    setIsSyncing(true);
    try {
      const response = await fetch(activeUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const res = await response.json();
      if (res.status === 'success') {
        const safeCategories = (res.categories || []).map((c: any) => ({
          ...c,
          id: (!c.id || c.id === 'undefined') ? `cat-${Date.now()}-${Math.random()}` : String(c.id),
          name: (!c.name || c.name === 'undefined') ? 'Без названия' : String(c.name),
          icon: (!c.icon || c.icon === 'undefined') ? 'ShoppingCart' : String(c.icon),
          monthlyLimit: Number(c.monthlyLimit) || 0,
          rolloverPreviousMonth: Number(c.rolloverPreviousMonth) || 0,
          percentage: Number(c.percentage) || 0
        }));
        
        const safeExpenses = (res.expenses || []).map((e: any) => ({
          ...e,
          id: (!e.id || e.id === 'undefined') ? `exp-${Date.now()}-${Math.random()}` : String(e.id),
          categoryId: (!e.categoryId || e.categoryId === 'undefined') ? '' : String(e.categoryId),
          amount: Number(e.amount) || 0,
          date: (!e.date || e.date === 'undefined') ? '' : String(e.date),
          description: (!e.description || e.description === 'undefined') ? '' : String(e.description),
        }));
        
        const safeIncomes = (res.incomes || []).map((i: any) => ({
          ...i,
          id: (!i.id || i.id === 'undefined') ? `inc-${Date.now()}-${Math.random()}` : String(i.id),
          amount: Number(i.amount) || 0,
          date: (!i.date || i.date === 'undefined') ? '' : String(i.date),
          description: (!i.description || i.description === 'undefined') ? '' : String(i.description),
        }));

        if (hasUserModified && !showToastOnSuccess) {
          console.log('Skipping sheet overwrite as user has modified data in this session');
        } else {
          setCategories(safeCategories);
          setExpenses(safeExpenses);
          setIncomes(safeIncomes);
          if (showToastOnSuccess) {
            showToast(
              language === 'RU' 
                ? 'Данные успешно загружены из Google Таблицы!' 
                : 'Data successfully loaded from Google Sheets!',
              'info'
            );
          }
        }
      } else {
        throw new Error(res.message || 'Error fetching data');
      }
    } catch (err: any) {
      console.error('Sheets Fetch Error:', err);
      showToast(
        language === 'RU'
          ? `Ошибка загрузки из Таблицы: ${err.message || 'Ошибка сети'}`
          : `Spreadsheet load error: ${err.message || 'Network error'}`,
        'warning'
      );
    } finally {
      setIsInitialLoad(false);
      setIsSyncing(false);
    }
  };

  // Save to Sheets
  const syncToSheets = async (cats: Category[], exps: Expense[], incs: AdditionalIncome[]) => {
    if (!isSyncConfigured) return;
    setIsSyncing(true);
    setSyncStatus('pending');
    try {
      await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          categories: cats,
          expenses: exps,
          incomes: incs
        })
      });
      setSyncStatus('success');

      if (syncSuccessTimeoutRef.current) {
        clearTimeout(syncSuccessTimeoutRef.current);
      }
      syncSuccessTimeoutRef.current = setTimeout(() => {
        setSyncStatus('idle');
      }, 3000);
    } catch (err: any) {
      console.error('Sheets Sync Error:', err);
      setSyncStatus('idle');
    } finally {
      setIsSyncing(false);
    }
  };

  // Currency State: RUB, USD, EUR, KZT, BYN, UAH
  const [currencyCode, setCurrencyCode] = useState(() => {
    try {
      return localStorage.getItem('glass_finance_currency') || 'RUB';
    } catch {
      return 'RUB';
    }
  });
  const [language, setLanguage] = useState<LanguageCode>(() => {
    try {
      const savedLanguage = localStorage.getItem('glass_finance_language') as LanguageCode;
      return (savedLanguage === 'RU' || savedLanguage === 'EN') ? savedLanguage : 'RU';
    } catch {
      return 'RU';
    }
  });
  const [showSettings, setShowSettings] = useState(false);
  const [settingsUrlInput, setSettingsUrlInput] = useState('');
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  useEffect(() => {
    if (showSettings) {
      setSettingsUrlInput(scriptUrl);
    }
  }, [showSettings, scriptUrl]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [tempYear, setTempYear] = useState(2026);

  // Sync tempYear with currentMonth whenever the modal opens
  useEffect(() => {
    if (showMonthPicker) {
      const yearPart = parseInt(currentMonth.split('-')[0]) || 2026;
      setTempYear(yearPart);
    }
  }, [showMonthPicker, currentMonth]);

  // Tab controller: 0 = Overview, 1 = Expenses, 2 = Incomes
  const [activeTab, setActiveTab] = useState(0);

  // Toast Notifications State
  const [toasts, setToasts] = useState<ToastType[]>([]);

  const showToast = (message: string, type: 'warning' | 'info' | 'success' = 'warning') => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  };

  // 2. Trigger Initial Fetch from Sheets on Mount
  useEffect(() => {
    if (isSyncConfigured) {
      fetchFromSheets(false);
    } else {
      setIsInitialLoad(false);
    }
  }, [scriptUrl]);

  // Resolve design style based on selection
  useEffect(() => {
    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        setResolvedTheme(e.matches ? 'dark' : 'light');
      };
      setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    } else {
      setResolvedTheme(themeMode);
    }
  }, [themeMode]);

  // Lock body & main content scrolling when modal dialog has been triggered in the main viewport
  useEffect(() => {
    const isModalOpen = showMonthPicker || showSettings;
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
  }, [showMonthPicker, showSettings]);

  // 3. Save State to LocalStorage and auto-save list states to Google Sheets
  useEffect(() => {
    saveState({ categories, expenses, incomes, currentMonth });

    if (isSyncConfigured && !isInitialLoad) {
      const dbnc = setTimeout(() => {
        syncToSheets(categories, expenses, incomes);
      }, 1200);
      return () => clearTimeout(dbnc);
    }
  }, [categories, expenses, incomes, currentMonth, isInitialLoad, isSyncConfigured]);

  const handleUpdateCurrency = (newCurrency: string) => {
    setCurrencyCode(newCurrency);
    try {
      localStorage.setItem('glass_finance_currency', newCurrency);
    } catch (e) {
      console.error('Failed to write currency to localStorage:', e);
    }
  };

  const handleUpdateLanguage = (newLang: LanguageCode) => {
    setLanguage(newLang);
    try {
      localStorage.setItem('glass_finance_language', newLang);
    } catch (e) {
      console.error('Failed to write language to localStorage:', e);
    }
  };

  // ------------ LOCAL STORAGE STATE MODIFIERS ------------
  const handleUpdateCategories = (updatedCats: Category[]) => {
    setCategories(updatedCats);
    markUserModified();
  };

  const handleAddExpense = (newExpense: Expense) => {
    const expenseMonth = newExpense.date.substring(0, 7);
    const oldCalculatedCats = calculateCategoriesForMonth(categories, expenses, incomes, expenseMonth);
    const matchedCat = oldCalculatedCats.find(c => c.id === newExpense.categoryId);
    
    if (matchedCat) {
      if (newExpense.amount > matchedCat.totalRemaining) {
        showToast(
          TRANSLATIONS[language].limitExceededDesc(
            newExpense.description,
            formatMoney(newExpense.amount, currencyCode),
            formatMoney(matchedCat.totalRemaining, currencyCode),
            matchedCat.name
          ),
          'warning'
        );
      }
    }

    setExpenses(prev => [...prev, newExpense]);
    markUserModified();
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm(TRANSLATIONS[language].confirmDeleteExpense)) {
      setExpenses(prev => prev.filter(e => e.id !== id));
      markUserModified();
    }
  };

  const handleEditExpense = (updatedExpense: Expense) => {
    setExpenses(prev => prev.map(e => e.id === updatedExpense.id ? updatedExpense : e));
    markUserModified();
  };

  const handleAddIncome = (newIncome: AdditionalIncome) => {
    setIncomes(prev => [...prev, newIncome]);
    markUserModified();
  };

  const handleDeleteIncome = (id: string) => {
    if (confirm(TRANSLATIONS[language].confirmDeleteIncome)) {
      setIncomes(prev => prev.filter(i => i.id !== id));
      markUserModified();
    }
  };

  // Switch month-year
  const handleNextMonth = () => {
    const todayStr = new Date().toISOString().substring(0, 7);
    if (currentMonth >= todayStr) return;

    const [year, month] = currentMonth.split('-').map(Number);
    let nextYear = year;
    let nextMonth = month + 1;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    const nextKey = `${nextYear}-${nextMonth.toString().padStart(2, '0')}`;
    if (nextKey > todayStr) return;
    setCurrentMonth(nextKey);
  };

  const handlePrevMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear -= 1;
    }
    const prevKey = `${prevYear}-${prevMonth.toString().padStart(2, '0')}`;
    setCurrentMonth(prevKey);
  };

  const getMonthRussianName = (key: string) => {
    return getMonthLocalizedName(key, language);
  };

  return (
    <div className={`relative min-h-screen flex justify-center items-stretch overflow-hidden select-none theme-${resolvedTheme} transition-colors duration-300 ${resolvedTheme === 'dark' ? 'bg-black text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* BACKGROUND FLOATING LIQUID GLOW SPOTS (Only render in Light theme to optimize battery/OLED in Pitch Black!) */}
      {resolvedTheme === 'light' && (
        <>
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] animate-float-1 pointer-events-none" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] animate-float-2 pointer-events-none" />
          <div className="absolute top-[30%] left-[20%] w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[100px] animate-float-1 pointer-events-none" />
        </>
      )}

      {/* PHONE EMULATOR CONTAINER WITH DESKTOP PADDING / FULL MOBILE COVERAGE */}
      <div className={`w-full max-w-md border-x relative flex flex-col justify-between shadow-2xl relative z-10 transition-colors duration-300 ${resolvedTheme === 'dark' ? 'bg-black border-neutral-850' : 'bg-white border-slate-200'}`}>
        
        {/* TOAST ALERTS CONTAINER */}
        <div className="absolute top-[140px] left-4 right-4 z-50 space-y-3 pointer-events-none">
          <AnimatePresence>
            {toasts.map(toast => {
              const isWarning = toast.type === 'warning';
              return (
                <motion.div
                  key={toast.id}
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  className={`pointer-events-auto w-full glass-panel rounded-2xl p-4 border backdrop-filter backdrop-blur-xl shadow-2xl flex items-start space-x-3 ${
                    isWarning 
                      ? 'border-rose-500/30 bg-rose-950/90 text-rose-100' 
                      : 'border-emerald-500/30 bg-emerald-950/90 text-emerald-100'
                  }`}
                >
                  {isWarning ? (
                    <AlertTriangle className="shrink-0 text-rose-400 mt-0.5" size={18} />
                  ) : (
                    <CheckCircle2 className="shrink-0 text-emerald-400 mt-0.5" size={18} />
                  )}
                  <div className="flex-1 text-xs text-left">
                    <p className={`font-bold font-display ${isWarning ? 'text-rose-300' : 'text-emerald-300'}`}>
                      {isWarning ? TRANSLATIONS[language].limitExceededTitle : (language === 'RU' ? 'Успешно' : 'Success')}
                    </p>
                    <p className={`leading-relaxed mt-0.5 font-sans ${isWarning ? 'text-rose-200/95' : 'text-emerald-200/95'}`}>{toast.message}</p>
                  </div>
                  <button 
                    onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                    className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition cursor-pointer shrink-0"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
        
        {/* TOP GLOSSY APP BAR */}
        <header className="glass-panel sticky top-0 z-40 px-5 py-4 border-b border-white/5 backdrop-blur-xl flex flex-col space-y-3.5 relative">
          <div className="flex items-center justify-between">
            {/* Elegant Application Name */}
            <div className="flex items-center space-x-2.5">
              <div className="bg-gradient-to-tr from-indigo-500 to-emerald-400 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
                <Wallet size={18} className="text-white" />
              </div>
              <div>
                <h1 className="font-extrabold text-base tracking-tight text-white font-display">{TRANSLATIONS[language].appName}</h1>
              </div>
            </div>

            {/* Action pill: Clickable Month Selector & Settings Trigger */}
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setShowImportModal(true)}
                className="flex items-center space-x-1.5 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/5 transition duration-150 cursor-pointer text-slate-100 hover:text-emerald-400 select-none focus:outline-none"
                title={language === 'RU' ? 'Импорт данных' : 'Import Data'}
              >
                <Upload size={14} className="text-emerald-400" />
                <span className="text-xs font-medium hidden sm:block">
                  {language === 'RU' ? 'Импорт' : 'Import'}
                </span>
              </button>

              <button 
                onClick={() => setShowSettings(true)}
                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 text-slate-400 hover:text-white transition duration-150 cursor-pointer focus:outline-none"
                title={TRANSLATIONS[language].settingsModalTitle}
              >
                <Settings size={13} />
              </button>
            </div>
          </div>

          {/* Month Navigator Control */}
          <div className="flex items-center justify-between bg-slate-950/50 rounded-2xl p-1.5 border border-white/5">
            <button 
              onClick={handlePrevMonth}
              className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <div 
              onClick={() => setShowMonthPicker(true)}
              className="text-center cursor-pointer group select-none"
              title={TRANSLATIONS[language].periodModalTitle}
            >
              <p className="text-xs font-semibold text-indigo-300 group-hover:text-indigo-100 font-display transition-all duration-300">
                {getMonthLocalizedName(currentMonth, language)}
              </p>
              <p className="text-[9px] text-slate-400 group-hover:text-slate-200 font-mono tracking-wider transition-colors duration-150">{TRANSLATIONS[language].selectPeriodChevron}</p>
            </div>
            <button 
              onClick={handleNextMonth}
              disabled={currentMonth >= new Date().toISOString().substring(0, 7)}
              className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition cursor-pointer disabled:opacity-20 disabled:pointer-events-none"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* SYNC STATUS BANNER - ABSOLUTE OVERLAY TO AVOID SHIFTING INTERFACE DOWN */}
          <AnimatePresence>
            {syncStatus !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="absolute top-full left-0 right-0 bg-indigo-950/95 border-b border-indigo-500/30 text-indigo-100 z-30 shadow-lg shadow-black/40 backdrop-blur-md"
              >
                <div className="px-5 py-3 flex items-center justify-between text-xs font-sans">
                  <div className="flex items-center space-x-2.5">
                    <div className="relative flex h-2 w-2 shrink-0">
                      {syncStatus === 'pending' ? (
                        <>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-400"></span>
                        </>
                      ) : (
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 animate-pulse"></span>
                      )}
                    </div>
                    <span className="font-semibold text-slate-100">
                      {syncStatus === 'pending' ? TRANSLATIONS[language].syncBannerPending : TRANSLATIONS[language].syncBannerSuccess}
                    </span>
                  </div>
                  {syncStatus === 'pending' && (
                    <RefreshCw size={12} className="animate-spin text-indigo-400 shrink-0" />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* SCROLLABLE INNER VIEWPORT */}
        <main className="flex-1 overflow-y-auto px-5 pt-6 pb-26 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab} // Smooth key swipe/fade animations on tab changes
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 0 && (
                <BudgetOverview
                  categories={categories}
                  expenses={expenses}
                  incomes={incomes}
                  currentMonth={currentMonth}
                  onUpdateCategories={handleUpdateCategories}
                  currencyCode={currencyCode}
                  language={language}
                />
              )}

              {activeTab === 2 && (
                <IncomeList
                  categories={categories}
                  incomes={incomes}
                  onAddIncome={handleAddIncome}
                  onDeleteIncome={handleDeleteIncome}
                  currencyCode={currencyCode}
                  language={language}
                />
              )}

              {activeTab === 1 && (
                <ExpensesList
                  categories={categories}
                  expenses={expenses}
                  onAddExpense={handleAddExpense}
                  onDeleteExpense={handleDeleteExpense}
                  onEditExpense={handleEditExpense}
                  currencyCode={currencyCode}
                  language={language}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* BOTTOM LIQUID GLASS NAVIGATION BAR */}
        <nav className="glass-panel fixed bottom-4 left-1/2 -translate-x-1/2 w-11/12 max-w-[390px] rounded-3xl p-2 z-40 border border-white/10 shadow-2xl backdrop-blur-2xl flex items-center justify-around">
          
          {/* Tab 0: Overview */}
          <button
            onClick={() => setActiveTab(0)}
            className={`flex flex-col items-center space-y-1.5 py-2 px-3.5 rounded-2xl relative transition duration-300 cursor-pointer ${activeTab === 0 ? 'text-indigo-400 font-bold scale-105' : 'text-slate-400 hover:text-white'}`}
          >
            {activeTab === 0 && (
              <motion.div
                layoutId="active-tab-glow"
                className="absolute inset-0 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl -z-10"
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              />
            )}
            <PiggyBank size={18} />
            <span className="text-[10px] tracking-wider font-semibold font-display">{TRANSLATIONS[language].navOverview}</span>
          </button>

          {/* Tab 2: Additional Incomes */}
          <button
            onClick={() => setActiveTab(2)}
            className={`flex flex-col items-center space-y-1.5 py-2 px-3.5 rounded-2xl relative transition duration-300 cursor-pointer ${activeTab === 2 ? 'text-indigo-400 font-bold scale-105' : 'text-slate-400 hover:text-white'}`}
          >
            {activeTab === 2 && (
              <motion.div
                layoutId="active-tab-glow"
                className="absolute inset-0 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl -z-10"
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              />
            )}
            <TrendingUp size={18} />
            <span className="text-[10px] tracking-wider font-semibold font-display">{TRANSLATIONS[language].navIncome}</span>
          </button>

          {/* Tab 1: Expenses */}
          <button
            onClick={() => setActiveTab(1)}
            className={`flex flex-col items-center space-y-1.5 py-2 px-3.5 rounded-2xl relative transition duration-300 cursor-pointer ${activeTab === 1 ? 'text-indigo-400 font-bold scale-105' : 'text-slate-400 hover:text-white'}`}
          >
            {activeTab === 1 && (
              <motion.div
                layoutId="active-tab-glow"
                className="absolute inset-0 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl -z-10"
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              />
            )}
            <TrendingDown size={18} />
            <span className="text-[10px] tracking-wider font-semibold font-display">{TRANSLATIONS[language].navExpenses}</span>
          </button>

        </nav>

        {/* --- MODAL DIALOGS --- */}
        <AnimatePresence>
          {showOnboarding && (
            <OnboardingGuide
              language={language}
              initialUrl={scriptUrl}
              isDismissable={isSyncConfigured || scriptUrl.length > 5}
              onClose={() => setShowOnboarding(false)}
              onComplete={(url) => {
                const cleaned = url.trim();
                setScriptUrl(cleaned);
                try {
                  localStorage.setItem('glass_finance_google_sheet_url', cleaned);
                  localStorage.setItem('glass_finance_onboarding_completed', 'true');
                } catch (e) {
                  console.error(e);
                }
                setShowOnboarding(false);
                if (cleaned) {
                  fetchFromSheets(true, cleaned);
                } else {
                  showToast(
                    language === 'RU' 
                      ? 'Включен локальный режим работы. Настроить синхронизацию можно в любое время.' 
                      : 'Local mode activated. You can set up cloud sync any time in Settings.',
                    'info'
                  );
                }
              }}
            />
          )}

          {showImportModal && (
            <ImportModal 
              language={language}
              onClose={() => setShowImportModal(false)}
              onImport={(cats, exps, incs) => {
                setCategories(cats.length ? cats : categories);
                setExpenses(exps.length ? exps : expenses);
                setIncomes(incs.length ? incs : incomes);
                markUserModified();
                setShowImportModal(false);
                showToast(
                  language === 'RU' ? 'Данные успешно заменены' : 'Data successfully imported',
                  'success'
                );
              }}
            />
          )}

          {/* 1. MONTH & YEAR SELECTOR MODAL */}
          {showMonthPicker && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowMonthPicker(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
              />
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="glass-panel w-full max-w-sm rounded-[32px] p-6 relative z-10 border border-white/10 shadow-2xl space-y-5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-base font-display">{TRANSLATIONS[language].periodModalTitle}</h3>
                  <button 
                    onClick={() => setShowMonthPicker(false)}
                    className="p-1.5 hover:bg-white/10 rounded-full transition duration-150 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Year Select Controller */}
                <div className="flex items-center justify-between bg-slate-950/60 p-2 rounded-2xl border border-white/5 select-none">
                  <button 
                    type="button"
                    onClick={() => setTempYear(prev => Math.max(2020, prev - 1))}
                    className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="font-mono text-sm font-bold text-indigo-300 tracking-wider">
                    {tempYear}{TRANSLATIONS[language].yearSuffix}
                  </span>
                  <button 
                    type="button"
                    disabled={tempYear >= new Date().getFullYear()}
                    onClick={() => setTempYear(prev => Math.min(new Date().getFullYear(), prev + 1))}
                    className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition cursor-pointer disabled:opacity-20 disabled:pointer-events-none"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* 12 Months Selection Grid */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: '01', label: language === 'RU' ? 'Янв' : 'Jan' },
                    { value: '02', label: language === 'RU' ? 'Фев' : 'Feb' },
                    { value: '03', label: language === 'RU' ? 'Мар' : 'Mar' },
                    { value: '04', label: language === 'RU' ? 'Апр' : 'Apr' },
                    { value: '05', label: language === 'RU' ? 'Май' : 'May' },
                    { value: '06', label: language === 'RU' ? 'Июн' : 'Jun' },
                    { value: '07', label: language === 'RU' ? 'Июл' : 'Jul' },
                    { value: '08', label: language === 'RU' ? 'Авг' : 'Aug' },
                    { value: '09', label: language === 'RU' ? 'Сен' : 'Sep' },
                    { value: '10', label: language === 'RU' ? 'Окт' : 'Oct' },
                    { value: '11', label: language === 'RU' ? 'Ноя' : 'Nov' },
                    { value: '12', label: language === 'RU' ? 'Дек' : 'Dec' }
                  ].map(m => {
                    const combined = `${tempYear}-${m.value}`;
                    const isSelected = currentMonth === combined;
                    const todayStr = new Date().toISOString().substring(0, 7);
                    const isFuture = combined > todayStr;
                    
                    return (
                      <button
                        key={m.value}
                        type="button"
                        disabled={isFuture}
                        onClick={() => {
                          if (isFuture) return;
                          setCurrentMonth(combined);
                          setShowMonthPicker(false);
                        }}
                        className={`py-3 rounded-2xl text-xs font-semibold border transition-all duration-200 ${isFuture ? 'opacity-20 cursor-not-allowed border-transparent text-slate-600 bg-transparent' : isSelected ? 'bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/25 scale-[0.98] cursor-pointer' : 'bg-slate-900/60 border-white/5 text-slate-300 hover:border-white/15 hover:text-white cursor-pointer'}`}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          )}

          {/* 2. APP SETTINGS MODAL */}
          {showSettings && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSettings(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
              />
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="glass-panel w-full max-w-sm rounded-[32px] p-6 relative z-10 border border-white/10 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Settings size={18} className="text-indigo-400" />
                    <h3 className="font-bold text-white text-base font-display">{TRANSLATIONS[language].settingsModalTitle}</h3>
                  </div>
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="p-1.5 hover:bg-white/10 rounded-full transition duration-150 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {TRANSLATIONS[language].settingsModalDesc}
                </p>

                {/* --- LANGUAGE SELECTION SECTION --- */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center space-x-2 text-slate-300">
                    <Globe size={13} className="text-indigo-400" />
                    <h4 className="text-[11px] font-bold uppercase tracking-widest">{TRANSLATIONS[language].languageSectionTitle}</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { code: 'RU', label: 'Русский (RU)' },
                      { code: 'EN', label: 'English (EN)' }
                    ].map(l => {
                      const isSelected = language === l.code;
                      return (
                        <button
                          key={l.code}
                          type="button"
                          onClick={() => handleUpdateLanguage(l.code as LanguageCode)}
                          className={`p-3 rounded-2xl border text-xs font-semibold transition-all duration-200 cursor-pointer ${isSelected ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300 font-bold shadow-md scale-[0.98]' : 'bg-slate-900/60 border-white/5 hover:border-white/10 text-slate-300 hover:text-white'}`}
                        >
                          {l.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* --- CURRENCY SELECTION SECTION --- */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex items-center space-x-2 text-slate-300">
                    <Wallet size={13} className="text-emerald-400" />
                    <h4 className="text-[11px] font-bold uppercase tracking-widest">{TRANSLATIONS[language].currencySectionTitle}</h4>
                  </div>
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {[
                      { code: 'RUB', label: language === 'RU' ? 'Российский рубль (₽)' : 'Russian Ruble (₽)' },
                      { code: 'USD', label: language === 'RU' ? 'Доллар США ($)' : 'US Dollar ($)' },
                      { code: 'EUR', label: language === 'RU' ? 'Евро (€)' : 'Euro (€)' },
                      { code: 'KZT', label: language === 'RU' ? 'Казахский тенге (₸)' : 'Kazakhstani Tenge (₸)' },
                      { code: 'BYN', label: language === 'RU' ? 'Белорусский рубль (Br)' : 'Belarusian Ruble (Br)' },
                      { code: 'UAH', label: language === 'RU' ? 'Украинская гривна (₴)' : 'Ukrainian Hryvnia (₴)' }
                    ].map(c => {
                      const isSelected = currencyCode === c.code;
                      return (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            handleUpdateCurrency(c.code);
                          }}
                          className={`w-full p-2.5 rounded-2xl border text-left flex items-center justify-between transition-all duration-200 cursor-pointer ${isSelected ? 'bg-emerald-500/10 border-emerald-500/40 shadow-md scale-[0.98]' : 'bg-slate-900/60 border-white/5 hover:border-white/10 text-slate-300 hover:text-white'}`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`p-1.5 rounded-lg text-[10px] font-bold font-mono ${isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                              {getCurrencySymbol(c.code)}
                            </div>
                            <span className={`text-[11px] ${isSelected ? 'text-white font-semibold' : 'text-slate-300'}`}>
                              {c.label}
                            </span>
                          </div>
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-500 border-emerald-400' : 'border-white/10'}`}>
                            {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* --- VISUAL THEME SELECTION --- */}
                <div className="space-y-2 pt-3 border-t border-white/10">
                  <div className="flex items-center space-x-2 text-slate-300">
                    <Sun size={13} className="text-amber-400" />
                    <h4 className="text-[11px] font-bold uppercase tracking-widest">{TRANSLATIONS[language].themeSectionTitle}</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { mode: 'dark', label: TRANSLATIONS[language].themeModeDark, icon: Moon },
                      { mode: 'light', label: TRANSLATIONS[language].themeModeLight, icon: Sun },
                      { mode: 'system', label: TRANSLATIONS[language].themeModeSystem, icon: Tv }
                    ].map(t => {
                      const isSelected = themeMode === t.mode;
                      const IconComponent = t.icon;
                      return (
                        <button
                          key={t.mode}
                          type="button"
                          onClick={() => {
                            setThemeMode(t.mode as ThemeMode);
                            try {
                              localStorage.setItem('glass_finance_theme_mode', t.mode);
                            } catch (e) {
                              console.error('Failed to write theme mode to localStorage:', e);
                            }
                          }}
                          className={`p-2.5 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${isSelected ? 'bg-indigo-500/15 border-indigo-500/50 text-indigo-300 font-semibold' : 'bg-slate-900/60 border-white/5 text-slate-300 hover:text-white hover:border-white/10'}`}
                        >
                          <IconComponent size={14} className={isSelected ? 'text-indigo-400' : 'text-slate-400'} />
                          <span className="text-[9px] leading-tight truncate w-full text-center">{t.mode === 'dark' ? 'OLED' : t.mode === 'light' ? 'Light' : 'Auto'}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* --- GOOGLE SHEETS SYNC SECTION --- */}
                <div className="space-y-3 pt-3 border-t border-white/10 font-sans text-left">
                  <div className="flex items-center space-x-2 text-slate-300">
                    <Database size={13} className="text-indigo-400" />
                    <h4 className="text-[11px] font-bold uppercase tracking-widest">{TRANSLATIONS[language].firebaseSectionTitle}</h4>
                  </div>
                  
                  <div className={`p-4 rounded-2xl border ${isSyncConfigured ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-slate-950/40 border-white/5'} space-y-3`}>
                    <div className="flex items-center space-x-2.5">
                      <div className={`p-1.5 rounded-xl ${isSyncConfigured ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}>
                        <Cloud size={14} className={isSyncing ? 'animate-bounce' : ''} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-mono leading-none text-slate-400">{TRANSLATIONS[language].firebaseStatusLabel}</p>
                        <p className={`text-xs font-bold truncate mt-0.5 ${isSyncConfigured ? 'text-emerald-400' : 'text-slate-300'}`}>
                          {isSyncConfigured ? TRANSLATIONS[language].firebaseLinked : TRANSLATIONS[language].firebaseLocalMode}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <label className="block text-[9px] font-semibold text-slate-400 font-mono tracking-wider uppercase">
                        {language === 'RU' ? 'Ссылка интеграции (SCRIPT_URL):' : 'Integration Link (SCRIPT_URL):'}
                      </label>
                      <div className="flex gap-1.5">
                        <input 
                          type="text"
                          value={settingsUrlInput}
                          onChange={(e) => setSettingsUrlInput(e.target.value)}
                          placeholder="https://script.google.com/macros/s/.../exec"
                          className="flex-1 px-3 py-2 text-xs rounded-xl glass-input min-w-0 font-mono"
                        />
                        {settingsUrlInput && (
                          <button
                            type="button"
                            onClick={() => setSettingsUrlInput('')}
                            className="p-2 bg-slate-900 border border-white/5 hover:border-white/10 hover:text-rose-400 text-slate-400 rounded-xl transition cursor-pointer"
                            title={language === 'RU' ? 'Очистить' : 'Clear'}
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const cleaned = settingsUrlInput.trim();
                          setScriptUrl(cleaned);
                          try {
                            localStorage.setItem('glass_finance_google_sheet_url', cleaned);
                            if (cleaned) {
                              localStorage.setItem('glass_finance_onboarding_completed', 'true');
                            }
                          } catch (e) {
                            console.error(e);
                          }
                          showToast(
                            language === 'RU' ? 'Ссылка успешно сохранена!' : 'Link saved successfully!',
                            'success'
                          );
                        }}
                        className="flex-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-600 border border-emerald-400 text-white text-xs font-bold rounded-xl transition cursor-pointer text-center font-display"
                      >
                        {language === 'RU' ? 'Сохранить' : 'Save'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowSettings(false);
                          setShowOnboarding(true);
                        }}
                        className="py-2 px-4 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white border border-indigo-500/20 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 font-display"
                        title={language === 'RU' ? 'Запустить руководство по настройке' : 'Launch setup wizard'}
                      >
                        <BookOpen size={12} />
                        <span>{language === 'RU' ? 'Гайд' : 'Guide'}</span>
                      </button>
                    </div>

                    {isSyncConfigured && (
                      <button
                        type="button"
                        disabled={isSyncing}
                        onClick={() => fetchFromSheets(true)}
                        className="w-full py-2.5 font-semibold text-xs rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white border border-indigo-400 transition duration-150 cursor-pointer shadow-lg shadow-indigo-500/10 flex items-center justify-center space-x-1.5 font-display"
                      >
                        <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                        <span>{TRANSLATIONS[language].firebaseSignInBtn}</span>
                      </button>
                    )}
                  </div>
                </div>



              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
