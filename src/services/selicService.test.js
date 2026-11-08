import { consultarSelicMensal } from './selicService';

const fetchOriginal = global.fetch;
beforeEach(() => { global.fetch = jest.fn(); });
afterEach(() => { global.fetch = fetchOriginal; });
const responder = (registros) => global.fetch.mockResolvedValue({ ok: true, json: async () => registros });

test('consulta apenas doze meses e alinha taxas mensais, preservando zero e ausência de publicação', async () => {
    responder([{ data: '01/01/2026', valor: '0.97' }, { data: '01/12/2025', valor: '0.00' },
        { data: '01/01/2025', valor: '9.99' }, { data: '01/02/2026', valor: '9.99' }]);
    const signal = new AbortController().signal;
    expect(await consultarSelicMensal(new Date(2026, 0, 15), signal)).toEqual({
        taxas: [...Array(10).fill(null), 0, 0.97], dataFinal: new Date(2026, 0, 1),
    });
    const [endereco, opcoes] = global.fetch.mock.calls[0];
    const url = new URL(endereco);
    expect(url.pathname).toBe('/dados/serie/bcdata.sgs.4390/dados');
    expect(url.searchParams.get('dataInicial')).toBe('01/02/2025');
    expect(url.searchParams.get('dataFinal')).toBe('31/01/2026');
    expect(opcoes.signal).toBe(signal);
});

test('período vazio preserva lacunas e fevereiro bissexto usa o último dia correto', async () => {
    responder([]);
    expect(await consultarSelicMensal(new Date(2024, 1, 1))).toEqual({ taxas: Array(12).fill(null), dataFinal: null });
    expect(new URL(global.fetch.mock.calls[0][0]).searchParams.get('dataFinal')).toBe('29/02/2024');
});

test.each([
    {}, [{ data: '31/02/2026', valor: '1.00' }], [{ data: '01/01/2026', valor: '' }],
    [{ data: '01/01/2026', valor: '1.2x' }], [{ data: '01/01/2026', valor: null }],
    [{ data: '01/01/2026', valor: '1' }, { data: '02/01/2026', valor: '2' }],
].map(registros => [registros]))('resposta inválida não se transforma em taxa zero: %j', async (registros) => {
    responder(registros);
    await expect(consultarSelicMensal(new Date(2026, 0, 1))).rejects.toThrow();
});

test('falha HTTP, rede ou cancelamento é propagado para a página', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false });
    await expect(consultarSelicMensal(new Date(2026, 0, 1))).rejects.toThrow('Não foi possível');
    const erro = Object.assign(new Error('Cancelado'), { name: 'AbortError' });
    global.fetch.mockRejectedValueOnce(erro);
    await expect(consultarSelicMensal(new Date(2026, 0, 1))).rejects.toBe(erro);
    global.fetch.mockRejectedValueOnce(new TypeError('Falha de rede'));
    await expect(consultarSelicMensal(new Date(2026, 0, 1))).rejects.toThrow('Falha de rede');
});

test('data inválida não dispara consulta', async () => {
    await expect(consultarSelicMensal(new Date(NaN))).rejects.toThrow('Período inválido');
    expect(global.fetch).not.toHaveBeenCalled();
});

test('encerra os doze meses na última publicação fechada e exclui a parcial', async () => {
    responder([{ data: '01/10/2026', valor: '1.20' }, { data: '01/11/2026', valor: '0.10' }]);
    const { taxas, dataFinal } = await consultarSelicMensal(new Date(2026, 10, 1), undefined, new Date(2026, 10, 6));
    expect(taxas).toEqual([...Array(11).fill(null), 1.2]);
    expect(dataFinal).toEqual(new Date(2026, 9, 1));
    expect(new URL(global.fetch.mock.calls[0][0]).searchParams.get('dataInicial')).toBe('01/11/2025');
    expect(new URL(global.fetch.mock.calls[0][0]).searchParams.get('dataFinal')).toBe('31/10/2026');
    expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('publicação atrasada desloca o corte e consulta somente o início que faltou para completar doze meses', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => [
        { data: '01/09/2026', valor: '0.00' }, { data: '01/08/2026', valor: '1.00' },
    ] }).mockResolvedValueOnce({ ok: true, json: async () => [{ data: '01/10/2025', valor: '0.90' }] });
    const signal = new AbortController().signal;
    const resultado = await consultarSelicMensal(new Date(2026, 10, 1), signal, new Date(2026, 10, 6));
    expect(resultado.dataFinal).toEqual(new Date(2026, 8, 1));
    expect(resultado.taxas).toEqual([0.9, ...Array(9).fill(null), 1, 0]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    const [endereco, opcoes] = global.fetch.mock.calls[1];
    expect(new URL(endereco).searchParams.get('dataInicial')).toBe('01/10/2025');
    expect(new URL(endereco).searchParams.get('dataFinal')).toBe('31/10/2025');
    expect(opcoes.signal).toBe(signal);
});

test('janeiro em andamento compara os doze meses do ano anterior', async () => {
    responder([{ data: '01/12/2025', valor: '1.00' }, { data: '01/01/2025', valor: '0.90' }]);
    const resultado = await consultarSelicMensal(new Date(2026, 0, 1), undefined, new Date(2026, 0, 7));
    expect(resultado.dataFinal).toEqual(new Date(2025, 11, 1));
    expect(resultado.taxas).toEqual([0.9, ...Array(10).fill(null), 1]);
    expect(new URL(global.fetch.mock.calls[0][0]).searchParams.get('dataInicial')).toBe('01/01/2025');
    expect(new URL(global.fetch.mock.calls[0][0]).searchParams.get('dataFinal')).toBe('31/12/2025');
});
