# Modelo de Score GF — Metodologia (réplica transparente da Cortex / EdgeFinder)

> Filosofia: **trading sem caixa-preta.** Todo número é rastreável até uma regra explícita.
> Escala mestra de sinais e saídas: **FORTE = ±2 · NORMAL = ±1 · NEUTRO = 0.**
> Data de referência da engenharia: 21/07/2026.

O modelo tem 3 saídas por ativo — **Score Técnico**, **Score Fundamentalista** e **Score Geral** —
todas em escala **−5 … +5**, mais **Força das Moedas** e **Cards de Par** (0–5 + direção).

---

## 1. SCORE TÉCNICO  (−5 … +5)

Calculado em 3 timeframes: **Semanal (W1), Diário (D1), H4** — regra de tendência do EdgeFinder
(médias móveis curta × longa + inclinação).

Por timeframe:
| Componente | Regra | Pontos |
|---|---|---|
| Cruzamento MM3 × MM14 | curta acima da longa | **+2** |
|  | curta abaixo da longa | **−2** |
|  | coladas | 0 |
| Inclinação MM14 | subindo | **+1** |
|  | lateral | 0 |
|  | descendo | **−1** |
| Ajuste de conflito | cruzamento de alta mas inclinação caindo | **−1** |
|  | cruzamento de baixa mas inclinação subindo | **+1** |

`TF_score ∈ [−3, +3]` → rótulo: `≥+2 ALTA FORTE · +1 ALTA · 0 NEUTRO · −1 BAIXA · ≤−2 BAIXA FORTE`

**Agregação** (timeframe maior pesa mais):
```
Técnico_raw = (1,2·W1 + 1,0·D1 + 0,8·H4) / 3      → [−3, +3]
Score Técnico = Técnico_raw × (5/3)                → [−5, +5]
```
Modificador opcional (±0,5): RSI em extremo (>70 / <30) contra a tendência, ou preço no topo/fundo do range de 52 semanas.

---

## 2. SCORE FUNDAMENTALISTA  (−5 … +5)

Soma de blocos disponíveis, normalizada. Para **índices e petróleo** o bloco Varejo não existe
(usa só COT + Sazonalidade + Macro), igual à Cortex.

### 2.1 COT — posicionamento institucional  (±2)
COT Index de Williams, janela de **3 anos (156 semanas)**:
```
COT Index = (Net_atual − Net_mín) / (Net_máx − Net_mín) × 100      (0–100)
Net = Long − Short   (grupo Large Speculators / não-comerciais)
```
| COT Index | Δ semanal | Pontos | Rótulo |
|---|---|---|---|
| > 90 | subindo | **+2** | ALTA FORTE |
| 60–90 | — | **+1** | ALTA |
| 40–60 | — | 0 | NEUTRO |
| 10–40 | — | **−1** | BAIXA |
| < 10 | caindo | **−2** | BAIXA FORTE |
> Alerta de reversão: index >90 ou <10 = extremo esticado → sinalizar risco, manter direção.

### 2.2 Varejo — sentimento de varejo (CONTRÁRIO)  (±2)
| % comprado (retail long) | Pontos |
|---|---|
| ≤ 20% (multidão vendida) | **+2** |
| 20–40% | **+1** |
| 40–60% | 0 |
| 60–80% | **−1** |
| ≥ 80% (multidão comprada) | **−2** |

### 2.3 Sazonalidade — 10 anos  (±2 índices/commodities · ±1 moedas)
Retorno médio histórico do mês/janela (D+7, D+15, D+30) + probabilidade de acerto.
- Retorno médio positivo → sinal +; negativo → −.
- Peso cheio quando retorno esperado **e** probabilidade (>60%) apontam para o mesmo lado; metade quando divergem.
- Índices/commodities recebem ±2 (sazonalidade mais pronunciada); moedas ±1.

### 2.4 Carry (juros) — para pares FX  (±2) · substitui o antigo bloco "Macro"
Ver §5.7. Para **índices e commodities**, este bloco vira "Macro" manual (diferencial de juros/ciclo, ±2).

**Agregação:**
```
Fund_raw = COT + Varejo + Sazonalidade + Macro          (blocos ativos)
Score Fundamentalista = Fund_raw / Σ|pontos_máx ativos| × 5   → [−5, +5]
```

---

## 3. SCORE GERAL  (−5 … +5)  — a fusão

```
Score Geral = w_téc · Score Técnico + w_fund · Score Fundamentalista
default: w_téc = w_fund = 0,5   (ajustáveis)
```
Rótulo: `≥+3 ALTA FORTE · +1…+3 ALTA · −1…+1 NEUTRO · −3…−1 BAIXA · ≤−3 BAIXA FORTE`

**Divergência / Confluência** (índice de convicção):
```
Alinhamento = 1 − |Score Técnico − Score Fundamentalista| / 10      (0 a 1)
```
- Perto de 1 → técnico e fundamento concordam = **alta convicção** (opere).
- Sinais opostos → Geral tende a zero automaticamente = **divergência** (fique de fora / meia mão).
- É por isso que na Cortex EURUSD com Fund ALTA FORTE mas Técnico BAIXA vira Geral ≈ neutro.

