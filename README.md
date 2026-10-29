# Eu Poupador

Painel de finanças pessoais em React, JavaScript e CSS, com Create React App.
Usa React Router para navegação, ApexCharts para gráficos, Firebase Authentication
para login e Cloud Firestore para consultar os dados financeiros.

## Funcionamento atual

| Tela | Rota | Integração atual |
| --- | --- | --- |
| Login | `/login` | Login por e-mail e senha, recuperação de senha e validação de assinatura. |
| Balanço Mensal | `/` | Todos os dez gráficos usam dados do usuário no Firestore: **Saldo: Receitas vs. Despesas**, **Saldo: Acumulado vs. Previsto**, **Receitas: Recebido vs. Previsto por fonte e totais**, **Despesas: Gasto vs. Previsto por despesa e totais**, **Despesas por Categoria**, **Despesas por Tipo**, **Despesas por Utilidade** e **Método 4D (Despesas Por Tipo): Gasto vs. Previsto**. |
| Objetivos | `/objetivos` | Todos os seis gráficos compartilham os dados do usuário no Firestore: os três gráficos mensais e os três globais, **Acúmulos e Amortizações**, **Grau de Compromisso Global** e **Atual vs. Desejado**. |
| Resultados | `/resultados` | Dados financeiros de demonstração, com consulta pública da Selic no gráfico de rendimentos percentuais. |

As telas do painel exigem login e assinatura válida. A série Selic em Resultados
usa um período fixo definido no componente e ainda não acompanha o seletor de mês.
O painel consulta as transações; o cadastro e a edição dos lançamentos continuam
no aplicativo que alimenta o Firebase.

## Executar localmente

Use Node.js 22 e npm. O SDK Firebase está fixado em `12.19.0`, com `overrides` de
`@firebase/app` e `@firebase/app-compat` no `package.json`. Preserve essas definições
e o `package-lock.json` ao instalar as dependências.

Use a pasta que contém este `package.json` (`eu-poupador/eu-poupador` neste workspace).

```powershell
npm ci
```

Se `.env.local` ainda não existir, crie esse arquivo na mesma pasta do `package.json`.
Preencha as variáveis abaixo com a configuração do aplicativo Web no Firebase
Console, em Configurações do projeto:

```dotenv
REACT_APP_FIREBASE_API_KEY=
REACT_APP_FIREBASE_AUTH_DOMAIN=
REACT_APP_FIREBASE_PROJECT_ID=
REACT_APP_FIREBASE_APP_ID=
REACT_APP_FIREBASE_STORAGE_BUCKET=
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=
```

As quatro primeiras variáveis são obrigatórias; os campos de storage e mensagens
são opcionais para os recursos atuais. Use a configuração Web do mesmo projeto
Firebase utilizado pelo aplicativo, para acessar as mesmas contas e transações.
Esses valores são incorporados ao código do navegador; não coloque credenciais
administrativas ou chaves privadas no frontend. O arquivo `.env.local` está ignorado
pelo Git.

```powershell
npm start
```

Acesse http://localhost:3000/login. Reinicie o servidor após mudar variáveis de ambiente.

## Firebase e acesso

- O provedor E-mail/Senha deve estar habilitado em Authentication.
- Confira os domínios autorizados para os fluxos de autenticação, incluindo o
  ambiente local quando necessário e o domínio de publicação.
- Use uma conta de teste já cadastrada. Cadastro e contratação seguem no fluxo
  externo ao painel; esta aplicação não cria contas nem altera assinaturas.
- Após login ou restauração de sessão, o app atualiza o token e aceita somente
  `isPremium === true` ou `users/{uid}.subscription.status === "active"`.
- Se `isPremium` não for `true`, o documento é consultado no servidor. Falhas de rede,
  permissão ou assinatura mantêm o painel bloqueado e iniciam o encerramento da sessão.
- O painel só é montado após a verificação. O botão Sair encerra a sessão Firebase.
- A recuperação de senha envia instruções pelo Firebase e apresenta a mesma
  confirmação para e-mails cadastrados ou não cadastrados.

As regras publicadas do Firestore precisam permitir a leitura do próprio documento
`users/{uid}` para verificar a assinatura, inclusive quando ela estiver inativa.
As subcoleções financeiras devem exigir o UID correspondente e a assinatura ativa;
o cliente não deve poder alterar `subscription`. A proteção das rotas na interface
complementa essas regras, sem substituí-las. Esta implementação não publica regras
nem modifica o webhook de assinaturas. Alterações de assinatura e remoção de claims
continuam sob responsabilidade do backend existente. A consulta de assinatura ocorre
no login e na restauração da sessão; não há listener contínuo de assinatura nesta etapa.

## Dados do Balanço Mensal

O primeiro gráfico mostra receitas, despesas e saldo de cada um dos **12 meses até
o mês selecionado**, incluindo esse mês. Por exemplo, ao selecionar outubro de 2026,
o período vai de novembro de 2025 a outubro de 2026. O seletor inicia no mês atual
e permite voltar no histórico, sem avançar para meses futuros.

O carregamento e o cálculo têm responsabilidades separadas:

1. `transacoesService.js` consulta `users/{uid}/transactions` com os limites de data
   informados pela página. Usa `onSnapshot` para acompanhar mudanças e entrega as
   transações com seus identificadores, sem calcular os totais do gráfico.
2. `BalancoMensal.js` mantém as transações no estado da página, junto com o controle
   de carregamento e erros da consulta. Ao trocar de mês ou usuário, encerra a consulta
   anterior e ignora respostas atrasadas.
3. `balancoService.js` define o período e calcula as séries, sem acessar o Firebase.
   A página usa `useMemo` para reaproveitar o cálculo enquanto as transações e o mês
   permanecem iguais.
4. `SaldoReceitasDespesas` recebe os resultados por propriedades e apresenta o gráfico.

