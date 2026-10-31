import { calcularSaldosMensais, calcularPatrimonioMensal, calcularVariacaoPatrimonial, calcularResultadoAtivos, calcularResultadoPassivos, calcularResultadoAtivoPassivo, calcularSaldoInvestimentos, calcularControleInvestimentos, calcularCarteiraInvestimentos, calcularRendimentosMensais, obterMensagemErroResultados } from "./resultadosService";

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

test('rendimentos somam apenas créditos do mês em investimentos e atualizam os saldos uma vez', () => {
    const objetivos = [{ id: 'i', current: 200, objective: 'Investimento', rendimentoPrevisto: 999 },
        { id: 'j', current: 100, objective: 'Investimento', isDeleted: true },
        { id: 'b', current: 500, objective: 'Bem' }, { id: 'd', current: -1000, objective: 'Dívida' }];
    const registros = [...criacoes,
        transacao(100, 'create', 'investment', null, 'j', 8), transacao(500, 'create', 'investment', null, 'b', 8),
        transacao(10, 'update', 'investment', null, 'i'), transacao(0.1, 'update', 'investment', null, 'i'),
        transacao(0.2, 'update', 'investment', null, 'i'), transacao(20, 'update', 'investment', null, 'j'),
        transacao(5, 'update', 'account', null, 'c'), transacao(7, 'update', 'investment', null, 'b'), transacao(8, 'update', 'investment', null, 'd'),
        transacao(40, 'income', 'investment', null, 'i'), transacao(50, 'account', 'investment', 'c', 'i'),
        transacao(20, 'investment', 'account', 'i', 'c'), transacao(5, 'investment', 'investment', 'i', 'j'),
        { ...transacao(999, 'update', 'investment', null, 'i'), isDeleted: true },
    ];
    const copia = JSON.stringify(registros);
    const base = calcular([...registros].reverse(), contas, objetivos);
    expect(calcularRendimentosMensais(base, objetivos)).toMatchObject({ rendimentos: [...Array(11).fill(0), 30.3], atual: 30.3, anterior: 0, diferencaPercentual: null });
    expect(calcularSaldoInvestimentos(base, objetivos).atual).toBe(400.3);
    expect(base.meses[11].rendimentos).toContainEqual({ id: 'i', tipo: 'investment', centavos: 1030 });
    expect(JSON.stringify(registros)).toBe(copia);
});

test('rendimentos não carregam valores de meses anteriores nem créditos anteriores à janela', () => {
    const objetivos = [{ id: 'i', current: 100, objective: 'Investimento' }];
    const registros = [transacao(100, 'create', 'investment', null, 'i', -4),
        transacao(10, 'update', 'investment', null, 'i', -3), transacao(20, 'update', 'investment', null, 'i', 8)];
    const base = calcular(registros, [], objetivos);
    expect(calcularRendimentosMensais(base, objetivos)).toMatchObject({ rendimentos: [...Array(10).fill(0), 20, 0], atual: 0, anterior: 20, diferenca: -20, diferencaPercentual: -100 });
    expect(calcularSaldoInvestimentos(base, objetivos).atual).toBe(130);
    expect(calcularRendimentosMensais(calcular([], [], []), []).rendimentos).toEqual(Array(12).fill(0));
});

test('rendimentos respeitam os limites locais do mês e excluem créditos futuros', () => {
    const objetivos = [{ id: 'i', current: 0, objective: 'Investimento' }];
    const inicio = new Date(2026, 9, 1);
    const registros = [transacao(0, 'create', 'investment', null, 'i', 7),
        { ...transacao(10, 'update', 'investment', null, 'i'), date: new Date(inicio.getTime() - 1).toISOString() },
        { ...transacao(20, 'update', 'investment', null, 'i'), date: inicio.toISOString() },
        transacao(999, 'update', 'investment', null, 'i', 9, 30), transacao(999, 'update', 'investment', null, 'i', 10, 1)];
    expect(calcularRendimentosMensais(calcular(registros, [], objetivos), objetivos).rendimentos.slice(-2)).toEqual([10, 20]);
    expect(calcularRendimentosMensais(calcular(registros, [], objetivos, new Date(2026, 8, 1)), objetivos).atual).toBe(10);
});

