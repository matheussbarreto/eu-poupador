import { calcularBalancoMensal, calcularSaldoAcumuladoPrevisto, calcularReceitasPorFonte, obterPrevisaoDoMes, obterMensagemErroBalanco } from "./balancoService";

const referencia = new Date(2026, 9, 16);
const dataOutubro = new Date(2026, 9, 15, 12).toISOString();
const receita = (amount, outros = {}) => ({ date: dataOutubro, amount, outgoingType: "income", incomingType: "account", ...outros });
const despesa = (amount, outros = {}) => ({ date: dataOutubro, amount, outgoingType: "account", incomingType: "expense", ...outros });

test("gera os 12 meses até o selecionado, inclusive os meses sem movimentação", () => {
    const dados = calcularBalancoMensal([], referencia);
    expect(dados.categorias).toEqual([
        "Nov/2025", "Dez/2025", "Jan/2026", "Fev/2026", "Mar/2026", "Abr/2026",
        "Mai/2026", "Jun/2026", "Jul/2026", "Ago/2026", "Set/2026", "Out/2026",
    ]);
    expect(dados.receitas).toEqual(Array(12).fill(0));
    expect(dados.despesas).toEqual(Array(12).fill(0));
    expect(dados.saldos).toEqual(Array(12).fill(0));
    expect(dados.semMovimentacoes).toBe(true);
});

test("soma em centavos e calcula saldo negativo sem alterar as transações compartilhadas", () => {
    const transacoes = Object.freeze([
        receita(0.1), receita("0.20"), despesa(0.4),
    ].map((transacao) => Object.freeze(transacao)));
    const dados = calcularBalancoMensal(transacoes, referencia);
    expect(dados.receitas[11]).toBe(0.3);
    expect(dados.despesas[11]).toBe(0.4);
    expect(dados.saldos[11]).toBe(-0.1);
    expect(dados.semMovimentacoes).toBe(false);
});

test("exclui registros apagados e saldos iniciais, preservando IDs legados e isDeleted ausente", () => {
    const dados = calcularBalancoMensal([
        receita(100, { id: "2026-10-15T12:00:00.000Z48291048" }),
        receita(25, { id: "inc_1", isDeleted: false }),
        receita(900, { isDeleted: true }),
        despesa(900, { isDeleted: true }),
        despesa(800, { outgoingType: "create" }),
        despesa(700, { out: "Criação" }),
        despesa(30),
    ], referencia);
    expect(dados.receitas[11]).toBe(125);
    expect(dados.despesas[11]).toBe(30);
    expect(dados.saldos[11]).toBe(95);
});

test("transferências, aportes, resgates e rendimentos não viram receitas ou despesas", () => {
    const transacoes = [
        { outgoingType: "account", incomingType: "account" },
        { outgoingType: "account", incomingType: "investment" },
        { outgoingType: "investment", incomingType: "account" },
        { outgoingType: "update", incomingType: "investment" },
    ].map((tipos) => ({ ...tipos, date: dataOutubro, amount: 500 }));
    expect(calcularBalancoMensal(transacoes, referencia).semMovimentacoes).toBe(true);
});

test("receita direcionada a investimento e pagamento direto de receita seguem os tipos do guia", () => {
    const dados = calcularBalancoMensal([
        receita(100, { incomingType: "investment" }),
        receita(40, { incomingType: "expense" }),
    ], referencia);
    expect(dados.receitas[11]).toBe(140);
    expect(dados.despesas[11]).toBe(40);
    expect(dados.saldos[11]).toBe(100);
});

test("respeita os limites locais do período e a virada do ano em datas ISO", () => {
    const inicio = new Date(2025, 10, 1);
    const fim = new Date(2026, 10, 1);
    const dados = calcularBalancoMensal([
        receita(999, { date: new Date(inicio.getTime() - 1).toISOString() }),
        receita(10, { date: inicio.toISOString() }),
        receita(20, { date: new Date(2025, 11, 31, 23, 59, 59).toISOString() }),
        receita(30, { date: new Date(2026, 0, 1).toISOString() }),
        receita(40, { date: new Date(fim.getTime() - 1).toISOString() }),
        receita(999, { date: fim.toISOString() }),
    ], referencia);
    expect(dados.receitas).toEqual([10, 20, 30, 0, 0, 0, 0, 0, 0, 0, 0, 40]);
});

