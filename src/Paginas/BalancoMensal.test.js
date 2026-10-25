import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import BalancoMensal from "./BalancoMensal";
import { observarTransacoes } from "../services/transacoesService";
import { observarPrevisoes } from "../services/previsoesService";

global.IS_REACT_ACT_ENVIRONMENT = true;
jest.mock("../services/transacoesService", () => ({
    observarTransacoes: jest.fn(),
}));
jest.mock("react-apexcharts", () => (props) => <div data-testid="grafico">{JSON.stringify({ series: props.series, categorias: props.options.xaxis.categories })}</div>);
jest.mock("../services/previsoesService", () => ({ observarPrevisoes: jest.fn() }));
jest.mock("../Componentes/DespesasGastoPrevistoCategoria", () => () => null);
jest.mock("../Componentes/DespesasGastoPrevisto", () => () => null);
jest.mock("../Componentes/DespesasPorCategoria", () => () => null);
jest.mock("../Componentes/DespesasPorTipo", () => () => null);
jest.mock("../Componentes/DespesasPorUtilidade", () => () => null);
jest.mock("../Componentes/DespesasPorTipoGastoPrevisto", () => () => null);

let container;
let root;
let consultas;
let consultasPrevisoes;
const transacoes = (valor, mes = 9) => [
    { id: "receita-1", date: new Date(2026, mes, 15, 12).toISOString(), amount: valor, outgoingType: "income", incomingType: "account", outID: "a", out: "Salário" },
    { id: "despesa-1", date: new Date(2026, mes, 15, 12).toISOString(), amount: 30, outgoingType: "account", incomingType: "expense" },
];
const valoresMensais = (valor) => [...Array(11).fill(0), valor];
const grafico = () => container.querySelector('[data-testid="grafico"]');
const comparacao = () => container.querySelector('.saldo-acumulado-previsto');
const graficoComparacao = () => comparacao().querySelector('[data-testid="grafico"]');
const previsoes = (valor) => ({ receitas: [{ id: "a", nome: "Salário", expected: valor }], despesas: [{ expected: 20 }] });
const fontes = () => container.querySelector('.receitas-recebido-previsto-categoria');
const graficoFontes = () => fontes().querySelector('[data-testid="grafico"]');
const resumoReceitas = () => container.querySelector('.receitas-recebido-previsto');
const graficoResumo = () => resumoReceitas().querySelector('[data-testid="grafico"]');

test("resumo compartilha totais, atualizações e mês com receitas por fonte", async () => {
    await act(async () => root.render(<BalancoMensal usuarioId="usuario-a" />));
    await act(async () => consultas[0].receber(transacoes(900)));
    expect(graficoResumo()).toBeNull();
    await act(async () => consultasPrevisoes[0].receber(previsoes(1000)));
    expect(JSON.parse(graficoResumo().textContent)).toEqual({
        series: [{ name: "Recebido", data: [900] }, { name: "Previsto", data: [1000] }], categorias: ["Out/2026"],
    });
    expect(resumoReceitas().textContent).toContain("-10,00%");
    await act(async () => consultas[0].receber([...transacoes(1000), { ...transacoes(100)[0], outID: "removida" }]));
    await act(async () => consultasPrevisoes[0].receber(previsoes(1200)));
    const itens = JSON.parse(graficoFontes().textContent).series[0].data;
    expect(JSON.parse(graficoResumo().textContent).series.map(serie => serie.data[0])).toEqual([
        itens.reduce((total, item) => total + item.y, 0), itens.reduce((total, item) => total + item.goals[0].value, 0),
    ]);
    expect(consultas).toHaveLength(1);
    expect(consultasPrevisoes).toHaveLength(1);
    await act(async () => container.querySelector('[aria-label="Mês anterior"]').click());
    expect(graficoResumo()).toBeNull();
    await act(async () => consultas[0].receber(transacoes(999)));
    expect(graficoResumo()).toBeNull();
    await act(async () => consultas[1].receber(transacoes(50, 8)));
    expect(JSON.parse(graficoResumo().textContent).categorias).toEqual(["Set/2026"]);
    expect(JSON.parse(graficoResumo().textContent).series[0].data).toEqual([50]);
    await act(async () => root.render(<BalancoMensal usuarioId="usuario-b" />));
    await act(async () => consultas[2].receber([]));
    await act(async () => consultasPrevisoes[0].receber(previsoes(999)));
    expect(graficoResumo()).toBeNull();
    await act(async () => consultasPrevisoes[1].receber({ receitas: [], despesas: [] }));
    expect(resumoReceitas().querySelector('[role="status"]').textContent).toContain("Não há receitas");
    expect(JSON.parse(graficoResumo().textContent).series.map(serie => serie.data[0])).toEqual([0, 0]);
});

