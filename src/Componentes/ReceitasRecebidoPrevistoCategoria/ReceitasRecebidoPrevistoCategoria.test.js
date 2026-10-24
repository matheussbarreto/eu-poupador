import { act } from "react";
import { createRoot } from "react-dom/client";
import ReceitasRecebidoPrevistoCategoria from "./index";

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
        { id: "a", nome: "Salário", recebido: 150, previsto: 100, percentual: 150 },
        { id: "b", nome: "Extras", recebido: 50, previsto: 0, percentual: null },
        { id: "c", nome: "Vendas", recebido: 0, previsto: 200, percentual: 0 },
    ],
    totalRecebido: 200, totalPrevisto: 300, diferenca: -100, semDados: false,
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

test("exibe recebimentos, metas e percentuais sem dividir por zero", async () => {
    await act(async () => root.render(<ReceitasRecebidoPrevistoCategoria dados={dados} />));
    const exibido = JSON.parse(grafico().textContent);
    expect(exibido.series[0].data.map((item) => [item.x, item.y, item.goals[0].value])).toEqual([
        ["Salário", 150, 100], ["Extras", 50, 0], ["Vendas", 0, 200],
    ]);
    expect(exibido.rotulos[0]).toContain("(150%)");
    expect(exibido.rotulos[1]).toContain("(—)");
    expect(exibido.rotulos[2]).toContain("(0%)");
    expect(exibido.legenda[2]).toContain("-R$");
    expect(container.textContent).not.toMatch(/Infinity|NaN/);
});

test("carregamento e erro escondem os dados anteriores e permitem repetir", async () => {
    const repetir = jest.fn();
    await act(async () => root.render(<ReceitasRecebidoPrevistoCategoria dados={dados} />));
    await act(async () => root.render(<ReceitasRecebidoPrevistoCategoria dados={dados} carregando />));
    expect(grafico()).toBeNull();
    expect(container.querySelector('[role="status"]').textContent).toContain("Carregando");
    await act(async () => root.render(<ReceitasRecebidoPrevistoCategoria dados={dados} erro="Falha na consulta" onTentarNovamente={repetir} />));
    expect(grafico()).toBeNull();
    expect(container.querySelector('[role="alert"]').textContent).toBe("Falha na consulta");
    await act(async () => container.querySelector('button').click());
    expect(repetir).toHaveBeenCalledTimes(1);
});

test("mês vazio remove as fontes anteriores e informa a ausência de valores", async () => {
    await act(async () => root.render(<ReceitasRecebidoPrevistoCategoria dados={dados} />));
    await act(async () => root.render(<ReceitasRecebidoPrevistoCategoria dados={{ itens: [], totalRecebido: 0, totalPrevisto: 0, diferenca: 0, semDados: true }} />));
    expect(grafico()).toBeNull();
    expect(container.querySelector('[role="status"]').textContent).toContain("Não há receitas recebidas ou previstas");
    expect(container.textContent).not.toContain("Salário");
});
