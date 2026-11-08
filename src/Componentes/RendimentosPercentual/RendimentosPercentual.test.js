import { act } from 'react';
import { createRoot } from 'react-dom/client';
import RendimentosPercentual from './index';

global.IS_REACT_ACT_ENVIRONMENT = true;
jest.mock('react-apexcharts', () => (props) => <div data-testid="grafico">{JSON.stringify({
    series: props.series, categorias: props.options.xaxis.categories, cores: props.options.colors,
    dica: props.options.tooltip.y.formatter(1.25), periodo: props.options.tooltip.x.formatter(null, { dataPointIndex: 11 }),
})}</div>);
const dados = { categorias: Array(11).fill('Jan/2026').concat('Fev/2026'), taxas: Array(10).fill(null).concat(1, 2),
    acumuladoAno: 3.02, categoria: 'Fev/2026', parcial: true, dataReferencia: '14/02/2026' };
const selic = { taxas: Array(10).fill(null).concat(0.9, null), acumuladoAno: null };
let container;
let root;
const grafico = () => container.querySelector('[data-testid="grafico"]');
const renderizar = async (props = {}) => act(async () => root.render(<RendimentosPercentual dados={dados} selic={selic} {...props} />));
beforeEach(() => { container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

test('preserva o título, separa taxas mensais do acumulado anual e mantém lacunas', async () => {
    await renderizar();
    expect(container.querySelector('h2').textContent).toBe('Rendimentos (% a.a.)');
    expect(container.querySelector('.legenda').textContent).toContain('3,02%');
    expect(container.textContent).not.toContain('Acumulado no ano —');
    expect(container.textContent).not.toContain('Taxas mensais ·');
    expect(container.textContent).not.toContain('Selic indisponível em meses sem taxa fechada publicada.');
    const exibido = JSON.parse(grafico().textContent);
    expect(exibido.series.map(serie => serie.data)).toEqual([dados.taxas, selic.taxas]);
    expect(exibido.dica).toBe('1,25% no mês');
    expect(exibido.periodo).toContain('parcial até 14/02/2026');
    expect(container.querySelector('.legenda').textContent).toContain('—');
});

test('controles preservam cores e acumulados ao ocultar e reexibir séries', async () => {
    await renderizar();
    const texto = container.querySelector('.legenda').textContent;
    await act(async () => container.querySelector('[aria-label="Exibir Rendimento Atual"]').click());
    expect(JSON.parse(grafico().textContent).cores).toEqual(['var(--dark-blue-color)']);
    expect(container.querySelector('.legenda').textContent).toBe(texto);
    await act(async () => container.querySelector('[aria-label="Exibir Rendimento Selic"]').click());
    expect(grafico()).toBeNull();
    expect(container.textContent).toContain('Selecione uma série');
    await act(async () => container.querySelector('[aria-label="Exibir Rendimento Atual"]').click());
    expect(JSON.parse(grafico().textContent).cores).toEqual(['#FF9900']);
});

test('falha ou carregamento da Selic não apaga o rendimento e a recuperação é independente', async () => {
    const tentar = jest.fn();
    await renderizar({ selic: undefined, carregandoSelic: true });
    expect(grafico()).not.toBeNull();
    expect(container.textContent).toContain('Carregando Selic');
    await renderizar({ selic: undefined, erroSelic: 'Falha na Selic', onTentarSelic: tentar });
    expect(JSON.parse(grafico().textContent).series).toHaveLength(1);
    expect(container.querySelector('.legenda').textContent).toContain('3,02%');
    await act(async () => container.querySelector('button').click());
    expect(tentar).toHaveBeenCalledTimes(1);
});

test('carregamento e erro dos dados privados escondem valores anteriores', async () => {
    await renderizar({ carregando: true });
    expect(grafico()).toBeNull();
    expect(container.querySelector('.legenda')).toBeNull();
    const tentar = jest.fn();
    await renderizar({ erro: 'Falha nos dados', onTentarNovamente: tentar });
    expect(grafico()).toBeNull();
    expect(container.querySelector('[role="alert"]').textContent).toBe('Falha nos dados');
    await act(async () => container.querySelector('button').click());
    expect(tentar).toHaveBeenCalledTimes(1);
});

test('taxas inexistentes não são apresentadas como zero', async () => {
    await renderizar({ dados: { ...dados, taxas: Array(12).fill(null), acumuladoAno: null }, selic: { taxas: Array(12).fill(null), acumuladoAno: null } });
    expect(grafico()).toBeNull();
    expect(container.textContent).toContain('Sem taxas disponíveis');
    expect(container.querySelector('.legenda').textContent).not.toContain('0,00%');
});
