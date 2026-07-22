# Camada de Dados GF Quant — Fontes abertas + verificação 24h

> Objetivo: **o cliente digita o mínimo possível.** Cada "fato" é buscado automaticamente;
> só pesos e overlays discricionários ficam manuais. Um job roda 24h, valida e carimba a data/fonte.

## 1. Mapa de fontes (fator → fonte aberta)

| Fator na ferramenta | Fonte aberta recomendada | Como / endpoint | Licença | Cadência | Custo/limite |
|---|---|---|---|---|---|
| **Eventos + projeções** (Risco de Evento) | **Financial Modeling Prep** ou **Finnhub** (calendário econômico c/ *estimate/previous/actual*) | `/economic_calendar` (REST JSON) | Comercial (free dev) | intradiário | free tier limitado; pago no público |
| ↳ datas oficiais (cross-check) | **FRED release calendar** | `fred/releases/dates` (JSON) | **Domínio público** | diário | grátis, key grátis |
| ↳ reuniões de BC | Calendários oficiais Fed/ECB/BoE/BoJ + Trading Economics | páginas oficiais / TE API | público / comercial | conforme agenda | grátis (oficial) |
| **Juros de política** (Carry) | **FRED** (Fed: `DFEDTARU`) + Trading Economics p/ demais BCs | `fred/series/observations` | público (Fed) / comercial (TE) | em decisão (~8×/ano) | grátis/limitado |
| **COT** (institucional) | **CFTC Public Reporting (Socrata)** — TFF p/ FX/índices, Disaggregated p/ commodities | `publicreporting.cftc.gov` Socrata REST JSON (`$where/$limit`) | **Domínio público** | semanal (sex 15:30 ET) | **grátis, sem auth** |
| **VIX / DXY / US10Y** (Regime) | **FRED** `VIXCLS` · `DTWEXBGS` · `DGS10` | `fred/series/observations` | **Domínio público** | diário | grátis |
| **Juro real 10a** (ouro) | **FRED** `DFII10` (TIPS 10a) | idem | **Domínio público** | diário | grátis |
| **Crescimento/Inflação** (quadrante) | **FRED** `CPIAUCSL`/`CPILFESL`, `PAYEMS`, `UNRATE`, `GDPC1` | idem | **Domínio público** | mensal/trim. | grátis |
| **Estoques de petróleo** | **EIA API** (crude inventories) | api.eia.gov (key grátis) | **Domínio público** | semanal | grátis |
| **Varejo** (contrário) | **Myfxbook Community Outlook** (majors + XAUUSD) | `get-community-outlook` | Comercial | 60s | free 100 req/24h |
| **Preço / técnico** (MM, RSI, tendência) | **Indicador Pine do usuário** (primário) · alt.: Twelve Data / Finnhub / Yahoo | export do Pine → JSON | — | intradiário | — |
| **Sazonalidade** | calculada do histórico de preço (janela 10a) | mesma fonte de preço | — | recalcula | — |
| **DXY→ouro** | derivado do Regime (já automático) | interno | — | — | — |
| **Compra de BCs (ouro)** | World Gold Council (trimestral) | relatório WGC | — | trimestral | grátis (baixa freq.) |

**Regra de ouro de licença (importante pro público):** priorizar **domínio público** — **FRED, CFTC, EIA**
(dados do governo dos EUA) cobrem a maior parte e podem ser usados comercialmente. FMP/Finnhub/Trading
Economics/Myfxbook são APIs **comerciais**: ótimas p/ desenvolver, exigem plano pago quando escalar.

## 2. Foco imediato — Eventos & projeções (automatizar o painel Risco de Evento)

Fluxo automático (sem input do cliente):
1. Job busca o **calendário** (FMP/Finnhub) filtrando **alto impacto** (FOMC, CPI, NFP, GDP, decisões de juros, BoJ…).
2. Cross-check das datas com **FRED release calendar** (autoridade) + agendas oficiais de BC.
3. Para cada moeda, calcula o **próximo evento** e o *days-until* → classifica `Iminente ≤48h / Esta semana / Nenhum`.
4. Escreve `events.json`; a ferramenta preenche o painel sozinha (campo vira override avançado, escondido).
5. **Projeções**: o `estimate`/`consensus` do calendário alimenta o viés esperado; a direção da surpresa
   (actual vs forecast) pode auto-ajustar Crescimento/Inflação do Farol. Sazonalidade = projeção do histórico.

## 3. Arquitetura da verificação 24h

```
[Fontes abertas] → [Job de ingestão (cron)] → [/data/*.json versionado] → [App estático lê os JSON]
                                   ↓
                       validação + carimbo (fonte, hora, status)
```

- **Front-end continua estático** (nosso HTML). Só passa a **ler JSON** em vez de seed hard-coded, com
  *fallback* pro seed atual se a fonte falhar. O humano só mexe em pesos/overlays.
- **Job de ingestão** roda em cadências casadas com cada fonte:
  | Cadência | O quê |
  |---|---|
  | diário (2–3×) | calendário/eventos, VIX/DXY/US10Y, juro real |
  | on-release | CPI/NFP/GDP (dispara pelo FRED release dates) |
  | sexta 15:30 ET | COT (CFTC) |
  | semanal | estoques EIA |
  | intradiário (opcional) | varejo (Myfxbook) |
- **Onde rodar (free):** **GitHub Actions cron** (grátis, faz commit dos JSON) — mais simples p/ "24h";
  alternativas: **Cloudflare Workers Cron** ou função agendada Vercel/Netlify.
- **Verificação/saúde:** cada fetch é validado (schema + faixa de valores + *frescor*). Um `status.json`
  guarda verde/atrasado/erro por fonte. Se uma fonte cair, mantém o último valor bom e marca **stale**.
  A UI mostra "atualizado em DD/MM · fonte X" e um ponto de saúde. Isso É a verificação 24h.

## 4. Plano de build (incremental, sem quebrar o que existe)

1. **Contrato de dados**: definir `data/{events,rates,regime,cot,sentiment}.json` + `status.json`.
2. **Refatorar o app** para ler os JSON (com fallback pro seed) — nada muda visualmente se o JSON faltar.
3. **Primeiro fetcher real = CFTC COT** (grátis, sem key, domínio público) como prova de conceito.
4. **FRED** (VIX/DXY/US10Y/juro real/CPI) — key grátis.
5. **Calendário** (FMP/Finnhub free) → `events.json`.
6. **GitHub Actions cron** rodando os fetchers + validação + commit → verificação 24h no ar.
7. Esconder inputs que viraram automáticos atrás de "override avançado".

> Decisão pendente do dono: **onde hospedar o job 24h** (GitHub Actions recomendado) e **quais chaves** criar
> (FRED grátis já; FMP/Finnhub/Myfxbook free p/ dev, plano pago no lançamento público).
