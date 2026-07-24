#!/usr/bin/env node
/* GF Quant — preço, Score Técnico (Tendência × Momentum), regime de ADX e risco por ATR.
 * Fonte: endpoint público de scanner do TradingView (sem chave).
 *
 * POR QUE SEPARAR (medido em 2026-07-24, ver METODOLOGIA §5.15):
 *   - Dentro do bloco de osciladores a correlação cruzada é 0,92–0,98 (Estocástico×Williams = 0,98):
 *     são o MESMO indicador com nomes diferentes. Repetir evidência infla convicção — e convicção
 *     vira TAMANHO DE POSIÇÃO nesta ferramenta. Redundância aqui é risco, não rigor.
 *   - Já entre os blocos a correlação é ~0 (MA × Osciladores = −0,01): carregam informações
 *     DIFERENTES. Portanto a média dos dois destrói informação; separar recupera.
 *   - `Recommend.MA` = tendência (seguidor). `Recommend.Other` = osciladores, que na convenção do
 *     TradingView votam VENDA quando sobrecomprado, ou seja: reversão à média.
 *     Por isso o peso entre eles muda conforme o ADX (regime).
 *
 * Rodar: node scripts/fetch-prices.mjs   |   --dry
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildBundle } from "./build-bundle.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dir, "..", "data");
const DRY = process.argv.includes("--dry");

const TICKERS = {
  EURUSD: "FX_IDC:EURUSD", GBPUSD: "FX_IDC:GBPUSD", AUDUSD: "FX_IDC:AUDUSD",
  NZDUSD: "FX_IDC:NZDUSD", USDCAD: "FX_IDC:USDCAD", USDJPY: "FX_IDC:USDJPY",
  USDCHF: "FX_IDC:USDCHF", AUDJPY: "FX_IDC:AUDJPY", NZDJPY: "FX_IDC:NZDJPY",
  AUDCAD: "FX_IDC:AUDCAD", EURCHF: "FX_IDC:EURCHF",
  XAUUSD: "TVC:GOLD", XAGUSD: "TVC:SILVER", USOIL: "FX:USOIL",
  US500: "SP:SPX", USTEC: "NASDAQ:NDX", US30: "DJ:DJI"
};
const COLS = [
  "close", "change", "Perf.W", "RSI", "ATR", "ADX", "EMA50",          // 0-6
  "Recommend.MA|1W", "Recommend.MA", "Recommend.MA|240",              // 7-9   tendência
  "Recommend.Other|1W", "Recommend.Other", "Recommend.Other|240"      // 10-12 momentum
];

// rating (−1..+1) -> pts (−2..+2), mesma escala do §1
function recToPts(v) {
  if (v == null || !Number.isFinite(v)) return null;
  if (v >= 0.5) return 2;
  if (v >= 0.1) return 1;
  if (v > -0.1) return 0;
  if (v > -0.5) return -1;
  return -2;
}
// ADX define em quem confiar: tendência forte -> médias; mercado lateral -> osciladores
function pesos(adx) {
  if (adx == null) return { t: 0.6, m: 0.4, regime: "indefinido" };
  if (adx >= 25) return { t: 0.80, m: 0.20, regime: "tendência" };
  if (adx >= 20) return { t: 0.60, m: 0.40, regime: "misto" };
  return { t: 0.40, m: 0.60, regime: "lateral" };
}

async function main() {
  const tickers = Object.values(TICKERS);
  const inv = Object.fromEntries(Object.entries(TICKERS).map(([s, t]) => [t, s]));
  const r = await fetch("https://scanner.tradingview.com/global/scan", {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0" },
    body: JSON.stringify({ symbols: { tickers, query: { types: [] } }, columns: COLS })
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} no scanner do TradingView`);
  const j = await r.json();

  const byAsset = {};
  for (const row of (j.data || [])) {
    const sym = inv[row.s]; if (!sym) continue;
    const d = row.d;
    const close = d[0], atr = d[4], adx = d[5] != null ? Math.round(d[5]) : null, ema50 = d[6];
    const w = pesos(adx);

    const maRaw = { W1: d[7], D1: d[8], H4: d[9] };
    const osRaw = { W1: d[10], D1: d[11], H4: d[12] };
    const trend = {}, mom = {}, tf = {};
    for (const k of ["W1", "D1", "H4"]) {
      trend[k] = recToPts(maRaw[k]);
      mom[k] = recToPts(osRaw[k]);
      // mistura ponderada pelo regime, feita no valor CRU (evita arredondar duas vezes)
      const a = maRaw[k], b = osRaw[k];
      tf[k] = (a == null && b == null) ? null
        : recToPts(a == null ? b : b == null ? a : w.t * a + w.m * b);
    }

    // risco: quantos ATRs o preço está longe da média de 50 (perseguindo ou não)
    const ext = (close != null && ema50 != null && atr) ? (close - ema50) / atr : null;
    const stop = atr ? 1.5 * atr : null;                       // stop sugerido = 1,5 ATR

    byAsset[sym] = {
      last: close, chg: d[1], perfW: d[2], rsi: d[3] != null ? Math.round(d[3]) : null,
      atr, adx, regime: w.regime, ema50,
      ext: ext != null ? +ext.toFixed(2) : null,
      stop: stop != null ? +stop.toPrecision(4) : null,
      stopPct: (stop && close) ? +(stop / close * 100).toFixed(2) : null,
      trend, mom, W1: tf.W1, D1: tf.D1, H4: tf.H4
    };
    console.log(`${sym.padEnd(7)} ADX ${String(adx).padStart(3)} ${w.regime.padEnd(10)} `
      + `tend ${trend.W1}/${trend.D1}/${trend.H4}  mom ${mom.W1}/${mom.D1}/${mom.H4}  `
      + `=> ${tf.W1}/${tf.D1}/${tf.H4}  ext ${byAsset[sym].ext}  stop ${byAsset[sym].stopPct}%`);
  }

  const ok = Object.keys(byAsset).length, total = Object.keys(TICKERS).length;
  const payload = {
    asof: new Date().toISOString().slice(0, 10),
    source: "TradingView — Recommend.MA (tendência) × Recommend.Other (momentum), peso pelo ADX",
    status: ok === 0 ? "erro" : ok < total ? "parcial" : "ok", count: `${ok}/${total}`, byAsset
  };
  console.log(`\n${ok}/${total} ativos.`);
  if (DRY) { console.log(JSON.stringify(payload, null, 2).slice(0, 1200)); return; }
  await writeFile(join(DATA_DIR, "prices.json"), JSON.stringify(payload, null, 2) + "\n");
  await buildBundle(DATA_DIR);
  console.log("data/prices.json e data/gfdata.js atualizados.");
}

main().catch(e => { console.error(e); process.exit(1); });
