import { Category, Expense, AdditionalIncome, CategoryWithCalculations } from '../types';

/**
 * Formats a money quantity into Russian Ruble with compulsory 2 decimal places.
 * Example: 15420 => "15 420.00 ₽"
 */
/**
 * Formats a money quantity into beautiful localized currency output.
 * Example: 15420 => "15 420,00 ₽"
 */
export function formatMoney(amount: number, currencyCode: string = 'RUB'): string {
  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (e) {
    // Dynamic fallback
    const symbols: Record<string, string> = {
      RUB: '₽',
      USD: '$',
      EUR: '€',
      KZT: '₸',
      BYN: 'Br',
      UAH: '₴'
    };
    const sym = symbols[currencyCode] || currencyCode;
    return `${amount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${sym}`;
  }
}

/**
 * Returns currency symbol based on ISO currency code.
 */
export function getCurrencySymbol(currencyCode: string): string {
  const symbols: Record<string, string> = {
    RUB: '₽',
    USD: '$',
    EUR: '€',
    KZT: '₸',
    BYN: 'Br',
    UAH: '₴'
  };
  return symbols[currencyCode] || currencyCode;
}

/**
 * Groups an array of expenses by Month and Year based on their date string (YYYY-MM-DD).
 * Format of group key: "YYYY-MM"
 */
export function groupExpensesByMonth(expenses: Expense[]): Record<string, Expense[]> {
  const sortedExpenses = [...expenses].sort((a, b) => b.date.localeCompare(a.date));
  const groups: Record<string, Expense[]> = {};
  
  for (const exp of sortedExpenses) {
    // Extract YYYY-MM
    const monthKey = exp.date.substring(0, 7); // "2026-06"
    if (!groups[monthKey]) {
      groups[monthKey] = [];
    }
    groups[monthKey].push(exp);
  }
  
  return groups;
}

/**
 * Converts a month-year string like "2026-06" to a beautiful readable Russian label like "2026 - 06 (июнь)"
 */
export function getReadableMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const monthNamesRu: Record<string, string> = {
    '01': 'январь',
    '02': 'февраль',
    '03': 'март',
    '04': 'апрель',
    '05': 'май',
    '06': 'июнь',
    '07': 'июль',
    '08': 'август',
    '09': 'сентябрь',
    '10': 'октябрь',
    '11': 'ноябрь',
    '12': 'декабрь'
  };
  const monthName = monthNamesRu[month] || month;
  return `${year} - ${month} (${monthName})`;
}

export function getNextMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  if (month === 12) {
    return `${year + 1}-01`;
  } else {
    return `${year}-${String(month + 1).padStart(2, '0')}`;
  }
}

/**
 * Calculates rollover and active calculations for all months up to the target month chronologically.
 */
