import { act } from "react";
import { createRoot } from "react-dom/client";
import RealizadoPrevistoPlanejamentoMensal from "./index";

global.IS_REACT_ACT_ENVIRONMENT = true;
jest.mock("react-apexcharts", () => (props) => <div data-testid="grafico">{JSON.stringify({ series: props.series, categorias: props.options.xaxis.categories, cores: props.options.colors })}</div>);
let container;
let root;
const dados = { categoria: "Out/2026", realizado: 75, previsto: 100, diferenca: -25, diferencaPercentual: -25, semDados: false };
const grafico = () => container.querySelector('[data-testid="grafico"]');
const renderizar = async (props = {}) => act(async () => root.render(<RealizadoPrevistoPlanejamentoMensal dados={dados} {...props} />));

beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

test("exibe totais, mês e diferença negativa em reais e percentual", async () => {
    await renderizar();
    expect(JSON.parse(grafico().textContent)).toEqual({
        series: [{ name: "Realizado", data: [75] }, { name: "Previsto", data: [100] }],
        categorias: ["Out/2026"], cores: ["var(--primary-color)", "var(--tertiary-color)"],
    });
    expect(container.querySelector('.diferenca-mensal').textContent).toMatch(/-R\$\s*25,00/);
    expect(container.querySelector('.diferenca-mensal').textContent).toContain("(-25,00%)");
});

test.each([[50, 50, "+50,00%"], [0, 0, "+0,00%"], [-0.01, -0.001, "-0,00%"], [50, null, "—"]])("diferença %s e percentual %s mantêm sinais e previsão zero", async (diferenca, diferencaPercentual, texto) => {
    await renderizar({ dados: { ...dados, diferenca, diferencaPercentual } });
    const legenda = container.querySelector('.diferenca-mensal').textContent;
    expect(legenda).toContain(`(${texto})`);
    expect(legenda).not.toMatch(/\+-|NaN|Infinity/);
});

test("controles ocultam séries mantendo cores, totais e diferença e permitem reexibir", async () => {
    await renderizar();
    const totais = container.querySelector('.legenda').textContent;
    await act(async () => container.querySelector('[aria-label="Exibir Realizado"]').click());
    expect(JSON.parse(grafico().textContent)).toMatchObject({ series: [{ name: "Previsto", data: [100] }], cores: ["var(--tertiary-color)"] });
    expect(container.querySelector('.legenda').textContent).toBe(totais);
    await act(async () => container.querySelector('[aria-label="Exibir Previsto"]').click());
    expect(grafico()).toBeNull();
    expect(container.querySelector('[role="status"]').textContent).toContain("Selecione uma série");
    await act(async () => container.querySelector('[aria-label="Exibir Realizado"]').click());
    expect(JSON.parse(grafico().textContent)).toMatchObject({ series: [{ name: "Realizado", data: [75] }], cores: ["var(--primary-color)"] });
});

test("carregamento e erro escondem os totais anteriores e permitem nova tentativa", async () => {
    await renderizar();
    await renderizar({ carregando: true });
    expect(grafico()).toBeNull();
    expect(container.querySelector('.legenda')).toBeNull();
    expect(container.querySelector('[role="status"]').textContent).toContain("Carregando");
    const repetir = jest.fn();
    await renderizar({ erro: "Falha na consulta", onTentarNovamente: repetir });
    expect(container.querySelector('[role="alert"]').textContent).toBe("Falha na consulta");
    await act(async () => container.querySelector('button').click());
    expect(repetir).toHaveBeenCalledTimes(1);
});

test("previsão sem aportes mostra barras e mês vazio remove valores anteriores", async () => {
    await renderizar({ dados: { ...dados, realizado: 0, diferenca: -100, diferencaPercentual: -100 } });
    expect(JSON.parse(grafico().textContent).series[0].data).toEqual([0]);
    expect(container.querySelector('.diferenca-mensal').textContent).toContain("(-100,00%)");
    await renderizar({ dados: { ...dados, realizado: 0, previsto: 0, semDados: true } });
    expect(grafico()).toBeNull();
    expect(container.querySelector('.legenda')).toBeNull();
    expect(container.querySelector('[role="status"]').textContent).toContain("Não há aportes, pagamentos ou previsões");
});
