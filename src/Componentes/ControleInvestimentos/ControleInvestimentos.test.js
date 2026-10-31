import { act } from 'react';
import { createRoot } from 'react-dom/client';
import ControleInvestimentos from './index';

global.IS_REACT_ACT_ENVIRONMENT = true;
jest.mock('react-apexcharts', () => (props) => <div data-testid="grafico">{JSON.stringify({
    series: props.series, categorias: props.options.xaxis.categories, cores: props.options.colors, altura: props.height,
    dicas: props.series.map((serie, seriesIndex) => serie.data.map((valor, dataPointIndex) => props.options.tooltip.y.formatter(valor, { seriesIndex, dataPointIndex }))),
})}</div>);
let container;
let root;
const dados = { categoria: 'Out/2026', categoriaAnterior: 'Set/2026', anterior: -100, atual: 100, diferenca: 200, diferencaPercentual: 200,
    itens: [{ id: 'i', nome: 'Reserva', anterior: -100, atual: -50, diferencaPercentual: 50 },
        { id: 'j', nome: 'Reserva', anterior: 0, atual: 150, diferencaPercentual: null }], semDados: false };
const grafico = () => container.querySelector('[data-testid="grafico"]');
const ler = () => JSON.parse(grafico().textContent);
const renderizar = async (props = {}) => act(async () => root.render(<ControleInvestimentos dados={dados} {...props} />));
beforeEach(() => { container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

test('compara posições por investimento, inclusive negativas e nomes iguais, com percentual nas dicas', async () => {
    await renderizar();
    expect(ler()).toMatchObject({ series: [{ name: 'Mês Anterior', data: [-100, 0] }, { name: 'Atual', data: [-50, 150] }],
        categorias: ['Reserva', 'Reserva'], cores: ['var(--tertiary-color)', 'var(--yellow-color)'] });
    expect(ler().dicas[1][0]).toMatch(/-R\$\s*50,00 \(\+50,00%\)/);
    expect(ler().dicas[1][1]).toContain('(—)');
    expect(container.querySelector('.legenda-serie[title="Set/2026"]')).not.toBeNull();
    expect(container.querySelector('.diferenca-investimentos').textContent).toMatch(/\+R\$\s*200,00\(\+200,00%\)/);
});

test('controles mantêm cores, totais e percentuais corretos ao ocultar a primeira série', async () => {
    await renderizar();
    const legenda = container.querySelector('.legenda').textContent;
    await act(async () => container.querySelector('[aria-label="Exibir Mês Anterior"]').click());
    expect(ler()).toMatchObject({ series: [{ name: 'Atual', data: [-50, 150] }], cores: ['var(--yellow-color)'] });
    expect(ler().dicas[0][0]).toContain('(+50,00%)');
    await act(async () => container.querySelector('[aria-label="Exibir Atual"]').click());
    expect(grafico()).toBeNull();
    expect(container.querySelector('[role="status"]').textContent).toContain('Selecione uma série');
    expect(container.querySelector('.legenda').textContent).toBe(legenda);
    await act(async () => container.querySelector('[aria-label="Exibir Mês Anterior"]').click());
    expect(ler().cores).toEqual(['var(--tertiary-color)']);
    expect(ler().dicas[0][0]).not.toContain('%');
    await act(async () => container.querySelector('[aria-label="Exibir Atual"]').click());
    expect(ler().series).toHaveLength(2);
});

test('mais investimentos aumentam a altura sem cortar itens', async () => {
    await renderizar();
    const altura = ler().altura;
    await renderizar({ dados: { ...dados, itens: Array.from({ length: 15 }, (_, id) => ({ ...dados.itens[0], id, nome: `Investimento ${id}` })) } });
    expect(ler().altura).toBeGreaterThan(altura);
    expect(ler().categorias).toHaveLength(15);
});

test('base zero, ausência de saldos e diferença negativa não geram percentuais inválidos', async () => {
    await renderizar({ dados: { ...dados, anterior: 0, diferencaPercentual: null } });
    expect(container.querySelector('.diferenca-investimentos').textContent).toContain('(—)');
    await renderizar({ dados: { ...dados, diferenca: -50, diferencaPercentual: -50 } });
    expect(container.querySelector('.diferenca-investimentos').textContent).toMatch(/-R\$\s*50,00\(-50,00%\)/);
    await renderizar({ dados: { ...dados, itens: [], anterior: 0, atual: 0, diferenca: 0, diferencaPercentual: null, semDados: true } });
    expect(grafico()).toBeNull();
    expect(container.querySelector('[role="status"]').textContent).toContain('Não há saldos');
    expect(container.textContent).not.toMatch(/NaN|Infinity/);
});

test('carregamento e falhas escondem valores antigos e permitem nova tentativa', async () => {
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
