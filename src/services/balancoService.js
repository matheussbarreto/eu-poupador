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

function criarErroLancamento() {
    const erro = new Error("Há lançamentos com data ou valor inválido.");
    erro.code = "app/lancamento-invalido";
    return erro;
}

function obterLancamentoDoBalanco(transacao) {
    if (transacao.isDeleted === true || transacao.outgoingType === "create" || transacao.out === "Criação") return null;

    const receita = transacao.outgoingType === "income";
    const despesa = transacao.incomingType === "expense";
    if (!receita && !despesa) return null;

    const data = new Date(transacao.date);
    const valor = Number(transacao.amount);
    const centavos = Math.round((valor + Number.EPSILON) * 100);
    if (typeof transacao.date !== "string" || !Number.isFinite(data.getTime()) ||
        !["number", "string"].includes(typeof transacao.amount) ||
        String(transacao.amount).trim() === "" || !Number.isFinite(valor) ||
        valor < 0 || !Number.isSafeInteger(centavos)) throw criarErroLancamento();

    return { data, centavos, receita, despesa };
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
        const lancamento = obterLancamentoDoBalanco(transacao);
        if (!lancamento) return;
        const { data, centavos, receita, despesa } = lancamento;
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

export function calcularReceitasPorFonte(transacoes, receitas, dataSelecionada) {
    const inicio = new Date(dataSelecionada.getFullYear(), dataSelecionada.getMonth(), 1);
    const fim = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 1);
    const fontes = new Map();

    receitas.forEach((receita) => {
        const nome = typeof receita.nome === "string" && receita.nome.trim() ? receita.nome.trim() : "Receita sem nome";
        const id = `id:${receita.id}`;
        fontes.set(id, {
            id,
            nome: receita.isDeleted === true ? `${nome} (removida)` : nome,
            ordem: Number.isFinite(receita.order) ? receita.order : Infinity,
            recebido: 0,
            previsto: Math.round(obterPrevisaoDoMes(receita, dataSelecionada) * 100),
        });
    });

    transacoes.forEach((transacao) => {
        if (transacao.outgoingType !== "income") return;
        const lancamento = obterLancamentoDoBalanco(transacao);
        if (!lancamento || lancamento.data < inicio || lancamento.data >= fim) return;

        const origem = typeof transacao.outID === "string" ? transacao.outID.trim() : "";
        const nome = typeof transacao.out === "string" ? transacao.out.trim() : "";
        // Sem identificador, mantém um grupo separado dos cadastros com o mesmo nome.
        const id = origem ? `id:${origem}` : `sem-id:${nome}`;
        if (!fontes.has(id)) {
            fontes.set(id, {
                id,
                nome: nome ? `${nome} (${origem ? "sem cadastro" : "não identificada"})` : "Receita não identificada",
                ordem: Infinity,
                recebido: 0,
                previsto: 0,
            });
        }
        const fonte = fontes.get(id);
        fonte.recebido += lancamento.centavos;
        if (!Number.isSafeInteger(fonte.recebido)) throw criarErroLancamento();
    });

    const fontesDoMes = [...fontes.values()]
        .filter((fonte) => fonte.recebido !== 0 || fonte.previsto !== 0)
        .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR") || a.id.localeCompare(b.id));
    const totalRecebido = fontesDoMes.reduce((total, fonte) => total + fonte.recebido, 0);
    const totalPrevisto = fontesDoMes.reduce((total, fonte) => total + fonte.previsto, 0);
    if (!Number.isSafeInteger(totalRecebido)) throw criarErroLancamento();
    if (!Number.isSafeInteger(totalPrevisto)) throw criarErroPrevisao();

    return {
        itens: fontesDoMes.map(({ id, nome, recebido, previsto }) => ({
            id, nome, recebido: recebido / 100, previsto: previsto / 100,
            percentual: previsto === 0 ? null : recebido / previsto * 100,
        })),
        totalRecebido: totalRecebido / 100,
        totalPrevisto: totalPrevisto / 100,
        diferenca: (totalRecebido - totalPrevisto) / 100,
        semDados: fontesDoMes.length === 0,
    };
}