Todos os dez gráficos compartilham as transações carregadas pela página.
O segundo reutiliza o saldo mensal calculado pelo primeiro e acrescenta as previsões,
com uma função de cálculo própria. O terceiro agrupa os recebimentos por fonte e
reutiliza as previsões de receitas já carregadas, sem abrir novas consultas.
O quarto usa os totais do terceiro para comparar os recebimentos e as previsões do mês.
O quinto relaciona os gastos aos cadastros de despesas e reutiliza os orçamentos já
carregados, com cálculo próprio e sem consultas adicionais.
O sexto compara os totais já calculados pelo quinto, sem repetir as somas.
O sétimo agrupa os gastos do quinto pela categoria atual dos cadastros de despesas,
também sem novas consultas.
O oitavo usa os mesmos gastos e cadastros para agrupá-los pelo tipo de despesa.
O nono reúne os totais por tipo em essenciais, não essenciais e não classificados,
sem consultar novamente os cadastros ou percorrer as transações.
O décimo agrupa os gastos e previsões do quinto pelo tipo atual de despesa,
sem consultar novamente o Firebase ou recalcular o histórico de previsões.

Os lançamentos seguem o modelo usado pelo aplicativo:

- `date`: data como string ISO em UTC, por exemplo `2026-10-15T15:00:00.000Z`.
  A consulta inclui o início do período e exclui o início do mês seguinte ao selecionado.
  Os limites e o agrupamento mensal seguem o fuso local do navegador.
- `amount`: valor não negativo em reais. O cálculo também aceita strings numéricas
  legadas e soma em centavos antes de converter os totais para reais.
- Receitas: lançamentos com `outgoingType === "income"`.
- Despesas: lançamentos com `incomingType === "expense"`.
- Registros com `isDeleted === true`, `outgoingType === "create"` ou `out === "Criação"`
  são desconsiderados no balanço. A ausência de `isDeleted` não exclui o lançamento.
- Saldo: receitas menos despesas de cada mês. Transferências entre contas, aportes
  e resgates não entram como receitas ou despesas apenas por movimentarem dinheiro.

Meses sem receitas ou despesas recebem zero. Quando todo o período fica zerado,
o gráfico apresenta uma mensagem de ausência de movimentações. Falhas de consulta
ou dados inválidos identificados pelo cálculo geram uma mensagem de erro e a opção
de tentar novamente. Um erro de cálculo não encerra a consulta em tempo real.

### Saldo: Acumulado vs. Previsto

O segundo gráfico compara o resultado e o planejamento **somente do mês selecionado**:

- **Acumulado:** receitas menos despesas registradas nesse mês, igual ao último saldo
  exibido no primeiro gráfico. Não inclui saldos de meses anteriores.
- **Previsto:** soma das receitas previstas menos a soma das despesas previstas do mês.
- **Diferença:** acumulado menos previsto.
- **Diferença percentual:** diferença dividida pelo valor absoluto do previsto, vezes
  100. Se o previsto for zero, aparece `—`, pois não há base para calcular o percentual.

`previsoesService.js` acompanha `users/{uid}/incomes` e `users/{uid}/expenses`, aguardando
as duas fontes antes de entregar os dados. A página mantém essas consultas durante
a navegação entre meses e as encerra ao trocar de usuário ou sair da tela.

A função `obterPrevisaoDoMes` respeita a criação do cadastro (`createdAt`) e usa a
entrada de `expectedHistory` correspondente ao mês selecionado. A leitura aceita
os dois formatos de histórico:

- **Aplicativo:** valor em `goal` e mês de 0 a 11, como no `getMonth()` do JavaScript.
  Nesse formato, `2026-9` corresponde a outubro de 2026.
- **Guia de integração:** valor em `value` e mês de 1 a 12; `2026-10` corresponde a outubro.
  Quando os dois campos existem, `value` e sua convenção de mês têm prioridade.

Antes da criação ou quando o histórico não contém esse mês, a previsão é zero;
previsões de outros meses não são reaproveitadas. Quando não há histórico, usa
`expected`; se esse campo estiver ausente, considera zero.
Registros marcados com `isDeleted === true` são desconsiderados. Valores e datas
inválidos identificados no cálculo geram uma mensagem de erro, sem exibir totais parciais.

As somas são feitas em centavos. Os controles das séries preservam sua seleção ao
atualizar os valores ou mudar o mês. Quando não há valores realizados nem previstos,
o gráfico exibe zeros e uma mensagem. Uma falha nas previsões mantém o primeiro gráfico
disponível; a opção de tentar novamente reabre apenas a consulta que precisa ser refeita.

### Receitas: Recebido vs. Previsto por fonte

O terceiro gráfico apresenta barras horizontais por fonte de receita, considerando
**somente o mês selecionado**. `calcularReceitasPorFonte` prepara os dados na página:

- **Recebido:** soma dos lançamentos de receita do mês, com as mesmas exclusões do
  primeiro gráfico. O vínculo usa `outID` da transação e o identificador do documento
  em `incomes`; nomes iguais não misturam fontes diferentes. O campo `balance` do
  cadastro não é utilizado, pois não representa necessariamente o mês consultado.
- **Previsto:** valor de cada fonte obtido por `obterPrevisaoDoMes`, com as mesmas
  regras de histórico descritas acima. A marca na barra indica essa previsão.
- **Percentual:** recebido dividido pelo previsto, vezes 100. Sem previsão, aparece
  `—`; uma fonte prevista que ainda não recebeu nada mostra `0%`.
- **Totais:** soma dos recebimentos, soma das previsões e diferença entre eles.
  O total recebido deve coincidir com as receitas do mês no primeiro gráfico.

Fontes com previsão e sem recebimentos continuam visíveis. Fontes com os dois valores
zerados são omitidas. A ordem segue `order` do cadastro, com nome e identificador como
desempate. Sem `order`, a fonte aparece após as que possuem ordem definida.

