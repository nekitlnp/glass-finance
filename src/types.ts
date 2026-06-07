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

// Calculated virtual fields for UI
export interface CategoryWithCalculations extends Category {
  currentExpenses: number;
  currentAdditional: number;
  remaining: number;       // monthlyLimit - currentExpenses
  totalRemaining: number;  // remaining + currentAdditional + rolloverPreviousMonth
}
