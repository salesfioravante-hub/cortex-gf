# GF Quant — Tutorial completo (para quem nunca usou)

Versão crua. Sem preocupação com design. O objetivo é você conseguir usar sozinho.

---

## 1. O que é esta ferramenta

É um **painel que dá nota para ativos** (moedas, ouro, petróleo, índices americanos).

Ela responde três perguntas, nesta ordem:

1. **Para que lado?** — o ativo está para subir ou para cair?
2. **Com quanta confiança?** — o fundamento e o gráfico concordam entre si?
3. **Quanto arriscar?** — quanto do seu capital colocar em cada ideia.

A nota final vai de **−5 (venda forte)** a **+5 (compra forte)**.

**O que ela NÃO é:** não é robô, não manda ordem, não adivinha o futuro. É um organizador de
evidências. A decisão continua sendo sua.

---

## 2. Como abrir

Duplo clique no arquivo:

```
C:\Users\gabri\Downloads\ui-ux-pro-max-skill-main\cortex-gf\index.html
```

Abre no navegador. Funciona sem internet. Tudo que você editar fica salvo naquele navegador.

---

## 3. A regra de ouro (entenda isto e você entende tudo)

Toda leitura da ferramenta usa **a mesma escala de 5 degraus**:

| Leitura | Vale | Cor |
|---|---|---|
| ALTA FORTE | +2 | verde escuro |
| ALTA | +1 | verde claro |
| NEUTRO | 0 | cinza |
| BAIXA | −1 | vermelho claro |
| BAIXA FORTE | −2 | vermelho escuro |

Essas notinhas se somam e viram três placares por ativo:

- **Score Técnico** — o que o gráfico diz (de −5 a +5)
- **Score Fundamentalista** — o que a economia/posicionamento diz (de −5 a +5)
- **Score Geral** — a mistura dos dois (de −5 a +5) ← **é o número que importa**

E o Geral vira um rótulo:

- **+3 ou mais** = ALTA FORTE
- **+1 a +3** = ALTA
- **−1 a +1** = NEUTRO (fique de fora)
- **−3 a −1** = BAIXA
- **−3 ou menos** = BAIXA FORTE

### O conceito mais importante: CONVICÇÃO

Se o gráfico diz "sobe" e o fundamento diz "cai", eles se anulam e o Geral fica perto de zero.
Isso é proposital. **Quando os dois brigam, você não tem trade.**

A barra de **Convicção** mostra o quanto os dois concordam:

- **90–100%** = os dois apontam junto → sinal forte
- **abaixo de 60%** = estão brigando → desconfie

---

## 4. Rotina diária de 5 minutos (o jeito prático de usar)

Faça nesta ordem, de cima para baixo. A tela foi montada nessa sequência de propósito.

1. **Olhe o cabeçalho** (canto superior direito). Tem que estar verde: `COT ok`, `REGIME ok`.
   Se aparecer âmbar com "⚠ vencido", os dados estão velhos — não confie nas notas.

2. **Leia o Farol de Regime.** Qual o clima? (REFLAÇÃO, ESTAGFLAÇÃO...) e o apetite a risco
   (RISK-ON / NEUTRO / RISK-OFF). Isso já te diz que tipo de ativo tende a ir bem hoje.

3. **Veja o Risco de Evento.** Tem banco central decidindo juro hoje ou amanhã? Se sim, aquela
   moeda está "minada" — a ferramenta já reduz o risco dela sozinha.

4. **Olhe o Ranking de Oportunidades.** São os melhores sinais, já ordenados.

5. **Desça até o Risco de Portfólio.** Aqui está a pergunta que salva conta:
   *"esses sinais são independentes ou é tudo a mesma aposta?"*

6. **Termine no Alocador de Risco.** Ele diz quanto arriscar em cada ideia.

Pronto. Você tem uma leitura de mesa em 5 minutos.

---

## 5. A tela, seção por seção

### 5.1 Cabeçalho
Mostra a saúde dos dados automáticos: qual fonte, de que dia, e se está vencido.
**Se estiver âmbar/vermelho, pare e resolva antes de operar.**

### 5.2 Barra de controles (logo abaixo)

