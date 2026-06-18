// ponytail: single file for all external API calls, no abstraction layers

const SOLANA_RPC = "https://api.mainnet-beta.solana.com";
const PUMP_API = "https://frontend-api-v3.pump.fun";

export type PumpToken = {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  image_uri: string;
  created_timestamp: number;
  market_cap: number;
  usd_market_cap: number;
  complete: boolean; // true = graduated to Raydium
  real_sol_reserves: number;
  real_token_reserves: number;
  total_supply: number;
  creator: string;
  twitter: string;
  telegram: string;
  website: string;
  nsfw: boolean;
  is_banned: boolean;
  reply_count: number;
  username: string;
  profile_image: string;
};

export async function getPumpTokens(
  offset = 0,
  limit = 20,
  sort = "created_timestamp",
  order = "DESC"
): Promise<PumpToken[]> {
  const r = await fetch(
    `${PUMP_API}/coins?offset=${offset}&limit=${limit}&sort=${sort}&order=${order}&includeNsfw=false`
  );
  return r.json();
}

export async function searchPumpTokens(query: string): Promise<PumpToken[]> {
  const r = await fetch(
    `${PUMP_API}/coins?offset=0&limit=20&search=${encodeURIComponent(query)}`
  );
  return r.json();
}

export async function getPumpToken(mint: string): Promise<PumpToken | null> {
  const r = await fetch(`${PUMP_API}/coins/${mint}`);
  if (!r.ok) return null;
  return r.json();
}

// Rug check using Solana RPC
export type RugCheckResult = {
  address: string;
  name: string;
  symbol: string;
  score: number;
  risks: string[];
  mintAuthority: string | null;
  freezeAuthority: string | null;
  topHolders: { address: string; pct: number }[];
  totalSupply: string;
};

export async function rugCheck(address: string): Promise<RugCheckResult> {
  const token = await getPumpToken(address);
  const risks: string[] = [];
  let score = 100;

  const accountInfo = await rpcCall("getAccountInfo", [
    address,
    { encoding: "jsonParsed" },
  ]);
  const supplyInfo = await rpcCall("getTokenSupply", [address]);

  const mintAuth =
    accountInfo?.value?.data?.parsed?.info?.mintAuthority || null;
  if (mintAuth) {
    risks.push("⚠️ Mint authority enabled — can create more tokens");
    score -= 30;
  }

  const freezeAuth =
    accountInfo?.value?.data?.parsed?.info?.freezeAuthority || null;
  if (freezeAuth) {
    risks.push("⚠️ Freeze authority enabled — can freeze accounts");
    score -= 20;
  }

  const holders = await rpcCall("getTokenLargestAccounts", [address]);
  const topHolders = (holders?.value || []).slice(0, 5).map((h: any) => ({
    address: h.address,
    pct: parseFloat(h.uiAmountString || "0"),
  }));

  const totalSupply = parseFloat(supplyInfo?.value?.uiAmountString || "0");
  const topHolderPct =
    (topHolders.reduce((s: number, h: any) => s + h.pct, 0) / totalSupply) *
    100;

  if (topHolderPct > 50) {
    risks.push(
      `⚠️ Top 5 holders own ${topHolderPct.toFixed(1)}% of supply`
    );
    score -= 25;
  }

  // Pump.fun specific checks
  if (token) {
    if (token.is_banned) {
      risks.push("🚫 BANNED on pump.fun");
      score -= 50;
    }
    if (token.nsfw) {
      risks.push("⚠️ NSFW flagged");
      score -= 10;
    }
    if (!token.complete) {
      risks.push("📊 Still on bonding curve (not graduated to Raydium)");
    } else {
      risks.push("✅ Graduated to Raydium");
    }
    if (token.usd_market_cap < 1000) {
      risks.push(`⚠️ Very low market cap: $${token.usd_market_cap.toFixed(0)}`);
      score -= 15;
    }
  }

  if (risks.length === 0) risks.push("✅ No major risks detected");

  return {
    address,
    name: token?.name || "Unknown",
    symbol: token?.symbol || "???",
    score: Math.max(0, score),
    risks,
    mintAuthority: mintAuth,
    freezeAuthority: freezeAuth,
    topHolders,
    totalSupply: supplyInfo?.value?.uiAmountString || "0",
  };
}

// Wallet tracker
export type WalletTx = {
  signature: string;
  slot: number;
  timestamp: number;
  type: string;
};

export async function getWalletActivity(
  address: string
): Promise<WalletTx[]> {
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
  }));
}

async function rpcCall(method: string, params: any[]): Promise<any> {
  const r = await fetch(SOLANA_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const d = await r.json();
  return d.result;
}

// Creator stats — how many coins deployed by this wallet
export type CreatorStats = {
  creator: string;
  totalCoins: number;
  coins: { mint: string; symbol: string; name: string; usd_market_cap: number; complete: boolean }[];
};

export async function getCreatorCoins(creator: string): Promise<CreatorStats> {
  const r = await fetch(
    `${PUMP_API}/coins?offset=0&limit=50&creator=${creator}&sort=created_timestamp&order=DESC`
  );
  const coins = await r.json();
  return {
    creator,
    totalCoins: coins.length,
    coins: coins.map((c: any) => ({
      mint: c.mint,
      symbol: c.symbol,
      name: c.name,
      usd_market_cap: c.usd_market_cap,
      complete: c.complete,
    })),
  };
}