---

## 4. FORÇA DAS MOEDAS  (−5 … +5)

Para cada moeda X, no timeframe escolhido:
```
Força(X) = média, sobre todos os pares que contêm X, do Score Geral do par,
           com sinal + se X é a base e − se X é a quote
```
Gera o ranking de força relativa (USD, EUR, GBP, JPY, AUD, NZD, CAD, CHF).

---

## 5. CARD DE PAR

- **Nota** = Score Geral do par, exibido em magnitude 0–5 + direção (ALTA/BAIXA).
- **Rótulo** = faixa do Geral (seção 3).
- **Barra de Divergência** = Alinhamento (seção 3); cheia = confluência, vazia = brigando.
- Ranking dos melhores pares = maior |Score Geral| com maior Alinhamento.

---

## 5.5 FAROL DE REGIME — o clima que inclina os scores  (Tier 1a)

Antes de olhar ativo por ativo, o gestor lê o **regime**. O Farol traduz 5 leituras globais
em um **tilt** (−1 … +1) somado ao Score Geral de cada ativo.

**Entradas globais:** Dólar (DXY) ↑/→/↓ · Juros 10a (US10Y) ↑/→/↓ · VIX (calmo/normal/elevado/estresse)
· Crescimento (acelerando/desacelerando) · Inflação (subindo/caindo).

**Quadrante** (Crescimento × Inflação):
| | Inflação ↓ | Inflação ↑ |
|---|---|---|
| **Crescimento ↑** | GOLDILOCKS (ações) | REFLAÇÃO (commodities, moedas de risco) |
| **Crescimento ↓** | DEFLAÇÃO (USD, defensivos) | ESTAGFLAÇÃO (ouro, USD, CHF) |

**Apetite a risco (R):** `R = clamp(VIX_score + DXY_score, −1, +1)`
(VIX calmo +1 … estresse −1; DXY caindo +0,3 / subindo −0,3). R>0,3 = risk-on; R<−0,3 = risk-off.

**Tilt do ativo:** `tilt = clamp(0,6 · (R · afinidade_risco) + 0,4 · preferência_quadrante, −1, +1)`
- *afinidade_risco*: índices +1, petróleo +1, prata +0,3, ouro −0,6; para pares FX = (risco_base − risco_quote)/2
  (AUD/NZD +1, CAD +0,5, USD −0,4, JPY −1, CHF −0,8, EUR 0, GBP +0,2).
- *preferência_quadrante*: tabela por classe/moeda (ex.: em Reflação → petróleo +1, AUD +1, USD −0,6; em Estagflação → ouro +1, USD/CHF +).

**Score Geral ajustado = clamp(Geral_base + tilt, −5, +5).** Desligável no botão "Aplicar ao score".
> Ex. real (Reflação/Risk-on): AUDJPY +3,7 → **+4,4**; petróleo +1,9 → **+2,7**; USDCAD +0,8 → **+0,3** ▼.
> Ouro fica ~neutro no tilt: o bônus de reflação é anulado pelo drag de *safe-haven* num risk-on — sutileza proposital.

## 5.6 RISCO DE PORTFÓLIO — quantas apostas você *realmente* tem  (Tier 1b)

O ranking pode devolver 10 sinais que na verdade são 3 apostas. Esta camada revela a
exposição real via **modelo de fatores** (nada de caixa-preta).

**Vetor de fatores por ativo** (8 moedas + RISK + GOLD + OIL):
- FX `AAABBB` → +1 na moeda base, −1 na quote, RISK = afinidade de risco do par.
- Índice → RISK +1, USD −0,3. Ouro → GOLD +1, RISK −0,6, USD −0,8. Prata → GOLD +0,6, RISK +0,3, USD −0,6. Petróleo → OIL +1, RISK +0,6.

**Correlação entre duas posições** = `cosseno(vetorA, vetorB) × direçãoA × direçãoB`.
Positivo = risco **soma** (mesma aposta); negativo = **hedge** (risco se anula).

**Book** = sinais acionáveis (|Score Geral| ≥ 2,0), cada um na direção sinalizada. A camada mostra:
- **Sinais → apostas reais**: nº de clusters (componentes com correlação ≥ 0,60) = apostas independentes. Ex.: 10 sinais → 5 apostas.
- **Viés do book**: soma das exposições → LONG/SHORT risco e USD.
- **Exposição líquida por moeda**: barras (ex.: +3 AUD, −3 JPY = book é uma aposta AUD/risk-on).
- **Clusters**: cada grupo correlacionado com seu fator comum + a **expressão mais limpa** (maior score × convicção). "Se abrir mais de um, dimensione como 1 risco."
- **Matriz de correlação**: heatmap do book (verde = soma risco, vermelho = hedge).

> Objetivo de gestor: não empilhar risco correlacionado sem perceber. Zona de perigo = correlação > 0,85.

## 5.7 JUROS & CARRY — o maior driver de câmbio  (Tier 1c)

