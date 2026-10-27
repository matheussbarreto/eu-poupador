import { calcularBalancoMensal, calcularSaldoAcumuladoPrevisto, calcularReceitasPorFonte, calcularReceitasRecebidoPrevisto, calcularDespesasPorCadastro, calcularDespesasGastoPrevisto, calcularDespesasPorCategoria, calcularDespesasPorTipo, calcularDespesasPorUtilidade, calcularDespesasPorTipoGastoPrevisto, obterPrevisaoDoMes, obterMensagemErroBalanco } from "./balancoService";

const referencia = new Date(2026, 9, 16);
const dataOutubro = new Date(2026, 9, 15, 12).toISOString();
const receita = (amount, outros = {}) => ({ date: dataOutubro, amount, outgoingType: "income", incomingType: "account", ...outros });
const despesa = (amount, outros = {}) => ({ date: dataOutubro, amount, outgoingType: "account", incomingType: "expense", ...outros });

test("comparação por tipo agrupa gastos e previsões e mantém os totais dos gráficos anteriores", () => {
    const despesas = [
        { id: "a", type: "Despesa Fixa Essencial", expected: 100 },
        { id: "b", type: " Despesa Fixa Essencial ", expected: 50 },
        { id: "c", type: "Despesa Variável Essencial", expected: 200 },
        { id: "d", type: "Despesa Fixa Não Essencial", expected: 0 },
        { id: "e", type: "Despesa Variável Não Essencial", expected: 25 },
        { id: "f", type: "Tipo desconhecido", expected: 10 },
        { id: "g", type: null },
    ];
    const transacoes = [
        despesa(10, { inID: "a" }), despesa(20, { inID: "b" }), despesa(50, { inID: "d" }),
        despesa(40, { inID: "e" }), despesa(12, { inID: "f" }), despesa(5, { inID: "g" }), despesa(7, { inID: "ausente" }),
    ];
    const cadastros = calcularDespesasPorCadastro(transacoes, despesas, referencia);
    const resultado = calcularDespesasPorTipoGastoPrevisto(cadastros, despesas);
    expect(resultado.itens).toEqual([
        { nome: "Despesa Fixa Essencial", gasto: 30, previsto: 150, percentual: 20 },
        { nome: "Despesa Variável Essencial", gasto: 0, previsto: 200, percentual: 0 },
        { nome: "Despesa Fixa Não Essencial", gasto: 50, previsto: 0, percentual: null },
        { nome: "Despesa Variável Não Essencial", gasto: 40, previsto: 25, percentual: 160 },
        { nome: "Não classificado", gasto: 24, previsto: 10, percentual: 240 },
    ]);
    expect(resultado).toMatchObject({ totalGasto: 144, totalPrevisto: 385, diferenca: 241, semDados: false });
    expect(resultado.diferencaPercentual).toBeCloseTo(241 / 385 * 100);
    const resumo = calcularDespesasGastoPrevisto(cadastros, referencia);
    expect(resultado.totalGasto).toBe(resumo.gasto);
    expect(resultado.totalPrevisto).toBe(resumo.previsto);
    expect(resultado.itens.filter((item) => item.gasto > 0).map(({ nome, gasto }) => ({ nome, gasto })))
        .toEqual(calcularDespesasPorTipo(cadastros, despesas).itens.map(({ nome, gasto }) => ({ nome, gasto })));
});

test("comparação por tipo soma centavos sem alterar os dados compartilhados", () => {
    const despesas = Object.freeze([
        Object.freeze({ id: "a", type: "Despesa Fixa Essencial", expected: 0.1 }),
        Object.freeze({ id: "b", type: "Despesa Fixa Essencial", expected: 0.2 }),
    ]);
    const cadastros = calcularDespesasPorCadastro([despesa(0.1, { inID: "a" }), despesa(0.2, { inID: "b" })], despesas, referencia);
    cadastros.itens.forEach(Object.freeze);
    Object.freeze(cadastros.itens);
    Object.freeze(cadastros);
    expect(calcularDespesasPorTipoGastoPrevisto(cadastros, despesas)).toEqual({
        itens: [{ nome: "Despesa Fixa Essencial", gasto: 0.3, previsto: 0.3, percentual: 100 }],
        totalGasto: 0.3, totalPrevisto: 0.3, diferenca: 0, diferencaPercentual: 0, semDados: false,
    });
});

