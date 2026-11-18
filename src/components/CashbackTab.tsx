import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  AlertTriangle,
  Baby,
  BedDouble,
  BookOpen,
  Bus,
  Camera,
  CarTaxiFront,
  Check,
  Clapperboard,
  Copy,
  Dumbbell,
  Flower2,
  Fuel,
  Gem,
  GraduationCap,
  Hammer,
  House,
  Info,
  KeyRound,
  Luggage,
  Music,
  Package,
  Palette,
  PawPrint,
  Pencil,
  Percent,
  Pill,
  Pizza,
  Plane,
  Plus,
  Repeat,
  Save,
  Search,
  Shirt,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Stethoscope,
  Tag,
  Ticket,
  TrainFront,
  Trash2,
  Truck,
  Tv,
  UtensilsCrossed,
  WashingMachine,
  Wifi,
  Wrench,
  X
} from 'lucide-react';
import googleAppsScriptCode from '../../GoogleAppsScript.js?raw';
import { CashbackEntry } from '../types';
import {
  CASHBACK_BANKS,
  CASHBACK_CATEGORIES,
  CASHBACK_CATEGORY_GROUPS,
  bankBadge,
  findBank,
  findCategory,
  normalizeDirectoryKey
} from '../utils/cashbackDirectory';
import {
  BankGroup,
  CashbackRowInput,
  activeCashback,
  categoryMatches,
  copyMonth,
  groupByBank,
  isSameBank,
  isSameCategory,
  monthOnlyEntries,
  offersByCategory,
  removeBank,
  replaceBankEntries,
  shiftMonth
} from '../utils/cashback';
import { parseAmountInput } from '../utils/finance';
import { LanguageCode, getMonthLocalizedName } from '../utils/translations';

/**
 * Where cashback is kept:
 * - device: no Google Sheet connected
 * - sheet: saved to the Google Sheet like everything else
 * - device-only: a sheet is connected, but its script is an older version that ignores cashback
 */
export type CashbackStorage = 'device' | 'sheet' | 'device-only';

const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Activity,
  Baby,
  BedDouble,
  BookOpen,
  Bus,
  Camera,
  CarTaxiFront,
  Clapperboard,
  Dumbbell,
  Flower2,
  Fuel,
  Gem,
  GraduationCap,
  Hammer,
  House,
  KeyRound,
  Luggage,
  Music,
  Package,
  Palette,
  PawPrint,
  Percent,
  Pill,
  Pizza,
  Plane,
  Shirt,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Stethoscope,
  Ticket,
  TrainFront,
  Truck,
  Tv,
  UtensilsCrossed,
  WashingMachine,
  Wifi,
  Wrench
};

function CashbackCategoryIcon({ category, size = 16 }: { category: string; size?: number }) {
  const Icon = CATEGORY_ICONS[findCategory(category)?.icon || ''] || Tag;
  return <Icon size={size} />;
}

function BankBadge({ bank, size = 'md' }: { bank: string; size?: 'sm' | 'md' }) {
  const badge = bankBadge(bank);
  const dimension = size === 'sm' ? 'w-6 h-6 text-[8px]' : 'w-9 h-9 text-[10px]';
  return (
    <span
      className={`${dimension} shrink-0 rounded-full inline-flex items-center justify-center font-black tracking-tight leading-none shadow-sm`}
      style={{ backgroundColor: badge.color, color: badge.textColor }}
      aria-hidden="true"
    >
      {badge.short}
    </span>
  );
}

const formatPercent = (value: number) => `${String(Math.round(value * 100) / 100).replace('.', ',')}%`;