Recebimentos de fontes removidas ou ausentes do cadastro são preservados, com previsão
zero e uma indicação no nome. Lançamentos sem `outID` são agrupados pelo nome informado,
como não identificados, sem associá-los a um cadastro apenas por terem o mesmo nome.

O componente recebe os resultados por propriedades e trata carregamento, erro com
nova tentativa e mês vazio. Mudanças nas consultas compartilhadas atualizam os valores;
um erro no valor previsto de uma despesa não impede o cálculo deste gráfico de receitas.

### Receitas: Recebido vs. Previsto (totais)

O quarto gráfico compara os totais de receitas em duas barras verticais, no mês
selecionado. `calcularReceitasRecebidoPrevisto` prepara o resumo a partir do resultado
de `calcularReceitasPorFonte`, sem consultar o Firebase nem somar os lançamentos novamente.

- **Recebido e Previsto:** os mesmos totais exibidos no gráfico por fonte.
- **Diferença:** recebido menos previsto.
- **Diferença percentual:** diferença dividida pelo previsto, vezes 100. Quando o
  previsto é zero, apresenta `—`. Por exemplo, R$ 900 recebidos para R$ 1.000 previstos
  resultam em −R$ 100 e −10%. Esse percentual indica a diferença em relação à previsão;
  o percentual de cada barra do terceiro gráfico indica quanto da previsão foi recebido.

Os controles da legenda mostram ou ocultam as barras, mantendo os totais e a seleção
ao atualizar os dados ou trocar o mês. O gráfico compartilha carregamento, erros e nova
tentativa com o gráfico por fonte. Meses vazios exibem valores zerados e uma mensagem.

### Despesas: Gasto vs. Previsto por despesa

O quinto gráfico apresenta uma barra horizontal por despesa cadastrada, como Aluguel
ou Supermercado, considerando **somente o mês selecionado**. O vínculo usa `inID` da
transação e o identificador do documento em `expenses`. Despesas com nomes iguais
permanecem separadas; o campo `category` não agrupa as barras deste gráfico.

`calcularDespesasPorCadastro` calcula os valores em centavos, reutilizando a validação
dos lançamentos do balanço e `obterPrevisaoDoMes`:

- **Gasto:** lançamentos com `incomingType === "expense"`, respeitando as mesmas
  exclusões e os limites de mês do primeiro gráfico. O campo `balance` não é usado.
- **Previsto:** orçamento da despesa no mês, seguindo as regras de histórico,
  criação e exclusão dos cadastros já descritas.
- **Percentual:** gasto dividido pelo previsto, vezes 100. Uma despesa prevista
  ainda sem gastos mostra `0%`; sem previsão, aparece `—`.
- **Diferença total:** previsto menos gasto. Positiva indica orçamento disponível;
  negativa indica que os gastos ultrapassaram o previsto, com destaque em vermelho.

Despesas com previsão e sem gastos continuam visíveis. Itens com ambos os valores
zerados são omitidos. A ordem segue `order`, com nome e identificador como desempate;
itens sem ordem definida ficam após os demais.

Gastos de despesas removidas ou ausentes do cadastro continuam nos totais, com
previsão zero e indicação no nome. Lançamentos sem `inID` ficam agrupados pelo nome
informado como não identificados, separados dos cadastros que tenham o mesmo nome.
O total gasto deve coincidir com as despesas do mês no primeiro gráfico.

O componente trata carregamento, erro com nova tentativa e mês vazio. Um erro no
cálculo das receitas não impede a apresentação das despesas válidas.

### Despesas: Gasto vs. Previsto (totais)

O sexto gráfico compara o gasto e o orçamento total do mês selecionado em duas barras
verticais. `calcularDespesasGastoPrevisto` prepara o resumo a partir do resultado de
`calcularDespesasPorCadastro`, sem novas consultas ou repetição das somas.

- **Gasto e Previsto:** os mesmos totais do gráfico por despesa.
- **Diferença:** previsto menos gasto; positiva indica orçamento disponível e negativa
  indica excesso, destacado em vermelho.
- **Diferença percentual:** diferença dividida pelo previsto, vezes 100. Com R$ 1.000
  previstos e R$ 800 gastos, mostra +R$ 200 (+20%). Com R$ 1.200 gastos, mostra −R$ 200
  (−20%). Quando o previsto é zero, apresenta `—`.

Os controles da legenda mostram ou ocultam as barras, preservando as cores, os totais
e a seleção ao atualizar os dados ou trocar de mês. O gráfico compartilha carregamento,
erros e nova tentativa com o quinto gráfico. Meses vazios exibem zeros e uma mensagem.

### Despesas por Categoria

O sétimo gráfico mostra, em uma rosca, a distribuição dos gastos realizados no mês
selecionado. `calcularDespesasPorCategoria` recebe os gastos por cadastro já calculados
e os cadastros de despesas compartilhados pela página.

- Associa cada item ao campo `category` pelo identificador do cadastro e soma em centavos.
- Mantém em **Outros** os gastos sem categoria, com categoria vazia ou inválida, ou sem
  cadastro correspondente. Não associa lançamentos somente pelo nome.
- Preserva gastos de cadastros removidos; se o documento ainda possui categoria,
  utiliza essa classificação.
- Inclui somente gastos realizados. Uma categoria com previsão e nenhum gasto não
  recebe fatia. O total coincide com o Gasto do quinto e sexto gráficos.
- Calcula cada percentual como gasto da categoria dividido pelo total gasto, vezes 100.
  A legenda apresenta duas casas decimais; por arredondamento, a soma exibida pode
  diferir ligeiramente de 100%.

A legenda é renderizada em React para acomodar nomes longos e quantidades variáveis
de categorias. Apresenta cores consistentes, valores e percentuais do total mensal.
O centro mostra o total e, ao passar o cursor sobre uma fatia, os dados da categoria.
Meses sem gastos mostram uma mensagem e total zero, mesmo que existam previsões.
Carregamento, erros e nova tentativa são compartilhados com os gráficos de despesas.

