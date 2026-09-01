#!/usr/bin/env node
/* GF Quant — manchetes dos bancos centrais (RSS, sem chave).
 *
 * Fonte de ALTO sinal e baixo ruído: comunicados oficiais de Fed/BCE/BoE/BoJ, que mapeiam direto
 * para USD/EUR/GBP/JPY. Alimenta um painel informativo (window.GFDATA.news). NÃO mexe no score.
 *
 * Rodar: node scripts/fetch-news.mjs   |   --dry
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildBundle } from "./build-bundle.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dir, "..", "data");
const DRY = process.argv.includes("--dry");

// bancos centrais (alto sinal) -> painel window.GFDATA.news
const CB_SOURCES = [
  { cur: "USD", name: "Fed", url: "https://www.federalreserve.gov/feeds/press_all.xml" },
  { cur: "EUR", name: "BCE", url: "https://www.ecb.europa.eu/rss/press.html" },
  { cur: "GBP", name: "BoE", url: "https://www.bankofengland.co.uk/rss/news" },
  { cur: "JPY", name: "BoJ", url: "https://www.boj.or.jp/en/rss/whatsnew.xml" }
];
// mercado (feeds grátis, alta frequência) -> ticker window.GFDATA.ticker
const MKT_SOURCES = [
  { cur: "MKT", name: "ForexLive", url: "https://www.forexlive.com/feed/" },
  { cur: "MKT", name: "FXStreet", url: "https://www.fxstreet.com/rss/news" }
];
const MAX_AGE_DAYS = 21;

function decode(s) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
}
function tag(block, name) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  if (!m) return "";
  return decode(m[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").replace(/<[^>]+>/g, "")).trim();
}
function linkOf(block) {
  const rss = block.match(/<link>([\s\S]*?)<\/link>/);
  if (rss && rss[1].trim().startsWith("http")) return rss[1].trim();
  const atom = block.match(/<link[^>]*href="([^"]+)"/);
  return atom ? atom[1] : "";
}
function dateOf(block) {
  const raw = tag(block, "pubDate") || tag(block, "dc:date") || tag(block, "published") || tag(block, "updated");
  const d = new Date(raw);
  return isNaN(d) ? null : d;
}

async function one(src, limit) {
  const r = await fetch(src.url, { headers: { "user-agent": "Mozilla/5.0 (compatible; GFQuant/1.0)" } });
  if (!r.ok) { console.warn(`FAIL ${src.name} HTTP ${r.status}`); return []; }
  const xml = await r.text();
  const blocks = (xml.match(/<item[\s>][\s\S]*?<\/item>/g) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/g) || []);
  const now = Date.now();
  const out = [];
  for (const b of blocks) {
    const title = tag(b, "title"); if (!title) continue;
    const d = dateOf(b);
    if (d && (now - d) / 86400000 > MAX_AGE_DAYS) continue;
    out.push({ cur: src.cur, source: src.name, title, link: linkOf(b), date: d ? d.toISOString().slice(0, 10) : "" });
    if (out.length >= limit) break;
  }
  console.log(`ok ${src.name} (${src.cur}) — ${out.length} manchetes`);
  return out;
}

async function gather(sources, limit) {
  let out = [];
  for (const s of sources) { try { out = out.concat(await one(s, limit)); } catch (e) { console.warn(`FAIL ${s.name}: ${e.message}`); } }
  out.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return out;
}

async function main() {
  const items = (await gather(CB_SOURCES, 4)).slice(0, 20);          // painel BC
  const ticker = (await gather(MKT_SOURCES, 15)).slice(0, 30);       // ticker de mercado
  // fallback: se os feeds de mercado falharem, o ticker usa as manchetes de BC
  const tickerFinal = ticker.length ? ticker : items;

  const payload = {
    asof: new Date().toISOString().slice(0, 10),
    source: "Bancos centrais (RSS) + mercado (ForexLive/FXStreet)",
    status: items.length ? "ok" : "erro", provider: "RSS BC",
    items, ticker: tickerFinal
  };
  console.log(`\n${items.length} manchetes BC · ${tickerFinal.length} no ticker.`);
  if (DRY) { console.log(JSON.stringify({ items: items.slice(0, 3), ticker: tickerFinal.slice(0, 5) }, null, 2)); return; }
  await writeFile(join(DATA_DIR, "news.json"), JSON.stringify(payload, null, 2) + "\n");
  await buildBundle(DATA_DIR);
  console.log("data/news.json e data/gfdata.js atualizados.");
}

main().catch(e => { console.error(e); process.exit(1); });
