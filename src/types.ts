export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: number;
  amount: number;
  category: string;
  description: string;
  type: TransactionType;
  date: string;
  createdAt: string;
}

export interface TransactionInput {
  amount: number;
  category: string;
  description: string;
  type: TransactionType;
  date: string;
}

export interface Category {
  id: number;
  name: string;
  type: TransactionType;
}