test("resumo repete apenas a consulta com falha e recupera os dois gráficos de receitas", async () => {
    await act(async () => root.render(<BalancoMensal usuarioId="usuario-a" />));
    await act(async () => consultas[0].receber(transacoes(900)));
    await act(async () => consultasPrevisoes[0].falhar({ code: "permission-denied" }));
    expect(graficoResumo()).toBeNull();
    expect(resumoReceitas().querySelector('[role="alert"]')).not.toBeNull();
    await act(async () => resumoReceitas().querySelector('button').click());
    expect(consultas).toHaveLength(1);
    await act(async () => consultasPrevisoes[1].receber(previsoes(1000)));
    expect(graficoResumo()).not.toBeNull();
    expect(graficoFontes()).not.toBeNull();
    await act(async () => consultas[0].falhar({ code: "unavailable" }));
    expect(graficoResumo()).toBeNull();
    await act(async () => resumoReceitas().querySelector('button').click());
    expect(consultasPrevisoes).toHaveLength(2);
    await act(async () => consultas[1].receber(transacoes(1200)));
    expect(resumoReceitas().textContent).toContain("+20,00%");
    expect(graficoFontes()).not.toBeNull();
});

beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers("modern");
    jest.setSystemTime(new Date(2026, 9, 16, 12));
    consultas = [];
    consultasPrevisoes = [];
    observarPrevisoes.mockImplementation((usuarioId, receber, falhar) => {
        const cancelar = jest.fn();
        consultasPrevisoes.push({ usuarioId, receber, falhar, cancelar });
        return cancelar;
    });
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
    expect(consultasPrevisoes).toHaveLength(2);
    expect(consultasPrevisoes[0].cancelar).toHaveBeenCalledTimes(1);
    await act(async () => consultas[0].receber(transacoes(999)));
    expect(grafico()).toBeNull();
    await act(async () => root.render(null));
    expect(consultas[1].cancelar).toHaveBeenCalledTimes(1);
    expect(consultasPrevisoes[1].cancelar).toHaveBeenCalledTimes(1);
    await act(async () => consultas[1].receber(transacoes(100)));
    expect(container.textContent).toBe("");
});

test("os dois gráficos compartilham transações e recebem atualizações independentes das previsões", async () => {
    await act(async () => root.render(<BalancoMensal usuarioId="usuario-a" />));
    await act(async () => consultas[0].receber(transacoes(100)));
    expect(grafico()).not.toBeNull();
    expect(graficoComparacao()).toBeNull();
    await act(async () => consultasPrevisoes[0].receber(previsoes(100)));
    expect(JSON.parse(graficoComparacao().textContent).series).toEqual([
        { name: "Acumulado", data: [70] }, { name: "Previsto", data: [80] },
    ]);
    expect(comparacao().textContent).toContain("-12,50%");
    await act(async () => consultasPrevisoes[0].receber(previsoes(120)));
    await act(async () => consultas[0].receber(transacoes(200)));
    expect(JSON.parse(graficoComparacao().textContent).series).toEqual([
        { name: "Acumulado", data: [170] }, { name: "Previsto", data: [100] },
    ]);
    expect(consultas).toHaveLength(1);
    expect(consultasPrevisoes).toHaveLength(1);
});