- **Peso Técnico × Fundamentalista** — quanto cada lado pesa no Geral. Padrão 50/50.
  Se você é mais gráfico, puxe para a esquerda; mais macro, para a direita.
- **Base do ranking** — como ordenar os cards:
  - *Convicção* (padrão): melhores sinais, considerando concordância
  - *Alta*: só as maiores compras
  - *Baixa*: só as maiores vendas
- **Restaurar dados 21/07** — desfaz TUDO que você editou e volta ao original. Cuidado.

### 5.3 Farol de Regime — "o clima do mercado"

Aqui a ferramenta descobre em que "estação do ano" o mercado está, cruzando **Crescimento** com
**Inflação**:

| | Inflação caindo | Inflação subindo |
|---|---|---|
| **Crescimento subindo** | GOLDILOCKS (bom p/ ações) | REFLAÇÃO (bom p/ commodities e moedas de risco) |
| **Crescimento caindo** | DEFLAÇÃO (bom p/ dólar) | ESTAGFLAÇÃO (bom p/ ouro e dólar) |

Também mostra o **Apetite a risco** (calculado do VIX + dólar):

- **RISK-ON** = mercado tranquilo, gosta de risco → favorece AUD, NZD, ações
- **RISK-OFF** = mercado com medo → favorece iene, franco suíço, dólar, ouro

**O que ele faz com isso:** ajusta a nota de cada ativo conforme o clima. Um card mostra, por exemplo:
`Regime ▲ +0,8 · base +3,7` — quer dizer: a nota original era 3,7 e o clima favorável somou 0,8.

O botão **"Aplicar ao score"** desliga esse ajuste se você quiser ver as notas puras.

> Estes 5 campos são **preenchidos automaticamente** pelo FRED (banco de dados do Fed).

### 5.4 Juros & Carry — "quem te paga para esperar"

Quando você compra um par de moedas, você recebe (ou paga) a diferença de juros entre elas.
Isso se chama **carry** e é o maior motor do câmbio no médio prazo.

- **Os 8 quadradinhos**: o juro de cada banco central e para onde ele está indo
  (Alta ▲ / Estável = / Corte ▼).
- **Painel da direita**: os pares que mais pagam carry.

**⚠ "Carry desmontando"** — este alerta é o mais importante da seção. Significa: você ganha juros
nesse par, **mas a moeda que financia a operação está subindo juros**, corroendo seu ganho. É o
clássico aviso de reversão. Hoje isso aparece nos pares com iene.

> Atenção: **estes juros ainda são preenchidos à mão** e os valores atuais são estimativas.
> Confira com a realidade antes de confiar. É o próximo item a ser automatizado.

### 5.5 Risco de Evento — "não entre na véspera"

Mostra qual banco central decide juros e quando.

- **Iminente (≤48h)** — evento em até 2 dias
- **Esta semana** — evento em até 7 dias

**O que a ferramenta faz:** ela **não muda a direção** do sinal — muda o **tamanho**.
Evento iminente corta o risco alocado **pela metade**; "esta semana" corta 15%.

Lógica de gestor: a tese pode estar certa, mas entrar na véspera de um Fed é apostar em moeda.

> Preenchido automaticamente pelo calendário oficial dos bancos centrais.

### 5.6 Ranking de Oportunidades — os melhores sinais

Cada card mostra:
- **Sigla e nome** do ativo
- **Rótulo** (ALTA FORTE, BAIXA...)
- **Número grande** = o Score Geral
- **Selos de alerta**: `⚠ carry` (carry desmontando) e `⚠ evento` (banco central chegando)
- **Linha do regime**: quanto o clima ajudou ou atrapalhou
- **Barra de Convicção**: quanto fundamento e gráfico concordam

**Clique em qualquer card** para abrir a ficha completa e editar.

### 5.7 Rastreador Macro — a tabela mestra

É o "raio-x" de todos os ativos. Cada linha mostra de onde veio a nota:

**Lado fundamentalista:**
- **COT** — o que os grandes fundos estão fazendo (posição institucional)
- **Varejo** — o que a massa está fazendo. **É invertido de propósito**: se todo mundo está
  comprado, isso é sinal de venda (a maioria costuma errar)
