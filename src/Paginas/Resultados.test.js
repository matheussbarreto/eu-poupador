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
jest.mock("react-apexcharts", () => (props) => <div data-testid="grafico">{JSON.stringify({ series: props.series, categorias: props.options.xaxis?.categories, labels: props.options.labels, cores: props.options.colors })}</div>);
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
    expect(container.querySelector('.resultado-passivos [role="alert"]').textContent).toContain('acesso');
    expect(container.querySelector('.resultado-passivos .legenda-categorias')).toBeNull();
    expect(container.querySelector('.resultado-ativo-passivo [role="alert"]').textContent).toContain('acesso');
    expect(container.querySelector('.resultado-ativo-passivo .legenda-categorias')).toBeNull();
    expect(container.querySelector('.saldo-investimentos [role="alert"]').textContent).toContain('acesso');
    expect(container.querySelector('.saldo-investimentos .legenda')).toBeNull();
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
    expect(container.querySelector('.resultado-passivos [role="alert"]').textContent).toContain('valor inválido');
    expect(container.querySelector('.resultado-ativo-passivo [role="alert"]').textContent).toContain('valor inválido');
    expect(container.querySelector('.saldo-investimentos [role="alert"]').textContent).toContain('valor inválido');
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

test('ativos compartilham as fontes, classificação, mês, recuperação e isolamento entre usuários', async () => {
    const ativos = () => container.querySelector('.resultado-ativos');
    const dadosAtivos = () => JSON.parse(ativos().querySelector('[data-testid="grafico"]').textContent);
    await act(async () => root.render(<Resultados usuarioId="a" />));
    expect(ativos().textContent).toContain('Carregando ativos');
    await receber();
    expect(dadosAtivos()).toMatchObject({ series: [100], labels: ['Outros'] });
    await act(async () => fontes.contas[0].receber([{ id: 'c', type: 'Banco', balance: 0 }]));
    expect(dadosAtivos()).toMatchObject({ series: [100], labels: ['Banco'], cores: ['#717171'] });
    await act(async () => fontes.transacoes[0].receber(transacoes(200)));
    expect(dadosAtivos().series[0]).toBe(valores()[0]);
    await act(async () => container.querySelector('[aria-label="Mês anterior"]').click());
    expect(ativos().textContent).toContain('Não há saldos positivos');
    expect(ativos().querySelector('[data-testid="grafico"]')).toBeNull();
    Object.values(fontes).forEach(lista => expect(lista).toHaveLength(1));
    await act(async () => fontes.contas[0].falhar({ code: 'unavailable' }));
    expect(ativos().querySelector('[role="alert"]')).not.toBeNull();
    await act(async () => ativos().querySelector('button').click());
    await receber(1);
    Object.values(fontes).forEach(lista => expect(lista).toHaveLength(2));
    await act(async () => root.render(<Resultados usuarioId="b" />));
    expect(ativos().textContent).toContain('Carregando ativos');
    await act(async () => fontes.transacoes[1].receber(transacoes(999)));
    expect(ativos().querySelector('[data-testid="grafico"]')).toBeNull();
});

test('passivos compartilham consultas, atualizações, classificação, recuperação e isolamento entre usuários', async () => {
    const passivos = () => container.querySelector('.resultado-passivos');
    const dadosPassivos = () => JSON.parse(passivos().querySelector('[data-testid="grafico"]').textContent);
    const origem = { date: new Date(2026, 9, 1).toISOString(), amount: -100, outgoingType: 'create', incomingType: 'account', inID: 'c' };
    await act(async () => root.render(<Resultados usuarioId="a" />));
    await act(async () => fontes.transacoes[0].receber([origem]));
    expect(passivos().textContent).toContain('Carregando passivos');
    expect(passivos().querySelector('[data-testid="grafico"]')).toBeNull();
    await act(async () => {
        fontes.contas[0].receber([{ id: 'c', type: 'Cartão', balance: 0 }]);
        fontes.investimentos[0].receber([]);
    });
    expect(dadosPassivos()).toMatchObject({ series: [100], labels: ['Cartões de Crédito'], cores: ['#FF0000'] });
    expect(passivos().textContent).toContain('100,00%');
    await act(async () => fontes.transacoes[0].receber([origem, ...transacoes(40)]));
    expect(dadosPassivos().series[0]).toBe(60);
    expect(dadosPassivos().series[0]).toBe(valores()[1]);
    await act(async () => fontes.contas[0].receber([{ id: 'c', type: 'Banco', balance: 0 }]));
    expect(dadosPassivos()).toMatchObject({ series: [60], labels: ['Outros'], cores: ['#B0B0B0'] });
    await act(async () => container.querySelector('[aria-label="Mês anterior"]').click());
    expect(passivos().textContent).toContain('Não há saldos negativos');
    expect(passivos().querySelector('[data-testid="grafico"]')).toBeNull();
    expect(passivos().textContent).toMatch(/Total: R\$\s*0,00/);
    await act(async () => jest.advanceTimersByTime(250));
    await act(async () => container.querySelector('[aria-label="Próximo mês"]').click());
    expect(dadosPassivos().series).toEqual([60]);
    Object.values(fontes).forEach(lista => expect(lista).toHaveLength(1));
    await act(async () => fontes.contas[0].falhar({ code: 'unavailable' }));
    expect(passivos().querySelector('.legenda-categorias')).toBeNull();
    await act(async () => passivos().querySelector('button').click());
    await receber(1);
    expect(passivos().textContent).toContain('Não há saldos negativos');
    Object.values(fontes).forEach(lista => expect(lista).toHaveLength(2));
    await act(async () => fontes.transacoes[1].receber([origem]));
    expect(dadosPassivos().series).toEqual([100]);
    await act(async () => root.render(<Resultados usuarioId="b" />));
    await act(async () => {
        fontes.transacoes[1].receber([{ ...origem, amount: -999 }]);
        fontes.contas[1].falhar({ code: 'unavailable' });
    });
    expect(passivos().textContent).toContain('Carregando passivos');
    expect(passivos().querySelector('[role="alert"]')).toBeNull();
    expect(passivos().querySelector('[data-testid="grafico"]')).toBeNull();
    await receber(2);
    expect(passivos().textContent).toContain('Não há saldos negativos');
});