test("inclui fevereiro de ano bissexto e mantém o mês selecionado como último ponto", () => {
    const dados = calcularBalancoMensal([
        receita(50, { date: new Date(2024, 1, 29, 23, 59).toISOString() }),
    ], new Date(2024, 1, 29));
    expect(dados.categorias[11]).toBe("Fev/2024");
    expect(dados.receitas[11]).toBe(50);
});

test.each([undefined, null, true, "", "abc", Infinity, -1])("valor inválido %s informa erro em vez de apresentar um total parcial", (valor) => {
    expect(() => calcularBalancoMensal([receita(100), despesa(valor)], referencia)).toThrow("valor inválido");
});

test("data inválida de lançamento relevante informa erro", () => {
    expect(() => calcularBalancoMensal([receita(100, { date: "sem-data" })], referencia)).toThrow("data ou valor inválido");
});

test.each(["permission-denied", "unavailable", "app/lancamento-invalido", "outro"])("traduz falha %s sem exibir mensagens técnicas", (code) => {
    const mensagem = obterMensagemErroBalanco({ code, message: "detalhe interno" });
    expect(mensagem).not.toContain("detalhe interno");
    expect(mensagem.length).toBeGreaterThan(20);
});

test("seleciona somente o orçamento do mês sem alterar o histórico compartilhado", () => {
    const item = Object.freeze({ expected: 999, expectedHistory: Object.freeze([
        Object.freeze({ date: "2026-11", value: 300 }),
        Object.freeze({ date: "2026-10", value: "100.50" }),
        Object.freeze({ date: "2026-02", value: 50 }),
    ]) });
    expect(obterPrevisaoDoMes(item, referencia)).toBe(100.5);
    expect(obterPrevisaoDoMes(item, new Date(2026, 0, 1))).toBe(0);
    expect(obterPrevisaoDoMes(item, new Date(2026, 10, 1))).toBe(300);
    expect(obterPrevisaoDoMes(item, new Date(2027, 0, 1))).toBe(0);
});

test("sem registro no mês, não herda previsões anteriores, futuras ou o valor padrão", () => {
    const item = { expected: 999, expectedHistory: [
        { date: "2026-09", value: 100 },
        { date: "2026-11", value: 300 },
    ] };
    expect(obterPrevisaoDoMes(item, referencia)).toBe(0);
    expect(obterPrevisaoDoMes({ ...item, expectedHistory: [
        ...item.expectedHistory, { date: "2026-10", value: 0 },
    ] }, referencia)).toBe(0);
});

test("histórico do aplicativo usa goal e meses de zero a onze, incluindo outubro como nove", () => {
    const item = Object.freeze({ expected: 999, expectedHistory: Object.freeze(
        Array.from({ length: 12 }, (_, mes) => Object.freeze({ date: `2026-${mes}`, goal: (mes + 1) * 100 }))
    ) });
    for (let mes = 0; mes < 12; mes += 1) {
        expect(obterPrevisaoDoMes(item, new Date(2026, mes, 1))).toBe((mes + 1) * 100);
    }
    expect(obterPrevisaoDoMes(item, new Date(2025, 11, 1))).toBe(0);
    expect(obterPrevisaoDoMes(item, new Date(2027, 0, 1))).toBe(0);
});

test("distingue o mês pelo formato do histórico e preserva valores zero", () => {
    const item = { expectedHistory: [
        { date: "2026-8", goal: 50 },
        { date: "2026-10", value: 0, goal: 999 },
        { date: "2026-10", goal: 200 },
    ] };
    expect(obterPrevisaoDoMes(item, new Date(2026, 8, 1))).toBe(50);
    expect(obterPrevisaoDoMes(item, referencia)).toBe(0);
    expect(obterPrevisaoDoMes(item, new Date(2026, 10, 1))).toBe(200);
    expect(obterPrevisaoDoMes({ expected: 999, expectedHistory: [{ date: "2026-9", goal: 0 }] }, referencia)).toBe(0);
});

test("previsão fixa, criação local, exclusão e histórico com zero respeitam o mês consultado", () => {
    expect(obterPrevisaoDoMes({ expected: "0.30", expectedHistory: [] }, referencia)).toBe(0.3);
    expect(obterPrevisaoDoMes({}, referencia)).toBe(0);
    expect(obterPrevisaoDoMes({ expected: 90, createdAt: new Date(2026, 10, 1).toISOString() }, referencia)).toBe(0);
    expect(obterPrevisaoDoMes({ expected: 90, createdAt: new Date(2026, 9, 31, 23, 59).toISOString() }, referencia)).toBe(90);
    expect(obterPrevisaoDoMes({ expected: 90, isDeleted: true }, referencia)).toBe(0);
    expect(obterPrevisaoDoMes({ expected: 90, expectedHistory: [{ date: "2026-10", value: 0 }] }, referencia)).toBe(0);
});

