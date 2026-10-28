import { calcularPlanejamentoMensal, calcularCompromissoMensal, calcularRealizadoPrevistoMensal, calcularPlanejamentoGlobal, calcularCompromissoGlobal, obterPeriodoObjetivos, obterMensagemErroObjetivos } from "./objetivosService";

const outubro = new Date(2026, 9, 1);
const data = new Date(2026, 9, 15, 12).toISOString();
const aporte = (amount, outros = {}) => ({ date: data, amount, outgoingType: "account", incomingType: "investment", inID: "a", ...outros });

test("compromisso global reutiliza os totais líquidos, incluindo dívidas e bens sem meta", () => {
    const planejamento = Object.freeze(calcularPlanejamentoGlobal([
        { id: "a", current: 100, montante: 100, objective: "Investimento" },
        { id: "b", current: 0, montante: 300, objective: "Bem" },
        { id: "c", current: 500, montante: 0, objective: "Bem" },
        { id: "d", current: -750, montante: 0, objective: "Dívida" },
        { id: "excluido", current: 9999, montante: 9999, isDeleted: true },
    ], [origemDivida()]));
    expect(calcularCompromissoGlobal(planejamento)).toEqual({ totalAtual: -150, totalDesejado: 400, percentual: -37.5, semDados: false });
    expect(planejamento.itens.find(item => item.id === "d").percentual).toBe(25);
    // A quitação individual não substitui o saldo da dívida no total líquido.
    expect(planejamento.totalAtual).toBe(-150);
});

test.each([
    [0, 100, false, 0], [250, 100, false, 250], [-50, 100, false, -50],
    [100, 0, false, null], [-100, 0, false, null], [0, 0, true, null], [0.3, 0.2, false, 150],
])("compromisso global trata atual %s e desejado %s", (totalAtual, totalDesejado, semDados, percentual) => {
    const resultado = calcularCompromissoGlobal(Object.freeze({ totalAtual, totalDesejado, semDados }));
    expect(resultado).toMatchObject({ totalAtual, totalDesejado, semDados });
    if (percentual === null) expect(resultado.percentual).toBeNull();
    else expect(resultado.percentual).toBeCloseTo(percentual);
});

test("planejamento global usa a posição atual e a meta global sem misturar previsão ou aportes mensais", () => {
    const investimentos = Object.freeze([
        Object.freeze({ id: "a", nome: "Reserva", objective: "Investimento", current: 5000, montante: 20000, goal: 500, aporte: 9999, goalHistory: [{ date: "inválida", goal: -1 }], order: 1 }),
        Object.freeze({ id: "b", nome: " Carro 2 ", objective: "Bem", current: "40000", montante: "50000", goal: 0, order: 0 }),
        Object.freeze({ id: "c", nome: "Empréstimo", objective: "Dívida", current: -3000, montante: 0, goal: 100 }),
    ]);
    expect(calcularPlanejamentoGlobal(investimentos)).toEqual({
        itens: [
            { id: "b", nome: "Carro 2", atual: 40000, desejado: 50000, divida: false, percentual: 80, concluido: false },
            { id: "a", nome: "Reserva", atual: 5000, desejado: 20000, divida: false, percentual: 25, concluido: false },
            { id: "c", nome: "Empréstimo", atual: -3000, desejado: 0, divida: true, percentual: null, concluido: false },
        ],
        totalAtual: 42000, totalDesejado: 70000, diferenca: -28000, semDados: false,
    });
});

