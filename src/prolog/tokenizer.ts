import { Token } from './types';

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  const src = source;

  function isWhitespace(c: string): boolean {
    return c === ' ' || c === '\t' || c === '\n' || c === '\r';
  }

  function isDigit(c: string): boolean {
    return c >= '0' && c <= '9';
  }

  function isAlpha(c: string): boolean {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
  }

  function isAlphaNum(c: string): boolean {
    return isAlpha(c) || isDigit(c);
  }

  function isSymbolChar(c: string): boolean {
    return "+-*/\\^<>=`~:.?@#&".includes(c);
  }

  while (pos < src.length) {
    const c = src[pos];

    if (isWhitespace(c)) {
      pos++;
      continue;
    }

    if (c === '%') {
      // line comment
      while (pos < src.length && src[pos] !== '\n') pos++;
      continue;
    }

    if (c === '/' && src[pos + 1] === '*') {
      // block comment
      pos += 2;
      while (pos < src.length && !(src[pos] === '*' && src[pos + 1] === '/')) pos++;
      pos += 2;
      continue;
    }

    if (c === '(') { tokens.push({ type: 'lparen', value: '(', pos }); pos++; continue; }
    if (c === ')') { tokens.push({ type: 'rparen', value: ')', pos }); pos++; continue; }
    if (c === '[') { tokens.push({ type: 'lbracket', value: '[', pos }); pos++; continue; }
    if (c === ']') { tokens.push({ type: 'rbracket', value: ']', pos }); pos++; continue; }
    if (c === ',') { tokens.push({ type: 'comma', value: ',', pos }); pos++; continue; }
    if (c === '!') { tokens.push({ type: 'atom', value: '!', pos }); pos++; continue; }

    if (c === '|') { tokens.push({ type: 'bar', value: '|', pos }); pos++; continue; }

    if (c === '.' && !isDigit(src[pos + 1])) {
      tokens.push({ type: 'dot', value: '.', pos });
      pos++;
      continue;
    }

    if (isDigit(c) || (c === '-' && isDigit(src[pos + 1]))) {
      let num = '';
      const startPos = pos;
      if (c === '-') {
        num += '-';
        pos++;
      }
      while (pos < src.length && isDigit(src[pos])) {
        num += src[pos];
        pos++;
      }
      if (src[pos] === '.' && isDigit(src[pos + 1])) {
        num += '.';
        pos++;
        while (pos < src.length && isDigit(src[pos])) {
          num += src[pos];
          pos++;
        }
      }
      // optional exponent
      if (src[pos] === 'e' || src[pos] === 'E') {
        num += src[pos];
        pos++;
        if (src[pos] === '+' || src[pos] === '-') {
          num += src[pos];
          pos++;
        }
        while (pos < src.length && isDigit(src[pos])) {
          num += src[pos];
          pos++;
        }
      }
      tokens.push({ type: 'num', value: num, pos: startPos });
      continue;
    }

    if (isAlpha(c)) {
      let word = '';
      const startPos = pos;
      while (pos < src.length && isAlphaNum(src[pos])) {
        word += src[pos];
        pos++;
      }
      // quoted atom
      if (c >= 'A' && c <= 'Z' || c === '_') {
        tokens.push({ type: 'var', value: word, pos: startPos });
      } else {
        tokens.push({ type: 'atom', value: word, pos: startPos });
      }
      continue;
    }

    if (c === "'") {
      let str = '';
      const startPos = pos;
      pos++;
      while (pos < src.length && src[pos] !== "'") {
        if (src[pos] === '\\') {
          pos++;
          str += src[pos];
        } else {
          str += src[pos];
        }
        pos++;
      }
      pos++;
      tokens.push({ type: 'atom', value: str, pos: startPos });
      continue;
    }

    if (isSymbolChar(c)) {
      let sym = '';
      const startPos = pos;
      while (pos < src.length && isSymbolChar(src[pos])) {
        sym += src[pos];
        pos++;
      }
      // symbol starting with lowercase letter is part of atom already handled
      // but symbols like :-, ?-, =, \=, is, etc.
      if (sym === '?-') {
        tokens.push({ type: 'symbol', value: '?-', pos: startPos });
      } else if (sym === ':-') {
        tokens.push({ type: 'symbol', value: ':-', pos: startPos });
      } else if (sym === '\\=') {
        tokens.push({ type: 'symbol', value: '\\=', pos: startPos });
      } else if (sym === '=<') {
        tokens.push({ type: 'symbol', value: '=<', pos: startPos });
      } else if (sym === 'is') {
        tokens.push({ type: 'symbol', value: 'is', pos: startPos });
      } else if (sym === '=') {
        tokens.push({ type: 'symbol', value: '=', pos: startPos });
      } else if (sym === '\\==') {
        tokens.push({ type: 'symbol', value: '\\==', pos: startPos });
      } else if (sym === '==') {
        tokens.push({ type: 'symbol', value: '==', pos: startPos });
      } else if (sym === '>=') {
        tokens.push({ type: 'symbol', value: '>=', pos: startPos });
      } else if (sym === '>/') {
        tokens.push({ type: 'symbol', value: '>/…', pos: startPos });
      } else if (sym === '>/') {
        tokens.push({ type: 'symbol', value: '>/', pos: startPos });
      } else if (sym === '<') {
        tokens.push({ type: 'symbol', value: '<', pos: startPos });
      } else if (sym === '>') {
        tokens.push({ type: 'symbol', value: '>', pos: startPos });
      } else if (sym === '=:=') {
        tokens.push({ type: 'symbol', value: '=:=', pos: startPos });
      } else if (sym === '=/=') {
        tokens.push({ type: 'symbol', value: '=/=', pos: startPos });
      } else if (sym === '->') {
        tokens.push({ type: 'symbol', value: '->', pos: startPos });
      } else if (sym === ';') {
        tokens.push({ type: 'symbol', value: ';', pos: startPos });
      } else if (sym === '!') {
        tokens.push({ type: 'atom', value: '!', pos: startPos });
      } else {
        // treat other symbol sequences as atoms (e.g. +, -, *, /)
        tokens.push({ type: 'atom', value: sym, pos: startPos });
      }
      continue;
    }

    if (c === ';') { tokens.push({ type: 'symbol', value: ';', pos }); pos++; continue; }

    throw new Error(`Token inesperado: '${c}' en posición ${pos}`);
  }

  return tokens;
}