test.each([null, true, "", "abc", Infinity, -1])("previsão inválida %s não vira zero silenciosamente", (valor) => {
    expect(() => obterPrevisaoDoMes({ expected: valor }, referencia)).toThrow("previsões");
    expect(() => obterPrevisaoDoMes({ expectedHistory: [{ date: "2026-10", value: valor }] }, referencia)).toThrow("previsões");
    expect(() => obterPrevisaoDoMes({ expectedHistory: [{ date: "2026-9", goal: valor }] }, referencia)).toThrow("previsões");
});

test.each([
    { createdAt: "inválido" },
    { expectedHistory: {} },
    { expectedHistory: [{ date: "2026-13", value: 10 }] },
    { expectedHistory: [{ date: "2026-00", value: 10 }] },
    { expectedHistory: [{ date: "2026-12", goal: 10 }] },
    { expectedHistory: [{ date: "2026-10" }] },
])("dados de previsão inválidos informam erro: %p", (item) => {
    expect(() => obterPrevisaoDoMes(item, referencia)).toThrow("previsões");
});

test("compara apenas o mês selecionado, somando previsões em centavos", () => {
    const balanco = calcularBalancoMensal([
        receita(999, { date: new Date(2026, 8, 15).toISOString() }), receita(0.3), despesa(0.1),
    ], referencia);
    const dados = calcularSaldoAcumuladoPrevisto(balanco, {
        receitas: [{ expected: 0.1 }, { expected: "0.20" }], despesas: [{ expected: 0.2 }],
    }, referencia);
    expect(dados).toEqual({ categoria: "Out/2026", acumulado: 0.2, previsto: 0.1, diferenca: 0.1, diferencaPercentual: 100, semDados: false });
});

test("previsto negativo usa base absoluta na diferença percentual", () => {
    const balanco = calcularBalancoMensal([despesa(50)], referencia);
    const dados = calcularSaldoAcumuladoPrevisto(balanco, { receitas: [], despesas: [{ expected: 100 }] }, referencia);
    expect(dados).toMatchObject({ acumulado: -50, previsto: -100, diferenca: 50, diferencaPercentual: 50 });
});

test("previsto zero não gera divisão por zero nem confunde saldo zero com ausência de dados", () => {
    const previsoes = { receitas: [], despesas: [] };
    const vazio = calcularSaldoAcumuladoPrevisto(calcularBalancoMensal([], referencia), previsoes, referencia);
    expect(vazio).toMatchObject({ acumulado: 0, previsto: 0, diferenca: 0, diferencaPercentual: null, semDados: true });
    const comMovimentacoes = calcularSaldoAcumuladoPrevisto(calcularBalancoMensal([receita(100), despesa(100)], referencia), previsoes, referencia);
    expect(comMovimentacoes.semDados).toBe(false);
    const comPrevisoes = calcularSaldoAcumuladoPrevisto(calcularBalancoMensal([], referencia), { receitas: [{ expected: 100 }], despesas: [{ expected: 100 }] }, referencia);
    expect(comPrevisoes.semDados).toBe(false);
});

test("agrupa receitas pelo identificador, preservando fontes com mesmo nome e nomes alterados", () => {
    const fontes = Object.freeze([
        Object.freeze({ id: "a", nome: "Trabalho", order: 2, expectedHistory: [{ date: "2026-9", goal: 100 }] }),
        Object.freeze({ id: "b", nome: "Trabalho", order: 1, expected: 200 }),
        Object.freeze({ id: "c", nome: "Aluguel", order: 3, expected: 50 }),
    ]);
    const transacoes = Object.freeze([
        receita(30, { outID: "a", out: "Nome antigo" }), receita(20, { outID: "a" }),
        receita(300, { outID: "b", incomingType: "investment" }), despesa(999),
    ].map(Object.freeze));
    const dados = calcularReceitasPorFonte(transacoes, fontes, referencia);
    expect(dados.itens).toEqual([
        { id: "id:b", nome: "Trabalho", recebido: 300, previsto: 200, percentual: 150 },
        { id: "id:a", nome: "Trabalho", recebido: 50, previsto: 100, percentual: 50 },
        { id: "id:c", nome: "Aluguel", recebido: 0, previsto: 50, percentual: 0 },
    ]);
    expect(dados).toMatchObject({ totalRecebido: 350, totalPrevisto: 350, diferenca: 0, semDados: false });
    expect(dados.totalRecebido).toBe(calcularBalancoMensal(transacoes, referencia).receitas[11]);
});

