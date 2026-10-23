import { calcularBalancoMensal, obterMensagemErroBalanco } from "./balancoService";

const referencia = new Date(2026, 9, 16);
const dataOutubro = new Date(2026, 9, 15, 12).toISOString();
const receita = (amount, outros = {}) => ({ date: dataOutubro, amount, outgoingType: "income", incomingType: "account", ...outros });
const despesa = (amount, outros = {}) => ({ date: dataOutubro, amount, outgoingType: "account", incomingType: "expense", ...outros });

test("gera os 12 meses até o selecionado, inclusive os meses sem movimentação", () => {
    const dados = calcularBalancoMensal([], referencia);
    expect(dados.categorias).toEqual([
        "Nov/2025", "Dez/2025", "Jan/2026", "Fev/2026", "Mar/2026", "Abr/2026",
        "Mai/2026", "Jun/2026", "Jul/2026", "Ago/2026", "Set/2026", "Out/2026",
    ]);
    expect(dados.receitas).toEqual(Array(12).fill(0));
    expect(dados.despesas).toEqual(Array(12).fill(0));
    expect(dados.saldos).toEqual(Array(12).fill(0));
    expect(dados.semMovimentacoes).toBe(true);
});

test("soma em centavos e calcula saldo negativo sem alterar as transações compartilhadas", () => {
    const transacoes = Object.freeze([
        receita(0.1), receita("0.20"), despesa(0.4),
    ].map((transacao) => Object.freeze(transacao)));
    const dados = calcularBalancoMensal(transacoes, referencia);
    expect(dados.receitas[11]).toBe(0.3);
    expect(dados.despesas[11]).toBe(0.4);
    expect(dados.saldos[11]).toBe(-0.1);
    expect(dados.semMovimentacoes).toBe(false);
});

test("exclui registros apagados e saldos iniciais, preservando IDs legados e isDeleted ausente", () => {
    const dados = calcularBalancoMensal([
        receita(100, { id: "2026-10-15T12:00:00.000Z48291048" }),
        receita(25, { id: "inc_1", isDeleted: false }),
        receita(900, { isDeleted: true }),
        despesa(900, { isDeleted: true }),
        despesa(800, { outgoingType: "create" }),
        despesa(700, { out: "Criação" }),
        despesa(30),
    ], referencia);
    expect(dados.receitas[11]).toBe(125);
    expect(dados.despesas[11]).toBe(30);
    expect(dados.saldos[11]).toBe(95);
});

test("transferências, aportes, resgates e rendimentos não viram receitas ou despesas", () => {
    const transacoes = [
        { outgoingType: "account", incomingType: "account" },
        { outgoingType: "account", incomingType: "investment" },
        { outgoingType: "investment", incomingType: "account" },
        { outgoingType: "update", incomingType: "investment" },
    ].map((tipos) => ({ ...tipos, date: dataOutubro, amount: 500 }));
    expect(calcularBalancoMensal(transacoes, referencia).semMovimentacoes).toBe(true);
});

test("receita direcionada a investimento e pagamento direto de receita seguem os tipos do guia", () => {
    const dados = calcularBalancoMensal([
        receita(100, { incomingType: "investment" }),
        receita(40, { incomingType: "expense" }),
    ], referencia);
    expect(dados.receitas[11]).toBe(140);
    expect(dados.despesas[11]).toBe(40);
    expect(dados.saldos[11]).toBe(100);
});

test("respeita os limites locais do período e a virada do ano em datas ISO", () => {
    const inicio = new Date(2025, 10, 1);
    const fim = new Date(2026, 10, 1);
    const dados = calcularBalancoMensal([
        receita(999, { date: new Date(inicio.getTime() - 1).toISOString() }),
        receita(10, { date: inicio.toISOString() }),
        receita(20, { date: new Date(2025, 11, 31, 23, 59, 59).toISOString() }),
        receita(30, { date: new Date(2026, 0, 1).toISOString() }),
        receita(40, { date: new Date(fim.getTime() - 1).toISOString() }),
        receita(999, { date: fim.toISOString() }),
    ], referencia);
    expect(dados.receitas).toEqual([10, 20, 30, 0, 0, 0, 0, 0, 0, 0, 0, 40]);
});

test("inclui fevereiro de ano bissexto e mantém o mês selecionado como último ponto", () => {
    const dados = calcularBalancoMensal([
        receita(50, { date: new Date(2024, 1, 29, 23, 59).toISOString() }),
    ], new Date(2024, 1, 29));
    expect(dados.categorias[11]).toBe("Fev/2024");
    expect(dados.receitas[11]).toBe(50);
});

test.each([undefined, null, true, "", "abc", Infinity, -1])("valor inválido %s informa erro em vez de apresentar um total parcial", (valor) => {
    expect(() => calcularBalancoMensal([receita(100), despesa(valor)], referencia)).toThrow("valor inválido");
});

test("data inválida de lançamento relevante informa erro", () => {
    expect(() => calcularBalancoMensal([receita(100, { date: "sem-data" })], referencia)).toThrow("data ou valor inválido");
});

test.each(["permission-denied", "unavailable", "app/lancamento-invalido", "outro"])("traduz falha %s sem exibir mensagens técnicas", (code) => {
    const mensagem = obterMensagemErroBalanco({ code, message: "detalhe interno" });
    expect(mensagem).not.toContain("detalhe interno");
    expect(mensagem.length).toBeGreaterThan(20);
});