test('rendimentos distinguem coleções, preservam a virada do ano e seguem reclassificação atual', () => {
    const objetivos = [{ id: 'i', current: 0, objective: 'Investimento' }];
    const registros = [transacao(0, 'create', 'investment', null, 'i', -2),
        transacao(10, 'update', 'investment', null, 'i', -1), transacao(20, 'update', 'investment', null, 'i', 0),
        transacao(999, 'update', 'account', null, 'i', 0)];
    const base = calcular(registros, [{ id: 'i', balance: 0 }], objetivos, new Date(2026, 0, 1));
    expect(calcularRendimentosMensais(base, objetivos)).toMatchObject({ categoria: 'Jan/2026', categoriaAnterior: 'Dez/2025', atual: 20, anterior: 10 });
    expect(calcularRendimentosMensais(base, [{ ...objetivos[0], objective: 'Bem' }]).rendimentos).toEqual(Array(12).fill(0));
});

test('créditos inválidos e ajustes não viram rendimentos estimados ou resultados parciais', () => {
    for (const amount of [-1, NaN, Infinity, '10']) {
        expect(() => calcular([...criacoes, transacao(amount, 'update', 'investment', null, 'i')])).toThrow();
    }
    expect(() => calcular([...criacoes, transacao(10, 'update', 'investment', null, 'ausente')])).toThrow();
    const objetivos = [{ id: 'i', objective: 'Investimento' }, { id: 'j', objective: 'Investimento' }];
    const base = rendimentos => ({ meses: [{ categoria: 'Set/2026', rendimentos: [] }, { categoria: 'Out/2026', rendimentos }] });
    expect(() => calcularRendimentosMensais(base([{ id: 'ausente', tipo: 'investment', centavos: 10 }]), objetivos)).toThrow();
    expect(() => calcularRendimentosMensais(base([{ id: 'i', tipo: 'investment', centavos: -10 }]), objetivos)).toThrow();
    expect(() => calcularRendimentosMensais(base([{ id: 'i', tipo: 'investment', centavos: Number.MAX_SAFE_INTEGER }, { id: 'j', tipo: 'investment', centavos: 1 }]), objetivos)).toThrow();
});

test('carteira reutiliza posições do controle, preservando IDs, nomes repetidos, ordem e centavos', () => {
    const controle = Object.freeze({ categoria: 'Out/2026', itens: Object.freeze([
        Object.freeze({ id: 'j', nome: 'Reserva', atual: 0.2, anterior: 999 }),
        Object.freeze({ id: 'i', nome: 'Reserva', atual: 0.1, anterior: 0 }),
    ]) });
    const carteira = calcularCarteiraInvestimentos(controle);
    expect(carteira).toMatchObject({ categoria: 'Out/2026', total: 0.3, semDados: false,
        itens: [{ id: 'j', nome: 'Reserva', valor: 0.2 }, { id: 'i', nome: 'Reserva', valor: 0.1 }] });
    expect(carteira.itens[0].percentual).toBeCloseTo(200 / 3);
    expect(carteira.itens.reduce((soma, item) => soma + item.percentual, 0)).toBeCloseTo(100);
});

test('carteira distribui apenas saldos positivos, mesmo com saldo líquido negativo', () => {
    expect(calcularCarteiraInvestimentos({ categoria: 'Out/2026', itens: [
        { id: 'i', nome: 'Reserva', atual: 100 }, { id: 'j', nome: 'Negativo', atual: -200 },
        { id: 'z', nome: 'Resgatado', anterior: 500, atual: 0 },
    ] })).toEqual({ categoria: 'Out/2026', total: 100, semDados: false,
        itens: [{ id: 'i', nome: 'Reserva', valor: 100, percentual: 100 }] });
});