export function calculateBalancesChronologically(
  categories: Category[],
  expenses: Expense[],
  incomes: AdditionalIncome[],
  targetMonth: string
): {
  rollovers: Record<string, Record<string, number>>;
  limits: Record<string, Record<string, number>>;
  primaryShares: Record<string, Record<string, number>>;
  additionalShares: Record<string, Record<string, number>>;
} {
  // Find all months represented in the database history
  const allMonthsSet = new Set<string>();
  allMonthsSet.add(targetMonth);
  expenses.forEach(e => allMonthsSet.add(e.date.substring(0, 7)));
  incomes.forEach(inc => allMonthsSet.add(inc.date.substring(0, 7)));

  const sortedMonths = Array.from(allMonthsSet).sort();
  const minMonth = sortedMonths[0];
  const maxMonth = targetMonth;

  // Build sequential list of months with no gaps
  const chronologicalMonths: string[] = [];
  let curr = minMonth;
  while (curr <= maxMonth) {
    chronologicalMonths.push(curr);
    curr = getNextMonth(curr);
  }

  const rollovers: Record<string, Record<string, number>> = {};
  const limits: Record<string, Record<string, number>> = {};
  const primaryShares: Record<string, Record<string, number>> = {};
  const additionalShares: Record<string, Record<string, number>> = {};

  // First month starts with 0 rollover (or uses the category seed default)
  const firstMonth = chronologicalMonths[0];
  rollovers[firstMonth] = {};
  categories.forEach(cat => {
    // Leftovers start from zero or can carry a starting baseline if required, but default to 0 for strict dynamic tracking
    rollovers[firstMonth][cat.id] = 0;
  });

  // Calculate forward step-by-step
  for (let i = 0; i < chronologicalMonths.length; i++) {
    const month = chronologicalMonths[i];
    const nextMonth = chronologicalMonths[i + 1];

    if (!rollovers[month]) {
      rollovers[month] = {};
      categories.forEach(cat => {
        rollovers[month][cat.id] = 0;
      });
    }

    const monthExpenses = expenses.filter(e => e.date.startsWith(month));
    const monthIncomes = incomes.filter(inc => inc.date.startsWith(month));

    const monthLimits: Record<string, number> = {};
    const monthTotalRemaining: Record<string, number> = {};
    const monthPrimaryShares: Record<string, number> = {};
    const monthAdditionalShares: Record<string, number> = {};

    categories.forEach(cat => {
      // 1. Primary Income Share: distributed using custom category percentages
      const primaryShare = monthIncomes
        .filter(inc => inc.type === 'primary' || inc.type === undefined)
        .reduce((sum, inc) => sum + (inc.amount * ((cat.percentage ?? 0) / 100)), 0);

      // 2. Additional Income Share: distributed equally among selected categories
      const additionalShare = monthIncomes
        .filter(inc => inc.type === 'additional')
        .reduce((sum, inc) => {
          if (inc.distributedTo) {
            const hasMatch = inc.distributedTo.includes(cat.id) || inc.distributedTo.includes(cat.name);
            if (hasMatch) {
              const denom = Math.max(1, inc.distributedTo.length);
              return sum + (inc.amount / denom);
            }
          }
          return sum;
        }, 0);

      const limit = primaryShare + additionalShare;
      monthLimits[cat.id] = limit;
      monthPrimaryShares[cat.id] = primaryShare;
      monthAdditionalShares[cat.id] = additionalShare;

      const catExpenses = monthExpenses
        .filter(e => e.categoryId === cat.id)
        .reduce((sum, e) => sum + e.amount, 0);

      const rollover = rollovers[month][cat.id] || 0;
      const remaining = limit - catExpenses;
      const totalRemaining = remaining + rollover;

      monthTotalRemaining[cat.id] = totalRemaining;
    });

    limits[month] = monthLimits;
    primaryShares[month] = monthPrimaryShares;
    additionalShares[month] = monthAdditionalShares;

    if (nextMonth) {
      rollovers[nextMonth] = {};
      categories.forEach(cat => {
        rollovers[nextMonth][cat.id] = monthTotalRemaining[cat.id] || 0;
      });
    }
  }

  return { rollovers, limits, primaryShares, additionalShares };
}

/**
 * Performs target calculation for all categories based on transaction tables and a selected target month.
 */