export function calcularDespesasPorCadastro(transacoes, despesas, dataSelecionada) {
    const inicio = new Date(dataSelecionada.getFullYear(), dataSelecionada.getMonth(), 1);
    const fim = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 1);
    const cadastros = new Map();

    despesas.forEach((despesa) => {
        const nome = typeof despesa.nome === "string" && despesa.nome.trim() ? despesa.nome.trim() : "Despesa sem nome";
        const id = `id:${despesa.id}`;
        cadastros.set(id, {
            id,
            nome: despesa.isDeleted === true ? `${nome} (removida)` : nome,
            ordem: Number.isFinite(despesa.order) ? despesa.order : Infinity,
            gasto: 0,
            previsto: Math.round(obterPrevisaoDoMes(despesa, dataSelecionada) * 100),
        });
    });

    transacoes.forEach((transacao) => {
        if (transacao.incomingType !== "expense") return;
        const lancamento = obterLancamentoDoBalanco(transacao);
        if (!lancamento || lancamento.data < inicio || lancamento.data >= fim) return;

        const destino = typeof transacao.inID === "string" ? transacao.inID.trim() : "";
        const nome = typeof transacao.in === "string" ? transacao.in.trim() : "";
        // Gastos sem identificador não são associados a um cadastro apenas pelo nome.
        const id = destino ? `id:${destino}` : `sem-id:${nome}`;
        if (!cadastros.has(id)) {
            cadastros.set(id, {
                id,
                nome: nome ? `${nome} (${destino ? "sem cadastro" : "não identificada"})` : "Despesa não identificada",
                ordem: Infinity,
                gasto: 0,
                previsto: 0,
            });
        }
        const cadastro = cadastros.get(id);
        cadastro.gasto += lancamento.centavos;
        if (!Number.isSafeInteger(cadastro.gasto)) throw criarErroLancamento();
    });

    const despesasDoMes = [...cadastros.values()]
        .filter((despesa) => despesa.gasto !== 0 || despesa.previsto !== 0)
        .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR") || a.id.localeCompare(b.id));
    const totalGasto = despesasDoMes.reduce((total, despesa) => total + despesa.gasto, 0);
    const totalPrevisto = despesasDoMes.reduce((total, despesa) => total + despesa.previsto, 0);
    if (!Number.isSafeInteger(totalGasto)) throw criarErroLancamento();
    if (!Number.isSafeInteger(totalPrevisto)) throw criarErroPrevisao();

    return {
        itens: despesasDoMes.map(({ id, nome, gasto, previsto }) => ({
            id, nome, gasto: gasto / 100, previsto: previsto / 100,
            percentual: previsto === 0 ? null : gasto / previsto * 100,
        })),
        totalGasto: totalGasto / 100,
        totalPrevisto: totalPrevisto / 100,
        diferenca: (totalPrevisto - totalGasto) / 100,
        semDados: despesasDoMes.length === 0,
    };
}

export function calcularDespesasPorCategoria(despesasPorCadastro, despesas) {
    const categoriasPorId = new Map(despesas.map((despesa) => [
        `id:${despesa.id}`,
        typeof despesa.category === "string" && despesa.category.trim() ? despesa.category.trim() : "Outros",
    ]));
    const categorias = new Map();
    despesasPorCadastro.itens.forEach((item) => {
        if (item.gasto === 0) return;
        const nome = categoriasPorId.get(item.id) || "Outros";
        categorias.set(nome, (categorias.get(nome) || 0) + Math.round(item.gasto * 100));
    });
    const totalCentavos = Math.round(despesasPorCadastro.totalGasto * 100);
    const itens = [...categorias.entries()]
        .sort(([a], [b]) => a === "Outros" ? 1 : b === "Outros" ? -1 : a.localeCompare(b, "pt-BR"))
        .map(([nome, centavos]) => ({
            nome, gasto: centavos / 100,
            percentual: totalCentavos === 0 ? 0 : centavos / totalCentavos * 100,
        }));
    return { itens, totalGasto: despesasPorCadastro.totalGasto, semDados: totalCentavos === 0 };
}

export function calcularDespesasPorTipo(despesasPorCadastro, despesas) {
    const tipos = new Map([
        "Despesa Fixa Essencial", "Despesa Variável Essencial",
        "Despesa Fixa Não Essencial", "Despesa Variável Não Essencial", "Não classificado",
    ].map((nome) => [nome, 0]));
    const tiposPorId = new Map(despesas.map((despesa) => [
        `id:${despesa.id}`, typeof despesa.type === "string" ? despesa.type.trim() : "",
    ]));
    despesasPorCadastro.itens.forEach((item) => {
        if (item.gasto === 0) return;
        const tipo = tiposPorId.get(item.id);
        const nome = tipos.has(tipo) ? tipo : "Não classificado";
        tipos.set(nome, tipos.get(nome) + Math.round(item.gasto * 100));
    });
    const totalCentavos = Math.round(despesasPorCadastro.totalGasto * 100);
    const itens = [...tipos.entries()]
        .filter(([, centavos]) => centavos > 0)
        .map(([nome, centavos]) => ({
            nome, gasto: centavos / 100,
            percentual: totalCentavos === 0 ? 0 : centavos / totalCentavos * 100,
        }));
    return { itens, totalGasto: despesasPorCadastro.totalGasto, semDados: totalCentavos === 0 };
}

