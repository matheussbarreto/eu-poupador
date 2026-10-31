import { act } from 'react';
import { createRoot } from 'react-dom/client';
import RendimentosMoeda from './index';

global.IS_REACT_ACT_ENVIRONMENT = true;
jest.mock('react-apexcharts', () => (props) => <div data-testid="grafico">{JSON.stringify({
    series: props.series, categorias: props.options.xaxis.categories, minimo: props.options.yaxis.min,
    cores: props.options.colors, dica: props.options.tooltip.y.formatter(props.series[0].data.at(-1)),
})}</div>);
let container;
let root;
const dados = { categoria: 'Out/2026', categorias: ['Nov/2025', 'Dez/2025', 'Jan/2026', 'Fev/2026', 'Mar/2026', 'Abr/2026',
    'Mai/2026', 'Jun/2026', 'Jul/2026', 'Ago/2026', 'Set/2026', 'Out/2026'], rendimentos: [...Array(10).fill(0), 10, 25.5], atual: 25.5 };
const grafico = () => container.querySelector('[data-testid="grafico"]');
const renderizar = async (props = {}) => act(async () => root.render(<RendimentosMoeda dados={dados} {...props} />));
beforeEach(() => { container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

test('mostra doze meses, zeros, centavos e o rendimento do mês selecionado', async () => {
    await renderizar();
    const exibido = JSON.parse(grafico().textContent);
    expect(exibido).toMatchObject({ categorias: dados.categorias, series: [{ name: 'Rendimento Atual', data: dados.rendimentos }], cores: ['#FF9900'] });
    expect(exibido.dica).toMatch(/R\$\s*25,50/);
    expect(container.querySelector('.legenda-serie').title).toBe('Out/2026');
    expect(container.querySelector('.legenda').textContent).toMatch(/R\$\s*25,50/);
});

test('controle oculta e restaura a linha mantendo o valor, incluindo atualizações', async () => {
    await renderizar();
    await act(async () => container.querySelector('input').click());
    expect(grafico()).toBeNull();
    expect(container.querySelector('[role="status"]').textContent).toContain('Selecione a série');
    await renderizar({ dados: { ...dados, atual: 30, rendimentos: [...dados.rendimentos.slice(0, -1), 30] } });
    expect(container.querySelector('.legenda').textContent).toMatch(/R\$\s*30,00/);
    expect(grafico()).toBeNull();
    await act(async () => container.querySelector('input').click());
    expect(JSON.parse(grafico().textContent).series[0].data.at(-1)).toBe(30);
});

test('meses sem rendimentos mantêm a série zerada', async () => {
    await renderizar({ dados: { ...dados, atual: 0, rendimentos: Array(12).fill(0) } });
    expect(JSON.parse(grafico().textContent).series[0].data).toEqual(Array(12).fill(0));
    expect(container.querySelector('.legenda').textContent).toMatch(/R\$\s*0,00/);
});

test('carregamento e falhas escondem valores anteriores e oferecem nova tentativa', async () => {
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