test("comparação por tipo usa apenas as previsões do mês selecionado e a classificação atual", () => {
    const despesas = [{ id: "a", type: "Despesa Fixa Essencial", expected: 9999, expectedHistory: [
        { date: "2026-8", goal: 200 }, { date: "2026-9", goal: 100 }, { date: "2026-10", goal: 500 },
    ] }];
    const transacoes = [despesa(150, { inID: "a" }), despesa(80, { inID: "a", date: new Date(2026, 8, 15, 12).toISOString() })];
    const outubro = calcularDespesasPorCadastro(transacoes, despesas, referencia);
    expect(calcularDespesasPorTipoGastoPrevisto(outubro, despesas)).toMatchObject({
        totalGasto: 150, totalPrevisto: 100, diferenca: -50, diferencaPercentual: -50,
    });
    const reclassificadas = [{ ...despesas[0], type: "Despesa Variável Não Essencial" }];
    const setembro = calcularDespesasPorCadastro(transacoes, reclassificadas, new Date(2026, 8, 1));
    expect(calcularDespesasPorTipoGastoPrevisto(setembro, reclassificadas).itens).toEqual([
        { nome: "Despesa Variável Não Essencial", gasto: 80, previsto: 200, percentual: 40 },
    ]);
});

test("comparação por tipo preserva gastos excluídos ou sem cadastro e não inventa previsão", () => {
    const despesas = [{ id: "a", nome: "Aluguel", type: "Despesa Fixa Essencial", expected: 500, isDeleted: true }];
    const cadastros = calcularDespesasPorCadastro([despesa(10, { inID: "a" }), despesa(20, { in: "Aluguel" })], despesas, referencia);
    expect(calcularDespesasPorTipoGastoPrevisto(cadastros, despesas)).toEqual({
        itens: [
            { nome: "Despesa Fixa Essencial", gasto: 10, previsto: 0, percentual: null },
            { nome: "Não classificado", gasto: 20, previsto: 0, percentual: null },
        ],
        totalGasto: 30, totalPrevisto: 0, diferenca: -30, diferencaPercentual: null, semDados: false,
    });
});

test("comparação por tipo distingue mês vazio de mês com apenas previsão sem classificação", () => {
    const despesas = [{ id: "a", type: 123, expectedHistory: [{ date: "2026-9", goal: 100 }] }];
    const outubro = calcularDespesasPorCadastro([], despesas, referencia);
    expect(calcularDespesasPorTipoGastoPrevisto(outubro, despesas)).toEqual({
        itens: [{ nome: "Não classificado", gasto: 0, previsto: 100, percentual: 0 }],
        totalGasto: 0, totalPrevisto: 100, diferenca: 100, diferencaPercentual: 100, semDados: false,
    });
    const setembro = calcularDespesasPorCadastro([], despesas, new Date(2026, 8, 1));
    expect(calcularDespesasPorTipoGastoPrevisto(setembro, despesas)).toEqual({
        itens: [], totalGasto: 0, totalPrevisto: 0, diferenca: 0, diferencaPercentual: null, semDados: true,
    });
});

test("utilidades somam tipos em centavos e preservam os não classificados e o total compartilhado", () => {
    const despesas = [
        { id: "a", type: "Despesa Fixa Essencial", expected: 100 },
        { id: "b", type: "Despesa Variável Essencial" },
        { id: "c", type: "Despesa Fixa Não Essencial" },
        { id: "d", type: "Despesa Variável Não Essencial" },
    ];
    const transacoes = [
        despesa(0.1, { inID: "a" }), despesa(0.2, { inID: "b" }),
        despesa(0.1, { inID: "c" }), despesa(0.2, { inID: "d" }), despesa(0.4),
    ];
    const cadastros = calcularDespesasPorCadastro(transacoes, despesas, referencia);
    const tipos = calcularDespesasPorTipo(cadastros, despesas);
    tipos.itens.forEach(Object.freeze);
    Object.freeze(tipos.itens);
    const dados = calcularDespesasPorUtilidade(Object.freeze(tipos));
    expect(dados).toEqual({ itens: [
        { nome: "Essencial", gasto: 0.3, percentual: 30 },
        { nome: "Não Essencial", gasto: 0.3, percentual: 30 },
        { nome: "Não classificado", gasto: 0.4, percentual: 40 },
    ], totalGasto: 1, semDados: false });
    expect(dados.totalGasto).toBe(tipos.totalGasto);
    expect(dados.totalGasto).toBe(calcularDespesasGastoPrevisto(cadastros, referencia).gasto);
    expect(dados.totalGasto).toBe(calcularBalancoMensal(transacoes, referencia).despesas[11]);
});

