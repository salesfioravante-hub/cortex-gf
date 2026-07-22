#!/usr/bin/env node
/* GF Quant — ingestão do FRED (Federal Reserve Economic Data, domínio público).
 * Automatiza o Farol de Regime + juro real do ouro + quadrante Crescimento×Inflação.
 *
 * Requer chave grátis: export FRED_API_KEY=xxxx   (fredaccount.stlouisfed.org)
 * No GitHub Actions: adicione o secret FRED_API_KEY.
 *
 * Saída: data/regime.json  ->  window.GFDATA.regime + window.GFDATA.commodity
 * Rodar: node scripts/fetch-fred.mjs        |  node scripts/fetch-fred.mjs --dry
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildBundle } from "./build-bundle.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dir, "..", "data");
const KEY = process.env.FRED_API_KEY;
const DRY = process.argv.includes("--dry");

if (!KEY) { console.warn("FRED_API_KEY ausente — pulando FRED (grátis em fredaccount.stlouisfed.org)."); process.exit(0); }

const SERIES = {
  vix: "VIXCLS", dxy: "DTWEXBGS", us10y: "DGS10", realyield: "DFII10",
  cpi: "CPILFESL", payems: "PAYEMS", unrate: "UNRATE"
};

async function obs(series, limit = 400) {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series}`
    + `&api_key=${KEY}&file_type=json&sort_order=desc&limit=${limit}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} ${series}`);
  const j = await r.json();
  return (j.observations || []).map(o => ({ d: o.date, v: parseFloat(o.value) })).filter(o => Number.isFinite(o.v));
}

// direção de uma série de nível (vals em ordem decrescente) ao longo de ~lookback observações
function dir(vals, lookback, eps) {
  const cur = vals[0]?.v, past = vals[Math.min(lookback, vals.length - 1)]?.v;
  if (cur == null || past == null) return "flat";
  const chg = (cur - past) / Math.abs(past || 1);
  return chg > eps ? "up" : chg < -eps ? "down" : "flat";
}
const vixBucket = v => v < 15 ? "calm" : v < 20 ? "normal" : v < 30 ? "elevated" : "stress";

// CPI (mensal, desc): YoY acelerando?
function cpiAccelerating(cpi) {
  if (cpi.length < 16) return null;
  const yoy = i => cpi[i].v / cpi[i + 12].v - 1;
  return yoy(0) > yoy(3);
}

async function main() {
  const data = {};
  for (const [k, s] of Object.entries(SERIES)) {
    try { data[k] = await obs(s); console.log(`ok ${k.padEnd(9)} ${s} último ${data[k][0]?.v} (${data[k][0]?.d})`); }
    catch (e) { data[k] = []; console.warn(`FAIL ${k} ${s}: ${e.message}`); }
  }

  const dxyDir = dir(data.dxy, 20, 0.005);
  const us10yDir = dir(data.us10y, 20, 0.02);
  const vix = data.vix[0]?.v != null ? vixBucket(data.vix[0].v) : "normal";

  // Crescimento: desemprego caindo OU payrolls acelerando
  const unrateDir = dir(data.unrate, 3, 0);
  const payAccel = (() => {
    const p = data.payems; if (p.length < 7) return null;
    const m = i => p[i].v - p[i + 1].v;
    return (m(0) + m(1) + m(2)) / 3 > (m(3) + m(4) + m(5)) / 3;
  })();
  const growth = (unrateDir === "down" || payAccel === true) ? "up" : "down";

  // Inflação: CPI núcleo YoY acelerando
  const infl = cpiAccelerating(data.cpi) === false ? "down" : "up";

  // Juro real 10a (DFII10) caindo = alta do ouro
  const ryDir = dir(data.realyield, 20, 0.02);
  const ryPts = ryDir === "down" ? 2 : ryDir === "up" ? -2 : 0;

  const asof = data.vix[0]?.d || new Date().toISOString().slice(0, 10);
  const payload = {
    asof, source: "FRED (Federal Reserve Bank of St. Louis)", status: "ok",
    regime: { dxy: dxyDir, us10y: us10yDir, vix, growth, infl },
    commodity: {
      XAUUSD: { realYield: ryPts },
      XAGUSD: { realYield: Math.max(-1, Math.min(1, ryPts)) }
    },
    values: { vix: data.vix[0]?.v, dxy: data.dxy[0]?.v, us10y: data.us10y[0]?.v, realyield: data.realyield[0]?.v }
  };

  console.log(`\nregime ${JSON.stringify(payload.regime)} · juro real ${data.realyield[0]?.v} (${ryDir}) -> pts ${ryPts}`);
  if (DRY) { console.log(JSON.stringify(payload, null, 2)); return; }
  await writeFile(join(DATA_DIR, "regime.json"), JSON.stringify(payload, null, 2) + "\n");
  await buildBundle(DATA_DIR);
  console.log("data/regime.json e data/gfdata.js atualizados.");
}

main().catch(e => { console.error(e); process.exit(1); });
