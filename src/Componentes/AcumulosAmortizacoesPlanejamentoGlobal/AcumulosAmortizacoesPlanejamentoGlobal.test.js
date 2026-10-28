import { act } from "react";
import { createRoot } from "react-dom/client";
import AcumulosAmortizacoesPlanejamentoGlobal from "./index";

global.IS_REACT_ACT_ENVIRONMENT = true;
jest.mock("react-apexcharts", () => (props) => <div data-testid="grafico">{JSON.stringify({
    series: props.series, percentual: props.options.plotOptions.radialBar.dataLabels.value.formatter(),
})}</div>);

let container;
let root;
const itens = [
    { id: "a", nome: "Reserva", atual: 250, desejado: 100, percentual: 250, concluido: true },
    { id: "b", nome: "Dívida", atual: -50, desejado: 0, percentual: null, concluido: false },
    { id: "c", nome: "Bem sem meta", atual: 50, desejado: 0, percentual: null, concluido: false },
    { id: "d", nome: "Quitada", atual: 0, desejado: 0, percentual: null, concluido: true },
    { id: "e", nome: "Saldo negativo", atual: -50, desejado: 100, percentual: -50, concluido: false },
];
const dados = { itens, totalAtual: 200, totalDesejado: 200, diferenca: 0, semDados: false };
const renderizar = async (props = {}) => act(async () => root.render(<AcumulosAmortizacoesPlanejamentoGlobal dados={dados} {...props} />));
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

test("mostra saldos, metas e percentuais reais limitando apenas o preenchimento circular", async () => {
    await renderizar();
    expect(graficos()).toEqual([
        { series: [100], percentual: "250%" }, { series: [0], percentual: "—" },
        { series: [0], percentual: "—" }, { series: [0], percentual: "—" }, { series: [0], percentual: "-50%" },
    ]);
    expect(container.querySelector('[aria-label="Totais atuais dos objetivos"]').textContent).toContain("200,00");
    expect(container.querySelector('[aria-label="Dívida: percentual indisponível"]').parentElement.textContent).toContain("-R$");
    expect(container.textContent).not.toMatch(/NaN|Infinity/);
});

test("oculta metas atingidas ou superadas e dívidas quitadas sem remover itens sem meta nem alterar totais", async () => {
    await renderizar();
    const totais = container.querySelector('.legenda').textContent;
    await act(async () => container.querySelector('input').click());
    expect(nomes()).toEqual(["Dívida", "Bem sem meta", "Saldo negativo"]);
    expect(container.querySelector('.legenda').textContent).toBe(totais);
    await renderizar({ dados: { ...dados, itens: [itens[0], itens[3]] } });
    expect(graficos()).toEqual([]);
    expect(container.querySelector('[role="status"]').textContent).toContain("filtro selecionado");
    expect(container.querySelector('.legenda').textContent).toBe(totais);
});

test("paginação mostra 12 itens, preserva totais e se ajusta quando cadastros são removidos", async () => {
    const muitos = { ...dados, itens: Array.from({ length: 13 }, (_, indice) => ({ ...itens[1], id: String(indice), nome: `Objetivo ${indice + 1}` })) };
    await renderizar({ dados: muitos });
    expect(graficos()).toHaveLength(12);
    expect(container.querySelector('[aria-label="Página anterior de objetivos globais"]').disabled).toBe(true);
    const totais = container.querySelector('.legenda').textContent;
    await act(async () => container.querySelector('[aria-label="Próxima página de objetivos globais"]').click());
    expect(nomes()).toEqual(["Objetivo 13"]);
    expect(container.querySelector('.legenda').textContent).toBe(totais);
    expect(container.querySelector('[aria-label="Próxima página de objetivos globais"]').disabled).toBe(true);
    await renderizar({ dados });
    expect(nomes()).toHaveLength(5);
    expect(container.querySelector('.paginacao')).toBeNull();
});

test("filtro volta à primeira página e nomes são renderizados como texto", async () => {
    const muitos = { ...dados, itens: Array.from({ length: 25 }, (_, indice) => ({ ...itens[indice % 2], id: String(indice), nome: '<img src=x onerror=alert(1)>' })) };
    await renderizar({ dados: muitos });
    await act(async () => container.querySelector('[aria-label="Próxima página de objetivos globais"]').click());
    await act(async () => container.querySelector('input').click());
    expect(graficos()).toHaveLength(12);
    expect(container.querySelector('.paginacao')).toBeNull();
    expect(container.querySelector('.titulo').textContent).toBe('<img src=x onerror=alert(1)>');
    expect(container.querySelector('img')).toBeNull();
});

test("carregamento e erro escondem dados anteriores e permitem repetir a consulta", async () => {
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

test("ausência de cadastros remove cartões e totais antigos", async () => {
    await renderizar();
    await renderizar({ dados: { itens: [], semDados: true } });
    expect(graficos()).toEqual([]);
    expect(container.querySelector('.legenda')).toBeNull();
    expect(container.querySelector('[role="status"]').textContent).toBe("Não há objetivos cadastrados.");
});
