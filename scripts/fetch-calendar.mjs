#!/usr/bin/env node
/* GF Quant — calendário econômico (dados de alto impacto: CPI, NFP, PIB, PCE…).
 *
 * Para RISCO DE EVENTO o que importa é a DATA (quando não entrar), não a projeção.
 * Por isso a fonte principal é o FRED, que já temos e é confiável em nuvem.
 *
 * Ordem das fontes (as três se complementam, nenhuma é obrigatória):
 *   1) FRED releases/dates  (FRED_API_KEY) — datas oficiais dos dados dos EUA -> USD.   [confiável]
 *   2) FMP economic_calendar (FMP_API_KEY) — várias moedas + projeção.                   [se o plano permitir]
 *   3) ForexFactory XML — reserva grátis; bloqueia IP de datacenter.                     [best-effort]
 *
 * SEMPRE grava data/events.json, mesmo em falha, com status e o motivo — erro silencioso
 * é pior que erro visível: o cabeçalho do app passa a mostrar o problema.
 *
 * Rodar: node scripts/fetch-calendar.mjs   |   --dry
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildBundle } from "./build-bundle.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dir, "..", "data");
const DRY = process.argv.includes("--dry");
const FRED_KEY = process.env.FRED_API_KEY;
const FMP_KEY = process.env.FMP_API_KEY;
const CUR = ["USD", "EUR", "GBP", "JPY", "AUD", "NZD", "CAD", "CHF"];
const COUNTRY2CUR = { US: "USD", EU: "EUR", GB: "GBP", UK: "GBP", JP: "JPY", AU: "AUD", NZ: "NZD", CA: "CAD", CH: "CHF" };

// releases dos EUA que realmente movem mercado
const US_HIGH = /(employment situation|consumer price index|gross domestic product|personal income and outlays|retail sales|producer price index|employment cost)/i;

const iso = d => d.toISOString().slice(0, 10);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const notes = [];

function put(out, cur, date, title, forecast = "") {
  if (!CUR.includes(cur) || !date) return;
  if (!out[cur] || date < out[cur].date) out[cur] = { date, title, forecast };
}

/* ---- 1) FRED: datas oficiais dos releases dos EUA ---- */
async function fromFRED(out) {
  if (!FRED_KEY) { notes.push("FRED: sem chave"); return; }
  const hoje = new Date(), fim = new Date(Date.now() + 14 * 86400000);
  const url = `https://api.stlouisfed.org/fred/releases/dates?api_key=${FRED_KEY}&file_type=json`
    + `&realtime_start=${iso(hoje)}&realtime_end=${iso(fim)}&include_release_dates_with_no_data=true&sort_order=asc&limit=1000`;
  const r = await fetch(url);
  if (!r.ok) { notes.push(`FRED: HTTP ${r.status}`); return; }
  const j = await r.json();
  let n = 0;
  for (const d of (j.release_dates || [])) {
    if (!US_HIGH.test(d.release_name || "")) continue;
    if (d.date < iso(hoje)) continue;
    put(out, "USD", d.date, d.release_name); n++;
  }
  notes.push(`FRED: ${n} releases de alto impacto (EUA)`);
}

/* ---- 2) FMP: várias moedas + projeção (depende do plano) ---- */
async function fromFMP(out) {
  if (!FMP_KEY) { notes.push("FMP: sem chave"); return; }
  const hoje = new Date(), fim = new Date(Date.now() + 9 * 86400000);
  const r = await fetch(`https://financialmodelingprep.com/api/v3/economic_calendar?from=${iso(hoje)}&to=${iso(fim)}&apikey=${FMP_KEY}`);
  if (!r.ok) {
    let m = ""; try { m = (await r.json())?.["Error Message"] || ""; } catch { }
    notes.push(`FMP: HTTP ${r.status}${m ? " — " + m.slice(0, 120) : ""}`);
    return;
  }
  const arr = await r.json();
  if (!Array.isArray(arr)) { notes.push("FMP: resposta inesperada " + JSON.stringify(arr).slice(0, 100)); return; }
  let n = 0;
  for (const e of arr) {
    if (String(e.impact).toLowerCase() !== "high") continue;
    const cur = e.currency || COUNTRY2CUR[e.country];
    const date = (e.date || "").slice(0, 10);
    if (!date || date < iso(hoje)) continue;
    put(out, cur, date, e.event, e.estimate ?? ""); n++;
  }
  notes.push(`FMP: ${n} eventos de alto impacto`);
}

/* ---- 3) ForexFactory: reserva ---- */
function tag(b, n) {
  const m = b.match(new RegExp(`<${n}>([\\s\\S]*?)</${n}>`));
  return m ? m[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim() : "";
}
async function fromFF(out) {
  let xml;
  for (let i = 1; i <= 3; i++) {
    const r = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.xml", { headers: { "user-agent": "Mozilla/5.0 (compatible; GFQuant/1.0)" } });
    if (r.ok) { xml = await r.text(); break; }
    if (r.status === 429 && i < 3) { await sleep(i * 10000); continue; }
    notes.push(`ForexFactory: HTTP ${r.status}`); return;
  }
  if (!xml) { notes.push("ForexFactory: sem resposta"); return; }
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  let n = 0;
  for (const b of (xml.match(/<event>[\s\S]*?<\/event>/g) || [])) {
    if (tag(b, "impact") !== "High") continue;
    const p = tag(b, "date").split("-").map(Number);           // MM-DD-YYYY
    if (p.length !== 3) continue;
    const d = new Date(p[2], p[0] - 1, p[1]);
    if (isNaN(d) || d < hoje) continue;
    put(out, tag(b, "country"), iso(d), tag(b, "title"), tag(b, "forecast")); n++;
  }
  notes.push(`ForexFactory: ${n} eventos`);
}

async function main() {
  const out = {};
  for (const [nome, fn] of [["FRED", fromFRED], ["FMP", fromFMP], ["ForexFactory", fromFF]]) {
    try { await fn(out); } catch (e) { notes.push(`${nome}: ${e.message}`); }
  }

  const n = Object.keys(out).length;
  const payload = {
    asof: iso(new Date()),
    source: "Calendário econômico (FRED + FMP + ForexFactory)",
    status: n ? "ok" : "erro",
    provider: "multi", notes, byCurrency: out
  };

  console.log("Diagnóstico das fontes:"); notes.forEach(x => console.log("  ·", x));
  console.log(`\nPróximo alto impacto por moeda (${n}):`);
  for (const c of CUR) if (out[c]) console.log(`  ${c}  ${out[c].date}  ${out[c].title}`);
  if (DRY) { console.log(JSON.stringify(payload, null, 2)); return; }
  await writeFile(join(DATA_DIR, "events.json"), JSON.stringify(payload, null, 2) + "\n");
  await buildBundle(DATA_DIR);
  console.log("data/events.json e data/gfdata.js atualizados.");
}

// nunca derruba o pipeline: grava o diagnóstico e sai limpo
main().catch(e => { console.error("Falha geral:", e.message); process.exit(0); });
