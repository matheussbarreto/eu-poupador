import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Objetivos from "./Objetivos";
import { observarInvestimentos } from "../services/investimentosService";
import { observarTransacoes } from "../services/transacoesService";

global.IS_REACT_ACT_ENVIRONMENT = true;
jest.mock("../services/investimentosService", () => ({ observarInvestimentos: jest.fn() }));
jest.mock("../services/transacoesService", () => ({ observarTransacoes: jest.fn() }));
jest.mock("react-apexcharts", () => (props) => <div data-testid="grafico">{JSON.stringify({ series: props.series, percentual: props.options.plotOptions.radialBar?.dataLabels.value.formatter(), categorias: props.options.xaxis?.categories })}</div>);
jest.mock("../Componentes/AcumulosAmortizacoesCompromissoGlobal", () => () => null);
jest.mock("../Componentes/AcumulosAmortizacoesPlanejamentoGlobal", () => () => null);
jest.mock("../Componentes/AtualDesesjadoPlanejamentoGlobal", () => () => null);

let container;
let root;
let consultas;
let cadastros;
const investimentos = [{ id: "a", nome: "Reserva", goalHistory: [{ date: "2026-8", goal: 200 }, { date: "2026-9", goal: 100 }] }];
const transacoes = (amount, mes = 9) => [{ inID: "a", date: new Date(2026, mes, 15, 12).toISOString(), amount, outgoingType: "account", incomingType: "investment" }];
const painel = () => container.querySelector('.aportes-pagamentos-planejamento-mensal');
const graficos = () => [...painel().querySelectorAll('[data-testid="grafico"]')].map((elemento) => JSON.parse(elemento.textContent));
const compromisso = () => container.querySelector('.aportes-pagamentos-compromisso-mensal');
const graficoCompromisso = () => compromisso().querySelector('[data-testid="grafico"]');
const comparacao = () => container.querySelector('.realizado-previsto-planejamento-mensal');
const graficoComparacao = () => comparacao().querySelector('[data-testid="grafico"]');

test("comparação mensal compartilha totais e atualizações sem novas consultas ou efeito dos filtros", async () => {
    await act(async () => root.render(<Objetivos usuarioId="usuario-a" />));
    await act(async () => consultas[0].receber(transacoes(150)));
    expect(graficoComparacao()).toBeNull();
    await act(async () => cadastros[0].receber(Array.from({ length: 13 }, (_, indice) => ({ id: indice === 0 ? "a" : String(indice), goal: 100 }))));
    expect(JSON.parse(graficoComparacao().textContent)).toEqual({ series: [{ name: "Realizado", data: [150] }, { name: "Previsto", data: [1300] }], categorias: ["Out/2026"] });
    const resumo = comparacao().textContent;
    await act(async () => painel().querySelector('[aria-label="Próxima página de objetivos"]').click());
    await act(async () => painel().querySelector('input').click());
    expect(comparacao().textContent).toBe(resumo);
    await act(async () => consultas[0].receber(transacoes(200)));
    await act(async () => cadastros[0].receber(investimentos));
    expect(JSON.parse(graficoComparacao().textContent).series.map((serie) => serie.data[0])).toEqual([200, 100]);
    expect(compromisso().querySelector('[aria-label^="Realizado:"]').textContent).toContain("200,00");
    expect(comparacao().querySelector('.diferenca-mensal').textContent).toContain("+100,00%");
    expect(consultas).toHaveLength(1);
    expect(cadastros).toHaveLength(1);
});

test("comparação acompanha mês e conta, reinicia visibilidade e ignora respostas antigas", async () => {
    await act(async () => root.render(<Objetivos usuarioId="usuario-a" />));
    await act(async () => consultas[0].receber(transacoes(100)));
    await act(async () => cadastros[0].receber(investimentos));
    await act(async () => comparacao().querySelector('[aria-label="Exibir Realizado"]').click());
    await act(async () => container.querySelector('[aria-label="Mês anterior"]').click());
    expect(graficoComparacao()).toBeNull();
    await act(async () => consultas[0].receber(transacoes(999)));
    expect(graficoComparacao()).toBeNull();
    await act(async () => consultas[1].receber([]));
    expect(JSON.parse(graficoComparacao().textContent)).toEqual({ series: [{ name: "Realizado", data: [0] }, { name: "Previsto", data: [200] }], categorias: ["Set/2026"] });
    expect(cadastros).toHaveLength(1);
    await act(async () => root.render(<Objetivos usuarioId="usuario-b" />));
    await act(async () => consultas[2].receber([]));
    await act(async () => cadastros[0].receber(investimentos));
    expect(graficoComparacao()).toBeNull();
    await act(async () => cadastros[1].receber([]));
    expect(graficoComparacao()).toBeNull();
    expect(comparacao().textContent).toContain("Não há aportes, pagamentos ou previsões");
});

