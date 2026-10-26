import { act } from "react";
import { createRoot } from "react-dom/client";
import DespesasPorCategoria from "./index";

global.IS_REACT_ACT_ENVIRONMENT = true;
let mockOpcoes;
jest.mock("react-apexcharts", () => (props) => {
    mockOpcoes = props.options;
    return <div data-testid="grafico">{JSON.stringify(props.series)}</div>;
});

let container;
let root;
const dados = { itens: [
    { nome: "Habitação", gasto: 30, percentual: 75 }, { nome: "Pets", gasto: 10, percentual: 25 },
], totalGasto: 40, semDados: false };
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

test("rosca apresenta gastos, percentuais e total mantendo as cores ao mudar as categorias", async () => {
    await act(async () => root.render(<DespesasPorCategoria dados={dados} />));
    expect(JSON.parse(grafico().textContent)).toEqual([30, 10]);
    expect(mockOpcoes.labels).toEqual(["Habitação", "Pets"]);
    expect(mockOpcoes.plotOptions.pie.donut.labels.total.formatter()).toContain("40,00");
    expect(container.querySelector('.legenda-categorias').textContent).toContain("75,00%");
    expect(container.querySelectorAll('.legenda-categorias li')).toHaveLength(2);
    const corPets = mockOpcoes.colors[1];
    await act(async () => root.render(<DespesasPorCategoria dados={{ itens: [{ nome: "Pets", gasto: 20, percentual: 100 }], totalGasto: 20, semDados: false }} />));
    expect(mockOpcoes.colors).toEqual([corPets]);
    expect(container.querySelector('.legenda-categorias').textContent).toContain("100,00%");
});

test("carregamento, erro e mês sem gastos não exibem valores antigos ou rosca artificial", async () => {
    const repetir = jest.fn();
    await act(async () => root.render(<DespesasPorCategoria dados={dados} />));
    await act(async () => root.render(<DespesasPorCategoria dados={dados} carregando />));
    expect(grafico()).toBeNull();
    expect(container.querySelector('[role="status"]').textContent).toContain("Carregando");
    await act(async () => root.render(<DespesasPorCategoria dados={dados} erro="Falha na consulta" onTentarNovamente={repetir} />));
    expect(grafico()).toBeNull();
    expect(container.querySelector('[role="alert"]').textContent).toBe("Falha na consulta");
    await act(async () => container.querySelector('button').click());
    expect(repetir).toHaveBeenCalledTimes(1);
    await act(async () => root.render(<DespesasPorCategoria dados={{ itens: [], totalGasto: 0, semDados: true }} />));
    expect(grafico()).toBeNull();
    expect(container.textContent).toContain("Não há despesas realizadas no mês selecionado");
    expect(container.textContent).toContain("0,00");
    expect(container.textContent).not.toMatch(/NaN|Infinity/);
});

test("nomes das categorias são apresentados como texto na legenda", async () => {
    const nome = '<img src=x onerror="alert(1)"> & Pets';
    await act(async () => root.render(<DespesasPorCategoria dados={{ itens: [{ nome, gasto: 1, percentual: 100 }], totalGasto: 1, semDados: false }} />));
    const legenda = container.querySelector('.legenda-categorias');
    expect(legenda.querySelector('img')).toBeNull();
    expect(legenda.textContent).toContain(nome);
});