A classificação é a **categoria atual do cadastro**: reclassificar uma despesa também
muda o agrupamento de seus gastos nos meses anteriores. Não há classificação histórica
por lançamento neste cálculo. Como reutiliza o resultado do quinto gráfico, uma previsão
inválida que impeça esse cálculo também impede a apresentação das categorias.

### Despesas por Tipo

O oitavo gráfico mostra a distribuição dos gastos realizados no mês pelos tipos
do campo `type` do cadastro. `calcularDespesasPorTipo` reutiliza os gastos por cadastro
calculados pelo quinto gráfico e associa a classificação pelo identificador.

Os grupos aparecem nesta ordem, somente quando possuem gastos:

- Despesa Fixa Essencial.
- Despesa Variável Essencial.
- Despesa Fixa Não Essencial.
- Despesa Variável Não Essencial.
- **Não classificado:** gastos sem cadastro, sem tipo ou com tipo não reconhecido.

Espaços nas extremidades do tipo são removidos. Não há classificação por nome,
categoria ou aproximação de texto. Cadastros removidos que ainda possuem um tipo
reconhecido preservam essa classificação para os gastos já realizados.

As somas são feitas em centavos e o percentual é calculado sobre o total gasto no mês,
sem incluir previsões. O total coincide com os gráficos anteriores de despesas.
As cores são fixas por tipo, a legenda em React permite quebra de linha e o centro
da rosca mantém o total mensal. Percentuais exibidos usam duas casas decimais.

O gráfico compartilha carregamento, erros e nova tentativa com os outros gráficos de
despesas. Meses sem gastos exibem mensagem e total zero, mesmo com previsões cadastradas.
Assim como no gráfico por categoria, utiliza a classificação atual do cadastro para
todos os meses e depende da validade dos dados usados no cálculo do quinto gráfico.

### Despesas por Utilidade

O nono gráfico apresenta a distribuição dos gastos realizados no mês em três grupos.
`calcularDespesasPorUtilidade` recebe o resultado de `calcularDespesasPorTipo` e reúne:

| Grupo | Tipos que o compõem |
| --- | --- |
| Essencial | Despesa Fixa Essencial + Despesa Variável Essencial |
| Não Essencial | Despesa Fixa Não Essencial + Despesa Variável Não Essencial |
| Não classificado | Gastos sem classificação reconhecida, preservados no oitavo gráfico |

Os valores são somados em centavos. O total é reutilizado do oitavo gráfico, e cada
percentual corresponde ao gasto do grupo dividido por esse total, vezes 100.
Previsões não entram nas fatias. Grupos sem gastos não aparecem na legenda ou na rosca.

O centro mantém o total mensal e a legenda em React exibe valores e percentuais,
com cores fixas: cinza para Essencial, vermelho para Não Essencial e laranja para
Não classificado. Um mês sem gastos apresenta mensagem e total zero, mesmo que
existam previsões. Carregamento, erros e nova tentativa são compartilhados com os
outros gráficos de despesas, sem novas consultas ao Firebase.

Como deriva do gráfico por tipo, acompanha a classificação atual do cadastro,
inclusive para meses anteriores, e depende da validade dos dados usados nesse cálculo.

### Método 4D (Despesas Por Tipo): Gasto vs. Previsto

O décimo gráfico compara os gastos e as previsões **somente do mês selecionado**.
`calcularDespesasPorTipoGastoPrevisto` recebe o resultado de `calcularDespesasPorCadastro`
e agrupa seus valores em centavos pelo campo `type` dos cadastros. Usa os mesmos quatro
tipos do oitavo gráfico, mantendo tipos ausentes ou desconhecidos e gastos sem cadastro
em **Não classificado**. Não relaciona registros pelo nome.

- **Gasto por tipo:** soma dos gastos realizados nas despesas daquele tipo, em barras vermelhas.
- **Previsto por tipo:** soma das previsões dessas despesas para o mês, em marcadores cinza.
- **Percentual por tipo:** gasto dividido pelo previsto, vezes 100. Previsão zero exibe `—`.
- **Diferença total:** total previsto menos total gasto. Valor negativo indica orçamento excedido.
- **Diferença percentual total:** diferença dividida pelo total previsto, vezes 100.
  Quando o total previsto é zero, exibe `—`.

Tipos com gasto ou previsão aparecem no gráfico, incluindo os que possuem somente
previsão. Grupos com ambos zerados ficam ocultos. Sem gastos e previsões, o gráfico
apresenta uma mensagem de ausência de dados. A altura acompanha a quantidade de grupos.

Os totais de gasto, previsão e diferença são reutilizados do quinto gráfico e coincidem
com o sexto. O gasto de cada tipo coincide com o oitavo. As regras de histórico mensal,
exclusões e cadastros removidos continuam sendo aplicadas no cálculo por cadastro.
A classificação é a atual, inclusive ao consultar meses anteriores; não há histórico de tipos.

A página calcula o agrupamento com `useMemo` e compartilha carregamento, erros e nova
tentativa com os demais gráficos de despesas. Não há consultas adicionais ao Firebase.

## Objetivos

A página recebe o identificador da sessão e compartilha três consultas:

- `investimentosService.js` observa `users/{uid}/investments`, incluindo investimentos,
  reservas, bens e dívidas. Preserva os campos e usa o ID do documento como identificador.
- `transacoesService.js` observa as transações **somente do mês selecionado**, com início
  inclusivo e fim exclusivo, seguindo o calendário local do navegador.
- `observarSaldosIniciais`, no mesmo serviço, observa apenas os registros com
  `outgoingType === "create"`, independentemente do mês. Essa consulta única fornece
  a base original das dívidas; não busca todo o histórico nem consulta por cartão.

