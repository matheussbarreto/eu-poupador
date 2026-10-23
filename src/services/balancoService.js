const nomesMeses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function obterPeriodoBalanco(dataSelecionada) {
    const ano = dataSelecionada.getFullYear();
    const mes = dataSelecionada.getMonth();
    // Segue o calendário local utilizado pelo seletor e pelo guia do aplicativo.
    return {
        inicio: new Date(ano, mes - 11, 1),
        fim: new Date(ano, mes + 1, 1),
    };
}

export function calcularBalancoMensal(transacoes, dataSelecionada) {
    const { inicio, fim } = obterPeriodoBalanco(dataSelecionada);
    const categorias = Array.from({ length: 12 }, (_, indice) => {
        const data = new Date(inicio.getFullYear(), inicio.getMonth() + indice, 1);
        return `${nomesMeses[data.getMonth()]}/${data.getFullYear()}`;
    });
    const receitas = Array(12).fill(0);
    const despesas = Array(12).fill(0);

    transacoes.forEach((transacao) => {
        if (transacao.isDeleted === true || transacao.outgoingType === "create" || transacao.out === "Criação") return;

        const receita = transacao.outgoingType === "income";
        const despesa = transacao.incomingType === "expense";
        if (!receita && !despesa) return;

        const data = new Date(transacao.date);
        const valor = Number(transacao.amount);
        const centavos = Math.round((valor + Number.EPSILON) * 100);
        if (typeof transacao.date !== "string" || !Number.isFinite(data.getTime()) ||
            !["number", "string"].includes(typeof transacao.amount) ||
            String(transacao.amount).trim() === "" || !Number.isFinite(valor) ||
            valor < 0 || !Number.isSafeInteger(centavos)) {
            const erro = new Error("Há lançamentos com data ou valor inválido.");
            erro.code = "app/lancamento-invalido";
            throw erro;
        }
        if (data < inicio || data >= fim) return;

        const indice = (data.getFullYear() - inicio.getFullYear()) * 12 + data.getMonth() - inicio.getMonth();
        if (receita) receitas[indice] += centavos;
        if (despesa) despesas[indice] += centavos;
    });

    return {
        categorias,
        receitas: receitas.map((valor) => valor / 100),
        despesas: despesas.map((valor) => valor / 100),
        saldos: receitas.map((valor, indice) => (valor - despesas[indice]) / 100),
        semMovimentacoes: receitas.every((valor) => valor === 0) && despesas.every((valor) => valor === 0),
    };
}

export function obterMensagemErroBalanco(erro) {
    switch (erro?.code) {
        case "permission-denied":
            return "Não foi possível acessar seus lançamentos. Verifique seu acesso e sua assinatura.";
        case "unavailable":
            return "Não foi possível conectar ao banco de dados. Verifique sua internet e tente novamente.";
        case "app/lancamento-invalido":
            return "Há lançamentos com data ou valor inválido. Confira os registros no aplicativo.";
        default:
            return "Não foi possível carregar o balanço. Tente novamente em instantes.";
    }
}