test("nova tentativa pela comparação recupera somente a consulta com erro", async () => {
    await act(async () => root.render(<Objetivos usuarioId="usuario-a" />));
    await act(async () => consultas[0].receber(transacoes(50)));
    await act(async () => cadastros[0].falhar({ code: "permission-denied" }));
    expect(comparacao().querySelector('[role="alert"]')).not.toBeNull();
    await act(async () => comparacao().querySelector('button').click());
    expect(consultas).toHaveLength(1);
    await act(async () => cadastros[1].receber(investimentos));
    expect(graficoComparacao()).not.toBeNull();
    await act(async () => consultas[0].receber(transacoes("inválido")));
    expect(graficoComparacao()).toBeNull();
    await act(async () => comparacao().querySelector('button').click());
    expect(cadastros).toHaveLength(2);
    await act(async () => consultas[1].receber(transacoes(150)));
    expect(JSON.parse(graficoComparacao().textContent).series[0].data).toEqual([150]);
});

test("compromisso compartilha os totais e atualizações sem depender do filtro ou da paginação", async () => {
    await act(async () => root.render(<Objetivos usuarioId="usuario-a" />));
    await act(async () => consultas[0].receber(transacoes(150)));
    expect(graficoCompromisso()).toBeNull();
    await act(async () => cadastros[0].receber(Array.from({ length: 13 }, (_, indice) => ({ id: indice === 0 ? "a" : String(indice), nome: `Objetivo ${indice}`, goal: 100 }))));
    expect(JSON.parse(graficoCompromisso().textContent).percentual).toBe("11,5%");
    const resumo = compromisso().textContent;
    expect(compromisso().querySelector('[aria-label^="Realizado:"]').textContent).toBe(painel().querySelector('.legenda-serie span:last-child').textContent);
    await act(async () => painel().querySelector('[aria-label="Próxima página de objetivos"]').click());
    expect(compromisso().textContent).toBe(resumo);
    await act(async () => painel().querySelector('input').click());
    expect(compromisso().textContent).toBe(resumo);
    await act(async () => cadastros[0].receber(investimentos));
    expect(JSON.parse(graficoCompromisso().textContent)).toEqual({ series: [100], percentual: "150%" });
    await act(async () => consultas[0].receber(transacoes(50)));
    expect(JSON.parse(graficoCompromisso().textContent).percentual).toBe("50%");
    expect(consultas).toHaveLength(1);
    expect(cadastros).toHaveLength(1);
});

test("compromisso acompanha mês e usuário, ignorando dados e callbacks antigos", async () => {
    await act(async () => root.render(<Objetivos usuarioId="usuario-a" />));
    await act(async () => consultas[0].receber(transacoes(100)));
    await act(async () => cadastros[0].receber(investimentos));
    expect(JSON.parse(graficoCompromisso().textContent).percentual).toBe("100%");
    await act(async () => container.querySelector('[aria-label="Mês anterior"]').click());
    expect(graficoCompromisso()).toBeNull();
    await act(async () => consultas[0].receber(transacoes(999)));
    expect(graficoCompromisso()).toBeNull();
    await act(async () => consultas[1].receber(transacoes(100, 8)));
    expect(JSON.parse(graficoCompromisso().textContent).percentual).toBe("50%");
    expect(cadastros).toHaveLength(1);
    await act(async () => root.render(<Objetivos usuarioId="usuario-b" />));
    await act(async () => consultas[2].receber([]));
    await act(async () => cadastros[0].receber(investimentos));
    expect(graficoCompromisso()).toBeNull();
    await act(async () => cadastros[1].receber([]));
    expect(graficoCompromisso()).toBeNull();
    expect(compromisso().textContent).toContain("Não há aportes, pagamentos ou previsões");
});

