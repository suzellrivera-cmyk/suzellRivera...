export interface VarTerm {
  tag: 'var';
  id: number;
  name: string;
}

export interface AtomTerm {
  tag: 'atom';
  name: string;
}

export interface NumTerm {
  tag: 'num';
  value: number;
}

export interface CompoundTerm {
  tag: 'compound';
  functor: string;
  args: Term[];
}

export type Term = VarTerm | AtomTerm | NumTerm | CompoundTerm;

export interface Clause {
  head: Term;
  body: Term | null;
}

export interface Program {
  clauses: Clause[];
  query: Term;
}

export type Subst = Map<number, Term>;
export type Trail = number[];

export interface Token {
  type: 'atom' | 'var' | 'num' | 'symbol' | 'lparen' | 'rparen' | 'lbracket' | 'rbracket' | 'comma' | 'bar' | 'dot';
  value: string;
  pos: number;
}

export interface TraceStep {
  depth: number;
  message: string;
  type: 'call' | 'try' | 'success' | 'fail' | 'info';
}

export interface PrologResult {
  success: boolean;
  answer: string;
  solutions: Map<string, string>[];
  trace: TraceStep[];
  error?: string;
}

export class TraceCollector {
  steps: TraceStep[] = [];

  add(depth: number, message: string, type: TraceStep['type'] = 'info') {
    this.steps.push({ depth, message, type });
  }
}

let varCounter = 0;

export function resetVarCounter(): void {
  varCounter = 0;
}

export function freshVar(name: string): VarTerm {
  return { tag: 'var', id: ++varCounter, name };
}

export function getVarCounter(): number {
  return varCounter;
}