export function calculateCategoriesForMonth(
  categories: Category[],
  expenses: Expense[],
  incomes: AdditionalIncome[],
  targetMonth: string // e.g. "2026-06"
): CategoryWithCalculations[] {
  const { rollovers, limits, primaryShares, additionalShares } = calculateBalancesChronologically(categories, expenses, incomes, targetMonth);

  const targetExpenses = expenses.filter(e => e.date.startsWith(targetMonth));

  return categories.map(cat => {
    // 1. Текущие_Расходы: Sum of current month's expenses belong to this category
    const currentExpenses = targetExpenses
      .filter(e => e.categoryId === cat.id)
      .reduce((sum, e) => sum + e.amount, 0);

    // 2. Лимит и Допы_Текущие: Limit represents the share of total monthly income allocated to this category
    const monthlyLimit = primaryShares[targetMonth]?.[cat.id] ?? 0;
    const currentAdditional = additionalShares[targetMonth]?.[cat.id] ?? 0;

    // 3. Остаток: Лимит - Текущие_Расходы
    const remaining = (limits[targetMonth]?.[cat.id] ?? 0) - currentExpenses;

    // 4. Остаток, перенесённый с прошлого месяца
    const rolloverPreviousMonth = rollovers[targetMonth]?.[cat.id] ?? 0;

    // 5. Остаток_Всего: Остаток + Остаток_Прошлый_Месяц
    const totalRemaining = remaining + rolloverPreviousMonth;

    return {
      ...cat,
      monthlyLimit,
      rolloverPreviousMonth,
      currentExpenses,
      currentAdditional,
      remaining,
      totalRemaining
    };
  });
}

/**
 * Today's date in the device's own time zone (YYYY-MM-DD).
 * `toISOString()` is UTC, so around midnight it returns yesterday's date (and, on the 1st, last month).
 */
export function todayLocalISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Current calendar month in the device's own time zone (YYYY-MM). */
export function currentLocalMonth(): string {
  return todayLocalISO().substring(0, 7);
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * How much of a category's money is spent this month.
 * "Available" is everything the category can spend this month: the month's limit, additional income
 * and the balance carried over from previous months. Using only the month's limit breaks at the start
 * of a month: until income is entered the limit is 0 and any expense reads as 100%.
 */
export function getCategoryUsage(cat: CategoryWithCalculations): {
  available: number;
  pct: number;
  overspent: boolean;
} {
  const available = cat.monthlyLimit + cat.currentAdditional + cat.rolloverPreviousMonth;
  const overspent = cat.currentExpenses > 0 && cat.currentExpenses > available;
  let pct = 0;
  if (cat.currentExpenses > 0) {
    pct = available > 0 ? Math.min(100, (cat.currentExpenses / available) * 100) : 100;
  }
  return { available, pct, overspent };
}

/** Sum of primary income entered for a month (YYYY-MM). */
export function getPrimaryIncomeForMonth(incomes: AdditionalIncome[], month: string): number {
  return incomes
    .filter(inc => (inc.type === 'primary' || inc.type === undefined) && inc.date.startsWith(month))
    .reduce((sum, inc) => sum + inc.amount, 0);
}

export type IncomeBaseSource = 'month' | 'last' | 'planned' | 'none';

/**
 * Monthly income used to convert a category's amount to a share and back.
 * Order: primary income of the viewed month, else the latest month that has primary income,
 * else the income the user typed in earlier, else nothing.
 */
export function getIncomeBase(
  incomes: AdditionalIncome[],
  month: string,
  plannedIncome: number
): { amount: number; source: IncomeBaseSource; month?: string } {
  const forMonth = getPrimaryIncomeForMonth(incomes, month);
  if (forMonth > 0) {
    return { amount: roundMoney(forMonth), source: 'month', month };
  }

  const months = Array.from(
    new Set(
      incomes
        .filter(inc => (inc.type === 'primary' || inc.type === undefined) && inc.date.length >= 7)
        .map(inc => inc.date.substring(0, 7))
    )
  ).sort();
  for (let i = months.length - 1; i >= 0; i--) {
    const total = getPrimaryIncomeForMonth(incomes, months[i]);
    if (total > 0) {
      return { amount: roundMoney(total), source: 'last', month: months[i] };
    }
  }

  if (plannedIncome > 0) {
    return { amount: roundMoney(plannedIncome), source: 'planned' };
  }
  return { amount: 0, source: 'none' };
}

/** Parses user-typed numbers: "15 000,50" => 15000.5. Returns NaN for anything that is not a number. */
export function parseAmountInput(raw: string): number {
  const cleaned = raw.replace(/\s/g, '').replace(',', '.');
  if (cleaned === '') return NaN;
  return Number(cleaned);
}
