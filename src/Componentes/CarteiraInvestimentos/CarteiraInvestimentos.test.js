import { act } from 'react';
import { createRoot } from 'react-dom/client';
import CarteiraInvestimentos from './index';

global.IS_REACT_ACT_ENVIRONMENT = true;
jest.mock('react-apexcharts', () => (props) => <div data-testid="grafico">{JSON.stringify({
    series: props.series, labels: props.options.labels, cores: props.options.colors,
    rotulo: props.options.plotOptions.pie.donut.labels.total.label,
    total: props.options.plotOptions.pie.donut.labels.total.formatter(),
})}</div>);
let container;
let root;
const dados = { categoria: 'Out/2026', total: 400, semDados: false, itens: [
    { id: 'i', nome: 'Reserva', valor: 100, percentual: 25 }, { id: 'j', nome: 'Reserva', valor: 300, percentual: 75 },
] };
const grafico = () => container.querySelector('[data-testid="grafico"]');
const ler = () => JSON.parse(grafico().textContent);
const renderizar = async (props = {}) => act(async () => root.render(<CarteiraInvestimentos dados={dados} {...props} />));
beforeEach(() => { container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

test('exibe distribuição por ID, valores, percentuais, mês e total positivo', async () => {
    await renderizar();
    expect(ler()).toMatchObject({ series: [100, 300], labels: ['Reserva', 'Reserva'], rotulo: 'Saldo positivo' });
    expect(ler().total).toMatch(/R\$\s*400,00/);
    expect(container.querySelectorAll('.legenda-carteira li')).toHaveLength(2);
    expect(container.querySelector('.legenda-carteira').title).toBe('Out/2026');
    expect(container.querySelector('.legenda-carteira').textContent).toContain('25,00%');
    expect(container.querySelector('.legenda-carteira').textContent).toContain('75,00%');
});

test('cores acompanham o ID ao mudar ordem, nome, mês e quantidade de posições', async () => {
    await renderizar();
    const cores = ler().cores;
    await renderizar({ dados: { ...dados, categoria: 'Set/2026', itens: [...dados.itens].reverse().map(item => ({ ...item, nome: 'Novo nome' })) } });
    expect(ler().cores).toEqual([...cores].reverse());
    await renderizar({ dados: { ...dados, total: 300, itens: [{ ...dados.itens[1], percentual: 100 }] } });
    expect(ler()).toMatchObject({ series: [300], cores: [cores[1]] });
    expect(container.querySelector('.legenda-carteira').textContent).toContain('100,00%');
});

test('nomes são texto e uma lista grande preserva todas as posições', async () => {
    const nome = '<img src=x onerror=alert(1)>';
    await renderizar({ dados: { ...dados, itens: Array.from({ length: 15 }, (_, indice) => ({ ...dados.itens[0], id: String(indice), nome })) } });
    expect(container.querySelectorAll('.legenda-carteira li')).toHaveLength(15);
    expect(container.querySelector('.legenda-carteira').textContent).toContain(nome);
    expect(container.querySelector('img')).toBeNull();
});

test('carteira vazia, carregamento e erros escondem valores anteriores e permitem nova tentativa', async () => {
    await renderizar();
    await renderizar({ carregando: true });
    expect(grafico()).toBeNull();
    expect(container.querySelector('.legenda-carteira')).toBeNull();
    expect(container.querySelector('section').getAttribute('aria-busy')).toBe('true');
    const tentar = jest.fn();
    await renderizar({ erro: 'Falha de conexão', onTentarNovamente: tentar });
    expect(container.querySelector('[role="alert"]').textContent).toBe('Falha de conexão');
    expect(grafico()).toBeNull();
    await act(async () => container.querySelector('button').click());
    expect(tentar).toHaveBeenCalledTimes(1);
    await renderizar({ dados: { categoria: 'Out/2026', total: 0, semDados: true, itens: [] } });
    expect(grafico()).toBeNull();
    expect(container.querySelector('.legenda-carteira')).toBeNull();
    expect(container.querySelector('[role="status"]').textContent).toContain('Não há investimentos com saldo positivo');
    expect(container.textContent).toMatch(/Saldo positivo: R\$\s*0,00/);
});
