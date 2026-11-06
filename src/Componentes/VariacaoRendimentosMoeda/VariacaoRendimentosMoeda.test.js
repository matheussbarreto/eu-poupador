import { act } from 'react';
import { createRoot } from 'react-dom/client';
import VariacaoRendimentosMoeda from './index';

global.IS_REACT_ACT_ENVIRONMENT = true;
jest.mock('react-apexcharts', () => (props) => <div data-testid="grafico">{JSON.stringify({
    series: props.series, categorias: props.options.xaxis.categories, cores: props.options.colors,
    dica: props.options.tooltip.y.formatter(props.series[0].data[0]),
})}</div>);
let container;
let root;
const dados = { categoria: 'Jan/2026', categoriaAnterior: 'Dez/2025', anterior: 10.1, atual: 25.25, diferenca: 15.15, diferencaPercentual: 150 };
const grafico = () => container.querySelector('[data-testid="grafico"]');
const renderizar = async (props = {}) => act(async () => root.render(<VariacaoRendimentosMoeda dados={dados} {...props} />));
beforeEach(() => { container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

test('compara os meses corretos preservando centavos, cores e sinais da variação', async () => {
    await renderizar();
    expect(JSON.parse(grafico().textContent)).toMatchObject({
        series: [{ name: 'Mês Anterior', data: [10.1] }, { name: 'Mês Atual', data: [25.25] }],
        categorias: ['Jan/2026'], cores: ['var(--tertiary-color)', 'var(--yellow-color)'],
    });
    expect(JSON.parse(grafico().textContent).dica).toMatch(/R\$\s*10,10/);
    expect(container.querySelector('.legenda-serie[title="Dez/2025"]')).not.toBeNull();
    expect(container.querySelector('.legenda-serie[title="Jan/2026"]')).not.toBeNull();
    expect(container.querySelector('.diferenca-rendimentos').textContent).toMatch(/\+R\$\s*15,15\(\+150,00%\)/);
});

test.each([0, 25])('mês anterior zerado e atual %s não inventam uma variação percentual', async (atual) => {
    await renderizar({ dados: { ...dados, anterior: 0, atual, diferenca: atual, diferencaPercentual: null } });
    expect(JSON.parse(grafico().textContent).series.map(serie => serie.data[0])).toEqual([0, atual]);
    expect(container.querySelector('.diferenca-rendimentos').textContent).toContain('(—)');
    expect(container.textContent).not.toMatch(/NaN|Infinity/);
});

test('mês sem créditos após mês com rendimento mostra queda de 100%', async () => {
    await renderizar({ dados: { ...dados, atual: 0, diferenca: -10.1, diferencaPercentual: -100 } });
    expect(container.querySelector('.diferenca-rendimentos').textContent).toMatch(/-R\$\s*10,10\(-100,00%\)/);
});

test('ocultar séries preserva totais e cores e permite restaurar valores atualizados', async () => {
    await renderizar();
    const legenda = container.querySelector('.legenda').textContent;
    await act(async () => container.querySelector('[aria-label="Exibir Mês Anterior"]').click());
    expect(JSON.parse(grafico().textContent)).toMatchObject({ series: [{ name: 'Mês Atual', data: [25.25] }], cores: ['var(--yellow-color)'] });
    expect(container.querySelector('.legenda').textContent).toBe(legenda);
    await act(async () => container.querySelector('[aria-label="Exibir Mês Atual"]').click());
    expect(grafico()).toBeNull();
    expect(container.querySelector('[role="status"]').textContent).toContain('Selecione uma série');
    await renderizar({ dados: { ...dados, atual: 20.2, diferenca: 10.1, diferencaPercentual: 100 } });
    expect(container.querySelector('.legenda').textContent).toMatch(/R\$\s*20,20/);
    await act(async () => container.querySelector('[aria-label="Exibir Mês Anterior"]').click());
    expect(JSON.parse(grafico().textContent).cores).toEqual(['var(--tertiary-color)']);
    await act(async () => container.querySelector('[aria-label="Exibir Mês Atual"]').click());
    expect(JSON.parse(grafico().textContent).series.map(serie => serie.data[0])).toEqual([10.1, 20.2]);
});

test('carregamento e erro escondem os dados anteriores e oferecem nova tentativa', async () => {
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
