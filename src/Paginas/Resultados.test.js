import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Resultados from "./Resultados";
import { observarContas } from "../services/contasService";
import { observarInvestimentos } from "../services/investimentosService";
import { observarHistoricoTransacoes } from "../services/transacoesService";

global.IS_REACT_ACT_ENVIRONMENT = true;
jest.mock("../services/contasService", () => ({ observarContas: jest.fn() }));
jest.mock("../services/investimentosService", () => ({ observarInvestimentos: jest.fn() }));
jest.mock("../services/transacoesService", () => ({ observarHistoricoTransacoes: jest.fn() }));
jest.mock("react-apexcharts", () => (props) => <div data-testid="grafico">{JSON.stringify({ series: props.series, categorias: props.options.xaxis.categories, cores: props.options.colors })}</div>);
jest.mock("../Componentes/ResultadoAtivos", () => () => null);
jest.mock("../Componentes/ResultadoPassivos", () => () => null);
jest.mock("../Componentes/ResultadoAtivoPassivo", () => () => null);
jest.mock("../Componentes/SaldoInvestimentos", () => () => null);
jest.mock("../Componentes/VariacaoSaldoInvestimentos", () => () => null);
jest.mock("../Componentes/ControleInvestimentos", () => () => null);
jest.mock("../Componentes/CarteiraInvestimentos", () => () => null);
jest.mock("../Componentes/RendimentosMoeda", () => () => null);
jest.mock("../Componentes/VariacaoRendimentosMoeda", () => () => null);
jest.mock("../Componentes/RendimentosPercentual", () => () => null);
jest.mock("../Componentes/VariacaoRendimentosPercentual", () => () => null);

let container;
let root;
let fontes;
const grafico = () => container.querySelector('[data-testid="grafico"]');
const valores = () => JSON.parse(grafico().textContent).series.map(serie => serie.data[11]);
const comparacao = () => container.querySelector('.variacao-patrimonial');
const graficoComparacao = () => comparacao().querySelector('[data-testid="grafico"]');
const valoresComparacao = () => JSON.parse(graficoComparacao().textContent).series.map(serie => serie.data[0]);
const transacoes = (amount = 100) => [{ date: new Date(2026, 9, 10).toISOString(), amount, outgoingType: "income", incomingType: "account", inID: "c" }];
const receber = async (indice = 0) => act(async () => {
    fontes.contas[indice].receber([{ id: "c", balance: 0 }]);
    fontes.investimentos[indice].receber([]);
    fontes.transacoes[indice].receber(transacoes());
});

beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 29, 12));
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    fontes = { contas: [], investimentos: [], transacoes: [] };
    [[observarContas, "contas"], [observarInvestimentos, "investimentos"], [observarHistoricoTransacoes, "transacoes"]].forEach(([observar, chave]) => {
        observar.mockImplementation((usuarioId, receber, falhar) => {
            const cancelar = jest.fn();
            fontes[chave].push({ usuarioId, receber, falhar, cancelar });
            return cancelar;
        });
    });
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); jest.useRealTimers(); });

test("aguarda as três fontes, compartilha atualizações e troca de mês sem novas consultas", async () => {
    await act(async () => root.render(<Resultados usuarioId="a" />));
    await act(async () => fontes.transacoes[0].receber(transacoes()));
    expect(grafico()).toBeNull();
    expect(graficoComparacao()).toBeNull();
    expect(container.textContent).toContain("Carregando patrimônio");
    await receber();
    expect(valores()).toEqual([100, 0, 100]);
    expect(valoresComparacao()).toEqual([0, 100]);
    expect(comparacao().querySelector('.diferenca-patrimonial').textContent).toContain('(—)');
    await act(async () => fontes.transacoes[0].receber(transacoes(200)));
    expect(valores()).toEqual([200, 0, 200]);
    expect(valoresComparacao()).toEqual([0, 200]);
    await act(async () => container.querySelector('[aria-label="Mês anterior"]').click());
    expect(valores()).toEqual([0, 0, 0]);
    expect(valoresComparacao()).toEqual([0, 0]);
    expect(JSON.parse(grafico().textContent).series.every(serie => serie.data.every(valor => valor === 0))).toBe(true);
    await act(async () => jest.advanceTimersByTime(250));
    await act(async () => container.querySelector('[aria-label="Próximo mês"]').click());
    expect(valores()).toEqual([200, 0, 200]);
    expect(valoresComparacao()).toEqual([0, 200]);
    Object.values(fontes).forEach(lista => expect(lista).toHaveLength(1));
    expect(container.textContent).not.toContain("demonstração");
});