Os cadastros e saldos iniciais permanecem carregados ao trocar de mês; somente a consulta
de transações mensais é refeita. As três consultas são encerradas ao sair da página ou trocar de usuário,
e respostas antigas são ignoradas. Falhas permitem repetir apenas a fonte afetada.

`objetivosService.js` calcula o planejamento mensal sem consultar o Firebase. A página
reutiliza esse resultado com `useMemo` e entrega os dados aos componentes por props.
A base contém os valores por objetivo e os totais. O segundo e o terceiro gráficos
reutilizam esses totais, sem novas consultas ou repetição da soma das transações.
O planejamento global usa os mesmos cadastros, com cálculo e estados independentes
das transações mensais. Quando há dívidas, também aguarda os registros de criação
para calcular o percentual quitado. Os gráficos mensais não dependem dessa terceira fonte.
O grau de compromisso global e a comparação Atual vs. Desejado reutilizam os totais
do planejamento global, sem consultar o Firebase novamente nem repetir a soma dos cadastros.

### Planejamento Mensal: Aportes e Pagamentos

As regras seguem o modelo real conferido e a definição confirmada para esta página:

- **Realizado:** soma dos lançamentos não excluídos do mês com `outgoingType === "account"`
  e `incomingType === "investment"`, vinculados por `inID`. A mesma regra inclui pagamentos
  de objetivos classificados como Dívida. Resgates não são descontados. Rendimentos,
  ajustes, saldos iniciais e transferências entre objetivos não contam como aportes.
- **Previsto:** `goalHistory` do mês selecionado, ou `goal` quando não existe histórico.
  No aplicativo, esses campos representam a previsão mensal; `montante` representa a
  meta global. O gráfico não usa `current`, `aporte` ou `montante` como realizado mensal.
- **Histórico:** reutiliza `obterPrevisaoDoMes` com os campos de objetivos. Entradas
  `{ date: "2026-9", goal: 100 }` correspondem a outubro; o formato do guia com `value`
  usa meses de 1 a 12. Histórico sem entrada para o mês resulta em zero, sem herdar
  valores de outro mês. A previsão não se aplica antes do mês de criação do cadastro.
- **Diferença:** total realizado menos total previsto. Valor negativo indica que falta
  realizar parte do planejamento mensal.
- **Percentual:** realizado dividido pelo previsto, vezes 100. Previsão zero exibe `—`.
  Percentuais acima de 100% são preservados no texto; apenas o preenchimento circular
  fica limitado a 100%.

As somas são feitas em centavos. Objetivos aparecem quando possuem realizado ou previsto
no mês, inclusive previsões ainda sem aportes. Cadastros excluídos não geram previsão,
mas seus lançamentos válidos continuam no realizado. Movimentações sem cadastro são
mantidas separadamente, com previsão zero; nomes iguais não substituem o vínculo por ID.

São apresentados até 12 objetivos por página, ordenados pelo campo `order`, nome e ID.
O filtro oculta itens sem previsão ou com a meta mensal atingida. Um item com previsão
positiva e realizado zero continua visível. Paginação e filtro não alteram os totais.
Ao trocar de mês ou conta, os controles são reiniciados; quando a lista diminui, a página
atual é ajustada para continuar válida.

O componente trata carregamento, falha com nova tentativa, mês vazio e filtro sem
resultados. Os três gráficos mensais acompanham o seletor de mês.

### Grau de Compromisso Mensal: Aportes e Pagamentos

`calcularCompromissoMensal` recebe o planejamento mensal já calculado e usa
**total realizado ÷ total previsto × 100**. O resultado é a razão dos totais,
não a média dos percentuais individuais. Filtros e paginação do primeiro gráfico
não alteram o percentual ou os valores do segundo.

O gráfico mantém os totais em reais e apresenta o percentual com até uma casa decimal.
Previsão total zero exibe `—`; previsão positiva sem aportes exibe `0%`. Acima de 100%,
o texto mantém o percentual real e apenas o preenchimento circular fica limitado.
Mês sem realizado e previsto exibe mensagem de ausência de dados. Carregamento,
erros e nova tentativa são compartilhados com o primeiro gráfico.

### Planejamento Mensal: Realizado vs. Previsto

`calcularRealizadoPrevistoMensal` reutiliza os totais e a diferença do planejamento
mensal. O gráfico apresenta Realizado em azul e Previsto em cinza, com o mês selecionado
no eixo horizontal. A diferença é **realizado menos previsto**; seu percentual é
**diferença ÷ previsto × 100**, exibido com duas casas decimais. Um valor negativo
indica que parte do planejamento ainda não foi realizada. Previsão zero exibe `—`.

Os controles da legenda permitem ocultar e reexibir cada barra, preservando as cores,
os totais e a diferença. Se ambas estiverem ocultas, aparece uma orientação para
selecionar uma série. Ao trocar de mês ou conta, ambas voltam a ficar visíveis.
Filtro e paginação do primeiro gráfico não alteram os totais desta comparação.

Carregamento, erros e nova tentativa são compartilhados com os outros gráficos
mensais. Um mês sem aportes e previsões exibe mensagem de ausência de dados;
um mês com apenas previsão continua mostrando a comparação.

### Planejamento Global: Acúmulos e Amortizações

`calcularPlanejamentoGlobal` calcula a **posição atual** a partir dos cadastros ativos
de `investments`. Este gráfico não representa uma posição histórica: trocar o mês
mantém seus saldos, metas, filtro e paginação.

- **Atual:** saldo `current` de cada objetivo, incluindo saldos negativos de dívidas.
- **Desejado:** `montante` para investimentos e bens. Ausência de meta equivale a zero.
  Para dívidas, o destino é a quitação, representada por zero.
- **Percentual:** atual dividido pelo desejado, vezes 100, para investimentos e bens
  com meta positiva. Meta ausente ou zerada exibe `—`.
  O texto preserva percentuais negativos ou acima de 100%; o arco fica entre 0 e 100%.
