#!/usr/bin/env node
/* GF Quant — calendário econômico (dados de alto impacto: CPI, NFP, PIB, PMI…).
 *
 * Dois caminhos:
 *   1) FMP (financialmodelingprep.com) se FMP_API_KEY existir — confiável em datacenter, traz projeção.
 *   2) ForexFactory XML como reserva grátis (pode ser bloqueado em IPs de nuvem — best-effort).
 *
 * Saída: data/events.json { byCurrency: { USD:{date,title,forecast}, ... } } = próximo alto impacto/moeda.
 * O app funde com data/cbcalendar.json (reuniões de BC) e usa o evento mais próximo.
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
const KEY = process.env.FMP_API_KEY;
const CUR = ["USD", "EUR", "GBP", "JPY", "AUD", "NZD", "CAD", "CHF"];
const COUNTRY2CUR = { US: "USD", EU: "EUR", GB: "GBP", UK: "GBP", JP: "JPY", AU: "AUD", NZ: "NZD", CA: "CAD", CH: "CHF" };

const sleep = ms => new Promise(r => setTimeout(r, ms));
const iso = d => d.toISOString().slice(0, 10);

// ---- caminho 1: FMP ----
async function fromFMP() {
  const today = new Date(), end = new Date(Date.now() + 9 * 86400000);
  const url = `https://financialmodelingprep.com/api/v3/economic_calendar?from=${iso(today)}&to=${iso(end)}&apikey=${KEY}`;
  const r = await fetch(url);
  if (!r.ok) { let m = ""; try { m = (await r.json())?.["Error Message"] || ""; } catch { } throw new Error(`FMP HTTP ${r.status}${m ? " — " + m : ""}`); }
  const arr = await r.json();
  if (!Array.isArray(arr)) throw new Error("FMP resposta inesperada: " + JSON.stringify(arr).slice(0, 120));
  const out = {};
  for (const e of arr) {
    if (String(e.impact).toLowerCase() !== "high") continue;
    const cur = e.currency || COUNTRY2CUR[e.country];
    if (!CUR.includes(cur)) continue;
    const date = (e.date || "").slice(0, 10);
    if (!date || date < iso(today)) continue;
    if (!out[cur] || date < out[cur].date) out[cur] = { date, title: e.event, forecast: e.estimate ?? "", previous: e.previous ?? "" };
  }
  return { byCurrency: out, provider: "FMP" };
}

// ---- caminho 2: ForexFactory (reserva) ----
function tag(block, name) {
  const m = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? m[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim() : "";
}
async function fromFF() {
  let xml;
  for (let i = 1; i <= 4; i++) {
    const r = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.xml", { headers: { "user-agent": "Mozilla/5.0 (compatible; GFQuant/1.0)" } });
    if (r.ok) { xml = await r.text(); break; }
    if (r.status === 429 && i < 4) { console.warn(`FF 429, tentativa ${i}...`); await sleep(i * 15000); continue; }
    throw new Error(`FF HTTP ${r.status}`);
  }
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const out = {};
  for (const b of (xml.match(/<event>[\s\S]*?<\/event>/g) || [])) {
    if (tag(b, "impact") !== "High") continue;
    const cur = tag(b, "country"); if (!CUR.includes(cur)) continue;
    const parts = tag(b, "date").split("-").map(Number);           // FF usa MM-DD-YYYY
    if (parts.length !== 3) continue;
    const d = new Date(parts[2], parts[0] - 1, parts[1]);
    if (isNaN(d) || d < today) continue;
    const date = iso(d);
    if (!out[cur] || date < out[cur].date) out[cur] = { date, title: tag(b, "title"), forecast: tag(b, "forecast"), previous: tag(b, "previous") };
  }
  return { byCurrency: out, provider: "ForexFactory" };
}

async function main() {
  let res;
  if (KEY) { try { res = await fromFMP(); } catch (e) { console.warn("FMP falhou:", e.message, "— tentando ForexFactory..."); } }
  else console.warn("Sem FMP_API_KEY — usando ForexFactory (reserva, pode ser bloqueado em nuvem).");
  if (!res) res = await fromFF();

  const payload = {
    asof: iso(new Date()), source: `Calendário econômico (${res.provider})`, status: Object.keys(res.byCurrency).length ? "ok" : "erro",
    provider: res.provider, byCurrency: res.byCurrency
  };
  console.log(`Fonte: ${res.provider}. Próximo alto impacto por moeda:`);
  for (const c of CUR) if (res.byCurrency[c]) console.log(`  ${c}  ${res.byCurrency[c].date}  ${res.byCurrency[c].title}  (proj ${res.byCurrency[c].forecast || "—"})`);
  if (DRY) { console.log(JSON.stringify(payload, null, 2)); return; }
  await writeFile(join(DATA_DIR, "events.json"), JSON.stringify(payload, null, 2) + "\n");
  await buildBundle(DATA_DIR);
  console.log("data/events.json e data/gfdata.js atualizados.");
}

main().catch(e => { console.error(e); process.exit(1); });