test("nova tentativa pelo compromisso recupera apenas a fonte com erro", async () => {
    await act(async () => root.render(<Objetivos usuarioId="usuario-a" />));
    await act(async () => consultas[0].receber(transacoes(50)));
    await act(async () => cadastros[0].receber([{ id: "a", goal: -1 }]));
    expect(compromisso().querySelector('[role="alert"]').textContent).toContain("previsões");
    await act(async () => compromisso().querySelector('button').click());
    expect(consultas).toHaveLength(1);
    await act(async () => cadastros[1].receber(investimentos));
    expect(graficoCompromisso()).not.toBeNull();
    await act(async () => consultas[0].falhar({ code: "unavailable" }));
    expect(graficoCompromisso()).toBeNull();
    await act(async () => compromisso().querySelector('button').click());
    expect(cadastros).toHaveLength(2);
    await act(async () => consultas[1].receber(transacoes(200)));
    expect(JSON.parse(graficoCompromisso().textContent).percentual).toBe("200%");
});

beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 27, 12));
    consultas = [];
    cadastros = [];
    observarInvestimentos.mockImplementation((usuarioId, receber, falhar) => {
        const cancelar = jest.fn();
        cadastros.push({ usuarioId, receber, falhar, cancelar });
        return cancelar;
    });
    observarTransacoes.mockImplementation((usuarioId, periodo, receber, falhar) => {
        const cancelar = jest.fn();
        consultas.push({ usuarioId, periodo, receber, falhar, cancelar });
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

test("aguarda as duas fontes, compartilha atualizações e refaz somente a consulta mensal ao mudar o período", async () => {
    await act(async () => root.render(<Objetivos usuarioId="usuario-a" />));
    expect(painel().textContent).toContain("Carregando");
    expect(consultas[0]).toMatchObject({ usuarioId: "usuario-a", periodo: { inicio: new Date(2026, 9, 1), fim: new Date(2026, 10, 1) } });
    await act(async () => consultas[0].receber(transacoes(50)));
    expect(graficos()).toHaveLength(0);
    await act(async () => cadastros[0].receber(investimentos));
    expect(graficos()).toEqual([{ series: [50], percentual: "50%" }]);
    await act(async () => consultas[0].receber(transacoes(75)));
    expect(graficos()[0].percentual).toBe("75%");
    await act(async () => cadastros[0].receber([{ id: "a", nome: "Reserva atualizada", goal: 150 }]));
    expect(graficos()[0].percentual).toBe("50%");
    expect(painel().textContent).toContain("Reserva atualizada");
    expect(consultas).toHaveLength(1);
    expect(cadastros).toHaveLength(1);
    await act(async () => cadastros[0].receber(investimentos));
    await act(async () => container.querySelector('[aria-label="Mês anterior"]').click());
    expect(graficos()).toHaveLength(0);
    expect(consultas[0].cancelar).toHaveBeenCalledTimes(1);
    await act(async () => consultas[0].receber(transacoes(999)));
    expect(graficos()).toHaveLength(0);
    await act(async () => consultas[1].receber(transacoes(100, 8)));
    expect(graficos()[0].percentual).toBe("50%");
    expect(consultas[1].periodo).toEqual({ inicio: new Date(2026, 8, 1), fim: new Date(2026, 9, 1) });
    expect(cadastros).toHaveLength(1);
});

test("troca de conta esconde dados e filtros anteriores e ignora respostas antigas", async () => {
    await act(async () => root.render(<Objetivos usuarioId="usuario-a" />));
    await act(async () => consultas[0].receber(transacoes(50)));
    await act(async () => cadastros[0].receber(investimentos));
    await act(async () => painel().querySelector('input').click());
    await act(async () => root.render(<Objetivos usuarioId="usuario-b" />));
    expect(graficos()).toHaveLength(0);
    expect(painel().textContent).not.toContain("Reserva");
    expect(consultas[0].cancelar).toHaveBeenCalledTimes(1);
    expect(cadastros[0].cancelar).toHaveBeenCalledTimes(1);
    await act(async () => consultas[0].receber(transacoes(999)));
    await act(async () => cadastros[0].falhar({ code: "permission-denied" }));
    await act(async () => consultas[1].receber([]));
    expect(graficos()).toHaveLength(0);
    expect(painel().querySelector('[role="alert"]')).toBeNull();
    await act(async () => cadastros[1].receber([{ id: "b", nome: "Outro objetivo", goal: 50 }]));
    expect(painel().textContent).toContain("Outro objetivo");
    expect(graficos()[0].percentual).toBe("0%");
    expect(painel().querySelector('input').checked).toBe(false);
    await act(async () => cadastros[1].receber([]));
    expect(painel().textContent).toContain("Não há aportes, pagamentos ou previsões");
});

test("falhas de rede permitem repetir apenas a fonte que falhou", async () => {
    await act(async () => root.render(<Objetivos usuarioId="usuario-a" />));
    await act(async () => consultas[0].receber(transacoes(50)));
    await act(async () => cadastros[0].falhar({ code: "permission-denied" }));
    expect(painel().querySelector('[role="alert"]').textContent).toContain("assinatura");
    await act(async () => painel().querySelector('button').click());
    expect(consultas).toHaveLength(1);
    expect(cadastros[0].cancelar).toHaveBeenCalledTimes(1);
    await act(async () => cadastros[1].receber(investimentos));
    expect(graficos()[0].percentual).toBe("50%");
    await act(async () => consultas[0].falhar({ code: "unavailable" }));
    expect(graficos()).toHaveLength(0);
    await act(async () => painel().querySelector('button').click());
    expect(cadastros).toHaveLength(2);
    await act(async () => consultas[1].receber(transacoes(150)));
    expect(graficos()[0].percentual).toBe("150%");
});

test("previsões e lançamentos inválidos permitem recuperar a fonte correta", async () => {
    await act(async () => root.render(<Objetivos usuarioId="usuario-a" />));
    await act(async () => consultas[0].receber(transacoes(50)));
    await act(async () => cadastros[0].receber([{ id: "a", goal: -1 }]));
    expect(painel().querySelector('[role="alert"]').textContent).toContain("previsões de objetivos");
    await act(async () => painel().querySelector('button').click());
    expect(consultas).toHaveLength(1);
    await act(async () => cadastros[1].receber(investimentos));
    await act(async () => consultas[0].receber(transacoes("inválido")));
    expect(painel().querySelector('[role="alert"]').textContent).toContain("aportes ou pagamentos");
    await act(async () => painel().querySelector('button').click());
    expect(cadastros).toHaveLength(2);
    await act(async () => consultas[1].receber(transacoes(50)));
    expect(graficos()[0].percentual).toBe("50%");
    // Um erro de cálculo também pode se resolver por atualização da consulta existente.
    await act(async () => cadastros[1].receber([{ id: "a", goal: -1 }]));
    await act(async () => cadastros[1].receber(investimentos));
    expect(graficos()[0].percentual).toBe("50%");
});

test("erros ao iniciar as consultas são exibidos e podem ser recuperados", async () => {
    observarInvestimentos.mockImplementationOnce(() => { throw { code: "permission-denied" }; });
    observarTransacoes.mockImplementationOnce(() => { throw { code: "unavailable" }; });
    await act(async () => root.render(<Objetivos usuarioId="usuario-a" />));
    expect(painel().querySelector('[role="alert"]')).not.toBeNull();
    await act(async () => painel().querySelector('button').click());
    await act(async () => consultas[0].receber(transacoes(50)));
    await act(async () => cadastros[0].receber(investimentos));
    expect(graficos()[0].percentual).toBe("50%");
});

test("StrictMode encerra as consultas antigas e desmontagem cancela as duas fontes", async () => {
    await act(async () => root.render(<StrictMode><Objetivos usuarioId="usuario-a" /></StrictMode>));
    expect(consultas).toHaveLength(2);
    expect(cadastros).toHaveLength(2);
    expect(consultas[0].cancelar).toHaveBeenCalledTimes(1);
    expect(cadastros[0].cancelar).toHaveBeenCalledTimes(1);
    await act(async () => consultas[0].receber(transacoes(999)));
    await act(async () => cadastros[0].receber(investimentos));
    expect(graficos()).toHaveLength(0);
    await act(async () => root.render(null));
    expect(consultas[1].cancelar).toHaveBeenCalledTimes(1);
    expect(cadastros[1].cancelar).toHaveBeenCalledTimes(1);
});
