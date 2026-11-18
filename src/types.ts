export interface Category {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  monthlyLimit: number;
  rolloverPreviousMonth: number;
  percentage?: number;
}

export interface Expense {
  id: string;
  categoryId: string;
  amount: number;
  date: string; // ISO format (YYYY-MM-DD)
  description: string;
}

export interface AdditionalIncome {
  id: string;
  amount: number;
  date: string; // ISO format (YYYY-MM-DD)
  description: string;
  distributedTo: string[]; // Array of Category IDs
  type?: 'primary' | 'additional';
}

/**
 * One cashback category chosen in a bank.
 * Bank and category are stored by name, so rows typed into the sheet by hand still work.
 */
export interface CashbackEntry {
  id: string;
  bank: string;
  category: string;
  percent: number;
  /** Month the category is chosen for (YYYY-MM); empty string = every month */
  month: string;
  /** Card, limit or conditions, as the user wrote them */
  note?: string;
}

// Calculated virtual fields for UI
export interface CategoryWithCalculations extends Category {
  currentExpenses: number;
  currentAdditional: number;
  remaining: number;       // monthlyLimit - currentExpenses
  totalRemaining: number;  // remaining + currentAdditional + rolloverPreviousMonth
}
