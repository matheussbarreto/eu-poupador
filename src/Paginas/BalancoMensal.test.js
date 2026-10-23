import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import BalancoMensal from "./BalancoMensal";
import { observarTransacoes } from "../services/transacoesService";

global.IS_REACT_ACT_ENVIRONMENT = true;
jest.mock("../services/transacoesService", () => ({
    observarTransacoes: jest.fn(),
}));
jest.mock("react-apexcharts", () => (props) => <div data-testid="grafico">{JSON.stringify({ series: props.series, categorias: props.options.xaxis.categories })}</div>);
jest.mock("../Componentes/SaldoAcumuladoPrevisto", () => () => null);
jest.mock("../Componentes/ReceitasRecebidoPrevistoCategoria", () => () => null);
jest.mock("../Componentes/ReceitasRecebidoPrevisto", () => () => null);
jest.mock("../Componentes/DespesasGastoPrevistoCategoria", () => () => null);
jest.mock("../Componentes/DespesasGastoPrevisto", () => () => null);
jest.mock("../Componentes/DespesasPorCategoria", () => () => null);
jest.mock("../Componentes/DespesasPorTipo", () => () => null);
jest.mock("../Componentes/DespesasPorUtilidade", () => () => null);
jest.mock("../Componentes/DespesasPorTipoGastoPrevisto", () => () => null);

let container;
let root;
let consultas;
const transacoes = (valor, mes = 9) => [
    { id: "receita-1", date: new Date(2026, mes, 15, 12).toISOString(), amount: valor, outgoingType: "income", incomingType: "account" },
    { id: "despesa-1", date: new Date(2026, mes, 15, 12).toISOString(), amount: 30, outgoingType: "account", incomingType: "expense" },
];
const valoresMensais = (valor) => [...Array(11).fill(0), valor];
const grafico = () => container.querySelector('[data-testid="grafico"]');

beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers("modern");
    jest.setSystemTime(new Date(2026, 9, 16, 12));
    consultas = [];
    observarTransacoes.mockImplementation((usuarioId, intervalo, receber, falhar) => {
        const cancelar = jest.fn();
        consultas.push({ usuarioId, intervalo, receber, falhar, cancelar });
        return cancelar;
    });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.useRealTimers();
});

test("carrega as transações da sessão e atualiza as três séries sem abrir outra consulta", async () => {
    await act(async () => root.render(<BalancoMensal usuarioId="usuario-a" />));
    expect(container.textContent).toContain("Carregando balanço");
    expect(grafico()).toBeNull();
    expect(consultas[0].usuarioId).toBe("usuario-a");
    expect(consultas[0].intervalo).toEqual({ inicio: new Date(2025, 10, 1), fim: new Date(2026, 10, 1) });
    await act(async () => consultas[0].receber(transacoes(123.45)));
    expect(JSON.parse(grafico().textContent).series).toEqual([
        { name: "Receitas", data: valoresMensais(123.45) },
        { name: "Despesas", data: valoresMensais(30) },
        { name: "Saldo", data: valoresMensais(93.45) },
    ]);
    expect(JSON.parse(grafico().textContent).categorias).toEqual([
        "Nov/2025", "Dez/2025", "Jan/2026", "Fev/2026", "Mar/2026", "Abr/2026",
        "Mai/2026", "Jun/2026", "Jul/2026", "Ago/2026", "Set/2026", "Out/2026",
    ]);
    await act(async () => consultas[0].receber(transacoes(200)));
    await act(async () => root.render(<BalancoMensal usuarioId="usuario-a" />));
    expect(JSON.parse(grafico().textContent).series[0].data).toEqual(valoresMensais(200));
    expect(consultas).toHaveLength(1);
});

test("troca de mês limpa valores antigos, cancela a consulta e ignora respostas atrasadas", async () => {
    await act(async () => root.render(<BalancoMensal usuarioId="usuario-a" />));
    await act(async () => consultas[0].receber(transacoes(100)));
    await act(async () => container.querySelector('[aria-label="Mês anterior"]').click());
    expect(consultas[0].cancelar).toHaveBeenCalledTimes(1);
    expect(consultas[1].intervalo).toEqual({ inicio: new Date(2025, 9, 1), fim: new Date(2026, 9, 1) });
    expect(grafico()).toBeNull();
    await act(async () => consultas[0].receber(transacoes(999)));
    expect(grafico()).toBeNull();
    await act(async () => consultas[1].receber(transacoes(50, 8)));
    expect(JSON.parse(grafico().textContent).series[0].data).toEqual(valoresMensais(50));
    await act(async () => consultas[0].falhar(new Error("falha antiga")));
    expect(container.querySelector('[role="alert"]')).toBeNull();
});