test("troca de mês lê o histórico do aplicativo sem herdar previsões ou reabrir a consulta", async () => {
    await act(async () => root.render(<BalancoMensal usuarioId="usuario-a" />));
    await act(async () => consultasPrevisoes[0].receber({ receitas: [{ id: "a", nome: "Salário", expectedHistory: [
        { date: "2026-8", goal: 50 }, { date: "2026-9", goal: 100 },
    ] }], despesas: [] }));
    await act(async () => consultas[0].receber(transacoes(100)));
    expect(JSON.parse(graficoComparacao().textContent)).toEqual({
        series: [{ name: "Acumulado", data: [70] }, { name: "Previsto", data: [100] }], categorias: ["Out/2026"],
    });
    expect(JSON.parse(graficoFontes().textContent).series[0].data[0]).toMatchObject({ x: "Salário", y: 100, goals: [{ value: 100 }] });
    await act(async () => container.querySelector('[aria-label="Mês anterior"]').click());
    expect(graficoComparacao()).toBeNull();
    await act(async () => consultas[1].receber(transacoes(50, 8)));
    expect(JSON.parse(graficoComparacao().textContent)).toEqual({
        series: [{ name: "Acumulado", data: [20] }, { name: "Previsto", data: [50] }], categorias: ["Set/2026"],
    });
    expect(JSON.parse(graficoFontes().textContent).series[0].data[0]).toMatchObject({ y: 50, goals: [{ value: 50 }] });
    await act(async () => jest.advanceTimersByTime(200));
    await act(async () => container.querySelector('[aria-label="Mês anterior"]').click());
    await act(async () => consultas[2].receber(transacoes(40, 7)));
    expect(JSON.parse(graficoComparacao().textContent)).toEqual({
        series: [{ name: "Acumulado", data: [10] }, { name: "Previsto", data: [0] }], categorias: ["Ago/2026"],
    });
    expect(JSON.parse(graficoFontes().textContent).series[0].data[0]).toMatchObject({ y: 40, goals: [{ value: 0 }] });
    expect(consultasPrevisoes).toHaveLength(1);
    expect(consultasPrevisoes[0].cancelar).not.toHaveBeenCalled();
});

test("falha das previsões mantém o primeiro gráfico e repete apenas a consulta necessária", async () => {
    await act(async () => root.render(<BalancoMensal usuarioId="usuario-a" />));
    await act(async () => consultas[0].receber(transacoes(100)));
    await act(async () => consultasPrevisoes[0].falhar({ code: "permission-denied" }));
    expect(grafico()).not.toBeNull();
    expect(graficoComparacao()).toBeNull();
    expect(comparacao().textContent).toContain("acessar suas previsões");
    await act(async () => comparacao().querySelector('button').click());
    expect(consultasPrevisoes[0].cancelar).toHaveBeenCalledTimes(1);
    await act(async () => consultasPrevisoes[0].receber(previsoes(999)));
    expect(graficoComparacao()).toBeNull();
    await act(async () => consultasPrevisoes[1].receber(previsoes(100)));
    expect(graficoComparacao()).not.toBeNull();
    expect(consultas).toHaveLength(1);
});

test("previsão inválida afeta somente a comparação e se recupera na próxima atualização", async () => {
    await act(async () => root.render(<BalancoMensal usuarioId="usuario-a" />));
    await act(async () => consultas[0].receber(transacoes(100)));
    await act(async () => consultasPrevisoes[0].receber(previsoes("inválido")));
    expect(grafico()).not.toBeNull();
    expect(comparacao().textContent).toContain("Há previsões com data ou valor inválido");
    await act(async () => consultasPrevisoes[0].receber(previsoes(100)));
    expect(comparacao().querySelector('[role="alert"]')).toBeNull();
    expect(graficoComparacao()).not.toBeNull();
    expect(consultasPrevisoes).toHaveLength(1);
});

test("troca de usuário não mistura transações novas com previsões da conta anterior", async () => {
    await act(async () => root.render(<BalancoMensal usuarioId="usuario-a" />));
    await act(async () => consultas[0].receber(transacoes(100)));
    await act(async () => consultasPrevisoes[0].receber(previsoes(100)));
    await act(async () => root.render(<BalancoMensal usuarioId="usuario-b" />));
    expect(consultasPrevisoes[0].cancelar).toHaveBeenCalledTimes(1);
    expect(consultasPrevisoes[1].usuarioId).toBe("usuario-b");
    await act(async () => consultas[1].receber(transacoes(200)));
    await act(async () => consultasPrevisoes[0].receber(previsoes(999)));
    expect(graficoComparacao()).toBeNull();
    expect(graficoFontes()).toBeNull();
    await act(async () => consultasPrevisoes[1].receber({ receitas: [], despesas: [] }));
    expect(JSON.parse(graficoComparacao().textContent).series[1].data).toEqual([0]);
    expect(JSON.parse(graficoFontes().textContent).series[0].data[0]).toMatchObject({ y: 200, goals: [{ value: 0 }] });
});