test.each([[], [{ id: 'i', atual: 0 }], [{ id: 'i', atual: -10 }]].map(itens => [itens]))('carteira sem posições positivas fica vazia sem percentual inválido (%j)', (itens) => {
    expect(calcularCarteiraInvestimentos({ categoria: 'Out/2026', itens })).toEqual({ categoria: 'Out/2026', itens: [], total: 0, semDados: true });
});

test('carteira herda período, classificação e cadastros removidos do controle', () => {
    const objetivos = [
        { id: 'i', objective: 'Investimento', current: 0, nome: 'Reserva', isDeleted: true },
        { id: 'b', objective: 'Bem', current: 0 },
    ];
    const registros = [transacao(100, 'create', 'investment', null, 'i', 8), transacao(500, 'create', 'investment', null, 'b', 8),
        transacao(50, 'income', 'investment', null, 'i'),
        { ...transacao(999, 'income', 'investment', null, 'i'), isDeleted: true }];
    const controle = calcularControleInvestimentos(calcular(registros, [], objetivos), objetivos);
    const carteira = calcularCarteiraInvestimentos(controle);
    expect(carteira.total).toBe(controle.atual);
    expect(carteira.itens).toEqual([{ id: 'i', nome: 'Reserva (removido)', valor: 150, percentual: 100 }]);
    const anterior = calcularControleInvestimentos(calcular(registros, [], objetivos, new Date(2026, 8, 1)), objetivos);
    expect(calcularCarteiraInvestimentos(anterior)).toMatchObject({ categoria: 'Set/2026', total: 100 });
});

test('carteira rejeita valores inválidos e soma insegura em vez de apresentar uma carteira parcial', () => {
    for (const atual of [NaN, Infinity, '100', undefined]) {
        expect(() => calcularCarteiraInvestimentos({ itens: [{ id: 'i', atual: 100 }, { id: 'j', atual }] })).toThrow();
    }
    expect(() => calcularCarteiraInvestimentos({ itens: [
        { id: 'i', atual: 50000000000000 }, { id: 'j', atual: 50000000000000 },
    ] })).toThrow();
});

test('controle detalha aportes, resgates e transferências por ID com totais iguais ao histórico', () => {
    const objetivos = [
        { id: 'i', nome: 'Reserva', current: 200, objective: 'Investimento', order: 2 },
        { id: 'j', nome: 'Reserva', current: 100, objective: 'Investimento', order: 1, isDeleted: true },
        { id: 'b', nome: 'Carro', current: 500, objective: 'Bem' },
        { id: 'd', current: -1000, objective: 'Dívida' },
    ];
    const registros = [...criacoes,
        transacao(100, 'create', 'investment', null, 'j', 8), transacao(500, 'create', 'investment', null, 'b', 8),
        transacao(50, 'investment', 'investment', 'i', 'j'),
        transacao(150, 'investment', 'account', 'i', 'c'), transacao(50, 'account', 'investment', 'c', 'j'),
        { ...transacao(999, 'account', 'investment', 'c', 'j'), isDeleted: true },
        transacao(999, 'account', 'investment', 'c', 'j', 10),
    ];
    const base = calcular(registros, contas, objetivos);
    const controle = calcularControleInvestimentos(base, objetivos);
    expect(controle.itens).toMatchObject([
        { id: 'j', nome: 'Reserva (removido)', anterior: 100, atual: 200, diferenca: 100, diferencaPercentual: 100 },
        { id: 'i', nome: 'Reserva', anterior: 200, atual: 0, diferenca: -200, diferencaPercentual: -100 },
    ]);
    expect(controle).toMatchObject({ categoria: 'Out/2026', categoriaAnterior: 'Set/2026', anterior: 300, atual: 200, diferenca: -100, semDados: false });
    for (const campo of ['anterior', 'atual', 'diferenca', 'diferencaPercentual']) {
        expect(controle[campo]).toBe(calcularSaldoInvestimentos(base, objetivos)[campo]);
    }
});