const makeEntryId = () => `cb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ------------ EDIT FORM ------------

const CUSTOM = '__custom';

interface RowDraft {
  key: number;
  /** Directory category id, CUSTOM, or '' while nothing is chosen */
  categoryId: string;
  customCategory: string;
  percent: string;
  everyMonth: boolean;
}

interface EditorState {
  /** Bank whose entries are being edited, null for a new bank */
  previousBank: string | null;
  /** Directory bank id, CUSTOM, or '' */
  bankId: string;
  customBank: string;
  rows: RowDraft[];
  note: string;
  mergedNotice: boolean;
}

let rowKeySeed = 0;
const nextRowKey = () => ++rowKeySeed;

const emptyRow = (): RowDraft => ({ key: nextRowKey(), categoryId: '', customCategory: '', percent: '', everyMonth: false });

function rowsFromGroup(group: BankGroup): RowDraft[] {
  return group.entries.map(entry => {
    const known = findCategory(entry.category);
    return {
      key: nextRowKey(),
      categoryId: known ? known.id : CUSTOM,
      customCategory: known ? '' : entry.category,
      percent: String(entry.percent).replace('.', ','),
      everyMonth: entry.month === ''
    };
  });
}

function bankFieldsFor(bank: string): Pick<EditorState, 'bankId' | 'customBank'> {
  const known = findBank(bank);
  return known ? { bankId: known.id, customBank: '' } : { bankId: CUSTOM, customBank: bank };
}

function draftBankName(state: EditorState): string {
  if (state.bankId === CUSTOM) return state.customBank.trim();
  return CASHBACK_BANKS.find(bank => bank.id === state.bankId)?.name || '';
}

function draftCategoryName(row: RowDraft): string {
  if (row.categoryId === CUSTOM) return row.customCategory.trim();
  return CASHBACK_CATEGORIES.find(category => category.id === row.categoryId)?.name || '';
}

function isBlankRow(row: RowDraft): boolean {
  return row.categoryId === '' && row.percent.trim() === '';
}

/** Rows to save, or the first problem as text */
function validateDraft(state: EditorState, isRu: boolean): { rows: CashbackRowInput[] } | { error: string } {
  if (!draftBankName(state)) {
    return { error: isRu ? 'Выберите банк или впишите его название.' : 'Choose a bank or type its name.' };
  }
  const filled = state.rows.filter(row => !isBlankRow(row));
  if (filled.length === 0) {
    return { error: isRu ? 'Добавьте хотя бы одну категорию с процентом.' : 'Add at least one category with a percent.' };
  }

  const rows: CashbackRowInput[] = [];
  for (const row of filled) {
    const category = draftCategoryName(row);
    if (!category) {
      return { error: isRu ? 'В одной из строк не выбрана категория.' : 'One of the rows has no category.' };
    }
    const percent = parseAmountInput(row.percent);
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
      return {
        error: isRu
          ? `Процент для «${category}» — число больше 0 и не больше 100.`
          : `The percent for “${category}” must be above 0 and at most 100.`
      };
    }
    const duplicate = rows.find(other => other.everyMonth === row.everyMonth && isSameCategory(other.category, category));
    if (duplicate) {
      return {
        error: isRu ? `Категория «${category}» указана дважды.` : `“${category}” is listed twice.`
      };
    }
    rows.push({ category, percent, everyMonth: row.everyMonth });
  }
  return { rows };
}

interface CashbackEditorProps {
  initial: EditorState;
  entries: CashbackEntry[];
  currentMonth: string;
  language: LanguageCode;
  onClose: () => void;
  onSave: (entries: CashbackEntry[]) => void;
}

function CashbackEditor({ initial, entries, currentMonth, language, onClose, onSave }: CashbackEditorProps) {
  const isRu = language === 'RU';
  const [state, setState] = useState<EditorState>(initial);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const monthName = getMonthLocalizedName(currentMonth, language);
  const monthNameLower = isRu ? monthName.toLowerCase() : monthName;

  const groups = useMemo(() => groupByBank(entries, currentMonth), [entries, currentMonth]);
  const draftValidation = validateDraft(state, isRu);
  const draftBank = draftBankName(state);
  const conflictingBank =
    draftBank && !(state.previousBank && isSameBank(state.previousBank, draftBank))
      ? groups.find(group => isSameBank(group.bank, draftBank))
      : undefined;
  // Saving would replace the categories of another bank card
  const validation: ReturnType<typeof validateDraft> = conflictingBank
    ? {
        error: isRu
          ? `У банка «${conflictingBank.bank}» уже есть категории — откройте его карточку в списке.`
          : `“${conflictingBank.bank}” already has categories — open its card in the list.`
      }
    : draftValidation;

  const updateRow = (key: number, patch: Partial<RowDraft>) =>
    setState(prev => ({ ...prev, rows: prev.rows.map(row => (row.key === key ? { ...row, ...patch } : row)) }));

  const removeRow = (key: number) =>
    setState(prev => {
      const rows = prev.rows.filter(row => row.key !== key);
      return { ...prev, rows: rows.length ? rows : [emptyRow()] };
    });

  const handleBankChange = (bankId: string) => {
    setState(prev => {
      const next = { ...prev, bankId, mergedNotice: false };
      // Adding a bank that already has categories: open its categories instead of overwriting them
      if (prev.previousBank === null && bankId !== CUSTOM && bankId !== '') {
        const name = CASHBACK_BANKS.find(bank => bank.id === bankId)?.name || '';
        const existing = groups.find(group => isSameBank(group.bank, name));
        if (existing) {
          const existingRows = rowsFromGroup(existing);
          const typedRows = prev.rows.filter(
            row => !isBlankRow(row) && !existingRows.some(other => other.categoryId === row.categoryId && other.everyMonth === row.everyMonth && row.categoryId !== CUSTOM)
          );
          return {
            ...next,
            previousBank: existing.bank,
            rows: [...existingRows, ...typedRows],
            note: prev.note || existing.note || '',
            mergedNotice: true
          };
        }
      }
      return next;
    });
  };

  const handleSave = () => {
    if (!('rows' in validation)) return;
    onSave(
      replaceBankEntries(entries, state.previousBank, draftBankName(state), currentMonth, validation.rows, state.note, makeEntryId)
    );
  };

  const handleDelete = () => {
    if (!state.previousBank) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onSave(removeBank(entries, state.previousBank, currentMonth));
  };

  const otherMonthsCount = state.previousBank
    ? entries.filter(entry => entry.month !== '' && entry.month !== currentMonth && isSameBank(entry.bank, state.previousBank!)).length
    : 0;

  const popularBanks = CASHBACK_BANKS.filter(bank => bank.popular);
  const otherBanks = CASHBACK_BANKS.filter(bank => !bank.popular);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        role="dialog"
        aria-label={isRu ? 'Кэшбэк банка' : 'Bank cashback'}
        className="glass-panel w-full max-w-sm rounded-[32px] p-6 relative z-10 space-y-4 max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white text-base font-display">
            {initial.previousBank
              ? (isRu ? 'Кэшбэк в банке' : 'Bank cashback')
              : (isRu ? 'Новый банк' : 'New bank')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full transition duration-150 text-slate-400 hover:text-white cursor-pointer"
            aria-label={isRu ? 'Закрыть' : 'Close'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Bank */}
        <div className="space-y-1.5">
          <label className="text-xs text-slate-400 font-medium block" htmlFor="cashback-bank">
            {isRu ? 'Банк' : 'Bank'}
          </label>
          <select
            id="cashback-bank"
            value={state.bankId}
            onChange={(e) => handleBankChange(e.target.value)}
            className="w-full glass-input rounded-xl px-4 py-2.5 text-sm appearance-none bg-slate-900"
          >
            <option value="" disabled>{isRu ? 'Выберите банк' : 'Choose a bank'}</option>
            <optgroup label={isRu ? 'Популярные' : 'Popular'}>
              {popularBanks.map(bank => (
                <option key={bank.id} value={bank.id}>{bank.name}</option>
              ))}
            </optgroup>
            <optgroup label={isRu ? 'Все банки' : 'All banks'}>
              {otherBanks.map(bank => (
                <option key={bank.id} value={bank.id}>{bank.name}</option>
              ))}
            </optgroup>
            <option value={CUSTOM}>{isRu ? 'Другой банк…' : 'Other bank…'}</option>
          </select>
          {state.bankId === CUSTOM && (
            <input
              type="text"
              value={state.customBank}
              onChange={(e) => setState(prev => ({ ...prev, customBank: e.target.value }))}
              className="w-full glass-input rounded-xl px-4 py-2.5 text-sm"
              placeholder={isRu ? 'Название банка' : 'Bank name'}
              aria-label={isRu ? 'Название банка' : 'Bank name'}
              autoFocus
            />
          )}
          {state.mergedNotice && (
            <p className="text-[11px] text-indigo-300 leading-snug">
              {isRu
                ? 'У этого банка уже есть категории — они подставлены ниже, можно дополнить.'
                : 'This bank already has categories — they are filled in below.'}
            </p>
          )}
        </div>

        {/* Categories */}
        <div className="space-y-2">
          <div className="text-xs text-slate-400 font-medium">
            {isRu ? `Категории на ${monthNameLower}` : `Categories for ${monthName}`}
          </div>

          {state.rows.map((row, index) => (
            <div key={row.key} className="rounded-2xl border border-white/5 bg-slate-900/60 p-2.5 space-y-2" data-cashback-row={index}>
              <div className="flex items-center gap-2">
                <select
                  value={row.categoryId}
                  onChange={(e) => updateRow(row.key, { categoryId: e.target.value })}
                  className="min-w-0 flex-1 glass-input rounded-xl px-3 py-2 text-sm appearance-none bg-slate-900"
                  aria-label={isRu ? `Категория ${index + 1}` : `Category ${index + 1}`}
                >
                  <option value="" disabled>{isRu ? 'Категория' : 'Category'}</option>
                  {CASHBACK_CATEGORY_GROUPS.map(group => (
                    <optgroup key={group.id} label={group.name}>
                      {CASHBACK_CATEGORIES.filter(category => category.group === group.id).map(category => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </optgroup>
                  ))}
                  <option value={CUSTOM}>{isRu ? 'Своя категория…' : 'Other category…'}</option>
                </select>
                <div className="relative w-[74px] shrink-0">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={row.percent}
                    onChange={(e) => updateRow(row.key, { percent: e.target.value })}
                    className="w-full glass-input rounded-xl pl-3 pr-6 py-2 text-sm font-mono"
                    placeholder="5"
                    aria-label={isRu ? `Процент ${index + 1}` : `Percent ${index + 1}`}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">%</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  className="p-2 shrink-0 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                  aria-label={isRu ? `Убрать строку ${index + 1}` : `Remove row ${index + 1}`}
                >
                  <X size={14} />
                </button>
              </div>
              {row.categoryId === CUSTOM && (
                <input
                  type="text"
                  value={row.customCategory}
                  onChange={(e) => updateRow(row.key, { customCategory: e.target.value })}
                  className="w-full glass-input rounded-xl px-3 py-2 text-sm"
                  placeholder={isRu ? 'Например, Пятёрочка или Почта России' : 'Category name'}
                  aria-label={isRu ? `Своя категория ${index + 1}` : `Custom category ${index + 1}`}
                />
              )}
              <label className="flex items-center space-x-2 px-1 text-[11px] text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={row.everyMonth}
                  onChange={(e) => updateRow(row.key, { everyMonth: e.target.checked })}
                  className="accent-indigo-500 w-3.5 h-3.5"
                />
                <span>{isRu ? 'Действует каждый месяц' : 'Every month'}</span>
              </label>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setState(prev => ({ ...prev, rows: [...prev.rows, emptyRow()] }))}
            className="w-full flex items-center justify-center space-x-1.5 rounded-2xl border border-dashed border-slate-500/40 hover:border-indigo-400/60 py-2.5 text-xs font-medium text-slate-300 hover:text-white transition cursor-pointer"
          >
            <Plus size={14} />
            <span>{isRu ? 'Ещё категория' : 'Add category'}</span>
          </button>
        </div>

        {/* Note */}
        <div className="space-y-1.5">
          <label className="text-xs text-slate-400 font-medium block" htmlFor="cashback-note">
            {isRu ? 'Карта или условия' : 'Card or conditions'}
            <span className="text-slate-500 font-normal">{isRu ? ' — необязательно' : ' — optional'}</span>
          </label>
          <input
            id="cashback-note"
            type="text"
            value={state.note}
            onChange={(e) => setState(prev => ({ ...prev, note: e.target.value }))}
            className="w-full glass-input rounded-xl px-4 py-2.5 text-sm"
            placeholder={isRu ? 'Например: Black, лимит 3 000 ₽ в месяц' : 'e.g. Black card, 3,000 ₽ monthly cap'}
          />
        </div>

        {otherMonthsCount > 0 && (
          <p className="text-[10px] text-slate-500 leading-snug">
            {isRu
              ? `Категории этого банка за другие месяцы (${otherMonthsCount}) не меняются.`
              : `This bank's categories in other months (${otherMonthsCount}) stay as they are.`}
          </p>
        )}

        <div className="space-y-2 pt-1">
          <div className="flex space-x-2">
            {initial.previousBank && (
              <button
                type="button"
                onClick={handleDelete}
                className={`${confirmDelete ? 'flex-1' : 'w-1/3'} flex items-center justify-center space-x-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 rounded-xl py-2.5 text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer`}
              >
                <Trash2 size={13} />
                <span>{confirmDelete ? (isRu ? 'Точно удалить?' : 'Really delete?') : (isRu ? 'Удалить' : 'Delete')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={!('rows' in validation)}
              className="flex-1 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:pointer-events-none text-white rounded-xl py-2.5 text-xs font-semibold tracking-wider uppercase transition-colors shadow-lg shadow-indigo-500/25 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Save size={14} />
              <span>{isRu ? 'Сохранить' : 'Save'}</span>
            </button>
          </div>
          {'error' in validation && (
            <p className="text-[11px] text-slate-400 text-center leading-snug" data-cashback-hint>
              {validation.error}
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ------------ TAB ------------

interface CashbackTabProps {
  entries: CashbackEntry[];
  currentMonth: string;
  onChange: (entries: CashbackEntry[]) => void;
  storage: CashbackStorage;
  language: LanguageCode;
}

export default function CashbackTab({ entries, currentMonth, onChange, storage, language }: CashbackTabProps) {
  const isRu = language === 'RU';
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [showScriptHelp, setShowScriptHelp] = useState(false);
  const [scriptCopied, setScriptCopied] = useState(false);

  // Lock page scrolling while the form is open
  useEffect(() => {
    if (!editor) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [editor]);

  const monthName = getMonthLocalizedName(currentMonth, language);
  const monthNameLower = isRu ? monthName.toLowerCase() : monthName;
  const previousMonth = shiftMonth(currentMonth, -1);
  const previousMonthName = getMonthLocalizedName(previousMonth, language);

  const active = activeCashback(entries, currentMonth);
  const offers = useMemo(() => offersByCategory(entries, currentMonth), [entries, currentMonth]);
  const banks = useMemo(() => groupByBank(entries, currentMonth), [entries, currentMonth]);

  const baseOffers = offers.find(group => isSameCategory(group.category, 'Все покупки'));
  const categoryOffers = offers.filter(group => group !== baseOffers);
  const visibleOffers = categoryOffers.filter(group => categoryMatches(group.category, query));

  const previousMonthEntries = monthOnlyEntries(entries, previousMonth);
  const canCopyPrevious = monthOnlyEntries(entries, currentMonth).length === 0 && previousMonthEntries.length > 0;

  // Search for a known category that nobody pays extra for: a match in the name wins over a match in a synonym
  const needle = normalizeDirectoryKey(query);
  const searchedCategory = needle
    ? CASHBACK_CATEGORIES.find(category => normalizeDirectoryKey(category.name).includes(needle)) ??
      CASHBACK_CATEGORIES.find(category => categoryMatches(category.name, query))
    : undefined;

  const openNew = () =>
    setEditor({ previousBank: null, bankId: '', customBank: '', rows: [emptyRow()], note: '', mergedNotice: false });

  const openBank = (group: BankGroup) =>
    setEditor({
      previousBank: group.bank,
      ...bankFieldsFor(group.bank),
      rows: rowsFromGroup(group),
      note: group.note || '',
      mergedNotice: false
    });

  const handleCopyPrevious = () => onChange(copyMonth(entries, previousMonth, currentMonth, makeEntryId));

  const handleCopyScript = async () => {
    let copied = false;
    try {
      await navigator.clipboard.writeText(googleAppsScriptCode);
      copied = true;
    } catch {
      // No clipboard API (older browsers, pages without https): copy through a hidden text field
      const field = document.createElement('textarea');
      field.value = googleAppsScriptCode;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.appendChild(field);
      field.select();
      try {
        copied = document.execCommand('copy');
      } catch {
        copied = false;
      }
      document.body.removeChild(field);
    }
    if (copied) {
      setScriptCopied(true);
      setTimeout(() => setScriptCopied(false), 2500);
    }
  };

  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-white/90 font-display flex items-center space-x-2">
            <span>{isRu ? 'Кэшбэк' : 'Cashback'}</span>
            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono font-normal">{banks.length}</span>
          </h2>
          <div className="text-[11px] text-slate-400">
            {isRu ? `Категории на ${monthNameLower}` : `Categories for ${monthName}`}
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={openNew}
          className="flex items-center space-x-1 shrink-0 text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-full border border-indigo-500/20 transition-all duration-200 cursor-pointer"
        >
          <Plus size={14} />
          <span>{isRu ? 'Банк' : 'Bank'}</span>
        </motion.button>
      </div>

      {/* The sheet's script does not know about cashback yet */}
      {storage === 'device-only' && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 space-y-2.5" data-cashback-storage-note>
          <div className="flex items-start space-x-2.5 text-[11px] leading-snug text-amber-100/90">
            <Info size={14} className="shrink-0 mt-0.5 text-amber-400" />
            <span>
              {isRu
                ? 'Кэшбэк пока сохраняется только на этом устройстве: скрипт Google Таблицы старой версии и не принимает его. Остальные данные синхронизируются как обычно.'
                : 'Cashback is saved on this device only: the Google Sheet script is an older version that does not accept it. Everything else syncs as usual.'}
            </span>
          </div>
          {showScriptHelp ? (
            <div className="space-y-2.5">
              <ol className="list-decimal pl-5 space-y-1 text-[11px] leading-snug text-slate-300">
                <li>{isRu ? 'Скопируйте новый код скрипта кнопкой ниже.' : 'Copy the new script code with the button below.'}</li>
                <li>{isRu ? 'В таблице: Расширения → Apps Script. Замените весь старый код новым и сохраните.' : 'In the sheet: Extensions → Apps Script. Replace all the old code and save.'}</li>
                <li>{isRu ? 'Начать развертывание → Управление развертываниями → карандаш → Версия: «Новая версия» → Развернуть.' : 'Deploy → Manage deployments → pencil → Version: New version → Deploy.'}</li>
                <li>{isRu ? 'Ссылка не изменится, в приложении ничего менять не нужно — кэшбэк отправится в таблицу сам.' : 'The link stays the same; cashback will be sent to the sheet automatically.'}</li>
              </ol>
              <button
                type="button"
                onClick={handleCopyScript}
                className="w-full flex items-center justify-center space-x-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 py-2 text-[11px] font-semibold text-amber-100 transition cursor-pointer"
              >
                {scriptCopied ? <Check size={13} /> : <Copy size={13} />}
                <span>{scriptCopied ? (isRu ? 'Код скопирован' : 'Copied') : (isRu ? 'Скопировать код скрипта' : 'Copy script code')}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowScriptHelp(true)}
              className="text-[11px] font-semibold text-amber-300 hover:text-amber-200 underline underline-offset-2 cursor-pointer"
            >
              {isRu ? 'Как обновить скрипт' : 'How to update the script'}
            </button>
          )}
        </div>
      )}

      {/* New month: offer last month's categories */}
      {canCopyPrevious && (
        <div className="glass-panel rounded-3xl p-4 border border-indigo-500/20 space-y-3" data-cashback-copy>
          <p className="text-[12px] leading-snug text-slate-300">
            {isRu
              ? `На ${monthNameLower} категорий ещё нет. Перенести ${previousMonthEntries.length} ${pluralRu(previousMonthEntries.length, ['категорию', 'категории', 'категорий'])} из ${shortMonthGenitive(previousMonth)}? Потом их можно поправить.`
              : `No categories for ${monthName} yet. Copy the ${previousMonthEntries.length} chosen for ${previousMonthName}? You can edit them afterwards.`}
          </p>
          <button
            type="button"
            onClick={handleCopyPrevious}
            className="w-full flex items-center justify-center space-x-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl py-2.5 text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer"
          >
            <Copy size={13} />
            <span>{isRu ? `Перенести из ${shortMonthGenitive(previousMonth)}` : `Copy from ${previousMonthName}`}</span>
          </button>
        </div>
      )}

      {active.length === 0 && !canCopyPrevious && (
        <div className="glass-panel rounded-3xl p-8 text-center border border-white/5 space-y-4 bg-slate-900/10 backdrop-blur-xl">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Percent size={22} />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-semibold text-white text-sm">{isRu ? 'Кэшбэка пока нет' : 'No cashback yet'}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isRu
                ? 'Добавьте банк и категории, которые выбрали в его приложении. Здесь будет видно, какой картой платить в каждой категории.'
                : 'Add a bank and the categories you chose in its app. You will see which card to pay with in each category.'}
            </p>
          </div>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center space-x-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl px-4 py-2.5 text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>{isRu ? 'Добавить банк' : 'Add bank'}</span>
          </button>
        </div>
      )}

      {/* Which card to pay with */}
      {offers.length > 0 && (
        <section className="space-y-3" aria-label={isRu ? 'Чем платить' : 'Which card to use'}>
          <div className="px-1 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold text-white/90 font-display">{isRu ? 'Чем платить' : 'Which card to use'}</h3>
            <span className="text-[10px] text-slate-500">{isRu ? 'лучший процент справа' : 'best percent on the right'}</span>
          </div>

          {categoryOffers.length > 4 && (
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full glass-input rounded-2xl pl-9 pr-4 py-2.5 text-sm"
                placeholder={isRu ? 'Найти категорию: аптека, такси…' : 'Find a category'}
                aria-label={isRu ? 'Найти категорию' : 'Find a category'}
              />
            </div>
          )}

          <div className="glass-panel rounded-3xl px-4 py-1 border border-white/5 divide-y divide-white/5">
            {visibleOffers.map(group => {
              const best = group.offers[0].percent;
              const winners = group.offers.filter(offer => offer.percent === best);
              const rest = group.offers.filter(offer => offer.percent !== best);
              return (
                <div key={group.category} className="flex items-center gap-3 py-3" data-cashback-offer={group.category}>
                  <div className="p-2 rounded-xl bg-slate-800/60 text-indigo-400 shrink-0">
                    <CashbackCategoryIcon category={group.category} size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-white truncate">{group.category}</div>
                    <div className="text-[11px] text-slate-400 leading-snug">
                      {winners.map(offer => offer.bank).join(isRu ? ' или ' : ' or ')}
                      {rest.length > 0 && (
                        <span className="text-slate-500">
                          {' · '}{isRu ? 'ещё ' : 'also '}
                          {rest.map(offer => `${offer.bank} ${formatPercent(offer.percent)}`).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex -space-x-1.5">
                      {winners.slice(0, 3).map(offer => (
                        <BankBadge key={offer.bank} bank={offer.bank} size="sm" />
                      ))}
                    </div>
                    <span className="font-mono font-bold text-emerald-400 text-base tabular-nums">{formatPercent(best)}</span>
                  </div>
                </div>
              );
            })}

            {visibleOffers.length === 0 && query.trim() !== '' && (
              <div className="py-3.5 text-[12px] text-slate-400 leading-snug" data-cashback-nomatch>
                {searchedCategory
                  ? (isRu
                      ? `На «${searchedCategory.name}» повышенного кэшбэка нет.`
                      : `No extra cashback for “${searchedCategory.name}”.`)
                  : (isRu ? 'Такой категории нет.' : 'No such category.')}
                {baseOffers && (
                  <span>
                    {' '}
                    {isRu ? 'Платите картой с кэшбэком на всё: ' : 'Use the card with cashback on everything: '}
                    <span className="text-white font-semibold">
                      {baseOffers.offers[0].bank} {formatPercent(baseOffers.offers[0].percent)}
                    </span>
                    .
                  </span>
                )}
              </div>
            )}

            {baseOffers && (
              <div className="flex items-center gap-3 py-3" data-cashback-offer="Все покупки">
                <div className="p-2 rounded-xl bg-slate-800/60 text-slate-400 shrink-0">
                  <Percent size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white/90 truncate">{isRu ? 'Всё остальное' : 'Everything else'}</div>
                  <div className="text-[11px] text-slate-400 leading-snug">
                    {baseOffers.offers.map(offer => `${offer.bank} ${formatPercent(offer.percent)}`).join(', ')}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <BankBadge bank={baseOffers.offers[0].bank} size="sm" />
                  <span className="font-mono font-bold text-slate-300 text-base tabular-nums">{formatPercent(baseOffers.offers[0].percent)}</span>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Banks */}
      {banks.length > 0 && (
        <section className="space-y-3" aria-label={isRu ? 'Банки' : 'Banks'}>
          <h3 className="px-1 text-sm font-semibold text-white/90 font-display">{isRu ? 'Мои банки' : 'My banks'}</h3>
          {banks.map(group => (
            <button
              type="button"
              key={group.bank}
              onClick={() => openBank(group)}
              className="w-full text-left glass-panel rounded-3xl p-4 border border-white/5 hover:border-indigo-500/30 transition cursor-pointer space-y-3"
              data-cashback-bank={group.bank}
              aria-label={isRu ? `Изменить кэшбэк: ${group.bank}` : `Edit cashback: ${group.bank}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <BankBadge bank={group.bank} />
                  <div className="min-w-0">
                    <div className="font-bold text-white text-sm truncate font-display">{group.bank}</div>
                    {group.note && <div className="text-[11px] text-slate-400 truncate">{group.note}</div>}
                  </div>
                </div>
                <span className="p-2 text-slate-400 rounded-xl shrink-0">
                  <Pencil size={13} />
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {group.entries.map(entry => (
                  <span
                    key={entry.id}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 pl-2 pr-2.5 py-1 text-[11px] text-slate-300"
                    title={entry.month === '' ? (isRu ? 'Каждый месяц' : 'Every month') : undefined}
                  >
                    <span className="text-indigo-400"><CashbackCategoryIcon category={entry.category} size={11} /></span>
                    <span>{entry.category}</span>
                    <span className="font-mono font-semibold text-emerald-400">{formatPercent(entry.percent)}</span>
                    {entry.month === '' && <Repeat size={10} className="text-slate-500" aria-label={isRu ? 'каждый месяц' : 'every month'} />}
                  </span>
                ))}
              </div>
            </button>
          ))}
          <p className="px-1 text-[10px] text-slate-500 leading-snug flex items-center gap-1">
            <Repeat size={10} className="shrink-0" />
            <span>{isRu ? '— категория действует каждый месяц, её не нужно переносить.' : '— the category works every month.'}</span>
          </p>
        </section>
      )}

      {active.length > 0 && storage === 'device' && (
        <p className="px-1 text-[10px] text-slate-500 leading-snug flex items-start gap-1.5">
          <AlertTriangle size={11} className="shrink-0 mt-px" />
          <span>
            {isRu
              ? 'Google Таблица не подключена — кэшбэк хранится только на этом устройстве.'
              : 'No Google Sheet connected — cashback is kept on this device only.'}
          </span>
        </p>
      )}

      <AnimatePresence>
        {editor && (
          <CashbackEditor
            key={editor.previousBank || 'new'}
            initial={editor}
            entries={entries}
            currentMonth={currentMonth}
            language={language}
            onClose={() => setEditor(null)}
            onSave={(next) => {
              onChange(next);
              setEditor(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// 1 категорию, 2 категории, 5 категорий
function pluralRu(count: number, forms: [string, string, string]): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

// "2026-10" -> "октября" (for "Перенести из октября")
function shortMonthGenitive(month: string): string {
  const names = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  return names[Number(month.split('-')[1]) - 1] || month;
}
