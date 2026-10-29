import { act } from "react";
import { createRoot } from "react-dom/client";
import VariacaoPatrimonial from "./index";

global.IS_REACT_ACT_ENVIRONMENT = true;
jest.mock("react-apexcharts", () => (props) => <div data-testid="grafico">{JSON.stringify({ series: props.series, categorias: props.options.xaxis.categories, cores: props.options.colors })}</div>);
let container;
let root;
const dados = { categoria: "Out/2026", categoriaAnterior: "Set/2026", anterior: -100, atual: -50, diferenca: 50, diferencaPercentual: 50 };
const grafico = () => container.querySelector('[data-testid="grafico"]');
const renderizar = async (props = {}) => act(async () => root.render(<VariacaoPatrimonial dados={dados} {...props} />));
beforeEach(() => { container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

test("apresenta posições negativas, meses corretos e melhoria com diferença positiva", async () => {
    await renderizar();
    expect(JSON.parse(grafico().textContent)).toEqual({
        series: [{ name: "Mês Anterior", data: [-100] }, { name: "Atual", data: [-50] }], categorias: ["Out/2026"],
        cores: ["var(--tertiary-color)", "var(--dark-blue-color)"],
    });
    expect(container.querySelector('.legenda-serie[title="Set/2026"]')).not.toBeNull();
    expect(container.querySelector('.diferenca-patrimonial').textContent).toMatch(/\+R\$\s*50,00\(\+50,00%\)/);
});

test.each([[0, -150, -150], [0, 150, 150], [0, 0, 0]])("base zero (%s → %s) preserva valores sem inventar um percentual", async (anterior, atual, diferenca) => {
    await renderizar({ dados: { ...dados, anterior, atual, diferenca, diferencaPercentual: null } });
    expect(JSON.parse(grafico().textContent).series.map(serie => serie.data[0])).toEqual([anterior, atual]);
    expect(container.querySelector('.diferenca-patrimonial').textContent).toContain('(—)');
    expect(container.textContent).not.toMatch(/NaN|Infinity/);
});

test("piora preserva sinais negativos da diferença e do percentual", async () => {
    await renderizar({ dados: { ...dados, atual: -150, diferenca: -50, diferencaPercentual: -50 } });
    expect(container.querySelector('.diferenca-patrimonial').textContent).toMatch(/-R\$\s*50,00\(-50,00%\)/);
});

test("controles ocultam séries mantendo cores e totais, e permitem reexibir ambas", async () => {
    await renderizar();
    const legenda = container.querySelector('.legenda').textContent;
    await act(async () => container.querySelector('[aria-label="Exibir Mês Anterior"]').click());
    expect(JSON.parse(grafico().textContent)).toMatchObject({ series: [{ name: "Atual", data: [-50] }], cores: ["var(--dark-blue-color)"] });
    expect(container.querySelector('.legenda').textContent).toBe(legenda);
    await act(async () => container.querySelector('[aria-label="Exibir Atual"]').click());
    expect(grafico()).toBeNull();
    expect(container.textContent).toContain('Selecione uma série');
    await act(async () => container.querySelector('[aria-label="Exibir Mês Anterior"]').click());
    expect(JSON.parse(grafico().textContent).cores).toEqual(["var(--tertiary-color)"]);
    await act(async () => container.querySelector('[aria-label="Exibir Atual"]').click());
    expect(JSON.parse(grafico().textContent).series).toHaveLength(2);
});

test("carregamento e falhas escondem os valores e oferecem nova tentativa", async () => {
    await renderizar();
    await renderizar({ carregando: true });
    expect(grafico()).toBeNull();
    expect(container.querySelector('.legenda')).toBeNull();
    expect(container.querySelector('section').getAttribute('aria-busy')).toBe('true');
    const tentar = jest.fn();
    await renderizar({ erro: "Falha de conexão", onTentarNovamente: tentar });
    expect(grafico()).toBeNull();
    expect(container.querySelector('[role="alert"]').textContent).toBe('Falha de conexão');
    await act(async () => container.querySelector('button').click());
    expect(tentar).toHaveBeenCalledTimes(1);
});