- **Quitação de dívidas:** usa o valor absoluto do saldo negativo original, salvo na
  transação de criação vinculada pelo `inID`. O percentual é
  **(valor original + saldo atual) ÷ valor original × 100**. Por exemplo, uma dívida
  criada com `amount: -1000` e `current: -750` está 25% quitada. Saldo zero ou positivo
  limita a quitação a 100%; aumento do saldo devedor pode resultar em percentual negativo.
  O cálculo reflete a redução líquida da dívida, incluindo ajustes presentes no saldo;
  não é a soma histórica dos pagamentos. Os valores exibidos continuam sendo saldo
  atual e meta de quitação em zero.
- **Totais:** soma em centavos de todos os objetivos ativos. O total atual é líquido,
  incluindo dívidas com sinal negativo; não é uma soma de pagamentos já efetuados.
  A diferença é o total atual menos o total desejado.
- **Concluídos:** investimentos e bens com meta positiva atingida ou superada e dívidas
  com saldo maior ou igual a zero. Objetivos sem meta não são considerados concluídos.

Todos os cadastros ativos são mostrados, inclusive bens sem previsão mensal e objetivos
com saldo e meta zerados. Cadastros excluídos não entram nos cartões nem nos totais.
`goal`, `goalHistory`, `aporte` e as movimentações do mês não entram no cálculo global.
Saldo ausente ou inválido e meta global inválida geram erro, sem serem convertidos em zero.
Origens excluídas ou de outros tipos são ignoradas. Origem ausente, duplicada ou sem
saldo inicial negativo exibe `—`, sem inferir o valor original pelo saldo atual ou
pela previsão mensal. Valor inválido em uma origem vinculada gera erro recuperável.

Há até 12 cartões por página, ordenados por `order`, nome e ID. O filtro de concluídos
e a paginação não alteram os totais. Quando a lista diminui, a página se ajusta;
trocar de usuário reinicia os controles e oculta imediatamente os dados anteriores.
Falhas de transações ou previsões mensais não bloqueiam este gráfico. A nova tentativa
do gráfico global refaz a fonte afetada: cadastros ou saldos iniciais. Falhas dos saldos
iniciais não bloqueiam os gráficos mensais nem objetivos globais sem dívidas.

### Grau de Compromisso Global: Acúmulos e Amortizações

`calcularCompromissoGlobal` recebe o planejamento global já calculado e usa
**total atual líquido ÷ total desejado × 100**, conforme a definição desta página.
Os valores Atual e Desejado são exatamente os mesmos do quarto gráfico.

O saldo atual inclui dívidas com sinal negativo e bens sem meta. O desejado soma as
metas globais dos investimentos e bens; dívidas mantêm meta de quitação em zero.
O percentual global não é a média dos percentuais individuais nem a soma das parcelas
quitadas das dívidas. Por exemplo, saldo líquido de -R$ 150 e metas de R$ 400 resultam
em -37,5%, mesmo que alguma dívida já esteja parcialmente quitada.

O texto preserva percentuais negativos e acima de 100%, com até uma casa decimal;
somente o preenchimento circular é limitado entre 0 e 100%. Meta total zero exibe `—`
e mantém os valores em reais. Meta positiva com saldo zero exibe `0%`. Sem cadastros
ativos, o componente mostra a ausência de dados.

Filtros e paginação do quarto gráfico não alteram o resumo. A troca de mês mantém
a posição global. Carregamento, erros e nova tentativa são compartilhados com o
planejamento global; a troca de usuário oculta imediatamente os valores anteriores.

### Planejamento Global: Atual vs. Desejado

`calcularAtualDesejadoGlobal` reutiliza os totais e a diferença do planejamento global.
As barras apresentam o saldo líquido atual em azul e o total desejado em cinza. Os
valores são os mesmos dos dois gráficos globais anteriores, incluindo dívidas com
saldo negativo e bens sem meta. O eixo horizontal indica **Posição atual** e não
acompanha o mês selecionado.

A diferença em reais é **atual menos desejado**. Seu percentual é
**diferença ÷ desejado × 100**, com duas casas decimais. Por exemplo, saldo líquido de
-R$ 150 e metas de R$ 400 resultam em diferença de -R$ 550 (-137,50%). Esse percentual
mede a diferença em relação à meta; o grau de compromisso do quinto gráfico mede a
razão atual/desejado. Meta total zero exibe `—` no percentual e preserva os valores
monetários. Objetivos ativos com saldos e metas zerados continuam mostrando a comparação.

Os controles permitem ocultar e reexibir as barras, mantendo as cores, os totais e
a diferença. Se ambas forem ocultadas, aparece uma orientação para selecionar uma
série. Trocar de mês preserva esses controles; trocar de usuário reinicia a visibilidade
e oculta os dados anteriores. Filtros e paginação do quarto gráfico não alteram os totais.

Carregamento, erros e nova tentativa são compartilhados com os outros gráficos globais.
Falhas na consulta mensal não afetam esta comparação. Sem cadastros ativos, o componente
mostra a ausência de dados.

## Organização

