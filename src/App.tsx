import { useState, useCallback, useRef, useEffect } from 'react';
import { Play, BookOpen, ChevronDown, ChevronRight, Terminal, Code2, Lightbulb, RotateCcw, CheckCircle2, XCircle, AlertTriangle, Sparkles, Copy, Check } from 'lucide-react';
import { runProlog, PrologResult, TraceStep } from './prolog';
import { Robot, RobotMood } from './components/Robot';

interface Example {
  title: string;
  description: string;
  code: string;
}

const EXAMPLES: Example[] = [
  {
    title: 'Avanzar',
    description: 'El robot avanza una posición',
    code: `accion(avanzar).

?- accion(avanzar).`,
  },
  {
    title: 'Girar',
    description: 'El robot gira a la izquierda o derecha',
    code: `accion(girar_izquierda).
accion(girar_derecha).

?- accion(girar_derecha).`,
  },
  {
    title: 'Secuencia de movimientos',
    description: 'El robot ejecuta una rutina de varios pasos',
    code: `paso(avanzar).
paso(girar_izquierda).
paso(avanzar).
paso(girar_derecha).
paso(retroceder).

rutina(P) :- paso(P).

?- rutina(P).`,
  },
  {
    title: 'Saltar obstaculo',
    description: 'El robot decide si saltar segun el obstaculo',
    code: `obstaculo(piedra).
obstaculo(roca).
obstaculo(hueco).

saltar(X) :- obstaculo(X).

?- saltar(piedra).`,
  },
  {
    title: 'Miembro de una lista',
    description: 'Verifica si un elemento pertenece a una lista',
    code: `miembro(X, [X|_]).
miembro(X, [_|T]) :- miembro(X, T).

?- miembro(b, [a,b,c]).`,
  },
  {
    title: 'Concatenación de listas',
    description: 'Relaciona dos listas con su concatenación',
    code: `concatenar([], L, L).
concatenar([X|T], L, [X|R]) :- concatenar(T, L, R).

?- concatenar([a,b], [c,d], R).`,
  },
  {
    title: 'Operaciones aritméticas',
    description: 'Uso de is y operadores aritméticos',
    code: `doble(X, Y) :- Y is X * 2.
factorial(0, 1).
factorial(N, R) :- N > 0, N1 is N - 1, factorial(N1, R1), R is N * R1.

?- doble(5, R).
?- factorial(5, R).`,
  },
  {
    title: 'Ancestro / descendiente',
    description: 'Recursividad con hechos y reglas',
    code: `padre(abraham, isaac).
padre(isaac, jacob).
padre(jacob, juda).

ancestro(X, Y) :- padre(X, Y).
ancestro(X, Y) :- padre(X, Z), ancestro(Z, Y).

?- ancestro(abraham, juda).
?- ancestro(abraham, X).`,
  },
];

type Tab = 'result' | 'trace' | 'robot';

function TraceTreeView({ steps }: { steps: TraceStep[] }) {
  return (
    <div className="font-mono text-sm space-y-0.5">
      {steps.length === 0 && (
        <p className="text-slate-500 italic px-3 py-2">No hay traza disponible.</p>
      )}
      {steps.map((step, i) => {
        const colors: Record<TraceStep['type'], string> = {
          call: 'text-sky-300',
          try: 'text-amber-300',
          success: 'text-emerald-300',
          fail: 'text-rose-300',
          info: 'text-slate-400',
        };
        const icons: Record<TraceStep['type'], string> = {
          call: '→',
          try: '?',
          success: '✓',
          fail: '✗',
          info: '·',
        };
        return (
          <div
            key={i}
            className={`flex items-start gap-2 px-2 py-0.5 rounded hover:bg-white/5 ${colors[step.type]}`}
            style={{ paddingLeft: `${step.depth * 20 + 8}px` }}
          >
            <span className="select-none opacity-70 mt-0.5">{icons[step.type]}</span>
            <span className="break-all">{step.message}</span>
          </div>
        );
      })}
    </div>
  );
}

const MOVIMIENTOS = ['avanzar', 'girar_izquierda', 'girar_derecha', 'retroceder', 'saltar'] as const;
type Movimiento = (typeof MOVIMIENTOS)[number];