- **Sazonalidade** — o comportamento histórico do ativo nesta época do ano
- **Score F** — a soma disso tudo

**Lado técnico:**
- **W1 / D1 / H4** — a tendência no gráfico semanal, diário e de 4 horas
- **Score T** — a soma, com o semanal pesando mais

**Geral:**
- **Conv.** — barra de convicção
- **Score** — a nota final com o rótulo

Setinhas ▲▼ ao lado da nota indicam que o regime mexeu nela.

**Clique em qualquer linha** para editar.

### 5.8 Força das Moedas

Ranking das 8 moedas, da mais forte para a mais fraca.

**Como usar:** o melhor par é **comprar a mais forte contra a mais fraca**. Se AUD está +2,7 e
JPY está −3,2, o par AUD/JPY é o mais "esticado" entre as duas pontas.

### 5.9 Risco de Portfólio — "quantas apostas eu realmente tenho?"

**Esta é a seção que separa amador de profissional.** Leia com atenção.

Se a ferramenta te dá 10 sinais e você abre os 10 achando que diversificou, mas todos dependem do
dólar cair — você não tem 10 trades, **tem 1 trade com 10 vezes o tamanho**. Quando virar, vira tudo junto.

O que a seção mostra:

- **Sinais acionáveis** — quantos passaram do corte (nota ≥ 2)
- **Sinais → apostas reais** — ex.: `10 → 5` significa que os 10 sinais são, na verdade, 5 apostas
- **Viés do book** — para onde você está inclinado no total (ex.: LONG risco, SHORT dólar)
- **Exposição líquida por moeda** — barras mostrando sua concentração real
- **Clusters de correlação** — grupos que são a mesma aposta. Cada um sugere a
  **expressão mais limpa** (o melhor par para representar aquela ideia) e marca os outros como
  "já coberto — não somar risco"
- **Matriz de correlação** — verde = os riscos se somam; vermelho = um protege o outro

### 5.10 Alocador de Risco — quanto colocar

Converte tudo em **quanto arriscar**.

**Controles:**
- **Risco por aposta** — quanto arriscar numa ideia perfeita (padrão 1,5% do capital)
- **Cap de risco do book** — o teto total (padrão 6%)
- **Capital (opcional)** — se você digitar, ele converte os % em reais

**Como ele decide o tamanho:** cada cluster é **uma aposta** e divide **um** orçamento (não vários).
O tamanho aumenta com nota e convicção, e **diminui** com alerta de carry (×0,6) e de evento
(×0,5 se iminente).

**Exemplo real:** o AUDJPY tinha a maior nota (+4,9), mas levou o menor tamanho — porque é um
grupo de 5 sinais iguais, tem carry desmontando e evento chegando. Já o ouro, mais limpo, levou mais.
**O trade "mais bonito no papel" nem sempre é o que merece mais dinheiro.**

Cada card mostra: o par escolhido, LONG ou SHORT, o **% de risco sugerido**, e os pares redundantes.

---

## 6. Como editar uma leitura

1. Clique em qualquer **card** ou **linha da tabela**
2. Abre um painel do lado direito com:
   - Os três placares no topo (Técnico, Fundamentalista, Geral)
   - Os campos, cada um com uma listinha de 5 opções
3. Mude qualquer campo → **tudo recalcula na hora**
4. Feche no ✕ ou aperte `Esc`

Fica salvo automaticamente naquele navegador.

**Campos diferentes por tipo de ativo:**
- **Moedas**: COT, Varejo, Sazonalidade, Carry (este é calculado, não editável)
- **Ouro/Prata**: COT, Sazonalidade, Juro real, Compra de bancos centrais, Dólar (automático)
- **Petróleo**: COT, Sazonalidade, Estoques, OPEC+, Geopolítica
- **Índices**: COT, Sazonalidade, Macro

---

## 7. O que é automático e o que você preenche

### Automático (não toque)
| O quê | De onde vem | Atualiza |
|---|---|---|
| COT (posição dos fundos) | CFTC (órgão dos EUA) | toda sexta |
| Regime (dólar, juros, VIX, crescimento, inflação) | FRED (Fed) | todo dia |
| Juro real do ouro | FRED | todo dia |
| Calendário de eventos | sites dos bancos centrais | fixo no ano |