test("lançamentos sem cadastro ou identificador e receitas removidas continuam nos totais", () => {
    const fontes = [
        { id: "a", nome: "Salário", expected: 100 },
        { id: "removida", nome: "Antiga", expected: 999, isDeleted: true },
    ];
    const transacoes = [
        receita(10, { outID: "a" }), receita(20, { outID: "desconhecida", out: "Salário" }),
        receita(30, { out: "Salário" }), receita(40), receita(50, { outID: "removida" }),
    ];
    const dados = calcularReceitasPorFonte(transacoes, fontes, referencia);
    expect(dados.itens).toHaveLength(5);
    expect(dados.itens).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: "id:a", recebido: 10, previsto: 100 }),
        expect.objectContaining({ nome: "Salário (sem cadastro)", recebido: 20, previsto: 0, percentual: null }),
        expect.objectContaining({ nome: "Salário (não identificada)", recebido: 30, previsto: 0 }),
        expect.objectContaining({ nome: "Receita não identificada", recebido: 40 }),
        expect.objectContaining({ nome: "Antiga (removida)", recebido: 50, previsto: 0 }),
    ]));
    expect(dados.totalRecebido).toBe(150);
    expect(dados.totalRecebido).toBe(calcularBalancoMensal(transacoes, referencia).receitas[11]);
});

test("receitas por fonte respeitam os limites do mês, exclusões e classificação dos lançamentos", () => {
    const inicio = new Date(2026, 9, 1);
    const fim = new Date(2026, 10, 1);
    const transacoes = [
        receita(10, { date: inicio.toISOString(), outID: "a" }),
        receita(20, { date: new Date(fim.getTime() - 1).toISOString(), outID: "a", incomingType: "expense" }),
        receita(999, { date: new Date(inicio.getTime() - 1).toISOString() }),
        receita(999, { date: fim.toISOString() }), receita(999, { isDeleted: true }),
        receita(999, { outgoingType: "create" }), receita(999, { out: "Criação" }),
        receita(999, { outgoingType: "account" }), receita(999, { outgoingType: "investment" }),
    ];
    const dados = calcularReceitasPorFonte(transacoes, [{ id: "a", nome: "Salário", expectedHistory: [
        { date: "2026-8", goal: 999 }, { date: "2026-9", goal: 40 }, { date: "2026-10", goal: 999 },
    ] }], referencia);
    expect(dados.itens).toEqual([{ id: "id:a", nome: "Salário", recebido: 30, previsto: 40, percentual: 75 }]);
    expect(dados).toMatchObject({ totalRecebido: 30, totalPrevisto: 40, diferenca: -10 });
});

test("soma receitas e previsões em centavos e não depende de balance do cadastro", () => {
    const dados = calcularReceitasPorFonte([receita(0.1, { outID: "a" }), receita("0.20", { outID: "a" })], [
        { id: "a", nome: "Fonte A", expected: 0.1, balance: 999 },
        { id: "b", nome: "Fonte B", expected: "0.20", balance: 999 },
    ], referencia);
    expect(dados).toMatchObject({ totalRecebido: 0.3, totalPrevisto: 0.3, diferenca: 0 });
    expect(dados.itens.find(item => item.id === "id:a").recebido).toBe(0.3);
});

test("fontes zeradas ou de outros meses geram estado vazio, sem herdar histórico", () => {
    const dados = calcularReceitasPorFonte([], [
        { id: "a", expected: 999, expectedHistory: [{ date: "2026-8", goal: 500 }] },
        { id: "b", expected: 999, createdAt: new Date(2026, 10, 1).toISOString() },
        { id: "c", expected: 0 },
    ], referencia);
    expect(dados).toEqual({ itens: [], totalRecebido: 0, totalPrevisto: 0, diferenca: 0, semDados: true });
});

test("dados inválidos de receita impedem totais parciais, enquanto despesas não participam do cálculo", () => {
    expect(() => calcularReceitasPorFonte([receita("inválido")], [], referencia)).toThrow("lançamentos");
    expect(() => calcularReceitasPorFonte([], [{ id: "a", expected: "inválido" }], referencia)).toThrow("previsões");
    expect(calcularReceitasPorFonte([receita(10), despesa("inválido")], [], referencia).totalRecebido).toBe(10);
});