test("nova tentativa pela comparação recupera a consulta compartilhada de transações", async () => {
    await act(async () => root.render(<BalancoMensal usuarioId="usuario-a" />));
    await act(async () => consultasPrevisoes[0].receber(previsoes(100)));
    await act(async () => consultas[0].falhar({ code: "unavailable" }));
    await act(async () => comparacao().querySelector('button').click());
    await act(async () => consultas[1].receber(transacoes(100)));
    expect(grafico()).not.toBeNull();
    expect(graficoComparacao()).not.toBeNull();
    expect(consultasPrevisoes).toHaveLength(1);
});

test("fontes usam os mesmos dados dos outros gráficos e atualizam sem consultas adicionais", async () => {
    await act(async () => root.render(<BalancoMensal usuarioId="usuario-a" />));
    await act(async () => consultas[0].receber(transacoes(150)));
    expect(graficoFontes()).toBeNull();
    await act(async () => consultasPrevisoes[0].receber(previsoes(200)));
    expect(JSON.parse(graficoFontes().textContent).series[0].data).toEqual([
        expect.objectContaining({ x: "Salário", y: 150, goals: [expect.objectContaining({ value: 200 })] }),
    ]);
    await act(async () => consultas[0].receber([...transacoes(200), { ...transacoes(50)[0], id: "sem-cadastro", outID: "antiga", out: "Extra" }]));
    const recebido = JSON.parse(graficoFontes().textContent).series[0].data.reduce((total, item) => total + item.y, 0);
    expect(recebido).toBe(JSON.parse(grafico().textContent).series[0].data[11]);
    expect(recebido).toBe(250);
    expect(consultas).toHaveLength(1);
    expect(consultasPrevisoes).toHaveLength(1);
});

test("erro no cálculo das despesas previstas não bloqueia o gráfico de fontes de receita", async () => {
    await act(async () => root.render(<BalancoMensal usuarioId="usuario-a" />));
    await act(async () => consultas[0].receber(transacoes(100)));
    await act(async () => consultasPrevisoes[0].receber({ ...previsoes(200), despesas: [{ expected: "inválido" }] }));
    expect(comparacao().querySelector('[role="alert"]')).not.toBeNull();
    expect(fontes().querySelector('[role="alert"]')).toBeNull();
    expect(JSON.parse(graficoFontes().textContent).series[0].data[0]).toMatchObject({ y: 100, goals: [{ value: 200 }] });
});

test("nova tentativa pelas fontes recupera previsões sem repetir a consulta de transações", async () => {
    await act(async () => root.render(<BalancoMensal usuarioId="usuario-a" />));
    await act(async () => consultas[0].receber(transacoes(100)));
    await act(async () => consultasPrevisoes[0].receber(previsoes("inválido")));
    expect(fontes().querySelector('[role="alert"]')).not.toBeNull();
    expect(grafico()).not.toBeNull();
    await act(async () => fontes().querySelector('button').click());
    await act(async () => consultasPrevisoes[0].receber(previsoes(999)));
    expect(graficoFontes()).toBeNull();
    await act(async () => consultasPrevisoes[1].receber(previsoes(200)));
    expect(graficoFontes()).not.toBeNull();
    expect(consultas).toHaveLength(1);
    expect(consultasPrevisoes).toHaveLength(2);
});

test("nova tentativa pelas fontes recupera falha da consulta compartilhada de transações", async () => {
    await act(async () => root.render(<BalancoMensal usuarioId="usuario-a" />));
    await act(async () => consultasPrevisoes[0].receber(previsoes(200)));
    await act(async () => consultas[0].falhar({ code: "unavailable" }));
    expect(fontes().querySelector('[role="alert"]')).not.toBeNull();
    await act(async () => fontes().querySelector('button').click());
    await act(async () => consultas[1].receber(transacoes(100)));
    expect(graficoFontes()).not.toBeNull();
    expect(consultasPrevisoes).toHaveLength(1);
});
