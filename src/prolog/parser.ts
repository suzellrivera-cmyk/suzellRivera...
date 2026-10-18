import { Token, Term, Clause, Program, freshVar, resetVarCounter, VarTerm } from './types';
import { tokenize } from './tokenizer';

const OP_PRECEDENCE: Record<string, number> = {
  ':-': 1200,
  '?-': 1200,
  ';': 1100,
  '->': 1050,
  ',': 1000,
  '\\=': 700,
  '=': 700,
  '==': 700,
  '\\==': 700,
  '=<': 700,
  '<': 700,
  '>': 700,
  '>=': 700,
  '=:=': 700,
  '=/=': 700,
  'is': 700,
  '+': 500,
  '-': 500,
  '*': 400,
  '/': 400,
  'mod': 400,
};

function opType(op: string): 'xfx' | 'xfy' | 'yfx' {
  switch (op) {
    case ':-':
    case '?-':
    case '\\=':
    case '=':
    case '==':
    case '\\==':
    case '=<':
    case '<':
    case '>':
    case '>=':
    case '=:=':
    case '=/=':
    case 'is':
      return 'xfx';
    case ',':
    case ';':
    case '->':
      return 'xfy';
    case '+':
    case '-':
    case '*':
    case '/':
    case 'mod':
      return 'yfx';
    default:
      return 'xfx';
  }
}

function isOperatorToken(t: Token): boolean {
  if (t.type === 'comma') return true;
  if (t.type === 'symbol' && OP_PRECEDENCE[t.value] !== undefined) return true;
  if (t.type === 'atom' && OP_PRECEDENCE[t.value] !== undefined) return true;
  return false;
}

function getOpValue(t: Token): string {
  if (t.type === 'comma') return ',';
  return t.value;
}

class ParserState {
  tokens: Token[];
  pos = 0;
  varNames: Map<string, number> = new Map();

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  peek(): Token | null {
    return this.pos < this.tokens.length ? this.tokens[this.pos] : null;
  }

  advance(): Token | null {
    return this.tokens[this.pos++] ?? null;
  }

  expect(type: Token['type'], value?: string): Token {
    const t = this.peek();
    if (!t || t.type !== type || (value !== undefined && t.value !== value)) {
      throw new Error(
        `Error de sintaxis: se esperaba ${value ?? type} pero se encontró '${t?.value ?? 'fin de entrada'}'`
      );
    }
    return this.advance()!;
  }

  getVar(name: string): Term {
    if (name === '_') {
      return freshVar('_');
    }
    if (this.varNames.has(name)) {
      return { tag: 'var', id: this.varNames.get(name)!, name };
    }
    const v = freshVar(name);
    this.varNames.set(name, v.id);
    return v;
  }

  parseProgram(): { clauses: Clause[]; query: Term | null } {
    const clauses: Clause[] = [];
    let query: Term | null = null;

    while (this.peek()) {
      const t = this.peek()!;
      if (t.type === 'symbol' && t.value === '?-') {
        this.advance();
        const body = this.parseTerm(1200);
        this.expect('dot');
        query = body;
      } else {
        this.varNames.clear();
        const head = this.parseTerm(1200);
        let body: Term | null = null;
        if (this.peek()?.type === 'symbol' && this.peek()!.value === ':-') {
          this.advance();
          body = this.parseTerm(1200);
        }
        this.expect('dot');
        clauses.push({ head, body });
      }
    }

    return { clauses, query };
  }

  parseTerm(maxPrec: number): Term {
    return this.parseBinary(maxPrec);
  }

  parseBinary(maxPrec: number): Term {
    let left = this.parseUnary();

    while (this.peek()) {
      const t = this.peek()!;

      if (!isOperatorToken(t)) break;

      const opVal = getOpValue(t);
      const prec = OP_PRECEDENCE[opVal];
      if (prec === undefined || prec > maxPrec) break;

      // Don't treat :- or ?- as binary operators here (they're handled at program level)
      if (opVal === ':-' || opVal === '?-') break;

      const type = opType(opVal);
      this.advance();

      let rightMaxPrec: number;
      if (type === 'xfx') rightMaxPrec = prec - 1;
      else if (type === 'xfy') rightMaxPrec = prec;
      else rightMaxPrec = prec - 1;

      const right = this.parseTerm(rightMaxPrec);

      left = { tag: 'compound', functor: opVal, args: [left, right] };
    }

    return left;
  }

  parseUnary(): Term {
    const t = this.peek();
    if (t) {
      // \+ prefix operator (negation as failure)
      if ((t.type === 'atom' || t.type === 'symbol') && t.value === '\\+') {
        this.advance();
        const arg = this.parseTerm(200);
        return { tag: 'compound', functor: '\\+', args: [arg] };
      }
      // - prefix for negative numbers
      if (t.type === 'atom' && t.value === '-' && this.peek()?.type === 'num') {
        this.advance();
        const numTok = this.advance()!;
        return { tag: 'num', value: -parseFloat(numTok.value) };
      }
    }
    return this.parsePrimary();
  }

  parsePrimary(): Term {
    const t = this.peek();
    if (!t) throw new Error('Error de sintaxis: entrada inesperada');

    if (t.type === 'lparen') {
      this.advance();
      const term = this.parseTerm(1200);
      this.expect('rparen');
      return term;
    }

    if (t.type === 'lbracket') {
      return this.parseList();
    }

    if (t.type === 'num') {
      this.advance();
      return { tag: 'num', value: parseFloat(t.value) };
    }

    if (t.type === 'var') {
      this.advance();
      return this.getVar(t.value);
    }

    if (t.type === 'atom') {
      this.advance();
      // Check for compound: functor(args)
      if (this.peek()?.type === 'lparen') {
        this.advance();
        const args: Term[] = [this.parseTerm(1200)];
        while (this.peek()?.type === 'comma') {
          this.advance();
          args.push(this.parseTerm(1200));
        }
        this.expect('rparen');
        return { tag: 'compound', functor: t.value, args };
      }
      return { tag: 'atom', name: t.value };
    }

    throw new Error(`Error de sintaxis: token inesperado '${t.value}'`);
  }

  parseList(): Term {
    this.expect('lbracket');
    if (this.peek()?.type === 'rbracket') {
      this.advance();
      return { tag: 'atom', name: '[]' };
    }

    const elements: Term[] = [this.parseTerm(999)];
    while (this.peek()?.type === 'comma') {
      this.advance();
      elements.push(this.parseTerm(999));
    }

    let tail: Term = { tag: 'atom', name: '[]' };
    if (this.peek()?.type === 'bar') {
      this.advance();
      tail = this.parseTerm(999);
    }
    this.expect('rbracket');

    let result = tail;
    for (let i = elements.length - 1; i >= 0; i--) {
      result = { tag: 'compound', functor: '.', args: [elements[i], result] };
    }
    return result;
  }
}

export function parseProgram(source: string): Program {
  resetVarCounter();
  const tokens = tokenize(source);
  const parser = new ParserState(tokens);
  const { clauses, query } = parser.parseProgram();

  if (!query) {
    throw new Error('No se encontró consulta (?- ...).');
  }

  return { clauses, query };
}