Entrada global: **juro de política de cada banco central** (8 moedas) + **viés** (Alta ▲ / Estável = / Corte ▼).

**Diferencial por par:** `dif = juro(base) − juro(quote)`. Positivo = você é *pago* para segurar o par (carry positivo).

**Pontos de carry** (entram no Score Fundamentalista do par, no lugar do bloco Macro):
| |dif| | Pontos |
|---|---|
| ≥ 2,5% | ±2 |
| 1,0–2,5% | ±1 |
| < 1,0% | 0 |
(sinal = sinal do diferencial)

**Alerta de carry desmontando:** se `dif > 1,0` **e** a moeda de *funding* (quote) está subindo juros (viés Alta),
o carrego está sendo corroído → **−1 ponto** e selo ⚠ no card. É o risco do iene hoje:
JGB subindo desmonta USDJPY/AUDJPY/NZDJPY mesmo com o nível de carry ainda alto.

> Seed 2026: USD 4,50 · EUR 2,15 · GBP 4,00 · JPY 0,75 (Alta) · AUD 3,60 · NZD 3,00 · CAD 2,75 · CHF 0,25.
> Resultado: maior carry USDCHF +4,25%; USDJPY +3,75% e AUDJPY +2,85% sinalizados ⚠ desmontando.
> Efeito real: long EURUSD ganha carry **negativo** (−1, EUR paga vs USD); USDCHF sobe pelo carry alto.

## 5.8 ALOCADOR DE RISCO — direção vira tamanho  (Tier 2)

O capstone: converte score + convicção + regime + correlação + carry em **quanto arriscar**.
Gestor aloca *risco*, não *lote*.

**Cada cluster de correlação = 1 aposta** (divide UM orçamento, não N). Para cada aposta:
- `força` = |Score Geral| da expressão mais limpa; `conv` = convicção dela.
- `qualidade q = min(1, (força/5)·0,5 + conv·0,5) × (carry desmontando ? 0,6 : 1)`.
- `risco = risco_base × q`, e se `Σrisco > cap` tudo é escalado para caber no cap.

**Controles (julgamento do trader, corretamente manuais):** risco-base por aposta (default 1,5%),
cap de risco do book (default 6%), capital opcional (converte % → R$).

**Saída:** um card por aposta com o risco sugerido, a expressão mais limpa, e os membros redundantes
marcados "não somar risco". A aposta frágil/concentrada é sizada para baixo mesmo com score alto.
> Ex. seed: ouro 1,28% (limpo, convicção 95%) > AUDJPY 0,88% (maior score +4,9, mas cluster de 5 + ⚠ carry).

## 5.9 FUNDAMENTOS DE COMMODITY — drivers reais  (Tier 2)

Para ouro/prata e petróleo o Score Fundamentalista troca o template genérico pelos drivers que de fato movem o ativo:

**Ouro / Prata** = `COT + Sazonalidade + Juro real 10a + Compra de bancos centrais + DXY→ouro`
- **Juro real** é o driver nº 1 (correlação histórica ≈ −0,82): caindo = alta do ouro (±2).
- **Compra de BCs**: forte = alta (±2). **DXY→ouro**: derivado **automático** do Farol (DXY caindo = +1) — sem input manual.

**Petróleo** = `COT + Sazonalidade + Estoques + OPEC+ + Geopolítica/Hormuz`
- Estoques caindo = aperto = alta (±2). OPEC+ cortando/contendo = alta. Prêmio geopolítico (Hormuz) = alta.

## 5.10 RISCO DE EVENTO — timing  (Tier 2)

Calendário de alto impacto por moeda: **Nenhum / Esta semana / Iminente ≤48h** (+ rótulo, ex. FOMC/CPI/BoJ).
Um ativo herda o pior evento entre suas moedas (FX: base+quote; índices/commodities: USD).
- **Não muda a direção/score** — muda o **timing e o tamanho**.
- No Alocador de Risco: evento **iminente ×0,5** no risco alocado; **esta semana ×0,85**.
- Selo nos cards: ⚠ evento (iminente, vermelho) / ◐ evento (semana, azul).
> Ex.: BoJ iminente derruba AUDJPY de 0,88% → 0,44% (em cima do corte de carry); AUDCAD (sem evento) sobe a #1.

## 6. Como o indicador Pine se pluga aqui

O Pine (a enviar) deve exportar, por ativo/timeframe, os **insumos crus**, não o veredito:
`MM3, MM14, inclinação, RSI, posição no range 52s` (técnico) e, se tiver, `COT Index, %varejo`.
A ferramenta aplica as regras acima. Assim o Pine vira a "fonte de dados" e o motor de score
continua único e transparente — trocar o Pine não muda a metodologia.

---
### Fontes da engenharia
- COT Index (Williams), janela 3 anos, fórmula posição-no-range 0–100.
- EdgeFinder: Trend (SMA 3 × SMA 14 + inclinação, ±2/±1), Varejo contrário (≥60% long → −1; ≤40% → +1),
  Sazonalidade 10 anos (±2 índices/commodities, ±1 moedas), score final = Técnico + Sentimento/COT + Fundamentos.
