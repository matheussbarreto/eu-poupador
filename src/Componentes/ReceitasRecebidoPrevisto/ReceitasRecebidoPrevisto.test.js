import { act } from "react";
import { createRoot } from "react-dom/client";
import ReceitasRecebidoPrevisto from "./index";

global.IS_REACT_ACT_ENVIRONMENT = true;
jest.mock("react-apexcharts", () => (props) => <div data-testid="grafico">{JSON.stringify({ series: props.series, cores: props.options.colors, categorias: props.options.xaxis.categories })}</div>);

let container;
let root;
const dados = { categoria: "Out/2026", recebido: 150, previsto: 200, diferenca: -50, diferencaPercentual: -25, semDados: false };
const grafico = () => container.querySelector('[data-testid="grafico"]');

beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
});
afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
});

test("visibilidade e cores permanecem corretas após atualização e troca de mês", async () => {
    await act(async () => root.render(<ReceitasRecebidoPrevisto dados={dados} />));
    expect(container.textContent).toContain("-25,00%");
    await act(async () => container.querySelector('[aria-label="Exibir Recebido"]').click());
    await act(async () => root.render(<ReceitasRecebidoPrevisto dados={{ ...dados, categoria: "Nov/2026", recebido: 180, previsto: 220 }} />));
    expect(JSON.parse(grafico().textContent)).toEqual({ series: [{ name: "Previsto", data: [220] }], cores: ["var(--tertiary-color)"], categorias: ["Nov/2026"] });
    expect(container.querySelector('[aria-label="Exibir Recebido"]').checked).toBe(false);
    expect(container.querySelector('table').textContent).toContain("180,00");
    expect(container.querySelector('table').textContent).toContain("220,00");
    await act(async () => container.querySelector('[aria-label="Exibir Previsto"]').click());
    expect(JSON.parse(grafico().textContent).series).toEqual([]);
    await act(async () => container.querySelector('[aria-label="Exibir Recebido"]').click());
    expect(JSON.parse(grafico().textContent).series).toEqual([{ name: "Recebido", data: [180] }]);
});

test("carregamento e erro removem valores antigos, com opção de repetir", async () => {
    const repetir = jest.fn();
    await act(async () => root.render(<ReceitasRecebidoPrevisto dados={dados} carregando />));
    expect(grafico()).toBeNull();
    expect(container.querySelector('[role="status"]').textContent).toContain("Carregando");
    await act(async () => root.render(<ReceitasRecebidoPrevisto dados={dados} erro="Falha nas previsões" onTentarNovamente={repetir} />));
    expect(grafico()).toBeNull();
    expect(container.querySelector('[role="alert"]').textContent).toBe("Falha nas previsões");
    await act(async () => container.querySelector('button').click());
    expect(repetir).toHaveBeenCalledTimes(1);
});

test("período vazio mantém zeros e usa traço para percentual sem base", async () => {
    await act(async () => root.render(<ReceitasRecebidoPrevisto dados={{ ...dados, recebido: 0, previsto: 0, diferenca: 0, diferencaPercentual: null, semDados: true }} />));
    expect(container.querySelector('[role="status"]').textContent).toContain("Não há receitas recebidas ou previstas");
    expect(container.textContent).toContain("(—)");
    expect(container.textContent).not.toMatch(/Infinity|NaN/);
    expect(JSON.parse(grafico().textContent).series.every((serie) => serie.data[0] === 0)).toBe(true);
});
