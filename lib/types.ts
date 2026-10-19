export type Portion = { person_id: string; amount: number };

export type Expense = {
  id: string;
  description: string;
  amount: number;
  category: string;
  created_by: string;
  created_at: string;
  receipt_key: string | null;
  receipt_url: string | null;
  lat: number | null;
  lng: number | null;
  place: string | null;
  payers: Portion[];
  shares: Portion[];
};

export type Settlement = {
  id: string;
  from_person: string;
  to_person: string;
  amount: number;
  note: string | null;
  /** What this payment was meant to clear; larger than `amount` for a part payment. */
  planned: number | null;
  created_at: string;
  lat: number | null;
  lng: number | null;
  place: string | null;
};

export type PlanRule = { id: string; from_person: string; to_person: string; created_by: string; created_at: string };

export type Ledger = { expenses: Expense[]; settlements: Settlement[]; rules: PlanRule[] };

export type NewExpense = {
  description: string;
  amount: number;
  category: string;
  created_by: string;
  receipt_key?: string | null;
  lat?: number | null;
  lng?: number | null;
  place?: string | null;
  payers: Portion[];
  shares: Portion[];
};