test('controle preserva centavos, negativos e nomes repetidos sem misturar coleções ou alterar a base', () => {
    const objetivos = Object.freeze([
        Object.freeze({ id: 'i', nome: 'Reserva', objective: 'Investimento' }),
        Object.freeze({ id: 'j', nome: 'Reserva', objective: 'Investimento' }),
        Object.freeze({ id: 'n', nome: ' ', objective: 'Investimento', order: 0 }),
    ]);
    const base = Object.freeze({ meses: Object.freeze([
        Object.freeze({ categoria: 'Set/2026', saldos: Object.freeze([{ id: 'i', tipo: 'investment', centavos: -20 }]) }),
        Object.freeze({ categoria: 'Out/2026', saldos: Object.freeze([
            { id: 'i', tipo: 'investment', centavos: -10 }, { id: 'j', tipo: 'investment', centavos: 10 },
            { id: 'n', tipo: 'investment', centavos: 30 }, { id: 'i', tipo: 'account', centavos: 999 },
        ]) }),
    ]) });
    expect(calcularControleInvestimentos(base, objetivos)).toMatchObject({
        anterior: -0.2, atual: 0.3, diferenca: 0.5, diferencaPercentual: 250,
        itens: [
            { id: 'n', nome: 'Investimento sem nome', anterior: 0, atual: 0.3, diferencaPercentual: null },
            { id: 'i', nome: 'Reserva', anterior: -0.2, atual: -0.1, diferencaPercentual: 50 },
            { id: 'j', nome: 'Reserva', anterior: 0, atual: 0.1, diferencaPercentual: null },
        ],
    });
});

test('controle mantém mês sem movimentos, respeita período, reclassificação e posições zeradas', () => {
    const objetivos = [{ id: 'i', objective: 'Investimento', current: 0 }];
    const registros = [transacao(100, 'create', 'investment', null, 'i', -3)];
    expect(calcularControleInvestimentos(calcular(registros, [], objetivos, new Date(2026, 0, 1)), objetivos)).toMatchObject({
        categoria: 'Jan/2026', categoriaAnterior: 'Dez/2025', anterior: 100, atual: 100, diferenca: 0,
    });
    const reclassificados = [{ ...objetivos[0], objective: 'Bem' }];
    expect(calcularControleInvestimentos(calcular(registros, [], objetivos), reclassificados)).toMatchObject({ itens: [], semDados: true, anterior: 0, atual: 0 });
    for (const registros of [[], [transacao(0, 'create', 'investment', null, 'i')], [transacao(100, 'create', 'investment', null, 'i', 10)]]) {
        expect(calcularControleInvestimentos(calcular(registros, [], objetivos), objetivos)).toMatchObject({ itens: [], semDados: true, anterior: 0, atual: 0, diferencaPercentual: null });
    }
});

test('controle não confunde total líquido zero com ausência de investimentos', () => {
    const objetivos = [{ id: 'i', objective: 'Investimento' }, { id: 'j', objective: 'Investimento' }];
    const base = { meses: [{ categoria: 'Set/2026', saldos: null }, { categoria: 'Out/2026', saldos: [
        { id: 'i', tipo: 'investment', centavos: 100 }, { id: 'j', tipo: 'investment', centavos: -100 },
    ] }] };
    expect(calcularControleInvestimentos(base, objetivos)).toMatchObject({ semDados: false, atual: 0, diferencaPercentual: null });
    expect(calcularControleInvestimentos(base, objetivos).itens).toHaveLength(2);
});

test('controle rejeita referências ausentes, valores inválidos e totais inseguros', () => {
    const base = saldos => ({ meses: [{ categoria: 'Set/2026', saldos: null }, { categoria: 'Out/2026', saldos }] });
    const objetivos = [{ id: 'i', objective: 'Investimento' }, { id: 'j', objective: 'Investimento' }];
    expect(() => calcularControleInvestimentos(base([{ id: 'ausente', tipo: 'investment', centavos: 1 }]), objetivos)).toThrow();
    for (const centavos of [NaN, Infinity, 1.5, '100']) {
        expect(() => calcularControleInvestimentos(base([{ id: 'i', tipo: 'investment', centavos }]), objetivos)).toThrow();
    }
    expect(() => calcularControleInvestimentos(base([{ id: 'i', tipo: 'investment', centavos: Number.MAX_SAFE_INTEGER }, { id: 'j', tipo: 'investment', centavos: 1 }]), objetivos)).toThrow();
});