test('comparação patrimonial compartilha os totais, mantém cores com uma única fatia e acompanha mês, recuperação e usuário', async () => {
    const resumo = () => container.querySelector('.resultado-ativo-passivo');
    const dadosResumo = () => JSON.parse(resumo().querySelector('[data-testid="grafico"]').textContent);
    const origens = [
        { date: new Date(2026, 9, 1).toISOString(), amount: 100, outgoingType: 'create', incomingType: 'account', inID: 'c' },
        { date: new Date(2026, 9, 1).toISOString(), amount: -300, outgoingType: 'create', incomingType: 'investment', inID: 'd' },
    ];
    await act(async () => root.render(<Resultados usuarioId="a" />));
    await act(async () => fontes.transacoes[0].receber(origens));
    expect(resumo().querySelector('[data-testid="grafico"]')).toBeNull();
    expect(resumo().textContent).toContain('Carregando patrimônio');
    await act(async () => {
        fontes.contas[0].receber([{ id: 'c', balance: 0, type: 'Banco' }]);
        fontes.investimentos[0].receber([{ id: 'd', current: 0, objective: 'Dívida' }]);
    });
    expect(dadosResumo()).toMatchObject({ series: [100, 300], labels: ['Ativos', 'Passivos'], cores: ['var(--primary-color)', '#FF0000'] });
    expect(resumo().textContent).toContain('25,00%');
    expect(resumo().textContent).toContain('75,00%');
    expect(dadosResumo().series).toEqual(valores().slice(0, 2));
    for (const [classe, valor] of [['resultado-ativos', 100], ['resultado-passivos', 300]]) {
        expect(JSON.parse(container.querySelector('.' + classe + ' [data-testid="grafico"]').textContent).series).toEqual([valor]);
    }
    await act(async () => fontes.transacoes[0].receber([...origens, ...transacoes(100)]));
    expect(dadosResumo().series).toEqual([200, 300]);
    expect(resumo().textContent).toContain('40,00%');
    await act(async () => container.querySelector('[aria-label="Mês anterior"]').click());
    expect(resumo().textContent).toContain('Não há saldos no mês selecionado');
    expect(resumo().textContent).toMatch(/Ativos \+ Passivos: R\$\s*0,00/);
    expect(resumo().querySelector('[data-testid="grafico"]')).toBeNull();
    await act(async () => jest.advanceTimersByTime(250));
    await act(async () => container.querySelector('[aria-label="Próximo mês"]').click());
    expect(dadosResumo().series).toEqual([200, 300]);
    Object.values(fontes).forEach(lista => expect(lista).toHaveLength(1));
    await act(async () => fontes.transacoes[0].receber([origens[1]]));
    expect(dadosResumo()).toMatchObject({ series: [300], labels: ['Passivos'], cores: ['#FF0000'] });
    expect(resumo().querySelectorAll('.legenda-categorias li')).toHaveLength(2);
    expect(resumo().querySelector('.legenda-categorias li').textContent).toMatch(/Ativos.*R\$\s*0,00.*0,00%/);
    await act(async () => fontes.transacoes[0].receber([origens[0]]));
    expect(dadosResumo()).toMatchObject({ series: [100], labels: ['Ativos'], cores: ['var(--primary-color)'] });
    await act(async () => fontes.contas[0].falhar({ code: 'unavailable' }));
    await act(async () => resumo().querySelector('button').click());
    await receber(1);
    expect(dadosResumo().series).toEqual([100]);
    Object.values(fontes).forEach(lista => expect(lista).toHaveLength(2));
    await act(async () => root.render(<Resultados usuarioId="b" />));
    await act(async () => {
        fontes.transacoes[1].receber(origens);
        fontes.contas[1].falhar({ code: 'unavailable' });
    });
    expect(resumo().querySelector('[data-testid="grafico"]')).toBeNull();
    expect(resumo().querySelector('.legenda-categorias')).toBeNull();
    expect(resumo().querySelector('[role="alert"]')).toBeNull();
    await receber(2);
    expect(dadosResumo().series).toEqual([100]);
});

