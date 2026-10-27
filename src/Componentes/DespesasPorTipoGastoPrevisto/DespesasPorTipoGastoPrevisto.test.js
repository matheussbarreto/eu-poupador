import { act } from "react";
import { createRoot } from "react-dom/client";
import DespesasPorTipoGastoPrevisto from "./index";

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
        { nome: "Despesa Fixa Essencial", gasto: 150, previsto: 100, percentual: 150 },
        { nome: "Despesa Variável Essencial", gasto: 0, previsto: 200, percentual: 0 },
        { nome: "Não classificado", gasto: 50, previsto: 0, percentual: null },
    ],
    totalGasto: 200, totalPrevisto: 300, diferenca: 100, diferencaPercentual: 100 / 3, semDados: false,
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

test("exibe gastos, metas por tipo e diferença total com percentuais distintos", async () => {
    await act(async () => root.render(<DespesasPorTipoGastoPrevisto dados={dados} />));
    const exibido = JSON.parse(grafico().textContent);
    expect(exibido.series[0].data.map((item) => [item.x, item.y, item.goals[0].value])).toEqual([
        ["Despesa Fixa Essencial", 150, 100], ["Despesa Variável Essencial", 0, 200], ["Não classificado", 50, 0],
    ]);
    expect(exibido.rotulos[0]).toContain("(150%)");
    expect(exibido.rotulos[1]).toContain("(0%)");
    expect(exibido.rotulos[2]).toContain("(—)");
    expect(exibido.legenda[0]).toContain("200,00");
    expect(exibido.legenda[1]).toContain("300,00");
    expect(exibido.legenda[2]).toContain("+R$");
    expect(exibido.legenda[2]).toContain("(+33,33%)");
});

test.each([-25, -0.001])("diferença percentual negativa %s mantém sinal e cor vermelha", async (percentual) => {
    await act(async () => root.render(<DespesasPorTipoGastoPrevisto dados={{ ...dados, diferenca: -0.01, diferencaPercentual: percentual }} />));
    const legenda = JSON.parse(grafico().textContent).legenda[2];
    expect(legenda).toContain("-R$");
    expect(legenda).toContain("(-");
    expect(legenda).not.toContain("+-");
    expect(legenda).toContain("var(--red-color)");
});

test("ausência de previsão total exibe travessão sem dividir por zero", async () => {
    await act(async () => root.render(<DespesasPorTipoGastoPrevisto dados={{ ...dados, totalPrevisto: 0, diferenca: -200, diferencaPercentual: null }} />));
    expect(JSON.parse(grafico().textContent).legenda[2]).toContain("(—)");
    expect(container.textContent).not.toMatch(/Infinity|NaN/);
});

test("carregamento e erro removem valores anteriores e permitem nova tentativa", async () => {
    const repetir = jest.fn();
    await act(async () => root.render(<DespesasPorTipoGastoPrevisto dados={dados} />));
    await act(async () => root.render(<DespesasPorTipoGastoPrevisto dados={dados} carregando />));
    expect(grafico()).toBeNull();
    expect(container.querySelector('[role="status"]').textContent).toContain("Carregando");
    await act(async () => root.render(<DespesasPorTipoGastoPrevisto dados={dados} erro="Falha na consulta" onTentarNovamente={repetir} />));
    expect(grafico()).toBeNull();
    expect(container.querySelector('[role="alert"]').textContent).toBe("Falha na consulta");
    await act(async () => container.querySelector('button').click());
    expect(repetir).toHaveBeenCalledTimes(1);
});

test("mês vazio remove o gráfico enquanto mês com somente previsão mostra a meta", async () => {
    const somentePrevisao = { ...dados, itens: [dados.itens[1]], totalGasto: 0, totalPrevisto: 200, diferenca: 200, diferencaPercentual: 100 };
    await act(async () => root.render(<DespesasPorTipoGastoPrevisto dados={somentePrevisao} />));
    expect(JSON.parse(grafico().textContent).series[0].data[0]).toMatchObject({ y: 0, goals: [{ value: 200 }] });
    await act(async () => root.render(<DespesasPorTipoGastoPrevisto dados={{ itens: [], semDados: true }} />));
    expect(grafico()).toBeNull();
    expect(container.querySelector('[role="status"]').textContent).toContain("Não há despesas realizadas ou previstas");
});