- `src/App.js`: rotas e liberação das páginas após validar a sessão.
- `src/Paginas/Login.js`: página e apresentação inicial.
- `src/Paginas/BalancoMensal.js`: seleção de período, carregamento compartilhado e cálculo dos dados apresentados.
- `src/Paginas/Objetivos.js`: consultas compartilhadas e cálculos dos seis gráficos, mensais e globais.
- `src/Componentes/FormularioLogin/`: formulário, recuperação e CSS.
- `src/Componentes/MonthSelector/`: navegação entre meses.
- `src/Componentes/SaldoReceitasDespesas/`: apresentação do primeiro gráfico e seus estados.
- `src/Componentes/SaldoAcumuladoPrevisto/`: comparação mensal, diferença e controles das séries.
- `src/Componentes/ReceitasRecebidoPrevistoCategoria/`: recebimentos e previsões por fonte de receita.
- `src/Componentes/ReceitasRecebidoPrevisto/`: comparação dos totais mensais de receitas e controles das barras.
- `src/Componentes/DespesasGastoPrevistoCategoria/`: gastos e orçamentos por despesa cadastrada.
- `src/Componentes/DespesasGastoPrevisto/`: comparação dos totais mensais de despesas e controles das barras.
- `src/Componentes/DespesasPorCategoria/`: gastos mensais agrupados por categoria, rosca e legenda.
- `src/Componentes/DespesasPorTipo/`: gastos mensais pelos quatro tipos e pelo grupo Não classificado.
- `src/Componentes/DespesasPorUtilidade/`: gastos essenciais, não essenciais e não classificados a partir dos totais por tipo.
- `src/Componentes/DespesasPorTipoGastoPrevisto/`: comparação dos gastos e previsões mensais por tipo de despesa.
- `src/Componentes/AportesPagamentosPlanejamentoMensal/`: realizado e previsto mensal por objetivo, filtro e paginação.
- `src/Componentes/AportesPagamentosCompromissoMensal/`: percentual e totais do compromisso mensal, derivados do planejamento.
- `src/Componentes/RealizadoPrevistoPlanejamentoMensal/`: comparação mensal dos totais, diferença e controles de visibilidade das barras.
- `src/Componentes/AcumulosAmortizacoesPlanejamentoGlobal/`: saldos e metas globais por objetivo, filtro de concluídos e paginação.
- `src/Componentes/AcumulosAmortizacoesCompromissoGlobal/`: razão entre saldo líquido atual e metas globais, com os totais do planejamento.
- `src/Componentes/AtualDesesjadoPlanejamentoGlobal/`: comparação dos totais globais, diferença e controles de visibilidade das barras.
- `src/services/firebase.js`: inicialização do SDK modular.
- `src/services/authService.js`: autenticação, assinatura e observação da sessão.
- `src/services/transacoesService.js`: leitura das transações por usuário e intervalo e consulta compartilhada dos saldos iniciais.
- `src/services/previsoesService.js`: leitura compartilhada das fontes de receitas e despesas previstas.
- `src/services/balancoService.js`: período, cálculos e mensagens do balanço.
- `src/services/investimentosService.js`: leitura dos cadastros compartilhados da página Objetivos.
- `src/services/objetivosService.js`: cálculos mensais, posição global dos objetivos e mensagens de erro.
- `src/index.css`: estilos gerais; os componentes mantêm seus próprios arquivos CSS.
- `*.test.js`: testes próximos aos arquivos que verificam.
- `AGENTS.md`: orientações de organização, escrita e validação para assistentes de código.

## Verificações

```powershell
npm test -- --watchAll=false --runInBand
npm run build
```

Os testes automatizados simulam as consultas ao Firebase, sem acessar contas reais
ou enviar e-mails. As funções de cálculo são executadas com dados de teste. A cobertura inclui:

- Login, assinatura, restauração da sessão, proteção das rotas, recuperação e logout.
- Consulta de transações por usuário e intervalo, atualizações e cancelamento.
- Cálculo mensal, centavos, saldo negativo, exclusões, datas e valores inválidos.
- Histórico de previsões, comparação mensal, previsto zero ou negativo e visibilidade das séries.
- Receitas por fonte, vínculo por identificador, fontes sem recebimentos ou previsão,
  cadastros removidos, nomes repetidos e consistência com o total mensal.
- Troca de mês e usuário, respostas atrasadas, período vazio, erros e nova tentativa.
- Resumo de receitas consistente com as fontes, diferença percentual e visibilidade das barras.
- Resumo de despesas consistente com os cadastros, diferença percentual de orçamento
  disponível ou excedido e controles das barras.
- Despesas por identificador, orçamento disponível ou excedido, gastos sem previsão,
  cadastros removidos e consistência com o total mensal de despesas.
- Categorias com gastos agrupados em centavos, classificação atual, gastos em Outros,
  cores estáveis e mês sem gastos, mesmo com previsões cadastradas.
- Tipos com agrupamento em centavos, classificações ausentes ou desconhecidas,
  cores fixas, atualização da classificação e consistência com os demais totais de despesas.
- Utilidades com soma dos tipos em centavos, preservação dos não classificados,
  percentuais, cores estáveis e estados com um único grupo ou sem gastos.
- Comparação por tipo com totais consistentes, orçamento excedido, previsão zero,
  grupos somente previstos, histórico mensal, reclassificação e atualização compartilhada.
- Objetivos com aportes e pagamentos mensais, exclusão de resgates/rendimentos/saldos
  iniciais, previsões por mês, centavos, IDs, cadastros removidos e percentuais acima de 100%.
- Paginação e filtro de objetivos sem alterar totais, isolamento entre contas e meses,
  cancelamento das consultas e recuperação da fonte que falhou.
- Compromisso mensal calculado pela razão dos totais, previsão zero, meta superada
  e consistência entre os dois gráficos durante atualizações, filtros e troca de mês.
- Comparação mensal dos objetivos com diferença em centavos, percentual positivo ou
  negativo, previsão zero, cores estáveis, controles de barras e consultas compartilhadas.
- Planejamento global com saldo atual, meta global, bens sem previsão mensal, dívidas,
  cadastros excluídos, centavos, metas zeradas ou superadas e valores inválidos.
- Independência do mês e dos erros mensais, atualização dos cadastros compartilhados,
  filtro de concluídos, paginação, nova tentativa e isolamento entre usuários no global.
- Quitação pela origem da dívida, com pagamento parcial, quitação completa, aumento
  do saldo devedor, origem ausente/excluída/duplicada e recuperação da consulta de criação.
- Compromisso global pela razão dos totais líquidos, incluindo saldos negativos,
  bens sem meta, metas zeradas ou superadas, filtros sem alterar o resumo e consultas compartilhadas.
