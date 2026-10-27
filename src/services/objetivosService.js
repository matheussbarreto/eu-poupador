import { obterPrevisaoDoMes } from "./balancoService";

export function obterPeriodoObjetivos(dataSelecionada) {
    return {
        inicio: new Date(dataSelecionada.getFullYear(), dataSelecionada.getMonth(), 1),
        fim: new Date(dataSelecionada.getFullYear(), dataSelecionada.getMonth() + 1, 1),
    };
}

function erroLancamento() {
    const erro = new Error("Há aportes ou pagamentos com data ou valor inválido.");
    erro.code = "app/lancamento-invalido";
    return erro;
}

export function calcularPlanejamentoMensal(transacoes, investimentos, dataSelecionada) {
    const { inicio, fim } = obterPeriodoObjetivos(dataSelecionada);
    const porObjetivo = new Map();
    investimentos.forEach((investimento) => {
        // No aplicativo, goal é a previsão mensal; montante é a meta global.
        const previsto = obterPrevisaoDoMes({
            expected: investimento.goal,
            expectedHistory: investimento.goalHistory,
            createdAt: investimento.createdAt,
            isDeleted: investimento.isDeleted,
        }, dataSelecionada);
        porObjetivo.set(`id:${investimento.id}`, {
            id: `id:${investimento.id}`,
            nome: typeof investimento.nome === "string" && investimento.nome.trim() ? investimento.nome.trim() : "Objetivo sem nome",
            ordem: Number.isFinite(investimento.order) ? investimento.order : Infinity,
            realizado: 0, previsto: Math.round(previsto * 100),
        });
    });

    transacoes.forEach((transacao) => {
        // Aportes e pagamentos saem de uma conta e entram no objetivo, inclusive dívidas.
        // Resgates, transferências entre objetivos, rendimentos e saldos iniciais não são aportes.
        if (transacao.isDeleted === true || transacao.out === "Criação" ||
            transacao.outgoingType !== "account" || transacao.incomingType !== "investment") return;
        const data = new Date(transacao.date);
        if (typeof transacao.date !== "string" || !Number.isFinite(data.getTime())) throw erroLancamento();
        if (data < inicio || data >= fim) return;
        const valor = Number(transacao.amount);
        const centavos = Math.round((valor + Number.EPSILON) * 100);
        if (!["number", "string"].includes(typeof transacao.amount) || String(transacao.amount).trim() === "" ||
            !Number.isFinite(valor) || valor < 0 || !Number.isSafeInteger(centavos)) throw erroLancamento();
        const nome = typeof transacao.in === "string" && transacao.in.trim() ? transacao.in.trim() : "Objetivo sem cadastro";
        const id = typeof transacao.inID === "string" && transacao.inID.trim() ? `id:${transacao.inID}` : `sem-id:${nome}`;
        if (!porObjetivo.has(id)) porObjetivo.set(id, { id, nome, ordem: Infinity, realizado: 0, previsto: 0 });
        porObjetivo.get(id).realizado += centavos;
    });

    const grupos = [...porObjetivo.values()]
        .filter((item) => item.realizado !== 0 || item.previsto !== 0)
        .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR") || a.id.localeCompare(b.id));
    const totalRealizado = grupos.reduce((soma, item) => soma + item.realizado, 0);
    const totalPrevisto = grupos.reduce((soma, item) => soma + item.previsto, 0);
    return {
        itens: grupos.map((item) => ({
            id: item.id, nome: item.nome,
            realizado: item.realizado / 100, previsto: item.previsto / 100,
            percentual: item.previsto === 0 ? null : item.realizado / item.previsto * 100,
        })),
        totalRealizado: totalRealizado / 100,
        totalPrevisto: totalPrevisto / 100,
        diferenca: (totalRealizado - totalPrevisto) / 100,
        semDados: grupos.length === 0,
    };
}

export function obterMensagemErroObjetivos(erro) {
    switch (erro?.code) {
        case "permission-denied":
            return "Não foi possível acessar seus objetivos. Verifique seu acesso e sua assinatura.";
        case "unavailable":
            return "Não foi possível conectar ao banco de dados. Verifique sua internet e tente novamente.";
        case "app/previsao-invalida":
            return "Há previsões de objetivos com data ou valor inválido. Confira os registros no aplicativo.";
        case "app/lancamento-invalido":
            return "Há aportes ou pagamentos com data ou valor inválido. Confira os registros no aplicativo.";
        default:
            return "Não foi possível carregar os objetivos. Tente novamente em instantes.";
    }
}