### Você preenche (por enquanto)
| O quê | Observação |
|---|---|
| **Técnico (W1, D1, H4)** | você lê no seu gráfico e marca. Vai ser automatizado pelo indicador Pine |
| **Juros de política** | os valores atuais são estimativas — confira |
| **Varejo** | precisa de fonte de sentimento |
| **Sazonalidade** | precisa de histórico |
| **Estoques/OPEC/Geopolítica** (petróleo) | leitura sua |
| **Pesos e risco** | isto é **estratégia sua** e deve continuar manual |

---

## 8. Glossário

- **COT** — relatório semanal que mostra a posição dos grandes fundos nos mercados futuros dos EUA.
  Se eles estão muito comprados, é sinal de alta (mas em extremos vira risco de reversão).
- **Carry** — a diferença de juros entre duas moedas. Positivo = você recebe por manter a posição.
- **Convicção** — o quanto o gráfico e o fundamento concordam.
- **Divergência** — o oposto: eles brigando. Sinal fraco.
- **Regime** — o "clima" do mercado (crescimento e inflação subindo ou caindo).
- **Risk-on / Risk-off** — mercado disposto a arriscar / com medo.
- **Cluster** — grupo de sinais que na prática são a mesma aposta.
- **Correlação** — o quanto dois ativos andam juntos. Alta correlação = risco dobrado sem perceber.
- **Sazonalidade** — tendência do ativo em certa época do ano, medida em 10 anos de histórico.
- **Juro real** — o juro descontada a inflação. **É o principal motor do ouro**: juro real caindo,
  ouro sobe.
- **DXY** — índice que mede a força do dólar contra uma cesta de moedas.
- **VIX** — o "medidor de medo" da bolsa americana. Baixo = calmaria; alto = pânico.
- **Book** — o conjunto das suas posições.
- **Expressão mais limpa** — dentro de um grupo de sinais iguais, o melhor par para representar a ideia.

---

## 9. Manutenção

### Enviar mudanças para o GitHub
Duplo clique em **`ENVIAR PROJETO PARA O GITHUB`** na Área de Trabalho. Espere "PRONTO".

### Os dados se atualizam sozinhos
Todo dia às 8h (Brasília) e toda sexta depois que a CFTC publica o COT.
Para rodar na hora: GitHub → aba **Actions** → "Atualizar dados (24h)" → **Run workflow**.

### Uma vez por ano (dezembro)
Atualizar o arquivo `data/cbcalendar.json` com as datas de reunião dos bancos centrais do ano
seguinte. Elas saem nos sites oficiais.

### Se o cabeçalho ficar âmbar
Quer dizer dado vencido. Rode o workflow. Se continuar, alguma fonte quebrou.

---

## 10. Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| Cabeçalho diz "usando seed" | o arquivo de dados não carregou | rode o workflow e sincronize |
| Notas não mudam ao editar | navegador travado | recarregue com `Ctrl+Shift+R` |
| Quero começar do zero | edições bagunçadas | botão "Restaurar dados 21/07" |
| Nenhum sinal no Alocador | nada passou de nota 2 | normal em mercado sem tendência — **não force trade** |
| Dados velhos mesmo após atualizar | cache do navegador | `Ctrl+Shift+R` |

---

## 11. Os 3 erros que a ferramenta existe para evitar

1. **Operar contra o fundamento** achando que o gráfico basta (ou o contrário).
   → A convicção denuncia.
2. **Abrir 5 posições que são a mesma aposta** achando que diversificou.
   → O Risco de Portfólio denuncia.
3. **Entrar grande na véspera de um banco central.**
   → O Risco de Evento corta o tamanho sozinho.

Se você só usar a ferramenta para evitar esses três, já vale.

---

## 12. Aviso

Ferramenta de apoio à decisão, construída com dados públicos. Não é recomendação de investimento.
As notas dependem das leituras que entram — **lixo entra, lixo sai**. O objetivo do projeto é o
oposto da caixa-preta: **todo número aqui pode ser rastreado até a regra que o gerou**, e todas as
regras estão em `METODOLOGIA.md`.
