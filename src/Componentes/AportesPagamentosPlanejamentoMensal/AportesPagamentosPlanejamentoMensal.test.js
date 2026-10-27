import { act } from "react";
import { createRoot } from "react-dom/client";
import AportesPagamentosPlanejamentoMensal from "./index";

global.IS_REACT_ACT_ENVIRONMENT = true;
jest.mock("react-apexcharts", () => (props) => <div data-testid="grafico">{JSON.stringify({
    series: props.series, percentual: props.options.plotOptions.radialBar.dataLabels.value.formatter(),
})}</div>);

let container;
let root;
const itens = [
    { id: "a", nome: "Reserva", realizado: 250, previsto: 100, percentual: 250 },
    { id: "b", nome: "Dívida", realizado: 0, previsto: 200, percentual: 0 },
    { id: "c", nome: "Sem previsão", realizado: 50, previsto: 0, percentual: null },
];
const dados = { itens, totalRealizado: 300, totalPrevisto: 300, diferenca: 0, semDados: false };
const renderizar = async (props = {}) => act(async () => root.render(<AportesPagamentosPlanejamentoMensal dados={dados} {...props} />));
const graficos = () => [...container.querySelectorAll('[data-testid="grafico"]')].map((elemento) => JSON.parse(elemento.textContent));
const nomes = () => [...container.querySelectorAll('.titulo')].map((elemento) => elemento.textContent);

beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
});
afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
});

test("mostra percentuais reais, limita apenas o preenchimento e trata previsão zero", async () => {
    await renderizar();
    expect(graficos()).toEqual([
        { series: [100], percentual: "250%" }, { series: [0], percentual: "0%" }, { series: [0], percentual: "—" },
    ]);
    expect(container.querySelector('[aria-label="Totais do mês"]').textContent).toContain("300,00");
    expect(container.textContent).not.toMatch(/NaN|Infinity/);
});

test("filtro mantém objetivos previstos sem aportes e não altera os totais", async () => {
    await renderizar();
    const totais = container.querySelector('.legenda').textContent;
    await act(async () => container.querySelector('input[type="checkbox"]').click());
    expect(nomes()).toEqual(["Dívida"]);
    expect(container.querySelector('.legenda').textContent).toBe(totais);
    await renderizar({ dados: { ...dados, itens: [itens[0], itens[2]] } });
    expect(graficos()).toEqual([]);
    expect(container.querySelector('[role="status"]').textContent).toContain("filtro selecionado");
    expect(container.querySelector('.legenda').textContent).toBe(totais);
});

test("paginação mostra 12 por página e se ajusta quando os dados diminuem", async () => {
    const muitos = { ...dados, itens: Array.from({ length: 13 }, (_, indice) => ({ ...itens[1], id: String(indice), nome: `Objetivo ${indice + 1}` })) };
    await renderizar({ dados: muitos });
    expect(graficos()).toHaveLength(12);
    const totais = container.querySelector('.legenda').textContent;
    await act(async () => container.querySelector('[aria-label="Próxima página de objetivos"]').click());
    expect(nomes()).toEqual(["Objetivo 13"]);
    expect(container.querySelector('.legenda').textContent).toBe(totais);
    await renderizar({ dados });
    expect(nomes()).toEqual(["Reserva", "Dívida", "Sem previsão"]);
    expect(container.querySelector('.paginacao')).toBeNull();
});

test("filtro volta à primeira página e mantém a paginação dentro dos limites", async () => {
    const muitos = { ...dados, itens: Array.from({ length: 25 }, (_, indice) => ({ ...itens[indice % 3], id: String(indice) })) };
    await renderizar({ dados: muitos });
    await act(async () => container.querySelector('[aria-label="Próxima página de objetivos"]').click());
    await act(async () => container.querySelector('input[type="checkbox"]').click());
    expect(graficos()).toHaveLength(8);
    expect(container.querySelector('.paginacao')).toBeNull();
});

test("carregamento, erro e nova tentativa escondem valores anteriores", async () => {
    await renderizar();
    await renderizar({ carregando: true });
    expect(graficos()).toEqual([]);
    expect(container.querySelector('.legenda')).toBeNull();
    expect(container.querySelector('[role="status"]').textContent).toContain("Carregando");
    const repetir = jest.fn();
    await renderizar({ erro: "Falha na consulta", onTentarNovamente: repetir });
    expect(graficos()).toEqual([]);
    expect(container.querySelector('[role="alert"]').textContent).toBe("Falha na consulta");
    await act(async () => container.querySelector('button').click());
    expect(repetir).toHaveBeenCalledTimes(1);
});

test("mês vazio remove cartões antigos e informa a ausência de dados", async () => {
    await renderizar();
    await renderizar({ dados: { itens: [], semDados: true } });
    expect(graficos()).toEqual([]);
    expect(container.textContent).not.toContain("Reserva");
    expect(container.querySelector('[role="status"]').textContent).toContain("Não há aportes, pagamentos ou previsões");
});