test('saldo dos investimentos soma posições mensais, aportes e resgates, sem duplicar transferências internas', () => {
    const objetivos = [...investimentos.map(item => ({ ...item, objective: item.id === 'i' ? 'Investimento' : 'Dívida' })),
        { id: 'j', current: 0, objective: 'Investimento', isDeleted: true }, { id: 'b', current: 0, objective: 'Bem' }];
    const registros = [...criacoes,
        transacao(100, 'create', 'investment', null, 'j', 8), transacao(500, 'create', 'investment', null, 'b', 8),
        transacao(200, 'account', 'investment', 'c', 'i'), transacao(50, 'investment', 'account', 'i', 'c'),
        transacao(50, 'investment', 'investment', 'i', 'j'),
        { ...transacao(999, 'account', 'investment', 'c', 'i'), isDeleted: true },
        transacao(999, 'account', 'investment', 'c', 'i', 10),
    ];
    const dados = calcularSaldoInvestimentos(calcular(registros, contas, objetivos), objetivos);
    expect(dados.saldos).toEqual([...Array(10).fill(0), 300, 450]);
    expect(dados).toMatchObject({ categoria: 'Out/2026', categoriaAnterior: 'Set/2026', anterior: 300, atual: 450, diferenca: 150, diferencaPercentual: 50 });
    expect(dados.categorias).toHaveLength(12);
    expect(dados.categorias[0]).toBe('Nov/2025');
    expect(calcularSaldoInvestimentos(calcular(registros, contas, objetivos, new Date(2026, 8, 1)), objetivos).atual).toBe(300);
});

test('saldo dos investimentos respeita a coleção e a classificação atual, incluindo centavos e posições negativas', () => {
    const saldos = Object.freeze([
        Object.freeze({ id: 'i', tipo: 'account', centavos: 9999 }),
        Object.freeze({ id: 'i', tipo: 'investment', centavos: 30 }),
        Object.freeze({ id: 'j', tipo: 'investment', centavos: -10 }),
        Object.freeze({ id: 'b', tipo: 'investment', centavos: 100 }),
        Object.freeze({ id: 'd', tipo: 'investment', centavos: -100 }),
        Object.freeze({ id: 'u', tipo: 'investment', centavos: 100 }),
    ]);
    const objetivos = [{ id: 'i', objective: 'Investimento' }, { id: 'j', objective: 'Investimento' },
        { id: 'b', objective: 'Bem' }, { id: 'd', objective: 'Dívida' }, { id: 'u', nome: 'Investimento' }];
    const base = { meses: [{ categoria: 'Set/2026', saldos: null }, { categoria: 'Out/2026', saldos }] };
    expect(calcularSaldoInvestimentos(base, objetivos)).toMatchObject({ saldos: [0, 0.2], atual: 0.2, diferenca: 0.2, diferencaPercentual: null });
    expect(calcularSaldoInvestimentos(base, objetivos.map(item => item.id === 'i' ? { ...item, objective: 'Bem' } : item)).atual).toBe(-0.1);
});

test.each([[0, 100, 100, null], [0, -100, -100, null], [0, 0, 0, null],
    [-100, -50, 50, 50], [-100, -150, -50, -50], [100, 50, -50, -50]])(
    'saldo dos investimentos de %s para %s mantém diferença %s e percentual %s', (anterior, atual, diferenca, percentual) => {
        const meses = [anterior, atual].map((valor, indice) => ({ categoria: ['Set/2026', 'Out/2026'][indice], saldos: [{ id: 'i', tipo: 'investment', centavos: valor * 100 }] }));
        expect(calcularSaldoInvestimentos({ meses }, [{ id: 'i', objective: 'Investimento' }])).toMatchObject({ anterior, atual, diferenca, diferencaPercentual: percentual });
    }
);

