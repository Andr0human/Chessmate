"use client";

import { ANALYSIS_START_FEN } from "@/lib/constants";
import { connectSocket, socket } from "@/services";
import {
  AnalysisError,
  AnalysisResult,
  AnalysisUpdate,
  Move,
  Square,
} from "@/types";
import { MantineProvider } from "@mantine/core";
import { Chess } from "chess.js";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const AnalysisBoard = dynamic(() => import("@/components/AnalysisBoard"), {
  ssr: false,
});

// Session-scoped storage for the admin secret. Never baked into the bundle
// (no NEXT_PUBLIC_*); the user types it and the server validates each request.
const ADMIN_PASS_KEY = "chessmate_admin_pass";

// Max search depth the live analysis may reach. The engine streams `info` per
// completed depth up to this cap; deeper = slower but stronger. Mirrors the
// server's clamp (1..30).
// Upper bound tracks the engine's MAX_DEPTH (40, types.h); the server re-clamps
// to the same ceiling in chessEngine/socket.ts.
const DEPTH_OPTIONS = [15, 20, 25, 30, 35, 40] as const;
const DEFAULT_MAX_DEPTH = 20;

type ConnState = "idle" | "connecting" | "ready" | "error";

// One position in the analysis line: a FEN plus the move (for highlighting)
// that produced it. line[0].lastMove is null (the loaded/start position).
type PositionNode = { fen: string; lastMove: Move | null };

// Format a White-relative centipawn score for display.
const formatEval = (whiteCp: number): string => {
  const pawns = whiteCp / 100;
  return `${pawns >= 0 ? "+" : ""}${pawns.toFixed(2)}`;
};

// Convert a UCI long-algebraic PV (e.g. ["e2e4", "e7e5"]) to SAN by replaying it
// from `fen`. SAN conversion happens here, not on the server, because the
// chess-rules authority is client-side (chess.js). Stops at the first move that
// doesn't apply (defensive — the engine's PV is always legal from the position).
const lanPvToSan = (fen: string, pvLan: string[]): string[] => {
  const game = new Chess(fen);
  const san: string[] = [];
  for (const lan of pvLan) {
    try {
      const move = game.move({
        from: lan.slice(0, 2) as Square,
        to: lan.slice(2, 4) as Square,
        promotion: lan.length > 4 ? lan[4] : undefined,
      });
      san.push(move.san);
    } catch {
      break;
    }
  }
  return san;
};

// Compact nodes/sec for the analysis readout: 2_100_000 → "2.1M", 43_000 → "43k".
// Sub-1000 values render as-is. Used only when nps > 0 (a pre-nps engine build
// reports 0, in which case the caller hides the field).
const formatNps = (nps: number): string => {
  if (nps >= 1_000_000) return `${(nps / 1_000_000).toFixed(1)}M`;
  if (nps >= 1_000) return `${Math.round(nps / 1_000)}k`;
  return String(nps);
};

// Build the page's (SAN) AnalysisResult from a (LAN) streaming wire update.
const toResult = (data: AnalysisUpdate): AnalysisResult => {
  const pv = lanPvToSan(data.fen, data.pvLan ?? []);
  return {
    fen: data.fen,
    terminal: data.terminal,
    scoreCp: data.scoreCp,
    mate: data.mate,
    mateIn: data.mateIn,
    depth: data.depth,
    nodes: data.nodes,
    nps: data.nps,
    bestMove: pv[0] ?? null,
    pv,
  };
};

