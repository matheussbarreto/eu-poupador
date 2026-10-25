import { act } from "react";
import { createRoot } from "react-dom/client";
import DespesasGastoPrevistoCategoria from "./index";

global.IS_REACT_ACT_ENVIRONMENT = true;
jest.mock("react-apexcharts", () => (props) => <div data-testid="grafico">{JSON.stringify({
    series: props.series,
    rotulos: props.series[0].data.map((item, dataPointIndex) => props.options.dataLabels.formatter(item.y, { dataPointIndex })),
    legenda: props.options.legend.customLegendItems,
})}</div>);

let container;
let root;
const dados = {
    itens: [
        { id: "a", nome: "Aluguel", gasto: 150, previsto: 100, percentual: 150 },
        { id: "b", nome: "Extras", gasto: 50, previsto: 0, percentual: null },
        { id: "c", nome: "Transporte", gasto: 0, previsto: 200, percentual: 0 },
    ],
    totalGasto: 200, totalPrevisto: 300, diferenca: 100, semDados: false,
};
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

test("exibe gastos, metas e percentuais sem dividir por zero", async () => {
    await act(async () => root.render(<DespesasGastoPrevistoCategoria dados={dados} />));
    const exibido = JSON.parse(grafico().textContent);
    expect(exibido.series[0].data.map((item) => [item.x, item.y, item.goals[0].value])).toEqual([
        ["Aluguel", 150, 100], ["Extras", 50, 0], ["Transporte", 0, 200],
    ]);
    expect(exibido.rotulos[0]).toContain("(150%)");
    expect(exibido.rotulos[1]).toContain("(—)");
    expect(exibido.rotulos[2]).toContain("(0%)");
    expect(exibido.legenda[2]).toContain("+R$");
    expect(container.textContent).not.toMatch(/Infinity|NaN/);
});

test("carregamento e erro escondem os dados anteriores e permitem repetir", async () => {
    const repetir = jest.fn();
    await act(async () => root.render(<DespesasGastoPrevistoCategoria dados={dados} />));
    await act(async () => root.render(<DespesasGastoPrevistoCategoria dados={dados} carregando />));
    expect(grafico()).toBeNull();
    expect(container.querySelector('[role="status"]').textContent).toContain("Carregando");
    await act(async () => root.render(<DespesasGastoPrevistoCategoria dados={dados} erro="Falha na consulta" onTentarNovamente={repetir} />));
    expect(grafico()).toBeNull();
    expect(container.querySelector('[role="alert"]').textContent).toBe("Falha na consulta");
    await act(async () => container.querySelector('button').click());
    expect(repetir).toHaveBeenCalledTimes(1);
});

test("mês vazio remove as despesas anteriores e informa a ausência de valores", async () => {
    await act(async () => root.render(<DespesasGastoPrevistoCategoria dados={dados} />));
    await act(async () => root.render(<DespesasGastoPrevistoCategoria dados={{ itens: [], totalGasto: 0, totalPrevisto: 0, diferenca: 0, semDados: true }} />));
    expect(grafico()).toBeNull();
    expect(container.querySelector('[role="status"]').textContent).toContain("Não há despesas realizadas ou previstas");
    expect(container.textContent).not.toContain("Aluguel");
});


test("orçamento excedido mostra a diferença negativa em vermelho", async () => {
    await act(async () => root.render(<DespesasGastoPrevistoCategoria dados={{ ...dados, totalGasto: 400, diferenca: -100 }} />));
    const legenda = JSON.parse(grafico().textContent).legenda[2];
    expect(legenda).toContain("-R$");
    expect(legenda).toContain("var(--red-color)");
});
