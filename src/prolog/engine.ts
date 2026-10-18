import {
  Term, VarTerm, Clause, Subst, Trail, TraceCollector,
  PrologResult, freshVar, resetVarCounter,
} from './types';
import { walk, deepWalk, unify, undoTrail, copyTerm } from './unify';
import { formatTerm } from './format';

const MAX_DEPTH = 200;
const MAX_SOLUTIONS = 10;

interface EngineOpts {
  trace: TraceCollector;
  allSolutions: boolean;
}

function renameClause(clause: Clause): Clause {
  const renaming = new Map<number, VarTerm>();
  return {
    head: copyTerm(clause.head, renaming),
    body: clause.body ? copyTerm(clause.body, renaming) : null,
  };
}

export function evaluateArith(term: Term, subst: Subst): number {
  const t = walk(term, subst);
  switch (t.tag) {
    case 'num':
      return t.value;
    case 'atom':
      if (t.name === 'pi') return Math.PI;
      if (t.name === 'e') return Math.E;
      throw new Error(`No se puede evaluar aritméticamente el átomo: ${t.name}`);
    case 'compound': {
      const args = t.args.map((a) => evaluateArith(a, subst));
      switch (t.functor) {
        case '+': return args[0] + args[1];
        case '-': return args[0] - args[1];
        case '*': return args[0] * args[1];
        case '/':
          if (args[1] === 0) throw new Error('División por cero');
          return args[0] / args[1];
        case 'mod':
          if (args[1] === 0) throw new Error('Módulo por cero');
          return args[0] % args[1];
        case 'abs': return Math.abs(args[0]);
        case 'max': return Math.max(args[0], args[1]);
        case 'min': return Math.min(args[0], args[1]);
        default:
          throw new Error(`Operación aritmética desconocida: ${t.functor}`);
      }
    }
    case 'var':
      throw new Error(`Variable no ligada en expresión aritmética: _${t.name}`);
  }
}

class CutException extends Error {
  constructor() {
    super('cut');
    this.name = 'CutException';
  }
}

class Engine {
  clauses: Clause[];
  subst: Subst = new Map();
  trail: Trail = [];
  trace: TraceCollector;
  allSolutions: boolean;
  solutions: Map<string, string>[] = [];
  depth = 0;
  queryVars: Map<number, string> = new Map();

  constructor(clauses: Clause[], query: Term, opts: EngineOpts) {
    this.clauses = clauses;
    this.trace = opts.trace;
    this.allSolutions = opts.allSolutions;
    this.collectQueryVars(query);
  }

  collectQueryVars(term: Term): void {
    const t = walk(term, this.subst);
    if (t.tag === 'var') {
      if (!this.queryVars.has(t.id)) {
        this.queryVars.set(t.id, t.name);
      }
    } else if (t.tag === 'compound') {
      t.args.forEach((a) => this.collectQueryVars(a));
    }
  }

