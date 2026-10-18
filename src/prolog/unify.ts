import { Term, VarTerm, Subst, Trail } from './types';

export function walk(term: Term, subst: Subst): Term {
  let t = term;
  while (t.tag === 'var' && subst.has(t.id)) {
    t = subst.get(t.id)!;
  }
  return t;
}

export function deepWalk(term: Term, subst: Subst): Term {
  const t = walk(term, subst);
  if (t.tag === 'compound') {
    return {
      tag: 'compound',
      functor: t.functor,
      args: t.args.map((a) => deepWalk(a, subst)),
    };
  }
  return t;
}

export function occursCheck(varId: number, term: Term, subst: Subst): boolean {
  const t = walk(term, subst);
  if (t.tag === 'var') return t.id === varId;
  if (t.tag === 'compound') {
    return t.args.some((a) => occursCheck(varId, a, subst));
  }
  return false;
}

export function unify(a: Term, b: Term, subst: Subst, trail: Trail): boolean {
  const aWalked = walk(a, subst);
  const bWalked = walk(b, subst);

  if (aWalked.tag === 'var' && bWalked.tag === 'var' && aWalked.id === bWalked.id) {
    return true;
  }

  if (aWalked.tag === 'var') {
    if (occursCheck(aWalked.id, bWalked, subst)) return false;
    subst.set(aWalked.id, bWalked);
    trail.push(aWalked.id);
    return true;
  }

  if (bWalked.tag === 'var') {
    if (occursCheck(bWalked.id, aWalked, subst)) return false;
    subst.set(bWalked.id, aWalked);
    trail.push(bWalked.id);
    return true;
  }

  if (aWalked.tag === 'atom' && bWalked.tag === 'atom') {
    return aWalked.name === bWalked.name;
  }

  if (aWalked.tag === 'num' && bWalked.tag === 'num') {
    return aWalked.value === bWalked.value;
  }

  if (aWalked.tag === 'compound' && bWalked.tag === 'compound') {
    if (aWalked.functor !== bWalked.functor || aWalked.args.length !== bWalked.args.length) {
      return false;
    }
    for (let i = 0; i < aWalked.args.length; i++) {
      if (!unify(aWalked.args[i], bWalked.args[i], subst, trail)) {
        return false;
      }
    }
    return true;
  }

  return false;
}

export function undoTrail(trail: Trail, subst: Subst): void {
  while (trail.length > 0) {
    const id = trail.pop()!;
    subst.delete(id);
  }
}

export function copyTerm(term: Term, renaming: Map<number, VarTerm>): Term {
  switch (term.tag) {
    case 'var': {
      if (!renaming.has(term.id)) {
        renaming.set(term.id, { tag: 'var', id: term.id * 1000000 + Math.floor(Math.random() * 1000000), name: term.name });
      }
      return renaming.get(term.id)!;
    }
    case 'atom':
      return term;
    case 'num':
      return term;
    case 'compound':
      return {
        tag: 'compound',
        functor: term.functor,
        args: term.args.map((a) => copyTerm(a, renaming)),
      };
  }
}