export function calcularDespesasPorTipoGastoPrevisto(despesasPorCadastro, despesas) {
    const tipos = new Map([
        "Despesa Fixa Essencial", "Despesa Variável Essencial",
        "Despesa Fixa Não Essencial", "Despesa Variável Não Essencial", "Não classificado",
    ].map((nome) => [nome, { gasto: 0, previsto: 0 }]));
    const tiposPorId = new Map(despesas.map((despesa) => [
        `id:${despesa.id}`, typeof despesa.type === "string" ? despesa.type.trim() : "",
    ]));
    despesasPorCadastro.itens.forEach((item) => {
        const tipo = tiposPorId.get(item.id);
        const grupo = tipos.get(tipos.has(tipo) ? tipo : "Não classificado");
        grupo.gasto += Math.round(item.gasto * 100);
        grupo.previsto += Math.round(item.previsto * 100);
    });
    const itens = [...tipos.entries()]
        .filter(([, grupo]) => grupo.gasto !== 0 || grupo.previsto !== 0)
        .map(([nome, grupo]) => ({
            nome, gasto: grupo.gasto / 100, previsto: grupo.previsto / 100,
            percentual: grupo.previsto === 0 ? null : grupo.gasto / grupo.previsto * 100,
        }));
    const { totalGasto, totalPrevisto, diferenca, semDados } = despesasPorCadastro;
    return {
        itens, totalGasto, totalPrevisto, diferenca,
        diferencaPercentual: totalPrevisto === 0 ? null : diferenca / totalPrevisto * 100,
        semDados,
    };
}

export function calcularDespesasPorUtilidade(despesasPorTipo) {
    const utilidadesPorTipo = new Map([
        ["Despesa Fixa Essencial", "Essencial"], ["Despesa Variável Essencial", "Essencial"],
        ["Despesa Fixa Não Essencial", "Não Essencial"], ["Despesa Variável Não Essencial", "Não Essencial"],
    ]);
    const grupos = new Map([["Essencial", 0], ["Não Essencial", 0], ["Não classificado", 0]]);
    despesasPorTipo.itens.forEach((item) => {
        const nome = utilidadesPorTipo.get(item.nome) || "Não classificado";
        grupos.set(nome, grupos.get(nome) + Math.round(item.gasto * 100));
    });
    const totalCentavos = Math.round(despesasPorTipo.totalGasto * 100);
    const itens = [...grupos.entries()]
        .filter(([, centavos]) => centavos > 0)
        .map(([nome, centavos]) => ({
            nome, gasto: centavos / 100,
            percentual: totalCentavos === 0 ? 0 : centavos / totalCentavos * 100,
        }));
    return { itens, totalGasto: despesasPorTipo.totalGasto, semDados: totalCentavos === 0 };
}

export function calcularReceitasRecebidoPrevisto(receitasPorFonte, dataSelecionada) {
    const { totalRecebido, totalPrevisto, diferenca, semDados } = receitasPorFonte;
    return {
        categoria: `${nomesMeses[dataSelecionada.getMonth()]}/${dataSelecionada.getFullYear()}`,
        recebido: totalRecebido,
        previsto: totalPrevisto,
        diferenca,
        diferencaPercentual: totalPrevisto === 0 ? null : diferenca / totalPrevisto * 100,
        semDados,
    };
}

export function calcularDespesasGastoPrevisto(despesasPorCadastro, dataSelecionada) {
    const { totalGasto, totalPrevisto, diferenca, semDados } = despesasPorCadastro;
    return {
        categoria: `${nomesMeses[dataSelecionada.getMonth()]}/${dataSelecionada.getFullYear()}`,
        gasto: totalGasto,
        previsto: totalPrevisto,
        diferenca,
        diferencaPercentual: totalPrevisto === 0 ? null : diferenca / totalPrevisto * 100,
        semDados,
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
