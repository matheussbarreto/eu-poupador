import { act } from 'react';
import { createRoot } from 'react-dom/client';
import VariacaoRendimentosPercentual from './index';

global.IS_REACT_ACT_ENVIRONMENT = true;
jest.mock('react-apexcharts', () => (props) => <div data-testid="grafico">{JSON.stringify({
    series: props.series, categorias: props.options.xaxis.categories, cores: props.options.colors,
    dicas: props.series.map(serie => props.options.tooltip.y.formatter(serie.data[0])),
    meses: props.series.map((_, seriesIndex) => props.options.tooltip.x.formatter(null, { seriesIndex })),
})}</div>);
const dados = { categoria: 'Jan/2026', categoriaAnterior: 'Dez/2025', anterior: 1.25, atual: 2.5, diferenca: 1.25 };
let container;
let root;
const grafico = () => container.querySelector('[data-testid="grafico"]');
const renderizar = async (props = {}) => act(async () => root.render(<VariacaoRendimentosPercentual dados={dados} {...props} />));
beforeEach(() => { container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

test('mostra as taxas mensais e a diferença em pontos percentuais, com datas e cores corretas', async () => {
    await renderizar();
    expect(container.querySelector('h2').textContent).toBe('Variação dos Rendimentos');
    expect(JSON.parse(grafico().textContent)).toEqual({
        series: [{ name: 'Mês Anterior', data: [1.25] }, { name: 'Mês Atual', data: [2.5] }],
        categorias: ['Jan/2026'], cores: ['var(--tertiary-color)', 'var(--yellow-color)'],
        dicas: ['1,25% no mês', '2,50% no mês'], meses: ['Dez/2025', 'Jan/2026'],
    });
    expect(container.querySelector('.legenda-serie[title="Dez/2025"]')).not.toBeNull();
    expect(container.querySelector('.legenda-serie[title="Jan/2026"]')).not.toBeNull();
    expect(container.querySelector('.diferenca-rendimentos').textContent).toContain('+1,25 p.p.');
    expect(container.textContent).not.toMatch(/R\$|% a\.a\./);
});

test.each([[0, 2, 2, '+2,00'], [2, 0, -2, '-2,00'], [0, 0, 0, '+0,00'], [1.004, 1, -0.004, '+0,00']])(
    'trata a variação de %s para %s sem dividir pela base ou exibir zero negativo', async (anterior, atual, diferenca, texto) => {
        await renderizar({ dados: { ...dados, anterior, atual, diferenca } });
        expect(JSON.parse(grafico().textContent).series.map(serie => serie.data[0])).toEqual([anterior, atual]);
        expect(container.querySelector('.diferenca-rendimentos').textContent).toContain(texto + ' p.p.');
        expect(container.textContent).not.toMatch(/NaN|Infinity|-0,00/);
    });

test.each([[null, 1], [1, null]])('taxa ausente em %s ou %s não vira zero nem gera uma diferença', async (anterior, atual) => {
    await renderizar({ dados: { ...dados, anterior, atual, diferenca: null } });
    expect(JSON.parse(grafico().textContent).series.map(serie => serie.data[0])).toEqual([anterior, atual]);
    expect(JSON.parse(grafico().textContent).dicas).toContain('Indisponível');
    expect(container.querySelector('.diferenca-rendimentos').textContent).toBe('Variação—');
    expect(container.querySelector('.legenda').textContent).not.toContain('0,00%');
});

test('sem taxas mostra estado vazio e preserva indisponibilidade na legenda', async () => {
    await renderizar({ dados: { ...dados, anterior: null, atual: null, diferenca: null } });
    expect(grafico()).toBeNull();
    expect(container.querySelector('[role="status"]').textContent).toContain('Sem taxas disponíveis');
    expect(container.querySelector('.legenda').textContent).not.toContain('0,00');
});

test('controles preservam valores e cores e identificam o mês parcial após ocultar uma barra', async () => {
    await renderizar();
    const legenda = container.querySelector('.legenda').textContent;
    await act(async () => container.querySelector('[aria-label="Exibir Mês Anterior"]').click());
    expect(JSON.parse(grafico().textContent).cores).toEqual(['var(--yellow-color)']);
    expect(container.querySelector('.legenda').textContent).toBe(legenda);
    await renderizar({ dados: { ...dados, parcial: true, dataReferencia: '15/01/2026' } });
    expect(JSON.parse(grafico().textContent).meses).toEqual(['Jan/2026 · parcial até 15/01/2026']);
    await act(async () => container.querySelector('[aria-label="Exibir Mês Atual"]').click());
    expect(grafico()).toBeNull();
    expect(container.querySelector('[role="status"]').textContent).toContain('Selecione uma série');
    await renderizar({ dados: { ...dados, atual: 0, diferenca: -1.25 } });
    expect(container.querySelector('.diferenca-rendimentos').textContent).toContain('-1,25 p.p.');
    await act(async () => container.querySelector('[aria-label="Exibir Mês Anterior"]').click());
    expect(JSON.parse(grafico().textContent).cores).toEqual(['var(--tertiary-color)']);
    await act(async () => container.querySelector('[aria-label="Exibir Mês Atual"]').click());
    expect(JSON.parse(grafico().textContent).series.map(serie => serie.data[0])).toEqual([1.25, 0]);
});

test('carregamento e erro escondem dados anteriores e permitem nova tentativa', async () => {
    await renderizar();
    await renderizar({ carregando: true });
    expect(grafico()).toBeNull();
    expect(container.querySelector('.legenda')).toBeNull();
    expect(container.querySelector('section').getAttribute('aria-busy')).toBe('true');
    const tentar = jest.fn();
    await renderizar({ erro: 'Falha de conexão', onTentarNovamente: tentar });
    expect(grafico()).toBeNull();
    expect(container.querySelector('.legenda')).toBeNull();
    expect(container.querySelector('[role="alert"]').textContent).toBe('Falha de conexão');
    await act(async () => container.querySelector('button').click());
    expect(tentar).toHaveBeenCalledTimes(1);
});