- Comparação global com diferença em centavos e percentual, barras negativas, metas
  zeradas, cores estáveis, visibilidade preservada entre meses e reiniciada entre contas.

Para validar a integração real, use contas de teste com e sem assinatura ativa e
confira login, atualização da página, acesso direto a `/objetivos` e `/resultados`,
recuperação de senha e saída. Verifique também o formulário no celular e por teclado.

No Balanço Mensal, compare os totais do primeiro gráfico com os lançamentos do mesmo
usuário no aplicativo. Confira a troca de mês e um período sem receitas ou despesas.
Ao alterar um lançamento no aplicativo e sincronizá-lo com o Firestore, o gráfico
deve refletir a mudança enquanto a consulta estiver ativa e o lançamento estiver
dentro do período exibido.

No segundo gráfico, confira se o Acumulado corresponde ao saldo do mês no primeiro.
Compare o Previsto com os orçamentos de receitas e despesas do aplicativo, incluindo
meses com alterações em `expectedHistory`. Confira atualização em tempo real, diferença
em reais e percentual, além dos controles para mostrar ou ocultar cada série.

No terceiro gráfico, compare cada fonte com os recebimentos e previsões do mês no
aplicativo. Confira se o total recebido coincide com as receitas do mês no primeiro
gráfico, incluindo lançamentos cuja fonte foi removida. Verifique também as fontes
previstas que ainda não receberam valores e o percentual quando a previsão é zero.

No quarto gráfico, confira os totais com o terceiro, a identificação do mês, a diferença
em reais e percentual e os controles para mostrar ou ocultar as barras. Alterações de
recebimentos ou previsões devem aparecer nos dois gráficos de receitas.

No quinto gráfico, confira cada despesa com os gastos e orçamentos do mês no aplicativo,
incluindo despesas sem gastos, sem previsão e removidas. Compare a soma dos gastos com
as despesas do mês no primeiro gráfico. Confira o percentual de uso e a diferença como
orçamento disponível ou excedido, além da atualização dos valores e da troca de mês.

No sexto gráfico, confira os totais com o quinto, o mês apresentado e os sinais da
diferença em reais e percentual. Verifique orçamento zero, mês vazio e os controles
das barras, que devem manter os totais da legenda mesmo quando uma série estiver oculta.

No sétimo gráfico, compare a soma das categorias com o Gasto do quinto e sexto gráficos.
Confira a atualização dos gastos e da classificação, categorias sem cadastro, cores
ao trocar de mês, nomes longos e meses que possuem somente previsões.

No oitavo gráfico, compare os quatro tipos com o aplicativo e confira os gastos em
Não classificado. O total deve coincidir com os gráficos por cadastro, totais e categoria.
Verifique reclassificação, troca de mês, cores e quebras de linha na legenda.

No nono gráfico, confira Essencial como a soma dos dois tipos essenciais do oitavo,
Não Essencial como a soma dos dois tipos não essenciais e Não classificado com o mesmo
valor do gráfico por tipo. Verifique os totais, percentuais, troca de mês e atualização
após reclassificar uma despesa.

No décimo gráfico, compare o Gasto e o Previsto totais com o quinto e o sexto e os gastos
de cada tipo com o oitavo. Confira as metas do mês selecionado, inclusive tipos com
somente previsão, gastos sem classificação e percentuais quando o orçamento é zero
ou foi excedido. Troque de mês e reclassifique uma despesa para conferir a atualização.

Na página Objetivos, compare o primeiro gráfico com os aportes e pagamentos realizados
no mês no aplicativo e com a previsão mensal de cada objetivo. Confirme que saldos
iniciais e resgates não alteram o realizado, inclusive em dívidas. Teste o mês anterior,
atualização de previsão, mais de 12 objetivos, filtro, meta zero e meta superada.
No segundo gráfico, confira os mesmos totais do primeiro e o percentual realizado/previsto.
Trocar o filtro ou a página de objetivos não deve alterar o resumo. No terceiro gráfico,
compare os totais com os dois primeiros e confira a diferença realizado menos previsto,
o mês no eixo horizontal e os controles de cada barra.

No quarto gráfico, compare os saldos atuais e as metas globais com os cadastros do
aplicativo. Confira bens sem previsão mensal, dívidas negativas, metas zeradas ou
superadas e exclusões. Nas dívidas, compare o percentual quitado com o saldo inicial
de criação e o saldo devedor atual. Trocar o mês não deve alterar a posição global; filtro e
paginação não devem mudar os totais. No quinto gráfico, confira os mesmos valores
Atual e Desejado do quarto e a razão entre eles, incluindo saldo líquido negativo
e meta total zero. Teste também a troca de conta e a nova tentativa após falha.
No sexto gráfico, compare os valores Atual e Desejado com os outros dois globais.
Confira a diferença em reais e percentual, saldo negativo, metas zeradas, ocultação
e retorno das barras. O eixo deve permanecer em Posição atual ao trocar de mês;
ao trocar de conta, as duas barras voltam a ficar visíveis.

## Publicação

O comando `npm run build` gera a pasta `build/`. Na hospedagem, incluindo a Vercel:

- Use como raiz a pasta que contém o `package.json`, com `npm run build` como comando
  de compilação e `build` como pasta de saída.
- Cadastre as mesmas variáveis `REACT_APP_FIREBASE_*` no ambiente do deploy. O arquivo
  `.env.local` da sua máquina não acompanha os commits.
- Após alterar essas variáveis, gere um novo build e publique novamente, pois seus
  valores são incorporados durante a compilação.
- Configure o retorno de `index.html` para as rotas da aplicação, permitindo acesso
  direto a `/login`, `/objetivos` e `/resultados`.

Um build bem-sucedido não confirma as credenciais, as permissões do Firestore ou
a assinatura da conta. Faça a verificação de login, dos dez gráficos do Balanço Mensal
e dos seis gráficos de Objetivos também no endereço publicado.