test('saldo dos investimentos mantém posições anteriores à janela, a virada do ano e zeros sem investimentos', () => {
    const objetivos = [{ id: 'i', objective: 'Investimento', current: 0 }];
    const origem = transacao(25, 'create', 'investment', null, 'i', -3);
    const dados = calcularSaldoInvestimentos(calcular([origem], [], objetivos, new Date(2026, 0, 1)), objetivos);
    expect(dados).toMatchObject({ categoria: 'Jan/2026', categoriaAnterior: 'Dez/2025', anterior: 25, atual: 25, diferenca: 0, diferencaPercentual: 0 });
    expect(calcularSaldoInvestimentos(calcular([origem], [], objetivos), objetivos).saldos).toEqual(Array(12).fill(25));
    expect(calcularSaldoInvestimentos(calcular([], contas, []), []).saldos).toEqual(Array(12).fill(0));
});

test('saldo dos investimentos rejeita referência ausente, centavos inválidos e soma insegura', () => {
    const base = saldos => ({ meses: [{ categoria: 'Set/2026', saldos: null }, { categoria: 'Out/2026', saldos }] });
    const objetivos = [{ id: 'i', objective: 'Investimento' }, { id: 'j', objective: 'Investimento' }];
    expect(() => calcularSaldoInvestimentos(base([{ id: 'ausente', tipo: 'investment', centavos: 1 }]), objetivos)).toThrow();
    for (const centavos of [NaN, Infinity, 1.5, '100']) {
        expect(() => calcularSaldoInvestimentos(base([{ id: 'i', tipo: 'investment', centavos }]), objetivos)).toThrow();
    }
    expect(() => calcularSaldoInvestimentos(base([{ id: 'i', tipo: 'investment', centavos: Number.MAX_SAFE_INTEGER }, { id: 'j', tipo: 'investment', centavos: 1 }]), objetivos)).toThrow();
});

test.each([
    [100, 300, 400, 25, 75], [300, 100, 400, 75, 25], [100, 100, 200, 50, 50],
    [100, 0, 100, 100, 0], [0, 100, 100, 0, 100], [0, 0, 0, 0, 0], [0.1, 0.2, 0.3, 100 / 3, 200 / 3],
])('comparação de ativos %s e passivos %s usa soma %s como base dos percentuais', (ativo, passivo, total, percentualAtivo, percentualPassivo) => {
    const dados = calcularResultadoAtivoPassivo(Object.freeze({
        categorias: Object.freeze(['Set/2026', 'Out/2026']),
        ativos: Object.freeze([999, ativo]), passivos: Object.freeze([999, passivo]),
    }));
    expect(dados.categoria).toBe('Out/2026');
    expect(dados.total).toBe(total);
    expect(dados.semDados).toBe(total === 0);
    expect(dados.itens.map(({ nome, valor }) => [nome, valor])).toEqual([['Ativos', ativo], ['Passivos', passivo]]);
    expect(dados.itens[0].percentual).toBeCloseTo(percentualAtivo);
    expect(dados.itens[1].percentual).toBeCloseTo(percentualPassivo);
});

test('comparação reutiliza o patrimônio e coincide com os totais das duas distribuições', () => {
    const base = calcular([...criacoes, transacao(250, 'account', 'investment', 'c', 'd')]);
    const dados = calcularResultadoAtivoPassivo(calcularPatrimonioMensal(base));
    expect(dados.itens.map(item => item.valor)).toEqual([
        calcularResultadoAtivos(base, contas, investimentos).total,
        calcularResultadoPassivos(base, contas, investimentos).total,
    ]);
    expect(dados.total).toBe(1700);
    expect(calcularResultadoAtivoPassivo(patrimonio([], contas, []))).toMatchObject({ total: 0, semDados: true });
});