function detectarMovimientos(result: PrologResult | null): Movimiento[] {
  if (!result || result.error) return [];
  const movs: Movimiento[] = [];
  const revisar = (texto: string) => {
    const lower = texto.toLowerCase();
    MOVIMIENTOS.forEach((m) => {
      if (lower.includes(m)) {
        movs.push(m);
      }
    });
  };
  if (result.answer) revisar(result.answer);
  result.solutions.forEach((sol) => {
    sol.forEach((v, k) => {
      revisar(k);
      revisar(v);
    });
  });
  return movs;
}

function App() {
  const [input, setInput] = useState<string>(EXAMPLES[0].code);
  const [result, setResult] = useState<PrologResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('result');
  const [allSolutions, setAllSolutions] = useState(false);
  const [showExamples, setShowExamples] = useState(true);
  const [copied, setCopied] = useState(false);
  const [robotMood, setRobotMood] = useState<RobotMood>('idle');
  const [robotSeq, setRobotSeq] = useState<Movimiento[]>([]);
  const traceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result && tab === 'trace' && traceRef.current) {
      traceRef.current.scrollTop = 0;
    }
  }, [tab, result]);

  useEffect(() => {
    if (result) {
      const movs = detectarMovimientos(result);
      setRobotSeq(movs);
      if (result.error) {
        setRobotMood('error');
      } else if (movs.length > 0) {
        setRobotMood('happy');
      } else if (result.success) {
        setRobotMood('happy');
      } else {
        setRobotMood('sad');
      }
      setTimeout(() => setRobotMood('idle'), 3000);
    }
  }, [result]);

  const handleRun = useCallback(() => {
    setLoading(true);
    setTab('robot');
    setRobotMood('thinking');
    setRobotSeq([]);
    setTimeout(() => {
      const res = runProlog(input, { allSolutions });
      setResult(res);
      setLoading(false);
    }, 800);
  }, [input, allSolutions]);

  const handleExample = (ex: Example) => {
    setInput(ex.code);
    setResult(null);
    setRobotMood('idle');
    setRobotSeq([]);
  };

  const handleCopyResult = () => {
    if (!result) return;
    const text = `Esta es la respuesta: ${result.answer}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Background gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-[700px] h-[700px] bg-sky-900/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 w-[600px] h-[600px] bg-teal-900/15 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-slate-800/80 backdrop-blur-md bg-slate-950/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">
                Prolog<span className="text-sky-400">IA</span>
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">Intérprete de Prolog con explicación paso a paso</p>
            </div>
          </div>
          <a
            href="https://es.wikipedia.org/wiki/Prolog"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-400 hover:text-sky-400 transition-colors hidden sm:flex items-center gap-1.5"
          >
            <BookOpen className="w-4 h-4" />
            ¿Qué es Prolog?
          </a>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-col gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
          {/* Left: Input */}
          <div className="flex flex-col gap-4">
            {/* Examples */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
              <button
                onClick={() => setShowExamples(!showExamples)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/50 transition-colors"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  Ejemplos
                </span>
                {showExamples ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
              </button>
              {showExamples && (
                <div className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex.title}
                      onClick={() => handleExample(ex)}
                      className="text-left p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-800 hover:border-sky-700/50 transition-all group"
                    >
                      <p className="text-sm font-medium text-slate-200 group-hover:text-sky-300 transition-colors">{ex.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{ex.description}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Code input */}
            <div className="flex flex-col flex-1 rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-900/80">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <Code2 className="w-4 h-4 text-sky-400" />
                  Código Prolog + Consulta
                </span>
                <button
                  onClick={() => { setInput(''); setResult(null); setRobotMood('idle'); setRobotSeq([]); }}
                  className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Limpiar
                </button>
              </div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleRun();
                  }
                }}
                spellCheck={false}
                className="flex-1 min-h-[280px] lg:min-h-0 w-full bg-transparent p-4 font-mono text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none"
                placeholder="Escribe tu código Prolog aquí..."
              />
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 bg-slate-900/80 gap-3">
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allSolutions}
                    onChange={(e) => setAllSolutions(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500/30"
                  />
                  Buscar todas las soluciones
                </label>
                <button
                  onClick={handleRun}
                  disabled={loading || !input.trim()}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 text-white text-sm font-medium shadow-lg shadow-sky-500/20 hover:shadow-sky-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:hover:scale-100 disabled:shadow-none"
                >
                  <Play className="w-4 h-4" />
                  Ejecutar
                </button>
              </div>
            </div>
          </div>

          {/* Right: Output */}
          <div className="flex flex-col gap-4">
            {/* Tabs */}
            <div className="flex flex-col flex-1 rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
              <div className="flex items-center gap-1 px-2 py-2 border-b border-slate-800 bg-slate-900/80">
                {([
                  { id: 'robot' as Tab, label: 'Robot', icon: Sparkles },
                  { id: 'result' as Tab, label: 'Respuesta', icon: CheckCircle2 },
                  { id: 'trace' as Tab, label: 'Traza', icon: Terminal },
                ]).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      tab === t.id
                        ? 'bg-slate-800 text-sky-300'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <t.icon className="w-4 h-4" />
                    {t.label}
                  </button>
                ))}
                {result && tab !== 'robot' && (
                  <button
                    onClick={handleCopyResult}
                    className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto p-4 min-h-[300px] lg:min-h-0">
                {/* Robot tab */}
                {tab === 'robot' && (
                  <div className="h-full flex flex-col items-center justify-center gap-6 py-4">
                    <div className="robot-arena">
                      <Robot mood={loading ? 'thinking' : robotMood} />
                    </div>
                    {robotSeq.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-2 max-w-sm">
                        {robotSeq.map((m, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 rounded-lg bg-sky-900/40 border border-sky-700/40 text-xs text-sky-200 font-mono animate-pop"
                            style={{ animationDelay: `${i * 200}ms` }}
                          >
                            {m.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                    {!loading && !result && (
                      <p className="text-slate-500 text-sm text-center">
                        Presiona <span className="text-sky-400 font-medium">Ejecutar</span> para ver al robot moverse.
                      </p>
                    )}
                    {loading && (
                      <p className="text-sky-300 text-sm animate-pulse">El robot está procesando...</p>
                    )}
                  </div>
                )}

                {!loading && !result && tab !== 'robot' && (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12">
                    <div className="w-16 h-16 rounded-2xl bg-slate-800/60 flex items-center justify-center mb-4">
                      <Terminal className="w-8 h-8 text-slate-600" />
                    </div>
                    <p className="text-slate-500 text-sm">Presiona <span className="text-sky-400 font-medium">Ejecutar</span> para ver el resultado</p>
                    <p className="text-slate-600 text-xs mt-1">o usa Ctrl+Enter</p>
                  </div>
                )}

                {loading && tab !== 'robot' && (
                  <div className="h-full flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
                  </div>
                )}

                {!loading && result && tab === 'result' && (
                  <div className="space-y-4">
                    {/* Result banner */}
                    {result.error ? (
                      <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-950/40 border border-rose-800/50">
                        <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-rose-300">Error</p>
                          <p className="text-sm text-rose-400/80 mt-1 font-mono">{result.error}</p>
                        </div>
                      </div>
                    ) : result.success ? (
                      <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/50">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-emerald-300">Esta es la respuesta:</p>
                          <p className="text-sm text-emerald-100 mt-1 font-mono break-all">
                            {result.answer}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
                        <XCircle className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-slate-300">Esta es la respuesta:</p>
                          <p className="text-sm text-slate-400 mt-1 font-mono">false.</p>
                        </div>
                      </div>
                    )}

                    {/* Solutions detail */}
                    {result.solutions.length > 0 && !result.error && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                          {result.solutions.length > 1 ? `${result.solutions.length} soluciones` : 'Variables ligadas'}
                        </p>
                        {result.solutions.map((sol, i) => (
                          <div key={i} className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                            {sol.size === 0 ? (
                              <p className="text-sm text-slate-400 font-mono">true.</p>
                            ) : (
                              <div className="space-y-1.5">
                                {Array.from(sol.entries()).map(([k, v]) => (
                                  <div key={k} className="flex items-center gap-2 text-sm font-mono">
                                    <span className="text-sky-400">{k}</span>
                                    <span className="text-slate-500">=</span>
                                    <span className="text-emerald-300 break-all">{v}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {!loading && result && tab === 'trace' && (
                  <div ref={traceRef} className="space-y-1">
                    <p className="text-xs text-slate-500 mb-3 px-2">
                      Traza de la resolución SLD paso a paso ({result.trace.length} pasos):
                    </p>
                    <TraceTreeView steps={result.trace} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs text-slate-600">
            Intérprete de Prolog — Hechos, reglas, listas, aritmética, negación, disyunción y corte
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
