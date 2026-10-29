import { calcularSaldosMensais, calcularPatrimonioMensal, calcularVariacaoPatrimonial, obterMensagemErroResultados } from "./resultadosService";

const outubro = new Date(2026, 9, 1);
const agora = new Date(2026, 9, 29, 12);
const contas = [{ id: "c", balance: 0 }];
const investimentos = [{ id: "i", current: 200 }, { id: "d", current: -1000, objective: "Dívida" }];
const transacao = (amount, outgoingType, incomingType, outID, inID, mes = 9, dia = 10) => ({
    amount, outgoingType, incomingType, outID, inID, date: new Date(2026, mes, dia, 12).toISOString(),
});
const criacoes = [transacao(1000, "create", "account", null, "c", 8), transacao(200, "create", "investment", null, "i", 8), transacao(-1000, "create", "investment", null, "d", 8)];
const calcular = (registros = criacoes, c = contas, i = investimentos, data = outubro) => calcularSaldosMensais(registros, c, i, data, agora);
const patrimonio = (...args) => calcularPatrimonioMensal(calcular(...args));

test.each([
    [100, 150, 50, 50], [100, 50, -50, -50], [100, 100, 0, 0],
    [0, 150, 150, null], [0, -150, -150, null], [0, 0, 0, null],
    [-100, -50, 50, 50], [-100, -150, -50, -50], [-100, 0, 100, 100],
    [-100, 100, 200, 200], [100, -100, -200, -200], [0.1, 0.3, 0.2, 200],
])("variação de %s para %s mantém diferença %s e percentual %s", (anterior, atual, diferenca, percentual) => {
    const dados = Object.freeze({ categorias: Object.freeze(["Ago/2026", "Set/2026", "Out/2026"]), patrimonios: Object.freeze([99999, anterior, atual]) });
    expect(calcularVariacaoPatrimonial(dados)).toEqual({
        categoria: "Out/2026", categoriaAnterior: "Set/2026", anterior, atual, diferenca, diferencaPercentual: percentual,
    });
});

test("comparação reutiliza os últimos totais do histórico, inclusive virada do ano e meses sem movimentos", () => {
    const origem = transacao(150, "create", "account", null, "c", -3);
    const base = patrimonio([origem], contas, [], new Date(2026, 0, 1));
    expect(calcularVariacaoPatrimonial(base)).toEqual({
        categoria: "Jan/2026", categoriaAnterior: "Dez/2025", anterior: 150, atual: 150, diferenca: 0, diferencaPercentual: 0,
    });
    expect(calcularVariacaoPatrimonial(patrimonio([], contas, []))).toMatchObject({ anterior: 0, atual: 0, diferenca: 0, diferencaPercentual: null });
});

test("variação rejeita valores inválidos e diferença acima da precisão segura", () => {
    for (const valores of [[NaN, 0], [0, Infinity], ["100", 200], [-90000000000000, 90000000000000]]) {
        expect(() => calcularVariacaoPatrimonial({ categorias: ["Set/2026", "Out/2026"], patrimonios: valores })).toThrow();
    }
});

test("reconstrói posições mensais com criação uma vez, aportes, resgates e pagamentos neutros no patrimônio", () => {
    const dados = patrimonio([...criacoes,
        transacao(500, "income", "account", "r", "c"),
        transacao(100, "account", "expense", "c", "e"),
        transacao(200, "account", "investment", "c", "i"),
        transacao(50, "investment", "account", "i", "c"),
        transacao(100, "account", "investment", "c", "d"),
    ]);
    expect(dados.categorias).toHaveLength(12);
    expect(dados.categorias[0]).toBe("Nov/2025");
    expect(dados.categorias[11]).toBe("Out/2026");
    expect(dados.ativos.slice(-2)).toEqual([1200, 1500]);
    expect(dados.passivos.slice(-2)).toEqual([1000, 900]);
    expect(dados.patrimonios.slice(-2)).toEqual([200, 600]);
    expect(dados.ativos.slice(0, 10)).toEqual(Array(10).fill(0));
    expect(dados.passivos.slice(0, 10)).toEqual(Array(10).fill(0));
    expect(dados.patrimonios.slice(0, 10)).toEqual(Array(10).fill(0));
    expect(dados.semHistorico).toBe(false);
});

test("incorpora movimentos anteriores à janela e mantém saldos nos meses sem lançamentos", () => {
    const origem = transacao(25, "create", "account", null, "c", -3);
    const dados = patrimonio([origem], contas, []);
    expect(dados.ativos).toEqual(Array(12).fill(25));
});

test("não usa current nem balance como saldo consolidado e preserva dados por entidade para os próximos gráficos", () => {
    const base = calcular([...criacoes, transacao(100, "account", "investment", "c", "i")], [{ id: "c", balance: 99999 }], [{ id: "i", current: 99999 }, investimentos[1]]);
    expect(base.meses[11].saldos).toContainEqual({ id: "i", tipo: "investment", centavos: 30000 });
    expect(calcularPatrimonioMensal(base).patrimonios[11]).toBe(200);
});

test("bem, conta negativa e dívida são classificados pelos sinais sem descontar o passivo duas vezes", () => {
    const dados = patrimonio([transacao(40, "create", "investment", null, "b"), transacao(-100, "create", "account", null, "c")], contas, [{ id: "b", objective: "Bem", current: 40 }]);
    expect([dados.ativos[11], dados.passivos[11], dados.patrimonios[11]]).toEqual([40, 100, -60]);
});

