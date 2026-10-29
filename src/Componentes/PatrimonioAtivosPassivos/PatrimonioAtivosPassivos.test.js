import { act } from "react";
import { createRoot } from "react-dom/client";
import PatrimonioAtivosPassivos from "./index";

global.IS_REACT_ACT_ENVIRONMENT = true;
jest.mock("react-apexcharts", () => (props) => <div data-testid="grafico">{JSON.stringify({
    tipo: props.type, series: props.series, categorias: props.options.xaxis.categories,
    legendas: props.series.map((item, seriesIndex) => props.options.legend.formatter(item.name, { seriesIndex })),
    tooltipNulo: props.options.tooltip.y.formatter(null),
})}</div>);
let container;
let root;
const dados = { categorias: ["Set/2026", "Out/2026"], ativos: [0, 100], passivos: [0, 250], patrimonios: [0, -150], semHistorico: false };
const renderizar = async (props = {}) => act(async () => root.render(<PatrimonioAtivosPassivos dados={dados} {...props} />));
const grafico = () => container.querySelector('[data-testid="grafico"]');
beforeEach(() => { container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

test("liga zeros anteriores ao patrimônio negativo e mantém os valores do mês selecionado nas legendas", async () => {
    await renderizar();
    const resultado = JSON.parse(grafico().textContent);
    expect(resultado.series.map(item => item.data)).toEqual([[0, 100], [0, 250], [0, -150]]);
    expect(resultado.tipo).toBe("line");
    expect(resultado.categorias).toEqual(dados.categorias);
    expect(resultado.legendas[2]).toContain('#ff1616');
    expect(resultado.legendas[2]).toMatch(/-R\$\s*150,00/);
    expect(resultado.tooltipNulo).toBe("—");
});

test("dois meses com histórico são conectados por linhas", async () => {
    await renderizar({ dados: { ...dados, ativos: [50, 100], passivos: [200, 250], patrimonios: [-150, -150] } });
    expect(JSON.parse(grafico().textContent).tipo).toBe("line");
});

test("carregamento, erro com nova tentativa e ausência de histórico não mostram valores antigos", async () => {
    await renderizar();
    await renderizar({ carregando: true });
    expect(grafico()).toBeNull();
    expect(container.querySelector('section').getAttribute('aria-busy')).toBe("true");
    const tentar = jest.fn();
    await renderizar({ erro: "Falha na leitura", onTentarNovamente: tentar });
    expect(grafico()).toBeNull();
    await act(async () => container.querySelector('button').click());
    expect(tentar).toHaveBeenCalledTimes(1);
    await renderizar({ dados: undefined });
    expect(grafico()).toBeNull();
    expect(container.textContent).toContain("Não há histórico");
});

test("período sem histórico exibe linhas zeradas após uma consulta válida", async () => {
    await renderizar({ dados: { ...dados, ativos: [0, 0], passivos: [0, 0], patrimonios: [0, 0], semHistorico: true } });
    expect(JSON.parse(grafico().textContent).legendas[2]).toMatch(/R\$\s*0,00/);
    expect(container.querySelector('[role="status"]')).toBeNull();
});