test("objetivos globais preservam ausência de meta, saldos zero, metas superadas e dívidas quitadas", () => {
    const resultado = calcularPlanejamentoGlobal([
        { id: "a", current: 150, montante: 100, nome: "Superado" },
        { id: "b", current: -50, montante: 100, nome: "Saldo negativo" },
        { id: "c", current: 0, nome: "Sem meta" },
        { id: "d", current: 0, montante: 0, nome: "Quitada", objective: "Dívida" },
        { id: "e", current: 1, montante: 1000, nome: "Crédito", objective: "Dívida" },
        { id: "f", current: 0, montante: 100, nome: "Ainda sem saldo" },
    ]);
    expect(resultado.itens.find(item => item.id === "a")).toMatchObject({ percentual: 150, concluido: true });
    expect(resultado.itens.find(item => item.id === "b")).toMatchObject({ percentual: -50, concluido: false });
    expect(resultado.itens.find(item => item.id === "c")).toMatchObject({ percentual: null, concluido: false });
    expect(resultado.itens.find(item => item.id === "d")).toMatchObject({ percentual: null, concluido: true });
    expect(resultado.itens.find(item => item.id === "e")).toMatchObject({ desejado: 0, percentual: null, concluido: true });
    expect(resultado.itens.find(item => item.id === "f")).toMatchObject({ percentual: 0, concluido: false });
    expect(resultado.itens).toHaveLength(6);
});

test("global exclui cadastros removidos, preserva IDs iguais em nome e soma em centavos", () => {
    const resultado = calcularPlanejamentoGlobal([
        { id: "z", nome: "Mesmo nome", current: 0.1, montante: 0.2 },
        { id: "a", nome: "Mesmo nome", current: 0.2, montante: 0.3 },
        { id: "removido", isDeleted: true, current: "inválido", montante: -1 },
    ]);
    expect(resultado).toMatchObject({ totalAtual: 0.3, totalDesejado: 0.5, diferenca: -0.2 });
    expect(resultado.itens.map(item => item.id)).toEqual(["a", "z"]);
    expect(calcularPlanejamentoGlobal([{ id: "a", current: 0, nome: " " }]).itens[0].nome).toBe("Objetivo sem nome");
    expect(calcularPlanejamentoGlobal([{ id: "a", isDeleted: true }])).toEqual({ itens: [], totalAtual: 0, totalDesejado: 0, diferenca: 0, semDados: true });
});

test.each([undefined, null, "", " ", "inválido", true, [], {}, Infinity, NaN, Number.MAX_SAFE_INTEGER])("saldo global inválido %p não vira zero", (current) => {
    expect(() => calcularPlanejamentoGlobal([{ id: "a", current, montante: 100 }])).toThrow("saldo ou meta global inválidos");
});

test.each([-1, -0.001, "inválido", "", true, Infinity])("meta global inválida %p gera erro identificável", (montante) => {
    expect(() => calcularPlanejamentoGlobal([{ id: "a", current: 10, montante }])).toThrow(expect.objectContaining({ code: "app/objetivo-invalido" }));
    expect(obterMensagemErroObjetivos({ code: "app/objetivo-invalido" })).toContain("saldo ou meta global inválidos");
});

const origemDivida = (outros = {}) => ({ inID: "d", outgoingType: "create", incomingType: "investment", amount: -1000, date: "2020-01-01T12:00:00.000Z", ...outros });

test.each([[-1000, 0], [-750, 25], [0, 100], [100, 100], [-1200, -20]])("quitação usa valor original da dívida com saldo %s", (current, percentual) => {
    const resultado = calcularPlanejamentoGlobal([{ id: "d", objective: "Dívida", current, montante: 0, goal: 50, aporte: 999 }], [origemDivida()]);
    expect(resultado.itens[0]).toMatchObject({ atual: current, desejado: 0, divida: true, percentual, concluido: current >= 0 });
    expect(resultado.totalAtual).toBe(current);
});

