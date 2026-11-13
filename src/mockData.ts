import { Category, Expense, AdditionalIncome } from './types';
import { currentLocalMonth } from './utils/finance';

export const INITIAL_CATEGORIES: Category[] = [];
export const INITIAL_EXPENSES: Expense[] = [];
export const INITIAL_INCOMES: AdditionalIncome[] = [];

export const STORAGE_KEYS = {
  CATEGORIES: 'glass_finance_categories_v3',
  EXPENSES: 'glass_finance_expenses_v3',
  INCOMES: 'glass_finance_incomes_v3',
  CURRENT_MONTH: 'glass_finance_current_month_v3'
};

export function loadState() {
  try {
    const categoriesStr = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    const expensesStr = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    const incomesStr = localStorage.getItem(STORAGE_KEYS.INCOMES);
    const currentMonthStr = localStorage.getItem(STORAGE_KEYS.CURRENT_MONTH);

    const defaultMonth = currentLocalMonth();

    return {
      categories: categoriesStr ? JSON.parse(categoriesStr) : INITIAL_CATEGORIES,
      expenses: expensesStr ? JSON.parse(expensesStr) : INITIAL_EXPENSES,
      incomes: incomesStr ? JSON.parse(incomesStr) : INITIAL_INCOMES,
      currentMonth: currentMonthStr || defaultMonth
    };
  } catch (e) {
    console.error('Failed to read from localStorage:', e);
    const defaultMonth = currentLocalMonth();
    return {
      categories: INITIAL_CATEGORIES,
      expenses: INITIAL_EXPENSES,
      incomes: INITIAL_INCOMES,
      currentMonth: defaultMonth
    };
  }
}

export function saveState(state: {
  categories: Category[];
  expenses: Expense[];
  incomes: AdditionalIncome[];
  currentMonth: string;
}) {
  try {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(state.categories));
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(state.expenses));
    localStorage.setItem(STORAGE_KEYS.INCOMES, JSON.stringify(state.incomes));
    localStorage.setItem(STORAGE_KEYS.CURRENT_MONTH, state.currentMonth);
  } catch (e) {
    console.error('Failed to write to localStorage:', e);
  }
}
