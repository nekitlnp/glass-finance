import { CashbackEntry } from '../types';
import {
  CASHBACK_BANKS,
  canonicalBankName,
  canonicalCategoryName,
  categoryOrder,
  findBank,
  findCategory,
  normalizeDirectoryKey
} from './cashbackDirectory';

/** Popular banks first, in directory order; banks typed in by hand after them */
function bankRank(name: string): number {
  const bank = findBank(name);
  return bank ? CASHBACK_BANKS.indexOf(bank) : CASHBACK_BANKS.length;
}

/** Entries that work in the given month: chosen for that month or set for every month. */
export function activeCashback(entries: CashbackEntry[], month: string): CashbackEntry[] {
  return entries.filter(entry => entry.month === month || entry.month === '');
}

export interface CashbackOffer {
  bank: string;
  percent: number;
  note?: string;
  everyMonth: boolean;
}

export interface CategoryOffers {
  category: string;
  /** Best first */
  offers: CashbackOffer[];
}

/**
 * For each category active in the month: which bank pays how much, best first.
 * A bank that has the same category twice (for the month and for every month) counts once, with the higher percent.
 */
export function offersByCategory(entries: CashbackEntry[], month: string): CategoryOffers[] {
  // category key -> display name and offers by bank key
  const byCategory = new Map<string, { category: string; banks: Map<string, CashbackOffer> }>();

  for (const entry of activeCashback(entries, month)) {
    if (!(entry.percent > 0)) continue;
    const category = canonicalCategoryName(entry.category);
    const bank = canonicalBankName(entry.bank);
    if (!category || !bank) continue;

    const categoryKey = normalizeDirectoryKey(category);
    if (!byCategory.has(categoryKey)) byCategory.set(categoryKey, { category, banks: new Map() });
    const banks = byCategory.get(categoryKey)!.banks;

    const bankKey = normalizeDirectoryKey(bank);
    const existing = banks.get(bankKey);
    if (!existing || entry.percent > existing.percent) {
      banks.set(bankKey, {
        bank,
        percent: entry.percent,
        note: entry.note || undefined,
        everyMonth: entry.month === ''
      });
    }
  }

  return Array.from(byCategory.values())
    .map(({ category, banks }) => ({
      category,
      offers: Array.from(banks.values()).sort(
        (a, b) => b.percent - a.percent || bankRank(a.bank) - bankRank(b.bank) || a.bank.localeCompare(b.bank, 'ru')
      )
    }))
    .sort(
      (a, b) => categoryOrder(a.category) - categoryOrder(b.category) || a.category.localeCompare(b.category, 'ru')
    );
}

export interface BankGroup {
  bank: string;
  entries: CashbackEntry[];
  note?: string;
}

/** Banks with their categories active in the month, popular banks first, in directory order. */
export function groupByBank(entries: CashbackEntry[], month: string): BankGroup[] {
  const groups = new Map<string, BankGroup>();
  for (const entry of activeCashback(entries, month)) {
    const bank = canonicalBankName(entry.bank);
    const key = normalizeDirectoryKey(bank);
    if (!groups.has(key)) groups.set(key, { bank, entries: [] });
    const group = groups.get(key)!;
    group.entries.push(entry);
    if (!group.note && entry.note) group.note = entry.note;
  }

  for (const group of groups.values()) {
    group.entries.sort(
      (a, b) =>
        b.percent - a.percent ||
        categoryOrder(a.category) - categoryOrder(b.category) ||
        a.category.localeCompare(b.category, 'ru')
    );
  }

  return Array.from(groups.values()).sort(
    (a, b) => bankRank(a.bank) - bankRank(b.bank) || a.bank.localeCompare(b.bank, 'ru')
  );
}

/** Same-bank test that understands aliases: «Тинькофф» and «Т-Банк» are one bank. */
export function isSameBank(a: string, b: string): boolean {
  return normalizeDirectoryKey(canonicalBankName(a)) === normalizeDirectoryKey(canonicalBankName(b));
}

export function isSameCategory(a: string, b: string): boolean {
  return normalizeDirectoryKey(canonicalCategoryName(a)) === normalizeDirectoryKey(canonicalCategoryName(b));
}

export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(year, monthNumber - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Categories chosen for one month only (not "every month") */
export function monthOnlyEntries(entries: CashbackEntry[], month: string): CashbackEntry[] {
  return entries.filter(entry => entry.month === month);
}

/** Copies the categories chosen for one month into another month. */
export function copyMonth(
  entries: CashbackEntry[],
  from: string,
  to: string,
  makeId: () => string
): CashbackEntry[] {
  const copies = monthOnlyEntries(entries, from).map(entry => ({ ...entry, id: makeId(), month: to }));
  return [...entries, ...copies];
}

export interface CashbackRowInput {
  category: string;
  percent: number;
  everyMonth: boolean;
}

/**
 * Saves the edit form of one bank: its categories for the month and its every-month categories
 * are replaced with the rows. Entries of this bank in other months are kept.
 * `previousBank` is the bank being edited (it may have been renamed in the form), or null for a new one.
 */
export function replaceBankEntries(
  entries: CashbackEntry[],
  previousBank: string | null,
  bank: string,
  month: string,
  rows: CashbackRowInput[],
  note: string,
  makeId: () => string
): CashbackEntry[] {
  const touched = (entry: CashbackEntry) =>
    (entry.month === month || entry.month === '') &&
    (isSameBank(entry.bank, bank) || (previousBank !== null && isSameBank(entry.bank, previousBank)));

  const kept = entries.filter(entry => !touched(entry));
  const previousIds = entries.filter(touched);
  const trimmedNote = note.trim();

  const created = rows.map(row => {
    const entryMonth = row.everyMonth ? '' : month;
    // Keep the id of an unchanged row, so the sheet does not see a delete plus an insert
    const reused = previousIds.find(
      entry => entry.month === entryMonth && isSameCategory(entry.category, row.category)
    );
    const result: CashbackEntry = {
      id: reused ? reused.id : makeId(),
      bank: canonicalBankName(bank),
      category: canonicalCategoryName(row.category),
      percent: Math.round(row.percent * 100) / 100,
      month: entryMonth
    };
    if (trimmedNote) result.note = trimmedNote;
    return result;
  });

  return [...kept, ...created];
}

/** Removes a bank's categories for the month and its every-month categories. */
export function removeBank(entries: CashbackEntry[], bank: string, month: string): CashbackEntry[] {
  return entries.filter(entry => !((entry.month === month || entry.month === '') && isSameBank(entry.bank, bank)));
}

/** Does the category (or one of its synonyms) contain the search text? */
export function categoryMatches(category: string, query: string): boolean {
  const needle = normalizeDirectoryKey(query);
  if (!needle) return true;
  const known = findCategory(category);
  const names = known ? [known.name, ...(known.aliases || [])] : [category];
  return names.some(name => normalizeDirectoryKey(name).includes(needle));
}
