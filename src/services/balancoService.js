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

function criarErroPrevisao() {
    const erro = new Error("Há previsões com data ou valor inválido.");
    erro.code = "app/previsao-invalida";
    return erro;
}

export function obterPrevisaoDoMes(item, dataSelecionada) {
    if (!item || item.isDeleted === true) return 0;
    const mesSelecionado = dataSelecionada.getFullYear() * 12 + dataSelecionada.getMonth();

    if (item.createdAt) {
        const criacao = new Date(item.createdAt);
        if (typeof item.createdAt !== "string" || !Number.isFinite(criacao.getTime())) throw criarErroPrevisao();
        if (mesSelecionado < criacao.getFullYear() * 12 + criacao.getMonth()) return 0;
    }

    const historico = item.expectedHistory;
    if (historico != null && !Array.isArray(historico)) throw criarErroPrevisao();
    let valor = item.expected === undefined ? 0 : item.expected;
    if (historico?.length) {
        let entradaSelecionada;
        historico.forEach((entrada) => {
            if (typeof entrada?.date !== "string" || !/^\d{4}-\d{1,2}$/.test(entrada.date)) throw criarErroPrevisao();
            const [ano, mes] = entrada.date.split("-").map(Number);
            // O aplicativo usa goal e meses de 0 a 11; o guia usa value e meses de 1 a 12.
            const usaGoal = entrada.value === undefined && entrada.goal !== undefined;
            const indiceMes = usaGoal ? mes : mes - 1;
            if (indiceMes < 0 || indiceMes > 11) throw criarErroPrevisao();
            const mesEntrada = ano * 12 + indiceMes;
            if (mesEntrada === mesSelecionado && !entradaSelecionada) {
                entradaSelecionada = entrada;
            }
        });
        // O histórico só contribui quando há uma previsão para o mês selecionado.
        if (!entradaSelecionada) return 0;
        valor = entradaSelecionada.value === undefined ? entradaSelecionada.goal : entradaSelecionada.value;
    }

    const numero = Number(valor);
    const centavos = Math.round((numero + Number.EPSILON) * 100);
    if (!["number", "string"].includes(typeof valor) || String(valor).trim() === "" ||
        !Number.isFinite(numero) || numero < 0 || !Number.isSafeInteger(centavos)) throw criarErroPrevisao();
    return centavos / 100;
}

export function calcularSaldoAcumuladoPrevisto(balanco, previsoes, dataSelecionada) {
    const somarPrevisoes = (itens) => itens.reduce((total, item) =>
        total + Math.round(obterPrevisaoDoMes(item, dataSelecionada) * 100), 0);
    const receitasPrevistas = somarPrevisoes(previsoes.receitas);
    const despesasPrevistas = somarPrevisoes(previsoes.despesas);
    // O último ponto do balanço corresponde somente ao mês selecionado.
    const indice = balanco.saldos.length - 1;
    const acumulado = Math.round(balanco.saldos[indice] * 100);
    const previsto = receitasPrevistas - despesasPrevistas;
    const diferenca = acumulado - previsto;
    if (![receitasPrevistas, despesasPrevistas, acumulado, previsto, diferenca].every(Number.isSafeInteger)) throw criarErroPrevisao();

    return {
        categoria: balanco.categorias[indice],
        acumulado: acumulado / 100,
        previsto: previsto / 100,
        diferenca: diferenca / 100,
        diferencaPercentual: previsto === 0 ? null : diferenca / Math.abs(previsto) * 100,
        semDados: balanco.receitas[indice] === 0 && balanco.despesas[indice] === 0 &&
            receitasPrevistas === 0 && despesasPrevistas === 0,
    };
}

export function obterMensagemErroPrevisoes(erro) {
    switch (erro?.code) {
        case "permission-denied":
            return "Não foi possível acessar suas previsões. Verifique seu acesso e sua assinatura.";
        case "unavailable":
            return obterMensagemErroBalanco(erro);
        case "app/previsao-invalida":
            return "Há previsões com data ou valor inválido. Confira os registros no aplicativo.";
        default:
            return "Não foi possível carregar as previsões. Tente novamente em instantes.";
    }
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
