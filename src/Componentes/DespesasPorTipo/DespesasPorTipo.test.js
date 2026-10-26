import { act } from "react";
import { createRoot } from "react-dom/client";
import DespesasPorTipo from "./index";

global.IS_REACT_ACT_ENVIRONMENT = true;
let mockOpcoes;
jest.mock("react-apexcharts", () => (props) => {
    mockOpcoes = props.options;
    return <div data-testid="grafico">{JSON.stringify(props.series)}</div>;
});

let container;
let root;
const dados = { itens: [
    { nome: "Despesa Fixa Essencial", gasto: 30, percentual: 75 },
    { nome: "Não classificado", gasto: 10, percentual: 25 },
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

test("tipos mostram gastos, total e percentuais com cores estáveis quando os grupos mudam", async () => {
    await act(async () => root.render(<DespesasPorTipo dados={dados} />));
    expect(JSON.parse(grafico().textContent)).toEqual([30, 10]);
    expect(mockOpcoes.labels).toEqual(["Despesa Fixa Essencial", "Não classificado"]);
    expect(mockOpcoes.plotOptions.pie.donut.labels.total.formatter()).toContain("40,00");
    expect(container.querySelector('.legenda-tipos').textContent).toContain("75,00%");
    const corSemTipo = mockOpcoes.colors[1];
    await act(async () => root.render(<DespesasPorTipo dados={{ itens: [{ nome: "Não classificado", gasto: 20, percentual: 100 }], totalGasto: 20, semDados: false }} />));
    expect(mockOpcoes.colors).toEqual([corSemTipo]);
    expect(container.querySelectorAll('.legenda-tipos li')).toHaveLength(1);
    expect(container.querySelector('.legenda-tipos').textContent).toContain("100,00%");
    expect(mockOpcoes.plotOptions.pie.donut.labels.total.formatter()).toContain("20,00");
});

test("carregamento, falha e mês vazio removem os gastos anteriores e permitem nova tentativa", async () => {
    const repetir = jest.fn();
    await act(async () => root.render(<DespesasPorTipo dados={dados} />));
    await act(async () => root.render(<DespesasPorTipo dados={dados} carregando />));
    expect(grafico()).toBeNull();
    expect(container.querySelector('[role="status"]').textContent).toContain("Carregando");
    await act(async () => root.render(<DespesasPorTipo dados={dados} erro="Falha na consulta" onTentarNovamente={repetir} />));
    expect(grafico()).toBeNull();
    expect(container.querySelector('[role="alert"]').textContent).toBe("Falha na consulta");
    await act(async () => container.querySelector('button').click());
    expect(repetir).toHaveBeenCalledTimes(1);
    await act(async () => root.render(<DespesasPorTipo dados={{ itens: [], totalGasto: 0, semDados: true }} />));
    expect(grafico()).toBeNull();
    expect(container.textContent).toContain("Não há despesas realizadas no mês selecionado");
    expect(container.textContent).toContain("0,00");
    expect(container.textContent).not.toMatch(/NaN|Infinity/);
});
