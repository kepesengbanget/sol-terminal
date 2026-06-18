// ponytail: single file for all external API calls, no abstraction layers

const DEXSCREENER = "https://api.dexscreener.com/latest/dex";
const SOLANA_RPC = "https://api.mainnet-beta.solana.com";

export type TokenProfile = {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { symbol: string };
  priceUsd: string;
  volume: { h24: number };
  priceChange: { h1: number; h24: number };
  liquidity: { usd: number };
  fdv: number;
  pairCreatedAt: number;
  txns: { h24: { buys: number; sells: number } };
};

export async function searchTokens(query: string): Promise<TokenProfile[]> {
  const r = await fetch(`${DEXSCREENER}/search?q=${encodeURIComponent(query)}`);
  const d = await r.json();
  return d.pairs?.slice(0, 20) || [];
}

export async function getNewPairs(): Promise<TokenProfile[]> {
  // DexScreener doesn't have a "new pairs" endpoint directly
  // Use token profiles endpoint for latest
  const r = await fetch("https://api.dexscreener.com/token-profiles/latest/v1");
  const profiles = await r.json();
  // Get details for first 20 Solana tokens
  const solanaTokens = profiles
    .filter((p: any) => p.chainId === "solana")
    .slice(0, 20);
  
  if (solanaTokens.length === 0) return [];
  
  const addresses = solanaTokens.map((t: any) => t.tokenAddress).join(",");
  const r2 = await fetch(`${DEXSCREENER}/tokens/${addresses}`);
  const d = await r2.json();
  return d.pairs || [];
}

export async function getTokenInfo(address: string): Promise<TokenProfile | null> {
  const r = await fetch(`${DEXSCREENER}/tokens/${address}`);
  const d = await r.json();
  return d.pairs?.[0] || null;
}

export type RugCheckResult = {
  address: string;
  name: string;
  symbol: string;
  score: number; // 0-100, higher = safer
  risks: string[];
  mintAuthority: string | null;
  freezeAuthority: string | null;
  topHolders: { address: string; pct: number }[];
  totalSupply: string;
};

export async function rugCheck(address: string): Promise<RugCheckResult> {
  // Get token info from DexScreener
  const tokenInfo = await getTokenInfo(address);
  
  // Get token account info from Solana RPC
  const accountInfo = await rpcCall("getAccountInfo", [
    address,
    { encoding: "jsonParsed" },
  ]);

  const supplyInfo = await rpcCall("getTokenSupply", [address]);

  const risks: string[] = [];
  let score = 100;

  // Check mint authority
  const mintAuth = accountInfo?.value?.data?.parsed?.info?.mintAuthority || null;
  if (mintAuth) {
    risks.push("⚠️ Mint authority enabled — can create more tokens");
    score -= 30;
  }

  // Check freeze authority
  const freezeAuth = accountInfo?.value?.data?.parsed?.info?.freezeAuthority || null;
  if (freezeAuth) {
    risks.push("⚠️ Freeze authority enabled — can freeze accounts");
    score -= 20;
  }

  // Get largest holders
  const holders = await rpcCall("getTokenLargestAccounts", [address]);
  const topHolders = (holders?.value || []).slice(0, 5).map((h: any) => ({
    address: h.address,
    pct: parseFloat(h.uiAmountString || "0"),
  }));

  const totalSupply = parseFloat(supplyInfo?.value?.uiAmountString || "0");
  const topHolderPct = topHolders.reduce((s: number, h: any) => s + h.pct, 0) / totalSupply * 100;

  if (topHolderPct > 50) {
    risks.push(`⚠️ Top 5 holders own ${topHolderPct.toFixed(1)}% of supply`);
    score -= 25;
  }

  // Low liquidity warning
  if (tokenInfo && (tokenInfo.liquidity?.usd || 0) < 10000) {
    risks.push(`⚠️ Low liquidity: $${(tokenInfo.liquidity?.usd || 0).toLocaleString()}`);
    score -= 15;
  }

  // High sell tax check (buys vs sells ratio)
  if (tokenInfo?.txns?.h24) {
    const { buys, sells } = tokenInfo.txns.h24;
    if (sells > 0 && buys / sells > 3) {
      risks.push("⚠️ Suspicious buy/sell ratio — possible bot activity");
      score -= 10;
    }
  }

  if (risks.length === 0) {
    risks.push("✅ No major risks detected");
  }

  return {
    address,
    name: tokenInfo?.baseToken?.name || "Unknown",
    symbol: tokenInfo?.baseToken?.symbol || "???",
    score: Math.max(0, score),
    risks,
    mintAuthority: mintAuth,
    freezeAuthority: freezeAuth,
    topHolders,
    totalSupply: supplyInfo?.value?.uiAmountString || "0",
  };
}

export type WalletTx = {
  signature: string;
  slot: number;
  timestamp: number;
  type: string;
  tokenTransfers: any[];
};

export async function getWalletActivity(address: string): Promise<WalletTx[]> {
  const sigs = await rpcCall("getSignaturesForAddress", [
    address,
    { limit: 20 },
  ]);

  if (!sigs) return [];

  return sigs.map((s: any) => ({
    signature: s.signature,
    slot: s.slot,
    timestamp: s.blockTime || 0,
    type: s.err ? "failed" : "success",
    tokenTransfers: [],
  }));
}

// ponytail: single RPC helper, no wrapper class
async function rpcCall(method: string, params: any[]): Promise<any> {
  const r = await fetch(SOLANA_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });
  const d = await r.json();
  return d.result;
}