test("troca de usuário cancela a consulta e não reaproveita dados da outra conta", async () => {
    await act(async () => root.render(<BalancoMensal usuarioId="usuario-a" />));
    await act(async () => consultas[0].receber(transacoes(100)));
    await act(async () => root.render(<BalancoMensal usuarioId="usuario-b" />));
    expect(consultas[0].cancelar).toHaveBeenCalledTimes(1);
    expect(consultas[1].usuarioId).toBe("usuario-b");
    expect(grafico()).toBeNull();
    await act(async () => consultas[0].receber(transacoes(999)));
    expect(grafico()).toBeNull();
    await act(async () => consultas[1].receber(transacoes(300)));
    await act(async () => consultas[0].receber(transacoes(999)));
    expect(JSON.parse(grafico().textContent).series[0].data).toEqual(valoresMensais(300));
});

test("falha remove os totais e permite repetir a consulta", async () => {
    await act(async () => root.render(<BalancoMensal usuarioId="usuario-a" />));
    await act(async () => consultas[0].receber(transacoes(100)));
    await act(async () => consultas[0].falhar({ code: "permission-denied" }));
    expect(grafico()).toBeNull();
    expect(container.querySelector('[role="alert"]').textContent).toContain("Não foi possível acessar seus lançamentos");
    await act(async () => container.querySelector('.estado-balanco button').click());
    expect(consultas[0].cancelar).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("Carregando balanço");
    await act(async () => consultas[1].receber(transacoes(200)));
    expect(JSON.parse(grafico().textContent).series[0].data).toEqual(valoresMensais(200));
});

test("mês sem movimentação exibe zeros e orientação, sem tratar vazio como falha", async () => {
    await act(async () => root.render(<BalancoMensal usuarioId="usuario-a" />));
    await act(async () => consultas[0].receber([]));
    expect(container.textContent).toContain("Não há receitas ou despesas");
    expect(grafico()).not.toBeNull();
    expect(JSON.parse(grafico().textContent).series.every((serie) => serie.data.every((valor) => valor === 0))).toBe(true);
    expect(container.querySelector('[role="alert"]')).toBeNull();
});

test("falha na inicialização da consulta é apresentada na tela", async () => {
    observarTransacoes.mockImplementation(() => { throw new Error("configuração"); });
    await act(async () => root.render(<BalancoMensal usuarioId="usuario-a" />));
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(grafico()).toBeNull();
});

test("falha de cálculo não interrompe a consulta e o gráfico se recupera quando os dados são corrigidos", async () => {
    await act(async () => root.render(<BalancoMensal usuarioId="usuario-a" />));
    await act(async () => consultas[0].receber(transacoes(100)));
    await act(async () => consultas[0].receber(transacoes("inválido")));
    expect(grafico()).toBeNull();
    expect(container.querySelector('[role="alert"]').textContent).toContain("Há lançamentos com data ou valor inválido");
    expect(consultas).toHaveLength(1);
    expect(consultas[0].cancelar).not.toHaveBeenCalled();

    await act(async () => consultas[0].receber(transacoes(200)));
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(JSON.parse(grafico().textContent).series[0].data).toEqual(valoresMensais(200));
    expect(consultas).toHaveLength(1);
});

test("StrictMode e desmontagem cancelam as consultas e ignoram callbacks antigos", async () => {
    await act(async () => root.render(<StrictMode><BalancoMensal usuarioId="usuario-a" /></StrictMode>));
    expect(consultas).toHaveLength(2);
    expect(consultas[0].cancelar).toHaveBeenCalledTimes(1);
    await act(async () => consultas[0].receber(transacoes(999)));
    expect(grafico()).toBeNull();
    await act(async () => root.render(null));
    expect(consultas[1].cancelar).toHaveBeenCalledTimes(1);
    await act(async () => consultas[1].receber(transacoes(100)));
    expect(container.textContent).toBe("");
});
