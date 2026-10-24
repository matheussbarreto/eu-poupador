# Eu Poupador

Painel de finanças pessoais em React, JavaScript e CSS, com Create React App.
Usa React Router para navegação, ApexCharts para gráficos, Firebase Authentication
para login e Cloud Firestore para consultar os dados financeiros.

## Funcionamento atual

| Tela | Rota | Integração atual |
| --- | --- | --- |
| Login | `/login` | Login por e-mail e senha, recuperação de senha e validação de assinatura. |
| Balanço Mensal | `/` | **Saldo: Receitas vs. Despesas** e **Saldo: Acumulado vs. Previsto** usam transações e previsões do usuário no Firestore. Os demais gráficos ainda usam dados de demonstração. |
| Objetivos | `/objetivos` | Dados de demonstração, sem integração com os dados financeiros do usuário. |
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

Os dois primeiros gráficos compartilham as transações carregadas pela página.
O segundo reutiliza o saldo mensal calculado pelo primeiro e acrescenta as previsões,
com uma função de cálculo própria. Os demais gráficos ainda precisam ser ligados
aos dados compartilhados ou às fontes adicionais de que necessitarem.

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

## Organização

- `src/App.js`: rotas e liberação das páginas após validar a sessão.
- `src/Paginas/Login.js`: página e apresentação inicial.
- `src/Paginas/BalancoMensal.js`: seleção de período, carregamento compartilhado e cálculo dos dados apresentados.
- `src/Componentes/FormularioLogin/`: formulário, recuperação e CSS.
- `src/Componentes/MonthSelector/`: navegação entre meses.
- `src/Componentes/SaldoReceitasDespesas/`: apresentação do primeiro gráfico e seus estados.
- `src/Componentes/SaldoAcumuladoPrevisto/`: comparação mensal, diferença e controles das séries.
- `src/services/firebase.js`: inicialização do SDK modular.
- `src/services/authService.js`: autenticação, assinatura e observação da sessão.
- `src/services/transacoesService.js`: leitura das transações por usuário e intervalo.
- `src/services/previsoesService.js`: leitura compartilhada das fontes de receitas e despesas previstas.
- `src/services/balancoService.js`: período, cálculos e mensagens do balanço.
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
- Troca de mês e usuário, respostas atrasadas, período vazio, erros e nova tentativa.

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
a assinatura da conta. Faça a verificação de login e dos dois primeiros gráficos também
no endereço publicado.