test("troca de usuário esconde valores anteriores e ignora callbacks atrasados", async () => {
    await act(async () => root.render(<Resultados usuarioId="a" />));
    await receber();
    await act(async () => root.render(<Resultados usuarioId="b" />));
    expect(grafico()).toBeNull();
    expect(graficoComparacao()).toBeNull();
    expect(comparacao().querySelector('.legenda')).toBeNull();
    await act(async () => {
        fontes.transacoes[0].receber(transacoes(999));
        fontes.contas[0].falhar({ code: "permission-denied" });
    });
    expect(grafico()).toBeNull();
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(graficoComparacao()).toBeNull();
    await receber(1);
    expect(valores()).toEqual([100, 0, 100]);
    Object.values(fontes).forEach(lista => {
        expect(lista[0].cancelar).toHaveBeenCalledTimes(1);
        expect(lista[1].usuarioId).toBe("b");
    });
});

test.each(["contas", "investimentos", "transacoes"])("falha em %s esconde totais e permite nova tentativa", async (fonte) => {
    await act(async () => root.render(<Resultados usuarioId="a" />));
    await receber();
    await act(async () => fontes[fonte][0].falhar({ code: "permission-denied" }));
    expect(grafico()).toBeNull();
    expect(graficoComparacao()).toBeNull();
    expect(comparacao().querySelector('[role="alert"]').textContent).toContain("acesso");
    expect(container.querySelector('[role="alert"]').textContent).toContain("acesso");
    await act(async () => container.querySelector('.estado-patrimonio button').click());
    expect(container.textContent).toContain("Carregando");
    await receber(1);
    expect(valores()).toEqual([100, 0, 100]);
    Object.values(fontes).forEach(lista => expect(lista[0].cancelar).toHaveBeenCalledTimes(1));
});

test("erro de cálculo não vira zero; após recuperação, lista vazia apresenta os doze meses zerados", async () => {
    await act(async () => root.render(<Resultados usuarioId="a" />));
    await receber();
    await act(async () => fontes.transacoes[0].receber([{ ...transacoes()[0], amount: "inválido" }]));
    expect(grafico()).toBeNull();
    expect(container.querySelector('[role="alert"]').textContent).toContain("valor inválido");
    expect(graficoComparacao()).toBeNull();
    await act(async () => fontes.transacoes[0].receber(transacoes(0)));
    expect(valores()).toEqual([0, 0, 0]);
    await act(async () => fontes.transacoes[0].receber([]));
    expect(valores()).toEqual([0, 0, 0]);
    expect(JSON.parse(grafico().textContent).series.every(serie => serie.data.every(valor => valor === 0))).toBe(true);
});

test("comparação compartilha saldo negativo, nova tentativa e isolamento dos controles entre meses e usuários", async () => {
    await act(async () => root.render(<Resultados usuarioId="a" />));
    await receber();
    await act(async () => fontes.transacoes[0].receber([
        { date: new Date(2026, 8, 1).toISOString(), amount: -100, outgoingType: "create", incomingType: "account", inID: "c" },
        ...transacoes(50),
    ]));
    expect(valoresComparacao()).toEqual([-100, -50]);
    expect(comparacao().querySelector('.diferenca-patrimonial').textContent).toContain('+50,00%');
    await act(async () => comparacao().querySelector('[aria-label="Exibir Atual"]').click());
    expect(valoresComparacao()).toEqual([-100]);
    expect(valores()).toEqual([0, 50, -50]);
    await act(async () => container.querySelector('[aria-label="Mês anterior"]').click());
    expect(valoresComparacao()).toEqual([0, -100]);
    expect(comparacao().querySelector('[aria-label="Exibir Atual"]').checked).toBe(true);
    Object.values(fontes).forEach(lista => expect(lista).toHaveLength(1));
    await act(async () => fontes.contas[0].falhar({ code: "unavailable" }));
    await act(async () => comparacao().querySelector('button').click());
    await receber(1);
    expect(valoresComparacao()).toEqual([0, 0]);
    Object.values(fontes).forEach(lista => expect(lista).toHaveLength(2));
    await act(async () => comparacao().querySelector('[aria-label="Exibir Atual"]').click());
    await act(async () => root.render(<Resultados usuarioId="b" />));
    expect(graficoComparacao()).toBeNull();
    await receber(2);
    expect(comparacao().querySelector('[aria-label="Exibir Atual"]').checked).toBe(true);
});

test("falha síncrona não deixa leituras anteriores abertas ao sair", async () => {
    observarInvestimentos.mockImplementation(() => { throw new Error("configuração"); });
    await act(async () => root.render(<Resultados usuarioId="a" />));
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    await act(async () => root.render(null));
    expect(fontes.contas[0].cancelar).toHaveBeenCalledTimes(1);
    expect(observarHistoricoTransacoes).not.toHaveBeenCalled();
});

test("StrictMode cancela todas as leituras e ignora o primeiro conjunto de callbacks", async () => {
    await act(async () => root.render(<StrictMode><Resultados usuarioId="a" /></StrictMode>));
    Object.values(fontes).forEach(lista => expect(lista[0].cancelar).toHaveBeenCalledTimes(1));
    await receber(0);
    expect(grafico()).toBeNull();
    await receber(1);
    expect(valores()).toEqual([100, 0, 100]);
    await act(async () => root.render(null));
    Object.values(fontes).forEach(lista => expect(lista[1].cancelar).toHaveBeenCalledTimes(1));
});
