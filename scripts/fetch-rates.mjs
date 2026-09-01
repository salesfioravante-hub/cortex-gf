#!/usr/bin/env node
/* Meridiano Quant — taxas de política dos bancos centrais (para VERIFICAR o input do carry).
 *
 * USD e EUR vêm do FRED (séries diárias, autoritativas). Os demais são referência CURADA
 * (RBA/RBNZ/BoC/BoE/BoJ/SNB) — o FRED não expõe todas de forma confiável e atual, então
 * mantemos uma tabela curada que se atualiza quando o banco central decide (ver cbcalendar.json).
 *
 * Saída: data/policy-rates.json -> window.GFDATA.policyRates
 * Requer FRED_API_KEY (mesmo secret do fetch-fred). Sem chave: mantém a tabela curada.
 * Rodar: node scripts/fetch-rates.mjs   |   --dry
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildBundle } from "./build-bundle.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dir, "..", "data");
const KEY = process.env.FRED_API_KEY;
const DRY = process.argv.includes("--dry");
const today = new Date().toISOString().slice(0, 10);

// referência curada (fallback + moedas sem série FRED confiável). Conferir quando o BC decidir.
const CURATED = {
  USD: { rate: 4.50, src: "Fed — limite superior da meta", auto: false },
  EUR: { rate: 2.15, src: "BCE — taxa de depósito", auto: false },
  GBP: { rate: 4.00, src: "BoE — Bank Rate", auto: false },
  JPY: { rate: 0.75, src: "BoJ — Policy Rate", auto: false },
  AUD: { rate: 3.60, src: "RBA — Cash Rate", auto: false },
  NZD: { rate: 3.00, src: "RBNZ — Official Cash Rate", auto: false },
  CAD: { rate: 2.75, src: "BoC — Overnight Rate", auto: false },
  CHF: { rate: 0.25, src: "SNB — Policy Rate", auto: false }
};
// séries FRED por moeda (só as confiáveis e diárias)
const FRED_SERIES = { USD: "DFEDTARU", EUR: "ECBDFR" };

async function latest(series) {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series}`
    + `&api_key=${KEY}&file_type=json&sort_order=desc&limit=1`;
  const r = await fetch(url);
  if (!r.ok) { let m=""; try{m=(await r.json()).error_message||"";}catch{} throw new Error(`HTTP ${r.status}${m?" — "+m:""}`); }
  const j = await r.json();
  const o = (j.observations || []).find(o => o.value !== ".");
  return o ? { rate: parseFloat(o.value), asof: o.date } : null;
}

async function main() {
  const byCurrency = {};
  const notes = [];
  // base curada, com data de hoje
  for (const [c, v] of Object.entries(CURATED)) byCurrency[c] = { ...v, asof: today };

  let fredOk = 0;
  if (KEY) {
    for (const [c, s] of Object.entries(FRED_SERIES)) {
      try {
        const r = await latest(s);
        if (r && Number.isFinite(r.rate)) {
          byCurrency[c] = { ...byCurrency[c], rate: r.rate, asof: r.asof, auto: true, src: byCurrency[c].src + ` (FRED ${s})` };
          fredOk++; notes.push(`${c}: FRED ${s} = ${r.rate}% (${r.asof})`);
          console.log(`ok  ${c} ${s} = ${r.rate}% (${r.asof})`);
        }
      } catch (e) { notes.push(`${c}: FRED ${s} FALHOU — ${e.message}`); console.warn(`FAIL ${c} ${s}: ${e.message}`); }
    }
  } else {
    notes.push("FRED_API_KEY ausente — usando só a referência curada.");
    console.warn("FRED_API_KEY ausente — mantendo tabela curada.");
  }

  const payload = {
    asof: today,
    source: "FRED (USD via DFEDTARU, EUR via ECBDFR) + referência curada Meridiano (demais)",
    status: fredOk > 0 ? "ok" : "curado",
    fred_ok: `${fredOk}/${Object.keys(FRED_SERIES).length}`,
    notes,
    nota: "rate = taxa de política oficial (%). Verifica o input do carry; não o substitui. Curadas: conferir quando o BC decidir (ver cbcalendar.json).",
    byCurrency
  };

  console.log(`\ntaxas: ${Object.entries(byCurrency).map(([c,v])=>`${c} ${v.rate}`).join(" · ")}`);
  if (DRY) { console.log(JSON.stringify(payload, null, 2)); return; }
  await writeFile(join(DATA_DIR, "policy-rates.json"), JSON.stringify(payload, null, 2) + "\n");
  await buildBundle(DATA_DIR);
  console.log("data/policy-rates.json e data/gfdata.js atualizados.");
}

main().catch(e => { console.error(e); process.exit(1); });
