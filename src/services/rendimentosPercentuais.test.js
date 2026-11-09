import { calcularSaldosMensais, calcularRendimentosMensais, calcularRendimentosPercentuais, calcularVariacaoRendimentosPercentuais, calcularAcumuladoAno } from './resultadosService';

const objetivos = [{ id: 'i', objective: 'Investimento', current: 0 }];
const lancamento = (data, amount, outgoingType = 'update', inID = 'i', incomingType = 'investment', outID) => ({
    date: data.toISOString(), amount, outgoingType, incomingType, inID, outID,
});
const calcular = (transacoes, selecionado = new Date(2026, 1, 1), investimentos = objetivos, agora = new Date(2026, 10, 6)) => {
    const base = calcularSaldosMensais(transacoes, [{ id: 'c', balance: 0 }], investimentos, selecionado, agora);
    return calcularRendimentosPercentuais(base, investimentos, calcularRendimentosMensais(base, investimentos));
};

test('variação compara os dois últimos meses, preserva precisão e não usa o acumulado anual', () => {
    const dados = { categorias: ['Nov/2025', 'Dez/2025', 'Jan/2026'], taxas: [99, 0.123456, 0.223457], acumuladoAno: 15 };
    const copia = JSON.stringify(dados);
    const variacao = calcularVariacaoRendimentosPercentuais(dados);
    expect(variacao).toMatchObject({ categoria: 'Jan/2026', categoriaAnterior: 'Dez/2025', anterior: 0.123456, atual: 0.223457 });
    expect(variacao.diferenca).toBeCloseTo(0.100001, 12);
    expect(JSON.stringify(dados)).toBe(copia);
});

test.each([
    [1, 2, 1], [2, 1, -1], [2, 0, -2], [0, 2, 2], [0, 0, 0],
    [null, 2, null], [1, null, null], [null, null, null],
])('variação de %s para %s preserva zero e indisponibilidade', (anterior, atual, diferenca) => {
    expect(calcularVariacaoRendimentosPercentuais({ categorias: ['Jan/2026', 'Fev/2026'], taxas: [anterior, atual] }))
        .toMatchObject({ anterior, atual, diferenca });
});

test('variação preserva o corte parcial e rejeita taxas inválidas', () => {
    const dados = { categorias: ['Jan/2026', 'Fev/2026'], taxas: [0, 1], parcial: true, dataReferencia: '14/02/2026' };
    expect(calcularVariacaoRendimentosPercentuais(dados)).toMatchObject({ parcial: true, dataReferencia: '14/02/2026' });
    [NaN, Infinity, '1'].forEach(taxa => expect(() => calcularVariacaoRendimentosPercentuais({ ...dados, taxas: [taxa, 1] })).toThrow());
});

test('pondera aporte no meio do mês e compõe apenas os meses do ano selecionado', () => {
    const registros = [lancamento(new Date(2025, 11, 1), 1000, 'create'),
        lancamento(new Date(2026, 0, 20), 10),
        lancamento(new Date(2026, 1, 15), 1000, 'account', 'i', 'investment', 'c'),
        lancamento(new Date(2026, 1, 27), 30.2)];
    const copia = JSON.stringify(registros);
    const dados = calcular(registros);
    expect(dados.taxas.slice(-2)).toEqual([1, 2]);
    expect(dados.acumuladoAno).toBeCloseTo(3.02, 10);
    expect(dados).toMatchObject({ quantidadeMesesAno: 2, categoria: 'Fev/2026', ano: 2026, parcial: false });
    expect(JSON.stringify(registros)).toBe(copia);
    const janeiro = calcular(registros, new Date(2026, 0, 1));
    expect(janeiro.acumuladoAno).toBeCloseTo(1, 10);
});

test('aportes iguais em datas distintas produzem taxas distintas sem contar o aporte como ganho', () => {
    const base = [lancamento(new Date(2025, 11, 1), 1000, 'create'), lancamento(new Date(2026, 1, 27), 20)];
    const inicio = calcular([...base, lancamento(new Date(2026, 1, 1), 1000, 'account', 'i', 'investment', 'c')]);
    const metade = calcular([...base, lancamento(new Date(2026, 1, 15), 1000, 'account', 'i', 'investment', 'c')]);
    expect(inicio.taxas.at(-1)).toBe(1);
    expect(metade.taxas.at(-1)).toBeCloseTo(20 / 1500 * 100);
});

