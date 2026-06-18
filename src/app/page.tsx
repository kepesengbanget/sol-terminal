"use client";
import { useState } from "react";

// ponytail: single page component, no routing, no state management library

type Tab = "feed" | "rugcheck" | "wallet";

export default function Home() {
  const [tab, setTab] = useState<Tab>("feed");

  return (
    <div className="min-h-screen p-4 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#1a1a2e] pb-3 mb-4">
        <h1 className="text-[var(--green)] text-lg font-bold tracking-wider">
          ◆ SOL TERMINAL
        </h1>
        <nav className="flex gap-1">
          {(["feed", "rugcheck", "wallet"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 text-xs uppercase tracking-wider border ${
                tab === t
                  ? "border-[var(--green)] text-[var(--green)] bg-[#0d1a0d]"
                  : "border-[var(--border)] text-[var(--dim)] hover:text-[var(--fg)]"
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      </header>

      {/* Content */}
      {tab === "feed" && <TokenFeed onNavigate={setTab} />}
      {tab === "rugcheck" && <RugChecker />}
      {tab === "wallet" && <WalletTracker />}
    </div>
  );
}

// ── Token Feed ──────────────────────────────────────────────

function TokenFeed({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const [tokens, setTokens] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    const r = await fetch(`/api/tokens?q=${encodeURIComponent(query)}`);
    const d = await r.json();
    setTokens(d);
    setLoading(false);
  };

  const loadNew = async () => {
    setLoading(true);
    const r = await fetch("/api/tokens?new=1");
    const d = await r.json();
    setTokens(d);
    setLoading(false);
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Search token or paste CA..."
          className="flex-1 px-3 py-2 rounded"
        />
        <button
          onClick={search}
          className="px-4 py-2 bg-[var(--green)] text-black font-bold rounded text-xs"
        >
          SEARCH
        </button>
        <button
          onClick={loadNew}
          className="px-4 py-2 border border-[var(--green)] text-[var(--green)] rounded text-xs"
        >
          NEW PAIRS
        </button>
      </div>

      {loading && <p className="text-[var(--dim)]">Loading...</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[var(--dim)] border-b border-[var(--border)]">
              <th className="text-left p-2">TOKEN</th>
              <th className="text-right p-2">PRICE</th>
              <th className="text-right p-2">24H VOL</th>
              <th className="text-right p-2">LIQ</th>
              <th className="text-right p-2">MCAP</th>
              <th className="text-right p-2">24H %</th>
              <th className="text-right p-2">BUYS</th>
              <th className="text-right p-2">SELLS</th>
              <th className="text-right p-2">AGE</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((t, i) => (
              <tr
                key={i}
                className="border-b border-[var(--border)] hover:bg-[#0d0d15] cursor-pointer"
                onClick={() => {
                  setQuery(t.baseToken?.address || "");
                  onNavigate("rugcheck");
                }}
              >
                <td className="p-2">
                  <span className="text-[var(--green)] font-bold">
                    {t.baseToken?.symbol}
                  </span>
                  <span className="text-[var(--dim)] ml-2">
                    {t.baseToken?.name}
                  </span>
                </td>
                <td className="text-right p-2">
                  ${parseFloat(t.priceUsd || "0").toFixed(6)}
                </td>
                <td className="text-right p-2">
                  ${formatNum(t.volume?.h24)}
                </td>
                <td className="text-right p-2">
                  ${formatNum(t.liquidity?.usd)}
                </td>
                <td className="text-right p-2">${formatNum(t.fdv)}</td>
                <td
                  className={`text-right p-2 ${
                    (t.priceChange?.h24 || 0) >= 0
                      ? "text-[var(--green)]"
                      : "text-[var(--red)]"
                  }`}
                >
                  {(t.priceChange?.h24 || 0).toFixed(1)}%
                </td>
                <td className="text-right p-2 text-[var(--green)]">
                  {t.txns?.h24?.buys || 0}
                </td>
                <td className="text-right p-2 text-[var(--red)]">
                  {t.txns?.h24?.sells || 0}
                </td>
                <td className="text-right p-2 text-[var(--dim)]">
                  {formatAge(t.pairCreatedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Rug Checker ─────────────────────────────────────────────

function RugChecker() {
  const [address, setAddress] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const check = async () => {
    if (!address.trim()) return;
    setLoading(true);
    const r = await fetch(`/api/rugcheck?address=${address}`);
    const d = await r.json();
    setResult(d);
    setLoading(false);
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && check()}
          placeholder="Paste token mint address..."
          className="flex-1 px-3 py-2 rounded"
        />
        <button
          onClick={check}
          className="px-4 py-2 bg-[var(--green)] text-black font-bold rounded text-xs"
        >
          CHECK
        </button>
      </div>

      {loading && <p className="text-[var(--dim)]">Scanning...</p>}

      {result && (
        <div className="border border-[var(--border)] rounded p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg text-[var(--green)] font-bold">
                {result.symbol} — {result.name}
              </h2>
              <p className="text-[var(--dim)] text-xs">{result.address}</p>
            </div>
            <div
              className={`text-3xl font-bold ${
                result.score >= 70
                  ? "text-[var(--green)]"
                  : result.score >= 40
                  ? "text-[var(--yellow)]"
                  : "text-[var(--red)]"
              }`}
            >
              {result.score}/100
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-[var(--dim)] text-xs mb-2">RISKS</h3>
            {result.risks.map((r: string, i: number) => (
              <p key={i} className="text-sm mb-1">
                {r}
              </p>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-[var(--dim)]">MINT AUTHORITY</p>
              <p
                className={
                  result.mintAuthority
                    ? "text-[var(--red)]"
                    : "text-[var(--green)]"
                }
              >
                {result.mintAuthority || "None ✅"}
              </p>
            </div>
            <div>
              <p className="text-[var(--dim)]">FREEZE AUTHORITY</p>
              <p
                className={
                  result.freezeAuthority
                    ? "text-[var(--red)]"
                    : "text-[var(--green)]"
                }
              >
                {result.freezeAuthority || "None ✅"}
              </p>
            </div>
          </div>

          {result.topHolders?.length > 0 && (
            <div className="mt-4">
              <h3 className="text-[var(--dim)] text-xs mb-2">TOP HOLDERS</h3>
              {result.topHolders.map((h: any, i: number) => (
                <div
                  key={i}
                  className="flex justify-between text-xs mb-1 font-mono"
                >
                  <span className="text-[var(--dim)]">
                    {h.address.slice(0, 4)}...{h.address.slice(-4)}
                  </span>
                  <span
                    className={
                      h.pct > 10 ? "text-[var(--red)]" : "text-[var(--fg)]"
                    }
                  >
                    {h.pct.toLocaleString()} tokens
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Wallet Tracker ──────────────────────────────────────────

function WalletTracker() {
  const [address, setAddress] = useState("");
  const [txs, setTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const track = async () => {
    if (!address.trim()) return;
    setLoading(true);
    const r = await fetch(`/api/wallet?address=${address}`);
    const d = await r.json();
    setTxs(d);
    setLoading(false);
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && track()}
          placeholder="Paste wallet address..."
          className="flex-1 px-3 py-2 rounded"
        />
        <button
          onClick={track}
          className="px-4 py-2 bg-[var(--green)] text-black font-bold rounded text-xs"
        >
          TRACK
        </button>
      </div>

      {loading && <p className="text-[var(--dim)]">Loading...</p>}

      {txs.length > 0 && (
        <div>
          <p className="text-[var(--dim)] text-xs mb-2">
            Last {txs.length} transactions
          </p>
          {txs.map((tx, i) => (
            <div
              key={i}
              className="border-b border-[var(--border)] py-2 flex justify-between items-center"
            >
              <div>
                <a
                  href={`https://solscan.io/tx/${tx.signature}`}
                  target="_blank"
                  className="text-[var(--blue)] hover:underline font-mono text-xs"
                >
                  {tx.signature.slice(0, 16)}...
                </a>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-[var(--dim)]">
                  slot {tx.slot.toLocaleString()}
                </span>
                <span
                  className={
                    tx.type === "success"
                      ? "text-[var(--green)]"
                      : "text-[var(--red)]"
                  }
                >
                  {tx.type}
                </span>
                <span className="text-[var(--dim)]">
                  {tx.timestamp
                    ? new Date(tx.timestamp * 1000).toLocaleString()
                    : "—"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────

function formatNum(n: number | undefined): string {
  if (!n) return "0";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(0);
}

function formatAge(ts: number): string {
  if (!ts) return "—";
  const hours = (Date.now() - ts) / 3600000;
  if (hours < 1) return Math.floor(hours * 60) + "m";
  if (hours < 24) return Math.floor(hours) + "h";
  return Math.floor(hours / 24) + "d";
}
