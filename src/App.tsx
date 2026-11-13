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
  BookOpen,
  CloudOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatMoney, calculateCategoriesForMonth, getCurrencySymbol, currentLocalMonth } from './utils/finance';
import { LanguageCode, TRANSLATIONS, getMonthLocalizedName } from './utils/translations';

interface ToastType {
  id: string;
  message: string;
  type: 'warning' | 'info' | 'success';
  title?: string;
}

type ThemeMode = 'dark' | 'light' | 'system';

// ------------ GOOGLE SHEETS TRANSPORT ------------
const SYNC_DIRTY_KEY = 'glass_finance_sync_dirty';
const LAST_SYNC_KEY = 'glass_finance_last_sync_at';

interface SheetData {
  categories: Category[];
  expenses: Expense[];
  incomes: AdditionalIncome[];
}

/** The script answered, and the answer was "error": the sheet did not accept the data. */
class SheetRejectedError extends Error {}

const isValidScriptUrl = (url: string) =>
  url.length > 5 && (url.startsWith('http://') || url.startsWith('https://'));

function normalizeSheetResponse(res: any): { data: SheetData; generatedIds: boolean } {
  let generatedIds = false;
  const makeId = (prefix: string) => {
    generatedIds = true;
    return `${prefix}-${Date.now()}-${Math.random()}`;
  };

  const categories = (res.categories || []).map((c: any) => ({
    ...c,
    id: (!c.id || c.id === 'undefined') ? makeId('cat') : String(c.id),
    name: (!c.name || c.name === 'undefined') ? 'Без названия' : String(c.name),
    icon: (!c.icon || c.icon === 'undefined') ? 'ShoppingCart' : String(c.icon),
    monthlyLimit: Number(c.monthlyLimit) || 0,
    rolloverPreviousMonth: Number(c.rolloverPreviousMonth) || 0,
    percentage: Number(c.percentage) || 0
  }));

  const expenses = (res.expenses || []).map((e: any) => ({
    ...e,
    id: (!e.id || e.id === 'undefined') ? makeId('exp') : String(e.id),
    categoryId: (!e.categoryId || e.categoryId === 'undefined') ? '' : String(e.categoryId),
    amount: Number(e.amount) || 0,
    date: (!e.date || e.date === 'undefined') ? '' : String(e.date),
    description: (!e.description || e.description === 'undefined') ? '' : String(e.description),
  }));

  const incomes = (res.incomes || []).map((i: any) => ({
    ...i,
    id: (!i.id || i.id === 'undefined') ? makeId('inc') : String(i.id),
    amount: Number(i.amount) || 0,
    date: (!i.date || i.date === 'undefined') ? '' : String(i.date),
    description: (!i.description || i.description === 'undefined') ? '' : String(i.description),
  }));

  return { data: { categories, expenses, incomes }, generatedIds };
}

async function readSheet(url: string): Promise<{ data: SheetData; generatedIds: boolean }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const res = await response.json();
  if (res.status !== 'success') {
    throw new Error(res.message || 'Error fetching data');
  }
  return normalizeSheetResponse(res);
}

const totalInCents = (items: { amount: number }[]) =>
  Math.round(items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) * 100);

/**
 * Saves everything to the sheet and resolves only when the save is confirmed.
 * Throws when the sheet could not be reached or did not accept the data.
 */
