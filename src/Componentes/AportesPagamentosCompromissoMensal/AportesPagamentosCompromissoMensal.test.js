import { act } from "react";
import { createRoot } from "react-dom/client";
import AportesPagamentosCompromissoMensal from "./index";

global.IS_REACT_ACT_ENVIRONMENT = true;
jest.mock("react-apexcharts", () => (props) => <div data-testid="grafico">{JSON.stringify({
    series: props.series, percentual: props.options.plotOptions.radialBar.dataLabels.value.formatter(),
})}</div>);

let container;
let root;
const dados = { totalRealizado: 150, totalPrevisto: 400, percentual: 37.5, semDados: false };
const grafico = () => container.querySelector('[data-testid="grafico"]');
const renderizar = async (props = {}) => act(async () => root.render(<AportesPagamentosCompromissoMensal dados={dados} {...props} />));

beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
});
afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
});

test("exibe os totais compartilhados e formata o percentual em português", async () => {
    await renderizar();
    expect(JSON.parse(grafico().textContent)).toEqual({ series: [37.5], percentual: "37,5%" });
    expect(container.querySelector('[aria-label^="Realizado:"]').textContent).toContain("150,00");
    expect(container.querySelector('[aria-label^="Previsto:"]').textContent).toContain("400,00");
});

test.each([[250, 100, "250%"], [0, 0, "0%"], [null, 0, "—"]])("percentual %s preserva o texto e limita somente o preenchimento", async (percentual, preenchimento, texto) => {
    await renderizar({ dados: { ...dados, percentual } });
    expect(JSON.parse(grafico().textContent)).toEqual({ series: [preenchimento], percentual: texto });
    expect(container.textContent).not.toMatch(/NaN|Infinity/);
});

test("carregamento e erro escondem os dados anteriores e permitem nova tentativa", async () => {
    await renderizar();
    await renderizar({ carregando: true });
    expect(grafico()).toBeNull();
    expect(container.querySelector('[aria-label^="Realizado:"]')).toBeNull();
    expect(container.querySelector('[role="status"]').textContent).toContain("Carregando");
    const repetir = jest.fn();
    await renderizar({ erro: "Falha na consulta", onTentarNovamente: repetir });
    expect(grafico()).toBeNull();
    expect(container.querySelector('[role="alert"]').textContent).toBe("Falha na consulta");
    await act(async () => container.querySelector('button').click());
    expect(repetir).toHaveBeenCalledTimes(1);
});

test("mês vazio remove valores anteriores e mês com apenas previsão exibe zero por cento", async () => {
    await renderizar({ dados: { totalRealizado: 0, totalPrevisto: 100, percentual: 0, semDados: false } });
    expect(JSON.parse(grafico().textContent).percentual).toBe("0%");
    await renderizar({ dados: { totalRealizado: 0, totalPrevisto: 0, percentual: null, semDados: true } });
    expect(grafico()).toBeNull();
    expect(container.querySelector('[role="status"]').textContent).toContain("Não há aportes, pagamentos ou previsões");
});