test('comparação rejeita totais negativos, inválidos e soma acima da precisão segura', () => {
    for (const [ativo, passivo] of [[-1, 0], [0, -1], [NaN, 0], [0, Infinity], ['100', 0], [90000000000000, 90000000000000]]) {
        expect(() => calcularResultadoAtivoPassivo({ categorias: ['Out/2026'], ativos: [ativo], passivos: [passivo] })).toThrow();
    }
});

test('passivos agrupam módulos negativos, mantêm IDs separados, centavos e histórico de cadastros excluídos', () => {
    const contasPassivos = [{ id: 'a', type: 'Cartão', isDeleted: true }, { id: 'b', type: 'Cartão' }, { id: 'c', type: 'Banco' }, { id: 'd', type: 'Cartão' }];
    const objetivos = [{ id: 'a', objective: 'Dívida' }, { id: 'b', objective: 'Dívida' }, { id: 'c', objective: 'Bem' }];
    const saldos = [
        { id: 'a', tipo: 'account', centavos: -10 }, { id: 'b', tipo: 'account', centavos: -20 },
        { id: 'c', tipo: 'account', centavos: -30 }, { id: 'd', tipo: 'account', centavos: 999 },
        { id: 'a', tipo: 'investment', centavos: -40 }, { id: 'b', tipo: 'investment', centavos: -50 },
        { id: 'c', tipo: 'investment', centavos: -60 },
    ].map(Object.freeze);
    const base = { meses: [{ categoria: 'Set/2026', saldos: null }, { categoria: 'Out/2026', saldos: Object.freeze(saldos) }] };
    const dados = calcularResultadoPassivos(base, contasPassivos, objetivos);
    expect(dados.total).toBe(2.1);
    expect(dados.total).toBe(calcularPatrimonioMensal(base).passivos[1]);
    expect(dados.itens.map(({ nome, valor }) => [nome, valor])).toEqual([
        ['Cartões de Crédito', 0.3], ['Dívidas', 0.9], ['Outros', 0.9],
    ]);
    expect(dados.itens.reduce((total, item) => total + item.percentual, 0)).toBeCloseTo(100);
    expect(dados.categoria).toBe('Out/2026');
});

test('passivos usam a posição do mês e pagamentos reduzem a dívida sem compensar outros saldos positivos', () => {
    const lancamentos = [...criacoes, transacao(250, 'account', 'investment', 'c', 'd')];
    const dados = calcularResultadoPassivos(calcular(lancamentos), contas, investimentos);
    expect(dados.itens).toEqual([{ nome: 'Dívidas', valor: 750, percentual: 100 }]);
    const anterior = calcularResultadoPassivos(calcular(lancamentos, contas, investimentos, new Date(2026, 8, 1)), contas, investimentos);
    expect(anterior.total).toBe(1000);
    expect(calcularResultadoPassivos(calcular([...lancamentos, transacao(750, 'account', 'investment', 'c', 'd')]), contas, investimentos).semDados).toBe(true);
});

test('passivos sem classificação reconhecida permanecem em Outros, sem adivinhar pelo nome', () => {
    const base = { meses: [{ categoria: 'Out/2026', saldos: [
        { id: 'c', tipo: 'account', centavos: -100 }, { id: 'i', tipo: 'investment', centavos: -100 },
    ] }] };
    expect(calcularResultadoPassivos(base, [{ id: 'c', nome: 'Cartão' }], [{ id: 'i', objective: 'Investimento', nome: 'Dívida' }]).itens)
        .toEqual([{ nome: 'Outros', valor: 2, percentual: 100 }]);
});

test.each([null, [], [{ id: 'c', tipo: 'account', centavos: 10 }], [{ id: 'c', tipo: 'account', centavos: 0 }]])('passivos sem saldos negativos não geram fatias (%j)', (saldos) => {
    expect(calcularResultadoPassivos({ meses: [{ categoria: 'Set/2026', saldos }] }, contas, [])).toEqual({ categoria: 'Set/2026', itens: [], total: 0, semDados: true });
});