export default function AnalysisPage() {
  const router = useRouter();

  // --- Auth gate ---
  const [adminPass, setAdminPass] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [gateInput, setGateInput] = useState("");
  const [gateError, setGateError] = useState<string | null>(null);

  // --- Position state (this page owns the move line + a cursor into it) ---
  // `line` is the full sequence of positions (line[0] = loaded/start position,
  // each later entry the result of one move); `cursor` is the index currently
  // shown. ←/→ navigation just moves the cursor; making a new move truncates
  // any forward history and appends.
  const [line, setLine] = useState<PositionNode[]>([
    { fen: ANALYSIS_START_FEN, lastMove: null },
  ]);
  const [cursor, setCursor] = useState(0);
  const [boardFlipped, setBoardFlipped] = useState(false);

  const fen = line[cursor].fen;
  const lastMove = line[cursor].lastMove;

  const [fenInput, setFenInput] = useState("");
  const [fenError, setFenError] = useState<string | null>(null);

  // --- Analysis state ---
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [maxDepth, setMaxDepth] = useState<number>(DEFAULT_MAX_DEPTH);

  // --- Connection state ---
  const [connState, setConnState] = useState<ConnState>("idle");
  const [retryKey, setRetryKey] = useState(0);

  // Latest FEN, so the (once-registered) socket handler can drop stale results.
  const fenRef = useRef(fen);
  // Cursor/line refs let the move + keyboard handlers stay stable (no deps on
  // the changing position) while still reading the current value.
  const cursorRef = useRef(cursor);
  const lineRef = useRef(line);
  useEffect(() => {
    fenRef.current = fen;
    cursorRef.current = cursor;
    lineRef.current = line;
  }, [fen, cursor, line]);

  const goBack = useCallback(() => setCursor((c) => Math.max(0, c - 1)), []);
  const goForward = useCallback(
    () => setCursor((c) => Math.min(lineRef.current.length - 1, c + 1)),
    []
  );

  // Load any stored admin pass on mount.
  useEffect(() => {
    const stored = sessionStorage.getItem(ADMIN_PASS_KEY);
    if (stored) setAdminPass(stored);
    setAuthChecked(true);
  }, []);

  // Register analysis listeners once. The engine streams `analysis_progress` per
  // completed depth (update the displayed eval live, keep the "analyzing" pulse)
  // and a final `analysis_result` at the search's end (settle the pulse). Both
  // carry a LAN PV converted to SAN here, and both are dropped if the position
  // has already moved on (stale guard via fenRef).
  useEffect(() => {
    const onProgress = (data: AnalysisUpdate) => {
      if (data.fen !== fenRef.current) return; // stale — position moved on
      setResult(toResult(data));
      setAnalysisError(null);
    };

    const onResult = (data: AnalysisUpdate) => {
      if (data.fen !== fenRef.current) return; // stale — position moved on
      setResult(toResult(data));
      setAnalyzing(false);
      setAnalysisError(null);
    };

    const onError = (err: AnalysisError) => {
      setAnalyzing(false);
      if (err.unauthorized) {
        // Failed admin check — drop the bad pass and re-show the gate.
        sessionStorage.removeItem(ADMIN_PASS_KEY);
        setAdminPass(null);
        setResult(null);
        setGateError("Incorrect admin password.");
        return;
      }
      setAnalysisError(err.message || "Analysis failed");
    };

    socket.on("analysis_progress", onProgress);
    socket.on("analysis_result", onResult);
    socket.on("analysis_error", onError);
    return () => {
      socket.off("analysis_progress", onProgress);
      socket.off("analysis_result", onResult);
      socket.off("analysis_error", onError);
    };
  }, []);

  // Wake + connect the socket once authenticated (no server hit for visitors
  // who never enter the password). connState must track the *real* connection:
  // we flip to "ready" on the socket's own `connect` event, not merely when
  // connectSocket() resolves (which only means connect() was *called*).
  // Otherwise on a cold-started server the first auto-analyze races ahead of the
  // handshake — its `if (socket.connected)` emit guard sees `false`, silently
  // drops the request, and never retries, leaving the panel stuck on "analyzing…".
  useEffect(() => {
    if (!adminPass) return;

    let cancelled = false;
    setConnState("connecting");

    const onConnect = () => {
      if (!cancelled) setConnState("ready");
    };
    const onConnectError = () => {
      if (!cancelled) setConnState("error");
    };
    socket.on("connect", onConnect);
    socket.on("connect_error", onConnectError);

    (async () => {
      try {
        await connectSocket();
        // Warm socket (e.g. on retry): `connect` won't fire again, so settle here.
        if (!cancelled && socket.connected) setConnState("ready");
      } catch {
        if (!cancelled) setConnState("error");
      }
    })();

    return () => {
      cancelled = true;
      socket.off("connect", onConnect);
      socket.off("connect_error", onConnectError);
    };
  }, [adminPass, retryKey]);

  // Auto-analyze whenever the position changes (debounced, latest-wins).
  useEffect(() => {
    if (!adminPass || connState !== "ready") return;

    // No legal moves → checkmate/stalemate; skip the engine and show the
    // verdict directly (matches the server's terminal handling).
    const game = new Chess(fen);
    if (game.moves().length === 0) {
      setResult({
        fen,
        terminal: true,
        scoreCp: 0,
        mate: false,
        mateIn: null,
        depth: 0,
        nodes: 0,
        nps: 0,
        bestMove: null,
        pv: [],
      });
      setAnalyzing(false);
      setAnalysisError(null);
      return;
    }

    setAnalyzing(true);
    setAnalysisError(null);
    const id = setTimeout(() => {
      if (socket.connected) {
        socket.emit("request_analysis", { fen, adminPass, maxDepth });
      }
    }, 200);

    return () => clearTimeout(id);
  }, [fen, adminPass, connState, maxDepth]);

  // Keyboard navigation: ←/→ step through the move line. Ignored while typing
  // in an input (FEN box / gate) so arrow keys still move the text caret there.
  useEffect(() => {
    if (!adminPass) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goBack();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goForward();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [adminPass, goBack, goForward]);

  // --- Handlers ---
  const submitGate = () => {
    const value = gateInput.trim();
    if (!value) return;
    sessionStorage.setItem(ADMIN_PASS_KEY, value);
    setAdminPass(value);
    setGateInput("");
    setGateError(null);
  };

  const handleBoardMove = useCallback(
    (fenAfter: string, move: { from: Square; to: Square; san: string }) => {
      // A move from the displayed position drops any forward history.
      setLine((prev) => [
        ...prev.slice(0, cursorRef.current + 1),
        { fen: fenAfter, lastMove: { from: move.from, to: move.to } },
      ]);
      setCursor((c) => c + 1);
    },
    []
  );

  // Play one or more SAN moves from the displayed position (best move / PV
  // step), appending each as its own node so they're individually navigable.
  const playLine = useCallback((sanMoves: string[]) => {
    const game = new Chess(fenRef.current);
    const appended: PositionNode[] = [];
    for (const san of sanMoves) {
      try {
        const m = game.move(san);
        appended.push({
          fen: game.fen(),
          lastMove: { from: m.from as Square, to: m.to as Square },
        });
      } catch {
        break;
      }
    }
    if (appended.length > 0) {
      setLine((prev) => [...prev.slice(0, cursorRef.current + 1), ...appended]);
      setCursor((c) => c + appended.length);
    }
  }, []);

  const loadFen = () => {
    const value = fenInput.trim();
    if (!value) return;
    try {
      new Chess(value); // throws on invalid FEN
      setLine([{ fen: value, lastMove: null }]);
      setCursor(0);
      setFenError(null);
    } catch {
      setFenError("Invalid FEN.");
    }
  };

  const reset = () => {
    setLine([{ fen: ANALYSIS_START_FEN, lastMove: null }]);
    setCursor(0);
  };

  // --- Derived display values ---
  // The engine already prints White-relative scores (eval * (2*side-1) in
  // search.h), so scoreCp / mateIn are absolute (+ = White better) — use them
  // directly, no per-turn flip. `turn` is only needed for the terminal label.
  const turn = fen.split(" ")[1] === "b" ? "b" : "w";
  const whiteCp = result ? result.scoreCp : 0;
  const whiteMateIn = result ? result.mateIn : null;

  const evalText = result?.mate
    ? `${whiteMateIn !== null && whiteMateIn < 0 ? "-" : "+"}M${Math.abs(
        whiteMateIn ?? 0
      )}`
    : formatEval(whiteCp);

  // Eval bar fill (White advantage as a 0–100%).
  const barPercent = result?.mate
    ? (whiteMateIn ?? 0) > 0
      ? 100
      : 0
    : Math.max(0, Math.min(100, 50 + (Math.max(-8, Math.min(8, whiteCp / 100)) / 8) * 50));

  const terminalLabel = (() => {
    if (!result?.terminal) return null;
    const game = new Chess(fen);
    if (game.isCheckmate()) {
      return `Checkmate — ${turn === "w" ? "Black" : "White"} wins`;
    }
    return "Stalemate — draw";
  })();

  // --- Render: auth gate ---
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white">Loading…</p>
      </div>
    );
  }

  if (!adminPass) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="bg-gray-800 rounded-lg p-8 w-full max-w-sm flex flex-col gap-4">
          <h1 className="text-white text-2xl font-bold">Analysis (Admin)</h1>
          <p className="text-gray-400 text-sm">
            Analysis mode is restricted. Enter the admin password to continue.
          </p>
          <input
            type="password"
            className="px-3 py-2 rounded bg-white text-gray-900"
            placeholder="Admin password"
            value={gateInput}
            onChange={(e) => setGateInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitGate()}
            autoFocus
          />
          {gateError && <p className="text-red-400 text-sm">{gateError}</p>}
          <div className="flex gap-3">
            <button
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer disabled:opacity-50"
              onClick={submitGate}
              disabled={!gateInput.trim()}
            >
              Unlock
            </button>
            <button
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 cursor-pointer"
              onClick={() => router.push("/")}
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Render: analysis board + panel ---
  return (
    <MantineProvider>
      <div className="min-h-screen bg-gray-900 py-4 px-2 sm:py-6 sm:px-4">
        <div className="max-w-full xl:max-w-7xl mx-auto">
          <div className="flex flex-col xl:flex-row gap-6 justify-center">
            {/* Board + controls */}
            <div className="flex flex-col items-center gap-4">
              <AnalysisBoard
                fen={fen}
                boardFlipped={boardFlipped}
                lastMove={lastMove}
                onMove={handleBoardMove}
              />

              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 cursor-pointer"
                  onClick={() => setBoardFlipped((f) => !f)}
                >
                  Flip
                </button>
                <button
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 cursor-pointer disabled:opacity-50"
                  onClick={goBack}
                  disabled={cursor === 0}
                  title="Previous move (←)"
                  aria-label="Previous move"
                >
                  ←
                </button>
                <button
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 cursor-pointer disabled:opacity-50"
                  onClick={goForward}
                  disabled={cursor >= line.length - 1}
                  title="Next move (→)"
                  aria-label="Next move"
                >
                  →
                </button>
                <button
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 cursor-pointer"
                  onClick={reset}
                >
                  Reset
                </button>
                <button
                  className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 cursor-pointer"
                  onClick={() => router.push("/")}
                >
                  Menu
                </button>
              </div>

              <div className="flex w-full max-w-xl gap-2">
                <input
                  type="text"
                  className="flex-1 px-3 py-2 rounded bg-white text-gray-900 text-sm"
                  placeholder="Paste a FEN to load…"
                  value={fenInput}
                  onChange={(e) => setFenInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadFen()}
                />
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
                  onClick={loadFen}
                >
                  Load
                </button>
              </div>
              {fenError && <p className="text-red-400 text-sm">{fenError}</p>}
            </div>

            {/* Analysis panel */}
            <div className="bg-gray-800 rounded-lg p-5 w-full xl:w-80 flex flex-col gap-4 text-white">
              <h2 className="text-xl font-bold">Engine Analysis</h2>

              {connState === "connecting" && (
                <p className="text-gray-400 text-sm">
                  Waking server (this may take up to a minute)…
                </p>
              )}
              {connState === "error" && (
                <div className="flex flex-col gap-2">
                  <p className="text-red-400 text-sm">
                    Couldn&apos;t reach the server.
                  </p>
                  <button
                    className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer w-fit"
                    onClick={() => setRetryKey((k) => k + 1)}
                  >
                    Retry
                  </button>
                </div>
              )}

              {connState === "ready" && (
                <>
                  {/* Max search depth — re-runs the live analysis on change */}
                  <div className="flex items-center justify-between">
                    <label htmlFor="max-depth" className="text-sm text-gray-400">
                      Max depth
                    </label>
                    <select
                      id="max-depth"
                      value={maxDepth}
                      onChange={(e) => setMaxDepth(Number(e.target.value))}
                      className="bg-gray-700 text-white text-sm rounded px-2 py-1 cursor-pointer"
                    >
                      {DEPTH_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  {terminalLabel ? (
                    <p className="text-lg font-semibold text-amber-300">
                      {terminalLabel}
                    </p>
                  ) : (
                    <>
                      {/* Eval number + bar (White-relative) */}
                      <div className="flex items-center gap-3">
                        <span className="text-3xl font-mono font-bold">
                          {result ? evalText : "—"}
                        </span>
                        {analyzing && (
                          <span className="text-gray-400 text-sm animate-pulse">
                            analyzing…
                          </span>
                        )}
                      </div>
                      <div className="h-3 w-full rounded bg-gray-900 overflow-hidden border border-gray-600">
                        <div
                          className="h-full bg-gray-100 transition-all"
                          style={{ width: `${result ? barPercent : 50}%` }}
                        />
                      </div>

                      {/* Best move */}
                      {result?.bestMove && (
                        <div>
                          <p className="text-sm text-gray-400 mb-1">Best move</p>
                          <button
                            className="px-3 py-1.5 bg-emerald-700 text-white rounded font-mono hover:bg-emerald-600 cursor-pointer"
                            onClick={() => playLine([result.bestMove as string])}
                          >
                            {result.bestMove}
                          </button>
                        </div>
                      )}

                      {/* Depth / nodes / nps */}
                      {result && result.depth > 0 && (
                        <p className="text-sm text-gray-400">
                          Depth {result.depth} · {result.nodes.toLocaleString()}{" "}
                          nodes
                          {result.nps > 0 && ` · ${formatNps(result.nps)} nps`}
                        </p>
                      )}

                      {/* Principal variation — click a move to step to it */}
                      {result && result.pv.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-400 mb-1">
                            Principal variation
                          </p>
                          <div className="flex flex-wrap gap-1 font-mono text-sm">
                            {result.pv.map((san, i) => (
                              <button
                                key={`${san}-${i}`}
                                className="px-1.5 py-0.5 rounded hover:bg-gray-700 cursor-pointer"
                                onClick={() => playLine(result.pv.slice(0, i + 1))}
                              >
                                {san}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {analysisError && (
                        <p className="text-red-400 text-sm">{analysisError}</p>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </MantineProvider>
  );
}
