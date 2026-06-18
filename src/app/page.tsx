"use client";
import { useState, useEffect } from "react";

type Tab = "feed" | "rugcheck" | "wallet";
type SortKey = "created_timestamp" | "usd_market_cap" | "reply_count";

export default function Home() {
  const [tab, setTab] = useState<Tab>("feed");

  return (
    <div className="min-h-screen p-4 max-w-7xl mx-auto">
      <header className="flex items-center justify-between border-b border-[#1a1a2e] pb-3 mb-4">
        <h1 className="text-[var(--green)] text-lg font-bold tracking-wider">
          ◆ PUMP TERMINAL
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

      {tab === "feed" && <TokenFeed onNavigate={setTab} />}
      {tab === "rugcheck" && <RugChecker />}
      {tab === "wallet" && <WalletTracker />}
    </div>
  );
}

// ── Creator Popup ───────────────────────────────────────────

function CreatorPopup({
  creator,
  onClose,
}: {
  creator: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/creator?address=${creator}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [creator]);

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-[#0d0d15] border border-[var(--border)] rounded-lg p-4 max-w-lg w-full max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-[var(--green)] font-bold text-sm">
            CREATOR DEPLOYMENTS
          </h3>
          <button onClick={onClose} className="text-[var(--dim)] hover:text-[var(--fg)]">
            ✕
          </button>
        </div>

        {loading && <p className="text-[var(--dim)]">Loading...</p>}

        {data && (
          <>
            <div className="flex gap-4 mb-3 text-xs">
              <div>
                <p className="text-[var(--dim)]">WALLET</p>
                <p className="font-mono text-[11px]">{creator.slice(0, 8)}...{creator.slice(-6)}</p>
              </div>
              <div>
                <p className="text-[var(--dim)]">TOTAL DEPLOYED</p>
                <p className="text-[var(--green)] font-bold text-lg">{data.totalCoins}</p>
              </div>
              <div>
                <p className="text-[var(--dim)]">GRADUATED</p>
                <p className="text-[var(--blue)] font-bold text-lg">
                  {data.coins.filter((c: any) => c.complete).length}
                </p>
              </div>
            </div>

            <div className="border-t border-[var(--border)] pt-2">
              {data.coins.map((c: any, i: number) => (
                <div
                  key={i}
                  className="flex justify-between items-center py-1 text-xs border-b border-[var(--border)]"
                >
                  <div>
                    <span className="text-[var(--green)] font-bold">{c.symbol}</span>
                    <span className="text-[var(--dim)] ml-2">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>${formatNum(c.usd_market_cap)}</span>
                    {c.complete ? (
                      <span className="text-[var(--blue)] text-[10px] px-1 border border-[var(--blue)] rounded">
                        RAY
                      </span>
                    ) : (
                      <span className="text-[var(--yellow)] text-[10px] px-1 border border-[var(--yellow)] rounded">
                        BOND
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Token Feed (pump.fun) ───────────────────────────────────

function TokenFeed({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const [tokens, setTokens] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<SortKey>("created_timestamp");
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null);
  const [copiedMint, setCopiedMint] = useState<string | null>(null);

  const load = async (q?: string) => {
    setLoading(true);
    const params = q ? `?q=${encodeURIComponent(q)}` : `?sort=${sort}`;
    const r = await fetch(`/api/tokens${params}`);
    setTokens(await r.json());
    setLoading(false);
  };

  useEffect(() => {
    load();
    // Auto-refresh setiap 30 detik
    const interval = setInterval(() => load(), 30_000);
    return () => clearInterval(interval);
  }, [sort]);

  return (
    <div>
      {selectedCreator && (
        <CreatorPopup
          creator={selectedCreator}
          onClose={() => setSelectedCreator(null)}
        />
      )}

      <div className="flex gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(query)}
          placeholder="Search pump.fun token..."
          className="flex-1 px-3 py-2 rounded"
        />
        <button
          onClick={() => load(query)}
          className="px-4 py-2 bg-[var(--green)] text-black font-bold rounded text-xs"
        >
          SEARCH
        </button>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="px-3 py-2 rounded bg-[#0d0d15] border border-[var(--border)] text-[var(--fg)] text-xs"
        >
          <option value="created_timestamp">NEWEST</option>
          <option value="usd_market_cap">MARKET CAP</option>
          <option value="reply_count">ACTIVITY</option>
        </select>
      </div>

      {loading && <p className="text-[var(--dim)]">Loading...</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[var(--dim)] border-b border-[var(--border)]">
              <th className="text-left p-2">TOKEN</th>
              <th className="text-left p-2">CREATOR</th>
              <th className="text-right p-2">DEPLOYED</th>
              <th className="text-right p-2">MCAP</th>
              <th className="text-right p-2">SOL RESERVE</th>
              <th className="text-center p-2">STATUS</th>
              <th className="text-right p-2">REPLIES</th>
              <th className="text-right p-2">AGE</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((t, i) => (
              <tr
                key={i}
                className="border-b border-[var(--border)] hover:bg-[#0d0d15] cursor-pointer"
                onClick={() => {
                  setQuery(t.mint);
                  onNavigate("rugcheck");
                }}
              >
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    {t.image_uri && (
                      <img
                        src={t.image_uri}
                        alt=""
                        className="w-6 h-6 rounded-full"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                    )}
                    <div>
                      <span className="text-[var(--green)] font-bold">{t.symbol}</span>
                      <button
                        className="ml-1 text-[var(--dim)] hover:text-[var(--green)] text-[10px] align-middle relative"
                        title="Copy CA"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(t.mint);
                          setCopiedMint(t.mint);
                          setTimeout(() => setCopiedMint(null), 1500);
                        }}
                      >
                        📋
                        {copiedMint === t.mint && (
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[var(--green)] text-black text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
                            Copied!
                          </span>
                        )}
                      </button>
                      <span className="text-[var(--dim)] ml-2 text-[11px]">{t.name}</span>
                    </div>
                  </div>
                </td>
                <td
                  className="p-2 text-[var(--blue)] font-mono text-[11px] hover:underline cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCreator(t.creator);
                  }}
                >
                  {t.username || t.creator?.slice(0, 6) + "..."}
                </td>
                <td className="text-right p-2 text-[var(--dim)]">
                  {(t as any).deployedCount || "—"}
                </td>
                <td className="text-right p-2">${formatNum(t.usd_market_cap)}</td>
                <td className="text-right p-2">
                  {(t.real_sol_reserves / 1e9).toFixed(2)} SOL
                </td>
                <td className="text-center p-2">
                  {t.is_banned ? (
                    <span className="text-red-500 text-[10px] px-2 py-0.5 border border-red-500 rounded">
                      BANNED
                    </span>
                  ) : t.nsfw ? (
                    <span className="text-purple-400 text-[10px] px-2 py-0.5 border border-purple-400 rounded">
                      NSFW
                    </span>
                  ) : t.complete ? (
                    <span className="text-[var(--blue)] text-[10px] px-2 py-0.5 border border-[var(--blue)] rounded">
                      RAYDIUM
                    </span>
                  ) : (
                    <span className="text-[var(--yellow)] text-[10px] px-2 py-0.5 border border-[var(--yellow)] rounded">
                      BONDING
                    </span>
                  )}
                </td>
                <td className="text-right p-2 text-[var(--dim)]">{t.reply_count}</td>
                <td className="text-right p-2 text-[var(--dim)]">
                  {formatAge(t.created_timestamp)}
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
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null);

  const check = async () => {
    if (!address.trim()) return;
    setLoading(true);
    const r = await fetch(`/api/rugcheck?address=${address}`);
    setResult(await r.json());
    setLoading(false);
  };

  return (
    <div>
      {selectedCreator && (
        <CreatorPopup
          creator={selectedCreator}
          onClose={() => setSelectedCreator(null)}
        />
      )}

      <div className="flex gap-2 mb-4">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && check()}
          placeholder="Paste pump.fun mint address..."
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
              <p className="text-[var(--dim)] text-xs font-mono">{result.address}</p>
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
            {result.risks.map((r: string, i: number) => (
              <p key={i} className="text-sm mb-1">{r}</p>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-[var(--dim)]">MINT AUTHORITY</p>
              <p className={result.mintAuthority ? "text-[var(--red)]" : "text-[var(--green)]"}>
                {result.mintAuthority || "None ✅"}
              </p>
            </div>
            <div>
              <p className="text-[var(--dim)]">FREEZE AUTHORITY</p>
              <p className={result.freezeAuthority ? "text-[var(--red)]" : "text-[var(--green)]"}>
                {result.freezeAuthority || "None ✅"}
              </p>
            </div>
          </div>

          {result.topHolders?.length > 0 && (
            <div className="mt-4">
              <h3 className="text-[var(--dim)] text-xs mb-2">TOP HOLDERS</h3>
              {result.topHolders.map((h: any, i: number) => (
                <div key={i} className="flex justify-between text-xs mb-1 font-mono">
                  <span className="text-[var(--dim)]">
                    {h.address.slice(0, 4)}...{h.address.slice(-4)}
                  </span>
                  <span className={h.pct > 10 ? "text-[var(--red)]" : "text-[var(--fg)]"}>
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
    setTxs(await r.json());
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
          <p className="text-[var(--dim)] text-xs mb-2">Last {txs.length} transactions</p>
          {txs.map((tx, i) => (
            <div
              key={i}
              className="border-b border-[var(--border)] py-2 flex justify-between items-center"
            >
              <a
                href={`https://solscan.io/tx/${tx.signature}`}
                target="_blank"
                className="text-[var(--blue)] hover:underline font-mono text-xs"
              >
                {tx.signature.slice(0, 16)}...
              </a>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-[var(--dim)]">slot {tx.slot.toLocaleString()}</span>
                <span className={tx.type === "success" ? "text-[var(--green)]" : "text-[var(--red)]"}>
                  {tx.type}
                </span>
                <span className="text-[var(--dim)]">
                  {tx.timestamp ? new Date(tx.timestamp * 1000).toLocaleString() : "—"}
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
  const ms = Date.now() - ts;
  const mins = ms / 60000;
  if (mins < 60) return Math.floor(mins) + "m";
  const hours = mins / 60;
  if (hours < 24) return Math.floor(hours) + "h";
  return Math.floor(hours / 24) + "d";
}