test.each([
    ["Despesa Fixa Essencial", "Essencial"],
    ["Despesa Variável Não Essencial", "Não Essencial"],
    ["tipo desconhecido", "Não classificado"],
])("utilidade com somente %s mantém 100%% e não cria fatias zeradas", (type, nome) => {
    const despesas = [{ id: "a", type }];
    const cadastros = calcularDespesasPorCadastro([despesa(50, { inID: "a" })], despesas, referencia);
    const tipos = calcularDespesasPorTipo(cadastros, despesas);
    expect(calcularDespesasPorUtilidade(tipos)).toEqual({
        itens: [{ nome, gasto: 50, percentual: 100 }], totalGasto: 50, semDados: false,
    });
});

test("utilidades não incluem previsões nem geram divisão por zero em mês sem gastos", () => {
    const despesas = [{ id: "a", type: "Despesa Fixa Essencial", expected: 500 }];
    const cadastros = calcularDespesasPorCadastro([], despesas, referencia);
    const tipos = calcularDespesasPorTipo(cadastros, despesas);
    expect(calcularDespesasPorUtilidade(tipos)).toEqual({ itens: [], totalGasto: 0, semDados: true });
});

test("tipos agrupam em centavos na ordem prevista, mantendo o total dos outros gráficos", () => {
    const despesas = Object.freeze([
        { id: "a", type: "Despesa Fixa Essencial", expected: 100 },
        { id: "b", type: " Despesa Fixa Essencial " },
        { id: "c", type: "Despesa Variável Essencial" },
        { id: "d", type: "Despesa Fixa Não Essencial" },
        { id: "e", type: "Despesa Variável Não Essencial" },
    ].map(Object.freeze));
    const transacoes = [
        despesa(0.1, { inID: "a" }), despesa(0.2, { inID: "b" }),
        despesa(0.3, { inID: "c" }), despesa(0.3, { inID: "d" }), despesa(0.3, { inID: "e" }),
    ];
    const cadastros = calcularDespesasPorCadastro(transacoes, despesas, referencia);
    cadastros.itens.forEach(Object.freeze);
    Object.freeze(cadastros.itens);
    const dados = calcularDespesasPorTipo(Object.freeze(cadastros), despesas);
    expect(dados).toEqual({ itens: [
        { nome: "Despesa Fixa Essencial", gasto: 0.3, percentual: 25 },
        { nome: "Despesa Variável Essencial", gasto: 0.3, percentual: 25 },
        { nome: "Despesa Fixa Não Essencial", gasto: 0.3, percentual: 25 },
        { nome: "Despesa Variável Não Essencial", gasto: 0.3, percentual: 25 },
    ], totalGasto: 1.2, semDados: false });
    expect(dados.totalGasto).toBe(calcularDespesasPorCategoria(cadastros, despesas).totalGasto);
    expect(dados.totalGasto).toBe(calcularDespesasGastoPrevisto(cadastros, referencia).gasto);
    expect(dados.totalGasto).toBe(calcularBalancoMensal(transacoes, referencia).despesas[11]);
});

test("tipos preservam cadastros removidos e classificam vínculos ou tipos ausentes como Não classificado", () => {
    const despesas = [
        { id: "a", nome: "Aluguel", type: "Despesa Fixa Essencial", isDeleted: true },
        { id: "b", type: "" }, { id: "c", type: null }, { id: "d", type: 123 },
        { id: "e", type: "Essencial" }, { id: "f", type: "Desp. Fixa Essencial" },
    ];
    const transacoes = [
        ...despesas.map(({ id }) => despesa(10, { inID: id })),
        despesa(10, { inID: "ausente" }), despesa(10, { in: "Aluguel" }),
    ];
    const dados = calcularDespesasPorTipo(calcularDespesasPorCadastro(transacoes, despesas, referencia), despesas);
    expect(dados.itens).toEqual([
        { nome: "Despesa Fixa Essencial", gasto: 10, percentual: 12.5 },
        { nome: "Não classificado", gasto: 70, percentual: 87.5 },
    ]);
    expect(dados.totalGasto).toBe(80);
});

