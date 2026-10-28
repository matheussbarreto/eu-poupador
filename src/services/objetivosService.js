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

export function calcularCompromissoMensal(planejamentoMensal) {
    const { totalRealizado, totalPrevisto, semDados } = planejamentoMensal;
    return {
        totalRealizado, totalPrevisto, semDados,
        percentual: totalPrevisto === 0 ? null : totalRealizado / totalPrevisto * 100,
    };
}

export function calcularRealizadoPrevistoMensal(planejamentoMensal, dataSelecionada) {
    const { totalRealizado, totalPrevisto, diferenca, semDados } = planejamentoMensal;
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return {
        categoria: `${meses[dataSelecionada.getMonth()]}/${dataSelecionada.getFullYear()}`,
        realizado: totalRealizado, previsto: totalPrevisto, diferenca, semDados,
        diferencaPercentual: totalPrevisto === 0 ? null : diferenca / totalPrevisto * 100,
    };
}

function obterCentavosObjetivo(valor, permitirNegativo = true) {
    const numero = Number(valor);
    const centavos = Math.round((numero + Number.EPSILON) * 100);
    if (!["number", "string"].includes(typeof valor) || String(valor).trim() === "" ||
        !Number.isFinite(numero) || !Number.isSafeInteger(centavos) || (!permitirNegativo && numero < 0)) {
        const erro = new Error("Há objetivos com saldo ou meta global inválidos.");
        erro.code = "app/objetivo-invalido";
        throw erro;
    }
    return centavos;
}

export function calcularPlanejamentoGlobal(investimentos, saldosIniciais = []) {
    const origens = new Map();
    saldosIniciais.forEach((transacao) => {
        if (transacao.isDeleted === true || transacao.outgoingType !== "create" || transacao.incomingType !== "investment" || !transacao.inID) return;
        if (!origens.has(transacao.inID)) origens.set(transacao.inID, []);
        origens.get(transacao.inID).push(transacao);
    });
    const objetivos = investimentos.filter((investimento) => investimento.isDeleted !== true).map((investimento) => {
        const divida = investimento.objective === "Dívida";
        const atual = obterCentavosObjetivo(investimento.current);
        // Dívidas têm como destino a quitação; o percentual usa o saldo negativo original.
        const desejado = divida ? 0 : obterCentavosObjetivo(investimento.montante ?? 0, false);
        let percentual = desejado === 0 ? null : atual / desejado * 100;
        const criacoes = origens.get(investimento.id) || [];
        if (divida && criacoes.length === 1) {
            let original;
            try {
                original = obterCentavosObjetivo(criacoes[0].amount);
            } catch (erro) {
                erro.code = "app/origem-divida-invalida";
                throw erro;
            }
            // Sem uma origem negativa única não há uma base segura para o percentual.
            if (original < 0) percentual = Math.min(100, (Math.abs(original) + atual) / Math.abs(original) * 100);
        }
        return {
            id: investimento.id,
            nome: typeof investimento.nome === "string" && investimento.nome.trim() ? investimento.nome.trim() : "Objetivo sem nome",
            ordem: Number.isFinite(investimento.order) ? investimento.order : Infinity,
            atual, desejado, divida, percentual,
            concluido: divida ? atual >= 0 : desejado > 0 && atual >= desejado,
        };
    }).sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR") || a.id.localeCompare(b.id));
    const totalAtual = objetivos.reduce((soma, item) => soma + item.atual, 0);
    const totalDesejado = objetivos.reduce((soma, item) => soma + item.desejado, 0);
    return {
        itens: objetivos.map(({ ordem, ...item }) => ({ ...item, atual: item.atual / 100, desejado: item.desejado / 100 })),
        totalAtual: totalAtual / 100,
        totalDesejado: totalDesejado / 100,
        diferenca: (totalAtual - totalDesejado) / 100,
        semDados: objetivos.length === 0,
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
        case "app/objetivo-invalido":
            return "Há objetivos com saldo ou meta global inválidos. Confira os registros no aplicativo.";
        case "app/origem-divida-invalida":
            return "Há registros de criação de dívidas com valor inválido. Confira os registros no aplicativo.";
        default:
            return "Não foi possível carregar os objetivos. Tente novamente em instantes.";
    }
}
