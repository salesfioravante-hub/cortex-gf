#!/usr/bin/env node
/* GF Quant — monta data/gfdata.js a partir de TODOS os data/*.json.
 * Contrato único que o app consome via window.GFDATA (carregado por <script> com cache-bust).
 * Usado pelos fetchers (fetch-cot, fetch-fred, …) e também roda sozinho:  node scripts/build-bundle.mjs */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

export async function buildBundle(DATA_DIR) {
  const files = (await readdir(DATA_DIR)).filter(f => f.endsWith(".json"));
  const meta = { generated: new Date().toISOString(), sources: {} };
  const out = { cot: {}, regime: null, commodity: {}, events: {}, cbcal: {} };

  for (const f of files) {
    const key = f.replace(".json", "");
    let j; try { j = JSON.parse(await readFile(join(DATA_DIR, f), "utf8")); } catch { continue; }

    if (key === "cot" && j.byAsset) {
      out.cot = Object.fromEntries(Object.entries(j.byAsset).map(([s, v]) => [s, { pts: v.pts }]));
      meta.sources.cot = { status: j.status, asof: j.asof, provider: "CFTC" };
    }
    if (key === "regime" && j.regime) {
      out.regime = j.regime;
      if (j.commodity) out.commodity = { ...out.commodity, ...j.commodity };
      meta.sources.regime = { status: j.status, asof: j.asof, provider: "FRED" };
    }
    if (key === "cbcalendar" && j.byCurrency) {
      out.cbcal = j.byCurrency;
      meta.sources.calendario = { status: "ok", asof: j.atualizado, provider: "Bancos centrais" };
    }
    if (key === "events" && j.byCurrency) {
      out.events = j.byCurrency;
      meta.sources.events = { status: j.status, asof: j.asof, provider: j.provider || "calendar" };
    }
  }

  const js = `/* GF Quant — bundle de dados automáticos (gerado por scripts/build-bundle.mjs). NÃO editar à mão. */
window.GFDATA = window.GFDATA || {};
window.GFDATA.meta = ${JSON.stringify(meta)};
window.GFDATA.cot = ${JSON.stringify(out.cot)};
window.GFDATA.regime = ${JSON.stringify(out.regime)};
window.GFDATA.commodity = ${JSON.stringify(out.commodity)};
window.GFDATA.events = ${JSON.stringify(out.events)};
window.GFDATA.cbcal = ${JSON.stringify(out.cbcal)};
`;
  await writeFile(join(DATA_DIR, "gfdata.js"), js);
  return { meta, out };
}

// execução standalone
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir = dirname(fileURLToPath(import.meta.url));
  buildBundle(join(dir, "..", "data")).then(() => console.log("data/gfdata.js regenerado."));
}
