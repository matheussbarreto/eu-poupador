import { act } from "react";
import { createRoot } from "react-dom/client";
import DespesasPorUtilidade from "./index";

global.IS_REACT_ACT_ENVIRONMENT = true;
let mockOpcoes;
jest.mock("react-apexcharts", () => (props) => {
    mockOpcoes = props.options;
    return <div data-testid="grafico">{JSON.stringify(props.series)}</div>;
});

let container;
let root;
const dados = { itens: [
    { nome: "Essencial", gasto: 30, percentual: 60 },
    { nome: "Não Essencial", gasto: 10, percentual: 20 },
    { nome: "Não classificado", gasto: 10, percentual: 20 },
], totalGasto: 50, semDados: false };
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

test("utilidades exibem valores, percentuais e total com cores fixas quando grupos desaparecem", async () => {
    await act(async () => root.render(<DespesasPorUtilidade dados={dados} />));
    expect(JSON.parse(grafico().textContent)).toEqual([30, 10, 10]);
    expect(mockOpcoes.labels).toEqual(["Essencial", "Não Essencial", "Não classificado"]);
    expect(mockOpcoes.colors).toEqual(["#B0B0B0", "#FF0000", "#FF9900"]);
    expect(mockOpcoes.plotOptions.pie.donut.labels.total.formatter()).toContain("50,00");
    expect(container.querySelector('.legenda-utilidades').textContent).toContain("60,00%");
    await act(async () => root.render(<DespesasPorUtilidade dados={{ itens: [{ nome: "Não Essencial", gasto: 20, percentual: 100 }], totalGasto: 20, semDados: false }} />));
    expect(mockOpcoes.colors).toEqual(["#FF0000"]);
    expect(container.querySelectorAll('.legenda-utilidades li')).toHaveLength(1);
    expect(container.querySelector('.legenda-utilidades').textContent).toContain("100,00%");
    expect(mockOpcoes.plotOptions.pie.donut.labels.total.formatter()).toContain("20,00");
});

test("carregamento, erro e mês vazio removem os valores anteriores e permitem nova tentativa", async () => {
    const repetir = jest.fn();
    await act(async () => root.render(<DespesasPorUtilidade dados={dados} />));
    await act(async () => root.render(<DespesasPorUtilidade dados={dados} carregando />));
    expect(grafico()).toBeNull();
    expect(container.querySelector('[role="status"]').textContent).toContain("Carregando");
    await act(async () => root.render(<DespesasPorUtilidade dados={dados} erro="Falha na consulta" onTentarNovamente={repetir} />));
    expect(grafico()).toBeNull();
    expect(container.querySelector('[role="alert"]').textContent).toBe("Falha na consulta");
    await act(async () => container.querySelector('button').click());
    expect(repetir).toHaveBeenCalledTimes(1);
    await act(async () => root.render(<DespesasPorUtilidade dados={{ itens: [], totalGasto: 0, semDados: true }} />));
    expect(grafico()).toBeNull();
    expect(container.textContent).toContain("Não há despesas realizadas no mês selecionado");
    expect(container.textContent).toContain("0,00");
    expect(container.textContent).not.toMatch(/NaN|Infinity/);
});