test("tipos respeitam o mês, as exclusões e a classificação atual do cadastro", () => {
    const despesas = [{ id: "a", type: "Despesa Fixa Essencial" }];
    const transacoes = [
        despesa(30, { inID: "a" }), despesa(999, { inID: "a", isDeleted: true }),
        despesa(999, { inID: "a", outgoingType: "create" }), receita(999),
        despesa(20, { inID: "a", date: new Date(2026, 8, 15).toISOString() }),
    ];
    const setembro = calcularDespesasPorCadastro(transacoes, despesas, new Date(2026, 8, 1));
    const outubro = calcularDespesasPorCadastro(transacoes, despesas, referencia);
    expect(calcularDespesasPorTipo(setembro, despesas).totalGasto).toBe(20);
    expect(calcularDespesasPorTipo(outubro, despesas).itens).toEqual([{ nome: "Despesa Fixa Essencial", gasto: 30, percentual: 100 }]);
    expect(calcularDespesasPorTipo(outubro, [{ id: "a", type: "Despesa Variável Não Essencial" }]).itens).toEqual([
        { nome: "Despesa Variável Não Essencial", gasto: 30, percentual: 100 },
    ]);
});

test("tipos sem gastos não geram fatias mesmo com previsão, nem divisão por zero", () => {
    const despesas = [{ id: "a", type: "Despesa Fixa Essencial", expected: 500 }];
    const cadastros = calcularDespesasPorCadastro([], despesas, referencia);
    expect(calcularDespesasPorTipo(cadastros, despesas)).toEqual({ itens: [], totalGasto: 0, semDados: true });
});

test("categorias agrupam gastos em centavos sem incluir previsões ou alterar os dados compartilhados", () => {
    const despesas = Object.freeze([
        { id: "a", category: "Habitação", expected: 100 },
        { id: "b", category: " Habitação ", expected: 200 },
        { id: "c", category: "Saúde" }, { id: "d", category: "Educação", expected: 300 },
    ].map(Object.freeze));
    const transacoes = [despesa(0.1, { inID: "a" }), despesa(0.2, { inID: "b" }), despesa(0.3, { inID: "c" })];
    const cadastros = calcularDespesasPorCadastro(transacoes, despesas, referencia);
    cadastros.itens.forEach(Object.freeze);
    Object.freeze(cadastros.itens);
    const dados = calcularDespesasPorCategoria(Object.freeze(cadastros), despesas);
    expect(dados).toEqual({
        itens: [{ nome: "Habitação", gasto: 0.3, percentual: 50 }, { nome: "Saúde", gasto: 0.3, percentual: 50 }],
        totalGasto: 0.6, semDados: false,
    });
    expect(dados.totalGasto).toBe(calcularDespesasGastoPrevisto(cadastros, referencia).gasto);
    expect(dados.totalGasto).toBe(calcularBalancoMensal(transacoes, referencia).despesas[11]);
});

test("categorias preservam gastos removidos e incluem em Outros os gastos sem classificação ou vínculo", () => {
    const despesas = [
        { id: "a", nome: "Aluguel", category: "Habitação", isDeleted: true },
        { id: "b", category: " " }, { id: "c", category: null },
        { id: "d", category: 123 }, { id: "e", category: "Pets" },
    ];
    const transacoes = [
        despesa(10, { inID: "a" }), despesa(10, { inID: "b" }), despesa(10, { inID: "c" }),
        despesa(10, { inID: "d" }), despesa(10, { inID: "e" }), despesa(10, { inID: "ausente" }),
        despesa(10, { in: "Aluguel" }),
    ];
    const cadastros = calcularDespesasPorCadastro(transacoes, despesas, referencia);
    const dados = calcularDespesasPorCategoria(cadastros, despesas);
    expect(dados.itens.map(({ nome, gasto }) => ({ nome, gasto }))).toEqual([
        { nome: "Habitação", gasto: 10 }, { nome: "Pets", gasto: 10 }, { nome: "Outros", gasto: 50 },
    ]);
    expect(dados.totalGasto).toBe(70);
    expect(dados.itens.reduce((total, item) => total + item.percentual, 0)).toBeCloseTo(100);
});

test("categorias respeitam o mês e refletem a classificação atual sem mudar o total", () => {
    const despesas = [{ id: "a", category: "Habitação" }];
    const transacoes = [
        despesa(30, { inID: "a" }), despesa(999, { inID: "a", isDeleted: true }),
        despesa(999, { inID: "a", outgoingType: "create" }),
        despesa(20, { inID: "a", date: new Date(2026, 8, 15).toISOString() }),
    ];
    const setembro = calcularDespesasPorCadastro(transacoes, despesas, new Date(2026, 8, 1));
    const outubro = calcularDespesasPorCadastro(transacoes, despesas, referencia);
    expect(calcularDespesasPorCategoria(setembro, despesas).totalGasto).toBe(20);
    expect(calcularDespesasPorCategoria(outubro, despesas).itens).toEqual([{ nome: "Habitação", gasto: 30, percentual: 100 }]);
    expect(calcularDespesasPorCategoria(outubro, [{ id: "a", category: "Pessoal" }]).itens).toEqual([{ nome: "Pessoal", gasto: 30, percentual: 100 }]);
});