  *solve(goal: Term): Generator<void> {
    if (this.depth > MAX_DEPTH) {
      this.trace.add(this.depth, 'Profundidad máxima alcanzada', 'fail');
      return;
    }

    const t = walk(goal, this.subst);

    if (t.tag === 'atom' && t.name === 'true') {
      yield;
      return;
    }

    if (t.tag === 'atom' && t.name === 'fail') {
      this.trace.add(this.depth, `fail`, 'fail');
      return;
    }

    if (t.tag === 'atom' && t.name === '!') {
      this.trace.add(this.depth, `! (corte)`, 'info');
      throw new CutException();
    }

    // Conjunction
    if (t.tag === 'compound' && t.functor === ',' && t.args.length === 2) {
      for (const _ of this.solve(t.args[0])) {
        for (const __ of this.solve(t.args[1])) {
          yield;
        }
      }
      return;
    }

    // Disjunction
    if (t.tag === 'compound' && t.functor === ';' && t.args.length === 2) {
      this.trace.add(this.depth, `; (disyunción): probando primera alternativa`, 'try');
      for (const _ of this.solve(t.args[0])) {
        yield;
      }
      this.trace.add(this.depth, `; probando segunda alternativa`, 'try');
      for (const _ of this.solve(t.args[1])) {
        yield;
      }
      return;
    }

    // If-then-else
    if (t.tag === 'compound' && t.functor === '->' && t.args.length === 2) {
      this.trace.add(this.depth, `-> (si-entonces): evaluando condición`, 'try');
      let succeeded = false;
      for (const _ of this.solve(t.args[0])) {
        succeeded = true;
        yield;
        break; // commit: only first solution
      }
      if (!succeeded) {
        this.trace.add(this.depth, `-> condición falló`, 'fail');
      }
      return;
    }

    // Negation as failure: \+
    if (t.tag === 'compound' && t.functor === '\\+' && t.args.length === 1) {
      this.trace.add(this.depth, `\\+ (negación por fallo): ${formatTerm(t.args[0], this.subst)}`, 'try');
      const mark = this.trail.length;
      let found = false;
      try {
        for (const _ of this.solve(t.args[0])) {
          found = true;
          break;
        }
      } catch (e) {
        if (e instanceof CutException) {
          found = true;
        } else {
          throw e;
        }
      }
      undoTrail(this.trail.slice(mark), this.subst);
      this.trail.length = mark;
      if (!found) {
        this.trace.add(this.depth, `\\+ éxito: el objetivo no es demostrable`, 'success');
        yield;
      } else {
        this.trace.add(this.depth, `\\+ fallo: el objetivo sí es demostrable`, 'fail');
      }
      return;
    }

    // Arithmetic: is
    if (t.tag === 'compound' && t.functor === 'is' && t.args.length === 2) {
      const left = walk(t.args[0], this.subst);
      this.trace.add(this.depth, `is: evaluando ${formatTerm(t.args[1], this.subst)}`, 'call');
      try {
        const result = evaluateArith(t.args[1], this.subst);
        const resultTerm = { tag: 'num' as const, value: result };
        if (unify(left, resultTerm, this.subst, this.trail)) {
          this.trace.add(this.depth, `is: ${formatTerm(left)} = ${result}`, 'success');
          yield;
        } else {
          this.trace.add(this.depth, `is: no se pudo unificar ${formatTerm(left, this.subst)} con ${result}`, 'fail');
        }
      } catch (e) {
        this.trace.add(this.depth, `is error: ${(e as Error).message}`, 'fail');
      }
      return;
    }

    // Unification: =
    if (t.tag === 'compound' && t.functor === '=' && t.args.length === 2) {
      this.trace.add(this.depth, `=: ${formatTerm(t.args[0], this.subst)} = ${formatTerm(t.args[1], this.subst)}`, 'call');
      const mark = this.trail.length;
      if (unify(t.args[0], t.args[1], this.subst, this.trail)) {
        this.trace.add(this.depth, `= exitoso`, 'success');
        yield;
      } else {
        undoTrail(this.trail.slice(mark), this.subst);
        this.trail.length = mark;
        this.trace.add(this.depth, `= fallo: no unifican`, 'fail');
      }
      return;
    }

    // Not-unifiable: \=
    if (t.tag === 'compound' && t.functor === '\\=' && t.args.length === 2) {
      this.trace.add(this.depth, `\\=: ${formatTerm(t.args[0], this.subst)} vs ${formatTerm(t.args[1], this.subst)}`, 'try');
      const mark = this.trail.length;
      const canUnify = unify(t.args[0], t.args[1], this.subst, this.trail);
      undoTrail(this.trail.slice(mark), this.subst);
      this.trail.length = mark;
      if (!canUnify) {
        this.trace.add(this.depth, `\\= éxito: no unifican`, 'success');
        yield;
      } else {
        this.trace.add(this.depth, `\\= fallo: sí unifican`, 'fail');
      }
      return;
    }

    // Term equality: ==
    if (t.tag === 'compound' && t.functor === '==' && t.args.length === 2) {
      const equal = termEqual(walk(t.args[0], this.subst), walk(t.args[1], this.subst));
      this.trace.add(this.depth, `==: ${equal ? 'iguales' : 'diferentes'}`, equal ? 'success' : 'fail');
      if (equal) yield;
      return;
    }

    // Term inequality: \==
    if (t.tag === 'compound' && t.functor === '\\==' && t.args.length === 2) {
      const equal = termEqual(walk(t.args[0], this.subst), walk(t.args[1], this.subst));
      this.trace.add(this.depth, `\\==: ${!equal ? 'diferentes' : 'iguales'}`, !equal ? 'success' : 'fail');
      if (!equal) yield;
      return;
    }

    // Arithmetic comparison
    if (t.tag === 'compound' && ['>=', '=<', '>', '<', '=:=', '=/='].includes(t.functor) && t.args.length === 2) {
      try {
        const a = evaluateArith(t.args[0], this.subst);
        const b = evaluateArith(t.args[1], this.subst);
        let result = false;
        switch (t.functor) {
          case '>=': result = a >= b; break;
          case '=<': result = a <= b; break;
          case '>': result = a > b; break;
          case '<': result = a < b; break;
          case '=:=': result = a === b; break;
          case '=/=': result = a !== b; break;
        }
        this.trace.add(this.depth, `${t.functor}: ${a} ${t.functor} ${b} → ${result}`, result ? 'success' : 'fail');
        if (result) yield;
      } catch (e) {
        this.trace.add(this.depth, `Error de comparación: ${(e as Error).message}`, 'fail');
      }
      return;
    }

    // Built-in: length/2 (basic support)
    // General user-defined predicate
    if (t.tag === 'atom' || t.tag === 'compound') {
      const functor = t.tag === 'atom' ? t.name : t.functor;
      const args = t.tag === 'atom' ? [] : t.args;
      const arity = args.length;
      const key = `${functor}/${arity}`;

      const matchingClauses = this.clauses.filter((c) => {
        const h = c.head;
        if (h.tag === 'atom') return h.name === functor && arity === 0;
        if (h.tag === 'compound') return h.functor === functor && h.args.length === arity;
        return false;
      });

      if (matchingClauses.length === 0) {
        this.trace.add(this.depth, `${key}: predicado no definido`, 'fail');
        return;
      }

      this.trace.add(this.depth, `Call: ${formatTerm(t, this.subst)}`, 'call');

      let clauseIdx = 0;
      for (const clause of matchingClauses) {
        const idx = clauseIdx++;
        const renamed = renameClause(clause);
        const mark = this.trail.length;

        const headArgs = renamed.head.tag === 'compound' ? renamed.head.args : [];
        this.trace.add(this.depth + 1, `Probando cláusula ${idx + 1}: ${formatTerm(renamed.head)}`, 'try');

        if (unify(t, renamed.head, this.subst, this.trail)) {
          if (renamed.body === null) {
            this.trace.add(this.depth + 1, `La cláusula ${idx + 1} unifica: ${formatTerm(renamed.head)} es un hecho`, 'success');
            yield;
          } else {
            this.trace.add(this.depth + 1, `La cláusula ${idx + 1} unifica: ${formatTerm(renamed.head)} :- ${formatTerm(renamed.body)}`, 'success');
            try {
              this.depth++;
              for (const _ of this.solve(renamed.body)) {
                this.depth--;
                yield;
                this.depth++;
              }
              this.depth--;
            } catch (e) {
              this.depth--;
              if (e instanceof CutException) {
                this.trace.add(this.depth + 1, `Corte (!): se detiene la búsqueda de alternativas para ${key}`, 'info');
                yield;
                return;
              }
              throw e;
            }
          }
        } else {
          this.trace.add(this.depth + 1, `La cláusula ${idx + 1} no unifica con ${formatTerm(t, this.subst)}`, 'fail');
        }

        undoTrail(this.trail.slice(mark), this.subst);
        this.trail.length = mark;
      }

      this.trace.add(this.depth, `${key}: sin más cláusulas`, 'fail');
      return;
    }

    if (t.tag === 'var') {
      this.trace.add(this.depth, `Variable no ligada como objetivo: _${t.name}`, 'fail');
      return;
    }
  }