async function writeSheet(url: string, payload: SheetData): Promise<void> {
  const body = JSON.stringify(payload);
  const headers = { 'Content-Type': 'text/plain;charset=utf-8' };

  // 1. A regular request: the script answers with JSON, so a failed save is visible.
  try {
    const response = await fetch(url, { method: 'POST', headers, body });
    if (response.ok) {
      const res = JSON.parse(await response.text());
      if (res && res.status === 'success') return;
      if (res && res.status === 'error') {
        throw new SheetRejectedError(res.message || 'Sheet error');
      }
    }
  } catch (err) {
    if (err instanceof SheetRejectedError) throw err;
    // The answer could not be read (blocked by the browser, or no network). Try the blind way below.
  }

  // 2. A blind request (how the app used to save), then read the sheet back to confirm it.
  await fetch(url, { method: 'POST', mode: 'no-cors', headers, body });
  const { data } = await readSheet(url);
  const confirmed =
    data.categories.length === payload.categories.length &&
    data.expenses.length === payload.expenses.length &&
    data.incomes.length === payload.incomes.length &&
    totalInCents(data.expenses) === totalInCents(payload.expenses) &&
    totalInCents(data.incomes) === totalInCents(payload.incomes);
  if (!confirmed) {
    throw new Error('SHEET_MISMATCH');
  }
}

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

  // ------------ SYNC STATE ------------
  // "dirty" = the device has changes the sheet has not confirmed yet. It is kept in localStorage,
  // so an unsent change survives closing the app and is sent again on the next launch
  // instead of being overwritten by an older copy from the sheet.
  const [dirty, setDirtyState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SYNC_DIRTY_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const dirtyRef = useRef(dirty);
  const setDirty = (value: boolean) => {
    dirtyRef.current = value;
    setDirtyState(value);
    try {
      if (value) {
        localStorage.setItem(SYNC_DIRTY_KEY, 'true');
      } else {
        localStorage.removeItem(SYNC_DIRTY_KEY);
      }
    } catch (e) {
      console.error('Failed to write sync flag to localStorage:', e);
    }
  };

  const [syncPhase, setSyncPhase] = useState<'idle' | 'loading' | 'saving'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(() => {
    try {
      return Number(localStorage.getItem(LAST_SYNC_KEY)) || null;
    } catch {
      return null;
    }
  });
  // Bumped to ask for a save to the sheet (debounced below)
  const [saveRequest, setSaveRequest] = useState(0);

  // Latest values for async code, which would otherwise see a stale render
  const dataRef = useRef<SheetData>({ categories, expenses, incomes });
  dataRef.current = { categories, expenses, incomes };
  const scriptUrlRef = useRef(scriptUrl);
  scriptUrlRef.current = scriptUrl;
  const revisionRef = useRef(0); // grows with every local change
  const saveInFlightRef = useRef(false);
  const saveAgainRef = useRef(false);
  const loadInFlightRef = useRef(false);

  const isSyncConfigured = isValidScriptUrl(scriptUrl);

  const requestSave = () => {
    revisionRef.current += 1;
    setDirty(true);
    setSaveRequest(n => n + 1);
  };

  // A fresh change gets a fresh attempt: forget an older "sheet unreachable" result
  const clearStaleSyncError = () => {
    if (!dirtyRef.current) {
      setSyncError(null);
    }
  };

  const markUserModified = () => {
    if (isValidScriptUrl(scriptUrlRef.current)) {
      clearStaleSyncError();
      requestSave();
    } else {
      revisionRef.current += 1;
    }
  };

  const markSynced = () => {
    const now = Date.now();
    setLastSyncAt(now);
    try {
      localStorage.setItem(LAST_SYNC_KEY, String(now));
    } catch (e) {
      console.error('Failed to write sync time to localStorage:', e);
    }
  };

  const describeSyncError = (err: any): string => {
    const isRu = language === 'RU';
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return isRu ? 'нет подключения к интернету' : 'no internet connection';
    }
    const message = String(err?.message || '');
    if (message === 'SHEET_MISMATCH') {
      return isRu ? 'таблица ответила, но данные в ней не совпали с отправленными' : 'the sheet answered, but its data does not match what was sent';
    }
    if (!message || message === 'Failed to fetch' || message === 'Load failed' || message.startsWith('NetworkError')) {
      return isRu ? 'таблица не отвечает' : 'the sheet is not responding';
    }
    return message;
  };

  // Load from Sheets
  const fetchFromSheets = async (showToastOnSuccess = false, targetUrl?: string) => {
    const activeUrl = targetUrl || scriptUrlRef.current;
    if (!isValidScriptUrl(activeUrl)) return;
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    setSyncPhase('loading');
    const revisionAtStart = revisionRef.current;
    try {
      const { data, generatedIds } = await readSheet(activeUrl);
      const local = dataRef.current;
      const sheetIsEmpty = data.categories.length === 0 && data.expenses.length === 0 && data.incomes.length === 0;
      const deviceHasData = local.categories.length > 0 || local.expenses.length > 0 || local.incomes.length > 0;

      if (dirtyRef.current || revisionRef.current !== revisionAtStart) {
        // Something was changed on the device while the sheet was loading: the device copy is newer
        console.log('Skipping sheet overwrite as user has modified data in this session');
        requestSave();
      } else if (sheetIsEmpty && deviceHasData) {
        // Never replace real data with an empty sheet (a freshly connected one, for example): fill the sheet instead
        requestSave();
        if (showToastOnSuccess) {
          showToast(
            language === 'RU'
              ? 'Таблица пустая — данные с этого устройства отправляются в неё.'
              : 'The sheet is empty — the data from this device is being sent to it.',
            'info'
          );
        }
      } else {
        setCategories(data.categories);
        setExpenses(data.expenses);
        setIncomes(data.incomes);
        markSynced();
        if (generatedIds) {
          // Rows typed into the sheet by hand got ids just now: store them in the sheet
          requestSave();
        }
        if (showToastOnSuccess) {
          showToast(
            language === 'RU' 
              ? 'Данные успешно загружены из Google Таблицы!' 
              : 'Data successfully loaded from Google Sheets!',
            'info'
          );
        }
      }
      setSyncError(null);
    } catch (err: any) {
      console.error('Sheets Fetch Error:', err);
      const reason = describeSyncError(err);
      setSyncError(reason);
      showToast(
        language === 'RU'
          ? `Не удалось загрузить данные из таблицы: ${reason}. Показано то, что сохранено на устройстве.`
          : `Could not load data from the sheet: ${reason}. Showing what is saved on this device.`,
        'warning',
        language === 'RU' ? 'Google Таблица' : 'Google Sheets'
      );
    } finally {
      loadInFlightRef.current = false;
      setSyncPhase('idle');
    }
  };

  // Save to Sheets. Resolves to true only when the sheet confirmed the save.
  const saveToSheets = async (): Promise<boolean> => {
    const url = scriptUrlRef.current;
    if (!isValidScriptUrl(url)) return false;
    if (saveInFlightRef.current) {
      saveAgainRef.current = true;
      return false;
    }
    saveInFlightRef.current = true;
    setSyncPhase('saving');
    const revision = revisionRef.current;
    let confirmed = false;
    try {
      await writeSheet(url, dataRef.current);
      confirmed = true;
      setSyncError(null);
      markSynced();
      if (revisionRef.current === revision) {
        setDirty(false);
      }
    } catch (err: any) {
      console.error('Sheets Sync Error:', err);
      setSyncError(describeSyncError(err));
    } finally {
      saveInFlightRef.current = false;
      setSyncPhase('idle');
      const changedMeanwhile = confirmed && revisionRef.current !== revision;
      if (saveAgainRef.current || changedMeanwhile) {
        saveAgainRef.current = false;
        setSaveRequest(n => n + 1);
      }
    }
    return confirmed;
  };

  // The "sync now" action: send unsent changes first, otherwise reload from the sheet
  const handleManualSync = async () => {
    if (!isSyncConfigured || syncPhase !== 'idle') return;
    if (dirtyRef.current) {
      const confirmed = await saveToSheets();
      if (confirmed) {
        showToast(
          language === 'RU' ? 'Изменения отправлены в Google Таблицу.' : 'Changes sent to Google Sheets.',
          'success'
        );
      }
      return;
    }
    await fetchFromSheets(true);
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

  const showToast = (message: string, type: 'warning' | 'info' | 'success' = 'warning', title?: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type, title }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  };

  // 2. On launch (and when the link changes): unsent changes go to the sheet first, otherwise load from it
  useEffect(() => {
    if (!isSyncConfigured) return;
    if (dirtyRef.current) {
      saveToSheets();
    } else {
      fetchFromSheets(false);
    }
  }, [scriptUrl]);

  // Retry unsent changes when the connection or the app comes back, and every 30 seconds
  useEffect(() => {
    if (!isSyncConfigured) return;
    const retry = () => {
      if (dirtyRef.current && !saveInFlightRef.current) {
        saveToSheets();
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') retry();
    };
    window.addEventListener('online', retry);
    document.addEventListener('visibilitychange', onVisibilityChange);
    const timer = setInterval(retry, 30000);
    return () => {
      window.removeEventListener('online', retry);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearInterval(timer);
    };
  }, [isSyncConfigured]);

  // Every screen opens from the top
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelector('main')?.scrollTo(0, 0);
  }, [activeTab]);

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

  // 3. Save State to LocalStorage
  useEffect(() => {
    saveState({ categories, expenses, incomes, currentMonth });
  }, [categories, expenses, incomes, currentMonth]);

  // 4. Send changes to Google Sheets shortly after the last edit
  useEffect(() => {
    if (saveRequest === 0) return;
    const dbnc = setTimeout(() => {
      saveToSheets();
    }, 1200);
    return () => clearTimeout(dbnc);
  }, [saveRequest]);

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
          'warning',
          TRANSLATIONS[language].limitExceededTitle
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
    const todayStr = currentLocalMonth();
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

  // ------------ SYNC INDICATOR (shown in the header on every screen) ------------
  const isRu = language === 'RU';
  const formatSyncTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const locale = isRu ? 'ru-RU' : 'en-GB';
    const time = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    if (date.toDateString() === new Date().toDateString()) return time;
    return `${date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' })} ${time}`;
  };

  type SyncIndicator = 'local' | 'loading' | 'saving' | 'unsynced' | 'unreachable' | 'synced';
  const syncIndicator: SyncIndicator = !isSyncConfigured
    ? 'local'
    : syncPhase === 'loading'
      ? 'loading'
      : dirty && syncError
        ? 'unsynced'      // changes on the device that the sheet did not confirm
        : syncPhase === 'saving' || dirty
          ? 'saving'
          : syncError
            ? 'unreachable' // nothing unsent, but the last load from the sheet failed
            : 'synced';

  const syncIndicatorView: Record<SyncIndicator, { label: string; hint: string; tone: string; icon: React.ReactNode }> = {
    local: {
      label: isRu ? 'Только на устройстве' : 'On this device only',
      hint: isRu ? 'Google Таблица не подключена. Нажмите, чтобы открыть настройки.' : 'No Google Sheet connected. Tap to open settings.',
      tone: 'text-slate-400',
      icon: <CloudOff size={11} />
    },
    loading: {
      label: isRu ? 'Загрузка из таблицы…' : 'Loading from the sheet…',
      hint: '',
      tone: 'text-indigo-300',
      icon: <RefreshCw size={11} className="animate-spin" />
    },
    saving: {
      label: isRu ? 'Синхронизация…' : 'Syncing…',
      hint: '',
      tone: 'text-indigo-300',
      icon: <RefreshCw size={11} className="animate-spin" />
    },
    unsynced: {
      label: isRu ? 'Не синхронизировано' : 'Not synced',
      hint: isRu ? 'Нажмите, чтобы отправить изменения ещё раз.' : 'Tap to send the changes again.',
      tone: 'text-red-400',
      icon: <AlertTriangle size={11} />
    },
    unreachable: {
      label: isRu ? 'Нет связи с таблицей' : 'Sheet unreachable',
      hint: isRu ? 'Нажмите, чтобы попробовать ещё раз.' : 'Tap to try again.',
      tone: 'text-amber-400',
      icon: <AlertTriangle size={11} />
    },
    synced: {
      label: lastSyncAt
        ? `${isRu ? 'Синхронизировано' : 'Synced'} · ${formatSyncTime(lastSyncAt)}`
        : (isRu ? 'Синхронизировано' : 'Synced'),
      hint: isRu ? 'Данные совпадают с Google Таблицей. Нажмите, чтобы обновить из таблицы.' : 'Data matches the Google Sheet. Tap to reload from the sheet.',
      tone: 'text-emerald-400',
      icon: <CheckCircle2 size={11} />
    }
  };
  const indicator = syncIndicatorView[syncIndicator];

  const handleSyncIndicatorClick = () => {
    if (!isSyncConfigured) {
      setShowSettings(true);
      return;
    }
    handleManualSync();
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
                      {toast.title || (isWarning ? (language === 'RU' ? 'Внимание' : 'Warning') : (language === 'RU' ? 'Успешно' : 'Success'))}
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
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="bg-gradient-to-tr from-indigo-500 to-emerald-400 p-2 rounded-xl shadow-lg shadow-indigo-500/20 shrink-0">
                <Wallet size={18} className="text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="font-extrabold text-base tracking-tight text-white font-display leading-tight">{TRANSLATIONS[language].appName}</h1>
                {/* Sync status: always visible, on every screen */}
                <button
                  type="button"
                  onClick={handleSyncIndicatorClick}
                  title={indicator.hint}
                  aria-live="polite"
                  data-sync-state={syncIndicator}
                  className={`flex items-center space-x-1 max-w-full text-[10px] leading-tight font-medium mt-0.5 cursor-pointer focus:outline-none ${indicator.tone}`}
                >
                  <span className="shrink-0">{indicator.icon}</span>
                  <span className="truncate">{indicator.label}</span>
                </button>
              </div>
            </div>

            {/* Action pill: Clickable Month Selector & Settings Trigger */}
            <div className="flex items-center space-x-2 shrink-0">
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
              disabled={currentMonth >= currentLocalMonth()}
              className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition cursor-pointer disabled:opacity-20 disabled:pointer-events-none"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* UNSYNCED WARNING - stays until the sheet confirms the changes */}
          {syncIndicator === 'unsynced' && (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5"
            >
              <div className="flex items-start space-x-2 min-w-0">
                <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-snug text-red-200">
                  {isRu
                    ? `Изменения сохранены на устройстве, но не попали в Google Таблицу: ${syncError}. Отправка повторится сама.`
                    : `Changes are saved on this device but have not reached Google Sheets: ${syncError}. Sending will be retried automatically.`}
                </p>
              </div>
              <button
                type="button"
                disabled={syncPhase !== 'idle'}
                onClick={handleManualSync}
                className="shrink-0 flex items-center space-x-1 text-[11px] font-semibold text-red-200 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-full px-3 py-1.5 transition cursor-pointer disabled:opacity-60"
              >
                <RefreshCw size={11} className={syncPhase === 'saving' ? 'animate-spin' : ''} />
                <span>{isRu ? 'Повторить' : 'Retry'}</span>
              </button>
            </div>
          )}
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
                  currentMonth={currentMonth}
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
                    const todayStr = currentLocalMonth();
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
                        <Cloud size={14} className={syncPhase !== 'idle' ? 'animate-bounce' : ''} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-mono leading-none text-slate-400">{TRANSLATIONS[language].firebaseStatusLabel}</p>
                        <p className={`text-xs font-bold truncate mt-0.5 ${isSyncConfigured ? 'text-emerald-400' : 'text-slate-300'}`}>
                          {isSyncConfigured ? TRANSLATIONS[language].firebaseLinked : TRANSLATIONS[language].firebaseLocalMode}
                        </p>
                        {isSyncConfigured && (
                          <p className={`text-[10px] mt-1 flex items-center space-x-1 ${indicator.tone}`}>
                            <span className="shrink-0">{indicator.icon}</span>
                            <span className="truncate">{indicator.label}</span>
                          </p>
                        )}
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
                        disabled={syncPhase !== 'idle'}
                        onClick={handleManualSync}
                        className="w-full py-2.5 font-semibold text-xs rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white border border-indigo-400 transition duration-150 cursor-pointer shadow-lg shadow-indigo-500/10 flex items-center justify-center space-x-1.5 font-display"
                      >
                        <RefreshCw size={12} className={syncPhase !== 'idle' ? 'animate-spin' : ''} />
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