test('saldo dos investimentos compartilha histórico, classificação e recuperação, com controles isolados por mês e usuário', async () => {
    const saldo = () => container.querySelector('.saldo-investimentos');
    const dadosSaldo = () => JSON.parse(saldo().querySelector('[data-testid="grafico"]').textContent);
    const registros = [
        { date: new Date(2026, 8, 1).toISOString(), amount: 100, outgoingType: 'create', incomingType: 'account', inID: 'c' },
        { date: new Date(2026, 8, 1).toISOString(), amount: 200, outgoingType: 'create', incomingType: 'investment', inID: 'i' },
        { date: new Date(2026, 9, 1).toISOString(), amount: 50, outgoingType: 'account', incomingType: 'investment', outID: 'c', inID: 'i' },
    ];
    await act(async () => root.render(<Resultados usuarioId="a" />));
    await act(async () => fontes.transacoes[0].receber(registros));
    expect(saldo().textContent).toContain('Carregando investimentos');
    expect(saldo().querySelector('[data-testid="grafico"]')).toBeNull();
    await act(async () => {
        fontes.contas[0].receber([{ id: 'c', balance: 0 }]);
        fontes.investimentos[0].receber([{ id: 'i', current: 0, objective: 'Investimento' }]);
    });
    expect(dadosSaldo().series[0].data.slice(-2)).toEqual([200, 250]);
    expect(dadosSaldo().categorias).toHaveLength(12);
    expect(saldo().querySelector('.diferenca-investimentos').textContent).toContain('+25,00%');
    await act(async () => fontes.transacoes[0].receber([...registros, { ...registros[2], amount: 20, outgoingType: 'investment', incomingType: 'account', outID: 'i', inID: 'c' }]));
    expect(dadosSaldo().series[0].data.slice(-2)).toEqual([200, 230]);
    expect(saldo().textContent).toContain('+15,00%');
    const legenda = saldo().querySelector('.legenda').textContent;
    await act(async () => saldo().querySelector('input').click());
    expect(saldo().querySelector('[data-testid="grafico"]')).toBeNull();
    expect(saldo().querySelector('.legenda').textContent).toBe(legenda);
    await act(async () => container.querySelector('[aria-label="Mês anterior"]').click());
    expect(saldo().querySelector('input').checked).toBe(true);
    expect(dadosSaldo().series[0].data.slice(-2)).toEqual([0, 200]);
    expect(saldo().querySelector('.diferenca-investimentos').textContent).toContain('(—)');
    Object.values(fontes).forEach(lista => expect(lista).toHaveLength(1));
    await act(async () => fontes.investimentos[0].receber([{ id: 'i', current: 0, objective: 'Bem' }]));
    expect(dadosSaldo().series[0].data).toEqual(Array(12).fill(0));
    await act(async () => fontes.contas[0].falhar({ code: 'unavailable' }));
    await act(async () => saldo().querySelector('button').click());
    await receber(1);
    expect(dadosSaldo().series[0].data).toEqual(Array(12).fill(0));
    Object.values(fontes).forEach(lista => expect(lista).toHaveLength(2));
    await act(async () => saldo().querySelector('input').click());
    await act(async () => root.render(<Resultados usuarioId="b" />));
    await act(async () => {
        fontes.transacoes[1].receber(registros);
        fontes.contas[1].falhar({ code: 'unavailable' });
    });
    expect(saldo().querySelector('[data-testid="grafico"]')).toBeNull();
    expect(saldo().querySelector('.legenda')).toBeNull();
    expect(saldo().querySelector('[role="alert"]')).toBeNull();
    await receber(2);
    expect(dadosSaldo().series[0].data).toEqual(Array(12).fill(0));
    expect(saldo().querySelector('input').checked).toBe(true);
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