test("base da dívida ignora outros objetivos, exclusões e movimentos comuns, sem vincular pelo nome", () => {
    const investimento = { id: "d", nome: "Dívida", objective: "Dívida", current: -750 };
    const ignoradas = [
        origemDivida({ isDeleted: true }), origemDivida({ inID: "outro" }), origemDivida({ inID: "", in: "Dívida" }),
        origemDivida({ incomingType: "account" }), origemDivida({ outgoingType: "account", amount: 250 }),
    ];
    expect(calcularPlanejamentoGlobal([investimento], ignoradas).itens[0].percentual).toBeNull();
    expect(calcularPlanejamentoGlobal([investimento], [...ignoradas, origemDivida()]).itens[0].percentual).toBe(25);
    expect(calcularPlanejamentoGlobal([investimento], [origemDivida(), origemDivida()]).itens[0].percentual).toBeNull();
    expect(calcularPlanejamentoGlobal([investimento], [origemDivida({ amount: 0 })]).itens[0].percentual).toBeNull();
    expect(calcularPlanejamentoGlobal([investimento], [origemDivida({ amount: 1000 })]).itens[0].percentual).toBeNull();
});

test("valores originais inválidos identificam a fonte para nova tentativa sem afetar outros objetivos", () => {
    const origens = [origemDivida({ amount: "inválido" })];
    expect(() => calcularPlanejamentoGlobal([{ id: "d", objective: "Dívida", current: -100 }], origens))
        .toThrow(expect.objectContaining({ code: "app/origem-divida-invalida" }));
    expect(obterMensagemErroObjetivos({ code: "app/origem-divida-invalida" })).toContain("criação de dívidas");
    expect(() => calcularPlanejamentoGlobal([{ id: "d", objective: "Investimento", current: 100, montante: 200 }], origens)).not.toThrow();
});

test("comparação mensal reutiliza totais e diferença do planejamento com o mês selecionado", () => {
    const planejamento = Object.freeze(calcularPlanejamentoMensal([aporte(0.1), aporte(0.2)], [{ id: "a", goal: 0.2 }], outubro));
    const resultado = calcularRealizadoPrevistoMensal(planejamento, outubro);
    expect(resultado).toEqual({ categoria: "Out/2026", realizado: 0.3, previsto: 0.2, diferenca: 0.1, diferencaPercentual: 50, semDados: false });
    expect(calcularCompromissoMensal(planejamento).totalRealizado).toBe(resultado.realizado);
    expect(calcularCompromissoMensal(planejamento).totalPrevisto).toBe(resultado.previsto);
    expect(calcularRealizadoPrevistoMensal(planejamento, new Date(2027, 0, 1)).categoria).toBe("Jan/2027");
});

test.each([
    [50, 100, -50, -50, false], [0, 100, -100, -100, false],
    [50, 0, 50, null, false], [0, 0, 0, null, true], [100, 100, 0, 0, false],
])("comparação de realizado %s e previsto %s trata a diferença e previsão zero", (totalRealizado, totalPrevisto, diferenca, diferencaPercentual, semDados) => {
    expect(calcularRealizadoPrevistoMensal({ totalRealizado, totalPrevisto, diferenca, semDados }, outubro))
        .toEqual({ categoria: "Out/2026", realizado: totalRealizado, previsto: totalPrevisto, diferenca, diferencaPercentual, semDados });
});

test("compromisso mensal usa a razão dos totais, não a média dos percentuais dos objetivos", () => {
    const planejamento = calcularPlanejamentoMensal([aporte(100)], [{ id: "a", goal: 100 }, { id: "b", goal: 300 }], outubro);
    expect(calcularCompromissoMensal(Object.freeze(planejamento))).toEqual({
        totalRealizado: 100, totalPrevisto: 400, percentual: 25, semDados: false,
    });
});

test.each([
    [0, 100, false, 0], [150, 100, false, 150], [50, 0, false, null], [0, 0, true, null], [0.3, 0.2, false, 150],
])("compromisso mensal trata realizado %s e previsto %s", (totalRealizado, totalPrevisto, semDados, percentual) => {
    const resultado = calcularCompromissoMensal({ totalRealizado, totalPrevisto, semDados });
    expect(resultado).toMatchObject({ totalRealizado, totalPrevisto, semDados });
    if (percentual === null) expect(resultado.percentual).toBeNull();
    else expect(resultado.percentual).toBeCloseTo(percentual);
});