test("apresenta zeros antes do primeiro registro, preservando a ausência de histórico na base compartilhada", () => {
    const vazio = patrimonio([], contas, []);
    expect(vazio.semHistorico).toBe(true);
    expect(vazio.ativos).toEqual(Array(12).fill(0));
    expect(vazio.passivos).toEqual(Array(12).fill(0));
    expect(vazio.patrimonios).toEqual(Array(12).fill(0));
    expect(calcular([], contas, []).meses.every(mes => mes.saldos === null)).toBe(true);
    const dados = patrimonio([transacao(0, "create", "account", null, "c")], contas, []);
    expect(dados.ativos.slice(0, 11)).toEqual(Array(11).fill(0));
    expect(dados.ativos[11]).toBe(0);
    expect(dados.semHistorico).toBe(false);
});

test("a seleção histórica não importa saldo, origem ou erro de ajuste do mês seguinte", () => {
    const registros = [...criacoes, transacao(10, "update", "investment", null, "i")];
    const dados = patrimonio(registros, contas, investimentos, new Date(2026, 8, 1));
    expect(dados.patrimonios[11]).toBe(200);
    expect(patrimonio(criacoes, contas, investimentos, new Date(2026, 7, 1)).semHistorico).toBe(true);
});

test("mês atual considera apenas movimentações já ocorridas e limite mensal é exclusivo", () => {
    const registros = [transacao(25, "income", "account", "r", "c", 9, 1), transacao(999, "income", "account", "r", "c", 9, 30), transacao(999, "income", "account", "r", "c", 10, 1)];
    expect(patrimonio(registros, contas, []).ativos[11]).toBe(25);
    const fim = new Date(2026, 9, 1).toISOString();
    const inicio = { ...registros[0], date: fim };
    expect(patrimonio([inicio], contas, [], new Date(2026, 8, 1)).semHistorico).toBe(true);
    expect(patrimonio([inicio], contas, []).ativos[11]).toBe(25);
});

test("soma centavos, não altera entradas e independe da ordem recebida", () => {
    const registros = [transacao(0.1, "income", "account", "r", "c"), transacao(0.2, "income", "account", "r", "c", 8)];
    const copia = JSON.stringify(registros);
    expect(patrimonio(registros, contas, []).ativos[11]).toBe(0.3);
    expect(JSON.stringify(registros)).toBe(copia);
});

test("transações excluídas não contam; cadastro excluído preserva as movimentações históricas ativas", () => {
    const dados = patrimonio([...criacoes, { ...transacao(100, "income", "account", "r", "c"), isDeleted: true }, { date: "inválida", isDeleted: true }], [{ ...contas[0], isDeleted: true }]);
    expect(dados.ativos[11]).toBe(1200);
});

test("IDs iguais em coleções diferentes e transferências entre contas ou entre investimentos não se confundem", () => {
    const dados = patrimonio([
        transacao(100, "create", "account", null, "igual"), transacao(50, "create", "investment", null, "igual"),
        transacao(0, "create", "investment", null, "outro"),
        transacao(10, "account", "account", "igual", "c"), transacao(20, "investment", "investment", "igual", "outro"),
    ], [{ id: "igual", balance: 100 }, ...contas], [{ id: "igual", current: 50 }, { id: "outro", current: 0 }]);
    expect(dados.patrimonios[11]).toBe(150);
});

test.each([
    { amount: NaN }, { amount: Infinity }, { amount: "100" }, { amount: null }, { amount: -1 },
    { date: "inválida" }, { date: null }, { outgoingType: "desconhecido" }, { incomingType: "desconhecido" },
])("não apresenta totais parciais para movimentação inválida: %j", (mudanca) => {
    expect(() => patrimonio([{ ...transacao(100, "income", "account", "r", "c"), ...mudanca }], contas, [])).toThrow();
});

test.each(["incomingType", "outgoingType"])("ajuste não confirmado em %s produz erro explícito", (campo) => {
    try {
        patrimonio([{ ...transacao(100, "income", "account", "r", "c"), [campo]: "update" }], contas, []);
        throw new Error("Deveria rejeitar o ajuste");
    } catch (erro) {
        expect(erro.code).toBe("app/ajuste-nao-interpretado");
    }
});

test("rejeita origem duplicada, saldo inicial desconhecido, cadastro e referência ausentes", () => {
    expect(() => calcular([...criacoes, criacoes[0]])).toThrow();
    expect(() => calcular([], [{ id: "c", balance: 500 }], [])).toThrow();
    expect(() => calcular([transacao(50, "account", "investment", "c", "i")], contas, [{ id: "i", current: 0 }])).toThrow();
    expect(() => calcular(criacoes, [], investimentos)).toThrow();
    expect(() => calcular([], [{ balance: 0 }], [])).toThrow();
});

test("mensagens de erro não expõem detalhes internos do provedor", () => {
    expect(obterMensagemErroResultados({ code: "permission-denied" })).toContain("acesso");
    expect(obterMensagemErroResultados({ code: "unavailable" })).toContain("conexão");
    expect(obterMensagemErroResultados({ message: "detalhe privado" })).toBe("Não foi possível carregar os resultados. Tente novamente.");
});