test("categorias ficam vazias quando só há previsões, sem divisões por zero", () => {
    const despesas = [{ id: "a", category: "Habitação", expected: 999 }];
    const cadastros = calcularDespesasPorCadastro([], despesas, referencia);
    expect(cadastros.semDados).toBe(false);
    expect(calcularDespesasPorCategoria(cadastros, despesas)).toEqual({ itens: [], totalGasto: 0, semDados: true });
});

test.each([
    [800, 1000, 200, 20], [1200, 1000, -200, -20],
    [1000, 1000, 0, 0], [0, 1000, 1000, 100],
    [50, 0, -50, null], [0, 0, 0, null], [0.3, 0.2, -0.1, -50],
])("resumo de despesas compara gasto %p e previsto %p", (gasto, previsto, diferenca, percentual) => {
    const cadastros = calcularDespesasPorCadastro([despesa(gasto, { inID: "a" })], [{ id: "a", expected: previsto }], referencia);
    const dados = calcularDespesasGastoPrevisto(Object.freeze(cadastros), referencia);
    expect(dados).toEqual({
        categoria: "Out/2026", gasto, previsto, diferenca,
        diferencaPercentual: percentual, semDados: gasto === 0 && previsto === 0,
    });
    expect(dados.gasto).toBe(cadastros.totalGasto);
    expect(dados.previsto).toBe(cadastros.totalPrevisto);
});

test("despesas são vinculadas por inID, sem misturar nomes iguais ou categorias amplas", () => {
    const cadastros = Object.freeze([
        Object.freeze({ id: "a", nome: "Aluguel", category: "Habitação", order: 2, expected: 100 }),
        Object.freeze({ id: "b", nome: "Aluguel", category: "Habitação", order: 1, expected: 200 }),
        Object.freeze({ id: "c", nome: "Condomínio", category: "Habitação", order: 3, expected: 50 }),
    ]);
    const transacoes = Object.freeze([
        despesa(30, { inID: "a", in: "Nome antigo" }), despesa(20, { inID: "a" }),
        despesa(300, { inID: "b" }), receita(999),
    ].map(Object.freeze));
    const dados = calcularDespesasPorCadastro(transacoes, cadastros, referencia);
    expect(dados.itens).toEqual([
        { id: "id:b", nome: "Aluguel", gasto: 300, previsto: 200, percentual: 150 },
        { id: "id:a", nome: "Aluguel", gasto: 50, previsto: 100, percentual: 50 },
        { id: "id:c", nome: "Condomínio", gasto: 0, previsto: 50, percentual: 0 },
    ]);
    expect(dados).toMatchObject({ totalGasto: 350, totalPrevisto: 350, diferenca: 0, semDados: false });
    expect(dados.totalGasto).toBe(calcularBalancoMensal(transacoes, referencia).despesas[11]);
});

test("gastos de despesas removidas, ausentes ou sem identificador permanecem nos totais", () => {
    const cadastros = [{ id: "a", nome: "Aluguel", expected: 100 }, { id: "b", nome: "Antiga", isDeleted: true, expected: 999 }];
    const transacoes = [
        despesa(10, { inID: "a" }), despesa(20, { inID: "ausente", in: "Aluguel" }),
        despesa(30, { in: "Aluguel" }), despesa(40), despesa(50, { inID: "b" }),
    ];
    const dados = calcularDespesasPorCadastro(transacoes, cadastros, referencia);
    expect(dados.itens).toHaveLength(5);
    expect(dados.itens).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: "id:a", gasto: 10, previsto: 100 }),
        expect.objectContaining({ nome: "Aluguel (sem cadastro)", gasto: 20, previsto: 0, percentual: null }),
        expect.objectContaining({ nome: "Aluguel (não identificada)", gasto: 30, previsto: 0 }),
        expect.objectContaining({ nome: "Despesa não identificada", gasto: 40 }),
        expect.objectContaining({ nome: "Antiga (removida)", gasto: 50, previsto: 0 }),
    ]));
    expect(dados).toMatchObject({ totalGasto: 150, totalPrevisto: 100, diferenca: -50 });
    expect(dados.totalGasto).toBe(calcularBalancoMensal(transacoes, referencia).despesas[11]);
});