test("o período inclui somente o mês selecionado, com limite final exclusivo e virada do ano", () => {
    expect(obterPeriodoObjetivos(new Date(2026, 11, 15))).toEqual({ inicio: new Date(2026, 11, 1), fim: new Date(2027, 0, 1) });
    const transacoes = [
        aporte(1, { date: new Date(2026, 8, 30, 23, 59, 59).toISOString() }),
        aporte(2, { date: new Date(2026, 9, 1).toISOString() }),
        aporte(3, { date: new Date(2026, 9, 31, 23, 59, 59).toISOString() }),
        aporte(4, { date: new Date(2026, 10, 1).toISOString() }),
    ];
    expect(calcularPlanejamentoMensal(transacoes, [], outubro).totalRealizado).toBe(5);
});

test("soma aportes e pagamentos de dívidas sem usar saldo acumulado, aporte salvo ou montante", () => {
    const investimentos = [
        { id: "a", nome: "Reserva", objective: "Investimento", current: 5000, aporte: 999, montante: 50000, goal: 100 },
        { id: "b", nome: "Dívida", objective: "Dívida", current: -3000, aporte: 999, montante: 0, goal: 200, order: 0 },
    ];
    expect(calcularPlanejamentoMensal([aporte(50), aporte(20), aporte(100, { inID: "b" })], investimentos, outubro)).toEqual({
        itens: [
            { id: "id:b", nome: "Dívida", realizado: 100, previsto: 200, percentual: 50 },
            { id: "id:a", nome: "Reserva", realizado: 70, previsto: 100, percentual: 70 },
        ],
        totalRealizado: 170, totalPrevisto: 300, diferenca: -130, semDados: false,
    });
});

test("resgates não reduzem aportes; criação, rendimentos, ajustes, transferências e exclusões não entram", () => {
    const transacoes = [
        aporte(150), aporte(50, { outgoingType: "investment", incomingType: "account", outID: "a" }),
        aporte(1000, { outgoingType: "create" }), aporte(1000, { out: "Criação" }),
        aporte(1000, { outgoingType: "update" }), aporte(1000, { incomingType: "update" }),
        aporte(1000, { outgoingType: "investment", outID: "b" }),
        aporte(1000, { incomingType: "account" }), aporte(1000, { incomingType: "expense" }),
        aporte(1000, { isDeleted: true }), aporte("inválido", { outgoingType: "create" }),
    ];
    expect(calcularPlanejamentoMensal(transacoes, [{ id: "a", goal: 100 }], outubro)).toMatchObject({ totalRealizado: 150, totalPrevisto: 100, diferenca: 50 });
});

test("previsão usa apenas goalHistory do mês, com meses do aplicativo iniciados em zero", () => {
    const investimentos = [{ id: "a", goal: 999, goalHistory: [
        { date: "2026-8", goal: 500 }, { date: "2026-9", goal: 100 }, { date: "2026-10", goal: 700 },
    ] }];
    expect(calcularPlanejamentoMensal([], investimentos, outubro).totalPrevisto).toBe(100);
    expect(calcularPlanejamentoMensal([], investimentos, new Date(2026, 8, 1)).totalPrevisto).toBe(500);
    expect(calcularPlanejamentoMensal([], investimentos, new Date(2026, 7, 1)).semDados).toBe(true);
});

test("previsão suporta o formato do guia e não aplica meta antes da criação do objetivo", () => {
    const investimentos = [
        { id: "a", goalHistory: [{ date: "2026-10", value: 50 }], createdAt: new Date(2026, 9, 15).toISOString() },
        { id: "b", goal: 100, createdAt: new Date(2026, 10, 1).toISOString() },
    ];
    expect(calcularPlanejamentoMensal([], investimentos, outubro).totalPrevisto).toBe(50);
    expect(calcularPlanejamentoMensal([], investimentos, new Date(2026, 8, 1)).semDados).toBe(true);
});

