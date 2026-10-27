import { calcularPlanejamentoMensal, calcularCompromissoMensal, obterPeriodoObjetivos, obterMensagemErroObjetivos } from "./objetivosService";

const outubro = new Date(2026, 9, 1);
const data = new Date(2026, 9, 15, 12).toISOString();
const aporte = (amount, outros = {}) => ({ date: data, amount, outgoingType: "account", incomingType: "investment", inID: "a", ...outros });

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