test('passivos rejeitam referência ausente, valores inválidos e soma sem precisão segura', () => {
    const base = (saldos) => ({ meses: [{ categoria: 'Out/2026', saldos }] });
    expect(() => calcularResultadoPassivos(base([{ id: 'ausente', tipo: 'account', centavos: -1 }]), contas, [])).toThrow();
    for (const centavos of [NaN, Infinity, -1.5, '-100']) {
        expect(() => calcularResultadoPassivos(base([{ id: 'c', tipo: 'account', centavos }]), contas, [])).toThrow();
    }
    expect(() => calcularResultadoPassivos(base([{ id: 'c', tipo: 'account', centavos: -Number.MAX_SAFE_INTEGER }, { id: 'i', tipo: 'investment', centavos: -1 }]), contas, investimentos)).toThrow();
});

test('ativos agrupam somente saldos positivos, com IDs separados e classificação atual, sem excluir histórico', () => {
    const contasAtivos = [{ id: 'a', type: 'Caixa', isDeleted: true }, { id: 'b', type: 'Banco' }, { id: 'c', type: 'Cartão' }, { id: 'd', type: 'desconhecido' }];
    const objetivos = [{ id: 'a', objective: 'Investimento' }, { id: 'b', objective: 'Bem' }, { id: 'c', objective: 'Dívida' }];
    const saldos = [
        { id: 'a', tipo: 'account', centavos: 10 }, { id: 'b', tipo: 'account', centavos: -500 },
        { id: 'c', tipo: 'account', centavos: 20 }, { id: 'd', tipo: 'account', centavos: 30 },
        { id: 'a', tipo: 'investment', centavos: 40 }, { id: 'b', tipo: 'investment', centavos: 50 },
        { id: 'c', tipo: 'investment', centavos: 60 },
    ];
    const base = { meses: [{ categoria: 'Set/2026', saldos: [] }, { categoria: 'Out/2026', saldos }] };
    const dados = calcularResultadoAtivos(base, contasAtivos, objetivos);
    expect(dados.total).toBe(2.1);
    expect(dados.total).toBe(calcularPatrimonioMensal(base).ativos[1]);
    expect(dados.itens.map(({ nome, valor }) => [nome, valor])).toEqual([
        ['Caixa', 0.1], ['Investimentos', 0.4], ['Bens', 0.5], ['Cartão', 0.2], ['Outros', 0.9],
    ]);
    expect(dados.itens.reduce((total, item) => total + item.percentual, 0)).toBeCloseTo(100);
    expect(dados.categoria).toBe('Out/2026');
});

test.each([null, [], [{ id: 'c', tipo: 'account', centavos: -10 }], [{ id: 'c', tipo: 'account', centavos: 0 }]])('ativos sem saldos positivos não geram fatias nem percentuais inválidos (%j)', (saldos) => {
    expect(calcularResultadoAtivos({ meses: [{ categoria: 'Set/2026', saldos }] }, contas, [])).toEqual({ categoria: 'Set/2026', itens: [], total: 0, semDados: true });
});

test('ativos rejeitam referência ausente e soma sem precisão segura', () => {
    const base = (saldos) => ({ meses: [{ categoria: 'Out/2026', saldos }] });
    expect(() => calcularResultadoAtivos(base([{ id: 'ausente', tipo: 'account', centavos: 1 }]), contas, [])).toThrow();
    expect(() => calcularResultadoAtivos(base([{ id: 'c', tipo: 'account', centavos: NaN }]), contas, [])).toThrow();
    expect(() => calcularResultadoAtivos(base([{ id: 'c', tipo: 'account', centavos: Number.MAX_SAFE_INTEGER }, { id: 'i', tipo: 'investment', centavos: 1 }]), contas, investimentos)).toThrow();
});

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
    const registros = [...criacoes, transacao(10, "investment", "update", "i", null)];
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

test("ajuste de saldo no destino continua produzindo erro explícito", () => {
    try {
        patrimonio([transacao(100, "account", "update", "c", null)], contas, []);
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