test('resgate reduz o capital ponderado e transferência entre investimentos não altera o retorno da carteira', () => {
    const registros = [lancamento(new Date(2025, 11, 1), 2000, 'create'),
        lancamento(new Date(2026, 1, 15), 1000, 'investment', 'c', 'account', 'i'),
        lancamento(new Date(2026, 1, 27), 15)];
    expect(calcular(registros).taxas.at(-1)).toBe(1);
    const comTransferencia = [...registros, lancamento(new Date(2025, 11, 1), 0, 'create', 'j'),
        lancamento(new Date(2026, 1, 20), 100, 'investment', 'j', 'investment', 'i')];
    expect(calcular(comTransferencia, undefined, [...objetivos, { id: 'j', objective: 'Investimento', current: 0 }]).taxas.at(-1)).toBe(1);
});

test('saldo inicial anterior à janela inclui rendimentos antigos e não entra no ganho do primeiro mês', () => {
    const dados = calcular([lancamento(new Date(2024, 0, 1), 1000, 'create'),
        lancamento(new Date(2024, 11, 1), 100), lancamento(new Date(2025, 2, 20), 11)]);
    expect(dados.categorias[0]).toBe('Mar/2025');
    expect(dados.taxas[0]).toBe(1);
    expect(dados.taxas.at(-1)).toBe(0);
    expect(dados.acumuladoAno).toBe(0);
});

test('mês parcial pondera até a data de corte e ignora lançamentos futuros e excluídos', () => {
    const corte = new Date(2026, 1, 15).getTime() - 1;
    const dados = calcular([lancamento(new Date(2026, 0, 1), 1000, 'create'),
        lancamento(new Date(2026, 1, 8), 1000, 'account', 'i', 'investment', 'c'),
        lancamento(new Date(2026, 1, 14), 15), lancamento(new Date(2026, 1, 16), 999),
        { ...lancamento(new Date(2026, 1, 10), 999), isDeleted: true }], undefined, undefined, new Date(corte));
    expect(dados.taxas.at(-1)).toBe(1);
    expect(dados.parcial).toBe(true);
    expect(dados.dataReferencia).toBe('14/02/2026');
});

test('sem capital é indisponível; base positiva sem créditos é zero e não usa previsão cadastrada', () => {
    const vazio = calcular([]);
    expect(vazio.taxas).toEqual(Array(12).fill(null));
    expect(vazio.acumuladoAno).toBeNull();
    const registros = [lancamento(new Date(2026, 1, 15), 1000, 'create')];
    const dados = calcular(registros, undefined, [{ ...objetivos[0], rendimentoPrevisto: 999 }]);
    expect(dados.taxas.at(-1)).toBe(0);
    expect(dados.acumuladoAno).toBe(0);
    expect(calcular([...registros, lancamento(new Date(2026, 1, 20), 10)]).acumuladoAno).toBeCloseTo(2, 10);
    expect(calcular([lancamento(new Date(2026, 0, 1), 0, 'create'), lancamento(new Date(2026, 1, 20), 10)]).acumuladoAno).toBeNull();
    expect(calcular([lancamento(new Date(2026, 0, 1), -100, 'create'), lancamento(new Date(2026, 1, 20), 10)]).taxas.at(-1)).toBeNull();
});

test('classificação atual e exclusão do cadastro seguem a base compartilhada', () => {
    const registros = [lancamento(new Date(2025, 11, 1), 1000, 'create'), lancamento(new Date(2026, 1, 20), 10),
        lancamento(new Date(2026, 1, 10), 999, 'update', 'c', 'account')];
    expect(calcular(registros, undefined, [{ ...objetivos[0], isDeleted: true }]).taxas.at(-1)).toBe(1);
    expect(calcular(registros, undefined, [{ ...objetivos[0], objective: 'Bem' }]).taxas.at(-1)).toBeNull();
});

test('acumulado não soma taxas, não anualiza e não ignora lacunas da Selic', () => {
    expect(calcularAcumuladoAno([99, 1, 2], 2)).toBeCloseTo(3.02, 10);
    expect(calcularAcumuladoAno([1, null, 2], 3)).toBeNull();
    expect(calcularAcumuladoAno([0, 0], 2)).toBe(0);
    expect(calcularAcumuladoAno([1], 2)).toBeNull();
    expect(() => calcularAcumuladoAno([Infinity], 1)).toThrow();
});
