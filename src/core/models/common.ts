export interface CalcResult {
  value: number;
  trace: CalculationTrace;
}

export interface CalculationTrace {
  formula: string;
  inputs: Record<string, unknown>;
  ruleId: string;
  description: string;
}

export interface ValidationWarning {
  id: string;
  severity: 'error' | 'warning' | 'info';
  ruleId: string;
  message: string;
  suggestion?: string;
  affectedPartIds?: string[];
  catalogVerified?: boolean;
}

export interface Photo {
  id: string;
  url: string;
  caption?: string;
}
