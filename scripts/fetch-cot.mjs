#!/usr/bin/env node
/* GF Quant — ingestão do COT da CFTC (fonte aberta, domínio público, sem chave).
 *
 * O que faz:
 *   1) Para cada contrato mapeado, baixa ~160 semanas do relatório Legacy Futures-Only via Socrata.
 *   2) Calcula o net de não-comerciais (large specs) e o COT Index de Williams (janela 3 anos).
 *   3) Converte o índice em pontos [-2,+2] e mapeia por moeda -> por ativo (par/índice/commodity).
 *   4) Escreve data/cot.json e regenera data/gfdata.js (window.GFDATA) p/ o app consumir.
 *
 * Rodar: node scripts/fetch-cot.mjs         (Node 18+; usa fetch nativo)
 *        node scripts/fetch-cot.mjs --dry    (não escreve arquivos; só imprime)
 *
 * NOTA: confirme o RESOURCE e os códigos de contrato na 1ª execução (o script loga o que recebeu).
 *       Portal: https://publicreporting.cftc.gov  (Legacy Futures-Only).
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildBundle } from "./build-bundle.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dir, "..", "data");
const DRY = process.argv.includes("--dry");

// Socrata — Legacy Futures-Only (verificar o id na 1ª execução; alternativas existem no portal)
const RESOURCE = "6dca-aqww";
const BASE = `https://publicreporting.cftc.gov/resource/${RESOURCE}.json`;
const WEEKS = 160;          // ~3 anos de semanas
const LOOKBACK = 156;       // janela do COT Index (3 anos)

// Código de contrato CFTC por MOEDA/ativo (cftc_contract_market_code)
const CONTRACTS = {
  EUR: "099741", JPY: "097741", GBP: "096742", AUD: "232741",
  NZD: "112741", CAD: "090741", CHF: "092741", USD: "098662", // USD Index (ICE)
  XAU: "088691", XAG: "084691", CL: "067651",                 // ouro, prata, WTI
  ES:  "13874A", NQ:  "209742", YM:  "124603"                 // E-mini S&P, Nasdaq, Dow
};

// Ativo do app -> como derivar o COT (par vs USD, cross, índice, commodity)
const ASSETS = {
  EURUSD:{pair:["EUR","USD"]}, GBPUSD:{pair:["GBP","USD"]}, AUDUSD:{pair:["AUD","USD"]},
  NZDUSD:{pair:["NZD","USD"]}, USDCAD:{pair:["USD","CAD"]}, USDJPY:{pair:["USD","JPY"]},
  USDCHF:{pair:["USD","CHF"]}, AUDJPY:{pair:["AUD","JPY"]}, NZDJPY:{pair:["NZD","JPY"]},
  AUDCAD:{pair:["AUD","CAD"]}, EURCHF:{pair:["EUR","CHF"]},
  XAUUSD:{single:"XAU"}, XAGUSD:{single:"XAG"}, USOIL:{single:"CL"},
  US500:{single:"ES"}, USTEC:{single:"NQ"}, US30:{single:"YM"}
};

const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };

async function fetchContract(code) {
  const url = `${BASE}?cftc_contract_market_code=${code}`
    + `&$select=report_date_as_yyyy_mm_dd,noncomm_positions_long_all,noncomm_positions_short_all`
    + `&$order=report_date_as_yyyy_mm_dd%20DESC&$limit=${WEEKS}`;
  const res = await fetch(url, { headers: { "accept": "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} para ${code}`);
  const rows = await res.json();
  // net = long - short, em ordem cronológica crescente
  const nets = rows
    .map(r => ({ d: r.report_date_as_yyyy_mm_dd, net: num(r.noncomm_positions_long_all) - num(r.noncomm_positions_short_all) }))
    .reverse();
  return nets;
}

// COT Index de Williams (0-100) sobre a janela + delta semanal
function cotIndex(nets) {
  if (!nets.length) return null;
  const win = nets.slice(-LOOKBACK);
  const vals = win.map(x => x.net);
  const cur = vals[vals.length - 1], prev = vals[vals.length - 2] ?? cur;
  const min = Math.min(...vals), max = Math.max(...vals);
  const index = max === min ? 50 : ((cur - min) / (max - min)) * 100;
  return { index, delta: cur - prev, asof: win[win.length - 1].d };
}

// índice (0-100) + delta -> pontos [-2,+2] (ver METODOLOGIA §2.1)
function idxToPts({ index, delta }) {
  if (index > 90) return delta > 0 ? 2 : 1;
  if (index >= 60) return 1;
  if (index > 40) return 0;
  if (index >= 10) return -1;
  return delta < 0 ? -2 : -1;
}

function pairPts(baseP, quoteP) {
  return Math.max(-2, Math.min(2, Math.round((baseP - quoteP) / 2)));
}

async function main() {
  const byCode = {};
  for (const [key, code] of Object.entries(CONTRACTS)) {
    try {
      const nets = await fetchContract(code);
      const ci = cotIndex(nets);
      byCode[key] = ci ? { ...ci, pts: idxToPts(ci) } : null;
      console.log(`ok  ${key.padEnd(4)} code ${code}  index ${ci ? ci.index.toFixed(0) : "—"}  pts ${ci ? idxToPts(ci) : "—"}`);
    } catch (e) {
      byCode[key] = null;
      console.warn(`FAIL ${key} (${code}): ${e.message}`);
    }
  }

  const byAsset = {};
  for (const [sym, def] of Object.entries(ASSETS)) {
    if (def.single) {
      const c = byCode[def.single];
      if (c) byAsset[sym] = { pts: c.pts, index: Math.round(c.index) };
    } else {
      const [b, q] = def.pair, cb = byCode[b], cq = byCode[q];
      if (cb && cq) byAsset[sym] = { pts: pairPts(cb.pts, cq.pts), index: Math.round(cb.index) };
      else if (cb) byAsset[sym] = { pts: cb.pts, index: Math.round(cb.index) };
    }
  }

  const asof = (Object.values(byCode).find(Boolean)?.asof || new Date().toISOString()).slice(0, 10);
  const ok = Object.keys(byAsset).length;
  const payload = {
    asof, source: "CFTC Commitments of Traders (Legacy Futures-Only)",
    status: ok ? "ok" : "erro", report: "noncommercial net (large speculators)", byAsset
  };

  console.log(`\n${ok}/${Object.keys(ASSETS).length} ativos com COT · asof ${asof}`);
  if (DRY) { console.log(JSON.stringify(payload, null, 2)); return; }

  await writeFile(join(DATA_DIR, "cot.json"), JSON.stringify(payload, null, 2) + "\n");
  await buildBundle(DATA_DIR);
  console.log("data/cot.json e data/gfdata.js atualizados.");
}

main().catch(e => { console.error(e); process.exit(1); });
