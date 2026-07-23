#!/usr/bin/env node
/* GF Quant — preço em tempo real + Score Técnico via TradingView (endpoint público de scanner).
 *
 * Sem chave. Usa o campo `Recommend.All` (nota técnica agregada de ~26 indicadores), que existe
 * POR TIMEFRAME: `|1W` (semanal), sem sufixo (diário), `|240` (H4). Mapeia direto para a nossa
 * escala −2..+2 e vira o Score Técnico automático (W1/D1/H4). Também traz preço, RSI, ATR, ADX.
 *
 * Rodar: node scripts/fetch-prices.mjs        |  node scripts/fetch-prices.mjs --dry
 *
 * NOTA: é um endpoint não-oficial (o mesmo que a lib tradingview-screener usa). Estável, mas se um dia
 *       mudar, o app cai no fallback do seed sem quebrar. Tickers confirmados em 2026-07-23.
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildBundle } from "./build-bundle.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dir, "..", "data");
const DRY = process.argv.includes("--dry");

// nosso ativo -> ticker do TradingView (confirmados: resolvem com Recommend.All nos 3 timeframes)
const TICKERS = {
  EURUSD: "FX_IDC:EURUSD", GBPUSD: "FX_IDC:GBPUSD", AUDUSD: "FX_IDC:AUDUSD",
  NZDUSD: "FX_IDC:NZDUSD", USDCAD: "FX_IDC:USDCAD", USDJPY: "FX_IDC:USDJPY",
  USDCHF: "FX_IDC:USDCHF", AUDJPY: "FX_IDC:AUDJPY", NZDJPY: "FX_IDC:NZDJPY",
  AUDCAD: "FX_IDC:AUDCAD", EURCHF: "FX_IDC:EURCHF",
  XAUUSD: "TVC:GOLD", XAGUSD: "TVC:SILVER", USOIL: "FX:USOIL",
  US500: "SP:SPX", USTEC: "NASDAQ:NDX", US30: "DJ:DJI"
};
const COLS = ["close", "change", "Perf.W", "Perf.1M", "RSI", "ATR", "ADX",
  "Recommend.All|1W", "Recommend.All", "Recommend.All|240"];

// Recommend.All (−1..+1) -> pts −2..+2 (mesma escala do resto do modelo, ver METODOLOGIA §1)
function recToPts(v) {
  if (v == null || !Number.isFinite(v)) return null;
  if (v >= 0.5) return 2;      // Strong Buy   -> ALTA FORTE
  if (v >= 0.1) return 1;      // Buy          -> ALTA
  if (v > -0.1) return 0;      // Neutral      -> NEUTRO
  if (v > -0.5) return -1;     // Sell         -> BAIXA
  return -2;                   // Strong Sell  -> BAIXA FORTE
}

async function main() {
  const tickers = Object.values(TICKERS);
  const inv = Object.fromEntries(Object.entries(TICKERS).map(([s, t]) => [t, s]));
  const body = { symbols: { tickers, query: { types: [] } }, columns: COLS };

  const r = await fetch("https://scanner.tradingview.com/global/scan", {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0" },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} no scanner do TradingView`);
  const j = await r.json();

  const byAsset = {};
  for (const row of (j.data || [])) {
    const sym = inv[row.s]; if (!sym) continue;
    const d = row.d;
    byAsset[sym] = {
      last: d[0], chg: d[1], perfW: d[2], perf1M: d[3],
      rsi: d[4] != null ? Math.round(d[4]) : null,
      atr: d[5], adx: d[6] != null ? Math.round(d[6]) : null,
      W1: recToPts(d[7]), D1: recToPts(d[8]), H4: recToPts(d[9])
    };
    console.log(`${sym.padEnd(7)} ${String(d[0]).padStart(10)}  W/D/H4 ${byAsset[sym].W1}/${byAsset[sym].D1}/${byAsset[sym].H4}  RSI ${byAsset[sym].rsi}`);
  }

  const ok = Object.keys(byAsset).length, total = Object.keys(TICKERS).length;
  const status = ok === 0 ? "erro" : ok < total ? "parcial" : "ok";
  const missing = Object.keys(TICKERS).filter(s => !byAsset[s]);
  if (missing.length) console.warn("!! sem dado:", missing.join(", "));

  const payload = {
    asof: new Date().toISOString().slice(0, 10),
    source: "TradingView (scanner) — Recommend.All por timeframe",
    status, count: `${ok}/${total}`, byAsset
  };
  console.log(`\n${ok}/${total} ativos com técnico · ${status}`);
  if (DRY) { console.log(JSON.stringify(payload, null, 2)); return; }
  await writeFile(join(DATA_DIR, "prices.json"), JSON.stringify(payload, null, 2) + "\n");
  await buildBundle(DATA_DIR);
  console.log("data/prices.json e data/gfdata.js atualizados.");
}

main().catch(e => { console.error(e); process.exit(1); });