test("vincula por ID, mantém cadastros excluídos com aportes e não mistura nomes iguais", () => {
    const investimentos = [
        { id: "a", nome: "Reserva", goal: 100, isDeleted: true },
        { id: "b", nome: "Reserva", goal: 200 },
    ];
    const resultado = calcularPlanejamentoMensal([
        aporte(20), aporte(30, { inID: "b" }), aporte(40, { inID: "ausente", in: "Reserva" }),
        aporte(50, { inID: undefined, in: "Reserva" }),
    ], investimentos, outubro);
    expect(resultado.itens).toHaveLength(4);
    expect(resultado.itens.find((item) => item.id === "id:a")).toMatchObject({ realizado: 20, previsto: 0, percentual: null });
    expect(resultado.itens.find((item) => item.id === "sem-id:Reserva")).toMatchObject({ realizado: 50, previsto: 0 });
    expect(resultado).toMatchObject({ totalRealizado: 140, totalPrevisto: 200, diferenca: -60 });
});

test("previsão sem aportes permanece visível e percentual zero difere de meta ausente", () => {
    const resultado = calcularPlanejamentoMensal([aporte(50, { inID: "b" })], [{ id: "a", goal: 100 }, { id: "b" }, { id: "c", goal: 0 }], outubro);
    expect(resultado.itens.map(({ id, percentual }) => ({ id, percentual }))).toEqual([
        { id: "id:a", percentual: 0 }, { id: "id:b", percentual: null },
    ]);
    expect(resultado.semDados).toBe(false);
    expect(calcularPlanejamentoMensal([], [], outubro)).toEqual({ itens: [], totalRealizado: 0, totalPrevisto: 0, diferenca: 0, semDados: true });
});

test("soma em centavos, aceita números legados e mantém percentuais acima de 100 sem mutar entradas", () => {
    const investimentos = Object.freeze([Object.freeze({ id: "a", goal: "0.20" })]);
    const transacoes = Object.freeze([Object.freeze(aporte(0.1)), Object.freeze(aporte("0.20"))]);
    const resultado = calcularPlanejamentoMensal(transacoes, investimentos, outubro);
    expect(resultado).toMatchObject({ totalRealizado: 0.3, totalPrevisto: 0.2, diferenca: 0.1 });
    expect(resultado.itens[0].percentual).toBe(150);
});

test.each([null, true, "", "inválido", -1, Infinity, Number.MAX_SAFE_INTEGER])("rejeita valor inválido de aporte: %s", (amount) => {
    expect(() => calcularPlanejamentoMensal([aporte(amount)], [], outubro)).toThrow("aportes ou pagamentos");
});

test("dados inválidos informam a origem para a página repetir somente a fonte correta", () => {
    expect(() => calcularPlanejamentoMensal([aporte(1, { date: "inválida" })], [], outubro)).toThrow(expect.objectContaining({ code: "app/lancamento-invalido" }));
    expect(() => calcularPlanejamentoMensal([], [{ id: "a", goal: -1 }], outubro)).toThrow(expect.objectContaining({ code: "app/previsao-invalida" }));
    expect(() => calcularPlanejamentoMensal([], [{ id: "a", goalHistory: [{ date: "2026-12", goal: 1 }] }], outubro)).toThrow(expect.objectContaining({ code: "app/previsao-invalida" }));
    expect(obterMensagemErroObjetivos({ code: "app/previsao-invalida" })).toContain("previsões de objetivos");
    expect(obterMensagemErroObjetivos({ code: "app/lancamento-invalido" })).toContain("aportes ou pagamentos");
    expect(obterMensagemErroObjetivos({ code: "permission-denied" })).toContain("assinatura");
    expect(obterMensagemErroObjetivos({ code: "unavailable" })).toContain("internet");
    expect(obterMensagemErroObjetivos(new Error())).toContain("Tente novamente");
});
