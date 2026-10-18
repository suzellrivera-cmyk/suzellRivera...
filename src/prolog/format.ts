import { Term, VarTerm, Subst, Trail, TraceCollector } from './types';
import { walk, deepWalk, unify, undoTrail, copyTerm } from './unify';

export function formatTerm(term: Term, subst: Subst | null = null): string {
  const t = subst ? deepWalk(term, subst) : term;
  return formatTermInner(t);
}

function formatTermInner(t: Term): string {
  switch (t.tag) {
    case 'var':
      return `_${t.name}`;
    case 'atom':
      return t.name;
    case 'num':
      return String(t.value);
    case 'compound': {
      if (t.functor === '.' && t.args.length === 2) {
        return formatList(t);
      }
      if (t.functor === ',' && t.args.length === 2) {
        return `(${formatTermInner(t.args[0])}, ${formatTermInner(t.args[1])})`;
      }
      if (t.functor === ';' && t.args.length === 2) {
        return `(${formatTermInner(t.args[0])}; ${formatTermInner(t.args[1])})`;
      }
      if (t.functor === '->' && t.args.length === 2) {
        return `(${formatTermInner(t.args[0])} -> ${formatTermInner(t.args[1])})`;
      }
      const ops = ['+', '-', '*', '/', 'is', '=', '\\=', '==', '\\==', '<', '>', '=<', '>=', '=:=', '=/=', 'mod'];
      if (ops.includes(t.functor) && t.args.length === 2) {
        return `(${formatTermInner(t.args[0])} ${t.functor} ${formatTermInner(t.args[1])})`;
      }
      if (t.functor === '\\+' && t.args.length === 1) {
        return `\\+(${formatTermInner(t.args[0])})`;
      }
      return `${t.functor}(${t.args.map(formatTermInner).join(', ')})`;
    }
  }
}

function formatList(t: Term): string {
  const elements: string[] = [];
  let current: Term = t;
  while (current.tag === 'compound' && current.functor === '.' && current.args.length === 2) {
    elements.push(formatTermInner(current.args[0]));
    current = current.args[1];
  }
  if (current.tag === 'atom' && current.name === '[]') {
    return `[${elements.join(', ')}]`;
  }
  return `[${elements.join(', ')}|${formatTermInner(current)}]`;
}