  run(query: Term): PrologResult {
    resetVarCounter();
    this.trace.steps = [];
    const solutions: Map<string, string>[] = [];
    let firstSuccess = false;

    try {
      for (const _ of this.solve(query)) {
        firstSuccess = true;
        const sol = new Map<string, string>();
        for (const [varId, varName] of this.queryVars) {
          const val = formatTerm({ tag: 'var', id: varId, name: varName }, this.subst);
          if (val !== `_${varName}`) {
            sol.set(varName, val);
          }
        }
        solutions.push(sol);
        if (!this.allSolutions || solutions.length >= MAX_SOLUTIONS) break;
      }
    } catch (e) {
      if (e instanceof CutException) {
        // top-level cut, just proceed
      } else {
        return {
          success: false,
          answer: 'Error',
          solutions: [],
          trace: this.trace.steps,
          error: (e as Error).message,
        };
      }
    }

    const success = solutions.length > 0;

    let answer: string;
    if (success) {
      if (solutions[0].size === 0) {
        answer = 'true.';
      } else if (this.allSolutions && solutions.length > 1) {
        answer = solutions
          .map((s, i) => {
            const bindings = Array.from(s.entries()).map(([k, v]) => `${k} = ${v}`).join(', ');
            return bindings || 'true';
          })
          .join(' ;\n');
      } else {
        answer = Array.from(solutions[0].entries())
          .map(([k, v]) => `${k} = ${v}`)
          .join(', ');
        if (answer === '') answer = 'true.';
      }
    } else {
      answer = 'false.';
    }

    return {
      success,
      answer,
      solutions,
      trace: this.trace.steps,
    };
  }
}

function termEqual(a: Term, b: Term): boolean {
  if (a.tag !== b.tag) return false;
  switch (a.tag) {
    case 'var':
      return (b as any).tag === 'var' && a.id === (b as any).id;
    case 'atom':
      return a.name === (b as any).name;
    case 'num':
      return a.value === (b as any).value;
    case 'compound':
      return a.functor === (b as any).functor && a.args.length === (b as any).args.length &&
        a.args.every((arg, i) => termEqual(arg, (b as any).args[i]));
  }
}

export function runQuery(clauses: Clause[], query: Term, allSolutions: boolean): PrologResult {
  const trace = new TraceCollector();
  const engine = new Engine(clauses, query, { trace, allSolutions });
  return engine.run(query);
}
