# Camada de dados — como ligar a automação

Fluxo: **fontes abertas → fetcher (Node) → `data/*.json` + `data/gfdata.js` → app lê `window.GFDATA`**.
O app tem *fallback*: se o bundle faltar ou uma fonte cair, usa o seed embutido (nada quebra).

## Rodar localmente (COT — não precisa de chave)
```bash
cd cortex-gf
node scripts/fetch-cot.mjs          # busca, calcula e escreve data/cot.json + data/gfdata.js
node scripts/fetch-cot.mjs --dry    # só imprime, não escreve
```
Node 18+ (usa `fetch` nativo). Abra o `index.html` depois — o cabeçalho mostra a fonte e a data.

## Verificação 24h (GitHub Actions)
1. Suba a pasta `cortex-gf/` como um repositório no GitHub (a raiz deve conter `scripts/`, `data/`, `.github/`).
2. O workflow `.github/workflows/data.yml` já roda: **sexta 20:30 UTC** (após o COT) e **diário 11:00 UTC**.
   Também dá pra rodar na mão em *Actions → Atualizar dados → Run workflow*.
3. Ele busca, valida e **commita** os JSON. O app hospedado passa a refletir os dados novos.

## Confirmar na 1ª execução
- **RESOURCE** do Socrata e os **códigos de contrato** em `scripts/fetch-cot.mjs` (`CONTRACTS`).
  O script loga `index`/`pts` por contrato — se algum vier vazio, ajuste o código no portal
  https://publicreporting.cftc.gov (Legacy Futures-Only).

## Conflito em `data/gfdata.js` (esperado, e por que)

O robô do GitHub e a máquina local **geram** esse arquivo. Se os dois gerarem entre sincronizações,
o git acusa conflito. A resolução correta **nunca é escolher um lado** — é regerar:

```bash
node scripts/build-bundle.mjs && git add data/gfdata.js && git rebase --continue
```

O atalho `ENVIAR PROJETO PARA O GITHUB.bat` (Área de Trabalho) já faz isso sozinho.

## Próximas fontes (mesma receita)
- `scripts/fetch-fred.mjs` → VIX (`VIXCLS`), DXY (`DTWEXBGS`), US10Y (`DGS10`), juro real (`DFII10`),
  CPI (`CPIAUCSL`), emprego (`PAYEMS`) — grava `data/regime.json`/`macro.json`. Precisa `FRED_API_KEY` (grátis).
- `scripts/fetch-calendar.mjs` → eventos (FMP/Finnhub) → `data/events.json`. Precisa chave free tier.
- `writeBundle()` no fetcher já regenera `gfdata.js` juntando todos os `data/*.json`.

Detalhes das fontes e licenças: ver `../FONTES-DADOS.md`.