test("despesas respeitam limites do mês, exclusões e histórico sem herdar outros meses", () => {
    const inicio = new Date(2026, 9, 1);
    const fim = new Date(2026, 10, 1);
    const transacoes = [
        despesa(10, { date: inicio.toISOString(), inID: "a" }),
        despesa(20, { date: new Date(fim.getTime() - 1).toISOString(), inID: "a", outgoingType: "income" }),
        despesa(999, { date: new Date(inicio.getTime() - 1).toISOString() }),
        despesa(999, { date: fim.toISOString() }), despesa(999, { isDeleted: true }),
        despesa(999, { outgoingType: "create" }), despesa(999, { out: "Criação" }),
        despesa(999, { incomingType: "account" }), despesa(999, { incomingType: "investment" }),
    ];
    const cadastros = [{ id: "a", nome: "Aluguel", expectedHistory: [
        { date: "2026-8", goal: 999 }, { date: "2026-9", goal: 50 }, { date: "2026-10", goal: 999 },
    ] }];
    const dados = calcularDespesasPorCadastro(transacoes, cadastros, referencia);
    expect(dados.itens).toEqual([{ id: "id:a", nome: "Aluguel", gasto: 30, previsto: 50, percentual: 60 }]);
    expect(dados.diferenca).toBe(20);
    expect(dados.totalGasto).toBe(calcularBalancoMensal(transacoes, referencia).despesas[11]);
    expect(calcularDespesasPorCadastro([], cadastros, new Date(2026, 7, 1)).semDados).toBe(true);
});

test("diferença de despesas soma centavos e representa previsto menos gasto", () => {
    const dados = calcularDespesasPorCadastro([despesa(0.1, { inID: "a" }), despesa("0.20", { inID: "a" })], [
        { id: "a", expected: 0.2, balance: 999 }, { id: "b", expected: 0.2 },
    ], referencia);
    expect(dados).toMatchObject({ totalGasto: 0.3, totalPrevisto: 0.4, diferenca: 0.1 });
    const semPrevisao = calcularDespesasPorCadastro([despesa(50)], [], referencia);
    expect(semPrevisao).toMatchObject({ totalGasto: 50, totalPrevisto: 0, diferenca: -50 });
    expect(semPrevisao.itens[0].percentual).toBeNull();
});

test("despesas zeradas, futuras ou sem previsão no mês geram estado vazio", () => {
    const dados = calcularDespesasPorCadastro([], [
        { id: "a", expected: 999, expectedHistory: [{ date: "2026-8", goal: 500 }] },
        { id: "b", expected: 999, createdAt: new Date(2026, 10, 1).toISOString() },
        { id: "c", expected: 0 }, { id: "d", expected: 999, isDeleted: true },
    ], referencia);
    expect(dados).toEqual({ itens: [], totalGasto: 0, totalPrevisto: 0, diferenca: 0, semDados: true });
});

test("despesas inválidas impedem totais parciais sem depender da validade das receitas", () => {
    expect(() => calcularDespesasPorCadastro([despesa("inválido")], [], referencia)).toThrow("lançamentos");
    expect(() => calcularDespesasPorCadastro([despesa(10, { date: "inválido" })], [], referencia)).toThrow("lançamentos");
    expect(() => calcularDespesasPorCadastro([], [{ id: "a", expected: "inválido" }], referencia)).toThrow("previsões");
    expect(calcularDespesasPorCadastro([despesa(10), receita("inválido")], [], referencia).totalGasto).toBe(10);
});

test.each([
    [900, 1000, -100, -10], [1200, 1000, 200, 20],
    [1000, 1000, 0, 0], [0, 1000, -1000, -100],
    [50, 0, 50, null], [0, 0, 0, null], [0.3, 0.2, 0.1, 50],
])("resumo de receitas compara recebido %p e previsto %p", (recebido, previsto, diferenca, percentual) => {
    const fontes = calcularReceitasPorFonte([receita(recebido, { outID: "a" })], [{ id: "a", expected: previsto }], referencia);
    const dados = calcularReceitasRecebidoPrevisto(Object.freeze(fontes), referencia);
    expect(dados).toEqual({
        categoria: "Out/2026", recebido, previsto, diferenca,
        diferencaPercentual: percentual, semDados: recebido === 0 && previsto === 0,
    });
    expect(dados.recebido).toBe(fontes.totalRecebido);
    expect(dados.previsto).toBe(fontes.totalPrevisto);
});

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
