import { PrologResult, TraceCollector, Clause, Term } from './types';
import { parseProgram } from './parser';
import { runQuery } from './engine';
import { formatTerm } from './format';

export interface RunOptions {
  allSolutions?: boolean;
}

export function runProlog(source: string, options: RunOptions = {}): PrologResult {
  try {
    const program = parseProgram(source);
    return runQuery(program.clauses, program.query, options.allSolutions ?? false);
  } catch (e) {
    const trace = new TraceCollector();
    return {
      success: false,
      answer: 'Error de análisis',
      solutions: [],
      trace: trace.steps,
      error: (e as Error).message,
    };
  }
}

export function parseOnly(source: string): { clauses: { head: string; body: string | null }[]; query: string } {
  const program = parseProgram(source);
  return {
    clauses: program.clauses.map((c) => ({
      head: formatTerm(c.head, null),
      body: c.body ? formatTerm(c.body, null) : null,
    })),
    query: formatTerm(program.query, null),
  };
}

export type { PrologResult, TraceStep } from './types';
