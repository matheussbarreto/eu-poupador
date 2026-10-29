import { obterPeriodoBalanco } from "./balancoService";

const nomesMeses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const tiposPatrimoniais = ["account", "investment"];

function falhar(code) {
    const erro = new Error("Não foi possível reconstruir os saldos.");
    erro.code = code;
    throw erro;
}

function obterCentavos(valor) {
    if (typeof valor !== "number" || !Number.isFinite(valor) || !Number.isSafeInteger(Math.round(valor * 100))) {
        falhar("app/movimentacao-invalida");
    }
    return Math.round(valor * 100);
}

// Base por entidade e mês, compartilhada pelos cálculos dos gráficos de Resultados.
export function calcularSaldosMensais(transacoes, contas, investimentos, dataSelecionada, agora = new Date()) {
    if (!Number.isFinite(dataSelecionada?.getTime()) || !Number.isFinite(agora?.getTime())) falhar("app/movimentacao-invalida");
    const { inicio, fim } = obterPeriodoBalanco(dataSelecionada);
    const limite = Math.min(fim.getTime(), agora.getTime() + 1);
    const cadastros = new Map();
    [["account", contas], ["investment", investimentos]].forEach(([tipo, itens]) => {
        itens.forEach((item) => {
            if (typeof item.id !== "string" || !item.id || cadastros.has(`${tipo}/${item.id}`)) falhar("app/cadastro-invalido");
            // Um cadastro excluído não apaga suas movimentações históricas ainda ativas.
            cadastros.set(`${tipo}/${item.id}`, { ...item, tipo });
        });
    });

    const origens = new Set();
    const origensPosteriores = new Set();
    const movimentados = new Set();
    const lancamentos = [];
    transacoes.forEach((transacao) => {
        if (transacao.isDeleted === true) return;
        const data = new Date(transacao.date);
        if (typeof transacao.date !== "string" || !Number.isFinite(data.getTime())) falhar("app/movimentacao-invalida");
        const entrada = `${transacao.incomingType}/${transacao.inID}`;
        const saida = `${transacao.outgoingType}/${transacao.outID}`;
        if (data.getTime() >= limite) {
            if (transacao.outgoingType === "create") origensPosteriores.add(entrada);
            return;
        }
        // Sem exemplos confirmados de ajustes absolutos versus diferenças, não estimar seu efeito.
        if (transacao.outgoingType === "update" || transacao.incomingType === "update") falhar("app/ajuste-nao-interpretado");
        const temEntrada = tiposPatrimoniais.includes(transacao.incomingType);
        const temSaida = tiposPatrimoniais.includes(transacao.outgoingType);
        const origemExterna = ["create", "income"].includes(transacao.outgoingType);
        if ((!temEntrada && !temSaida) || (!temSaida && !origemExterna) || (!temEntrada && transacao.incomingType !== "expense")) {
            falhar("app/movimentacao-invalida");
        }
        const centavos = obterCentavos(transacao.amount);
        if (centavos < 0 && transacao.outgoingType !== "create") falhar("app/movimentacao-invalida");
        [temEntrada && entrada, temSaida && saida].filter(Boolean).forEach((chave) => {
            if (!cadastros.has(chave)) falhar("app/referencia-ausente");
            movimentados.add(chave);
        });
        if (transacao.outgoingType === "create") {
            if (origens.has(entrada)) falhar("app/origem-invalida");
            origens.add(entrada);
        }
        lancamentos.push({ data: data.getTime(), centavos, entrada: temEntrada ? entrada : null, saida: temSaida ? saida : null });
    });

    cadastros.forEach((item, chave) => {
        if (origens.has(chave) || origensPosteriores.has(chave)) return;
        if (item.createdAt && new Date(item.createdAt).getTime() >= limite) return;
        const saldo = item.tipo === "account" ? item.balance : item.current;
        // Contas sem origem e zeradas no cadastro começam em zero, conforme o modelo conferido.
        // Um saldo não zero sem registro inicial não permite reconstruir o passado com segurança.
        if ((saldo != null && saldo !== 0) || (item.tipo === "investment" && movimentados.has(chave))) falhar("app/origem-invalida");
    });
    lancamentos.sort((a, b) => a.data - b.data);
    const saldos = new Map();
    let indice = 0;
    const meses = Array.from({ length: 12 }, (_, mes) => {
        const data = new Date(inicio.getFullYear(), inicio.getMonth() + mes, 1);
        const fimMes = Math.min(new Date(data.getFullYear(), data.getMonth() + 1, 1).getTime(), limite);
        while (indice < lancamentos.length && lancamentos[indice].data < fimMes) {
            const lancamento = lancamentos[indice++];
            [[lancamento.entrada, 1], [lancamento.saida, -1]].forEach(([chave, sinal]) => {
                if (!chave) return;
                const saldo = (saldos.get(chave) || 0) + sinal * lancamento.centavos;
                if (!Number.isSafeInteger(saldo)) falhar("app/movimentacao-invalida");
                saldos.set(chave, saldo);
            });
        }
        return {
            categoria: `${nomesMeses[data.getMonth()]}/${data.getFullYear()}`,
            // null diferencia ausência de histórico de um saldo efetivamente zerado.
            saldos: indice === 0 || data.getTime() >= limite ? null : Array.from(saldos, ([chave, centavos]) => ({
                id: cadastros.get(chave).id, tipo: cadastros.get(chave).tipo, centavos,
            })),
        };
    });
    return { meses };
}

export function calcularPatrimonioMensal({ meses }) {
    const totais = meses.map(({ saldos }) => {
        if (saldos === null) return null;
        let ativos = 0;
        let passivos = 0;
        saldos.forEach(({ centavos }) => {
            if (centavos >= 0) ativos += centavos;
            else passivos -= centavos;
        });
        if (![ativos, passivos, ativos - passivos].every(Number.isSafeInteger)) falhar("app/movimentacao-invalida");
        return { ativos: ativos / 100, passivos: passivos / 100, patrimonio: (ativos - passivos) / 100 };
    });
    return {
        categorias: meses.map(({ categoria }) => categoria),
        // Na apresentação, meses sem registros começam em zero; a base preserva a distinção.
        ativos: totais.map((item) => item?.ativos ?? 0),
        passivos: totais.map((item) => item?.passivos ?? 0),
        patrimonios: totais.map((item) => item?.patrimonio ?? 0),
        semHistorico: totais.every((item) => item === null),
    };
}

export function calcularVariacaoPatrimonial({ categorias, patrimonios }) {
    const indice = patrimonios.length - 1;
    const anterior = obterCentavos(patrimonios[indice - 1]);
    const atual = obterCentavos(patrimonios[indice]);
    const diferenca = atual - anterior;
    if (!Number.isSafeInteger(diferenca)) falhar("app/movimentacao-invalida");
    return {
        categoria: categorias[indice],
        categoriaAnterior: categorias[indice - 1],
        anterior: anterior / 100,
        atual: atual / 100,
        diferenca: diferenca / 100,
        // O módulo mantém o sinal de melhora/piora mesmo quando o patrimônio anterior é negativo.
        diferencaPercentual: anterior === 0 ? null : diferenca / Math.abs(anterior) * 100,
    };
}

export function obterMensagemErroResultados(erro) {
    const mensagens = {
        "permission-denied": "Não foi possível acessar seus dados. Confira seu acesso e sua assinatura.",
        "unavailable": "Não foi possível conectar. Confira sua conexão e tente novamente.",
        "app/configuracao-ausente": "A conexão com o Firebase não está configurada.",
        "app/movimentacao-invalida": "Há movimentações com data, tipo ou valor inválido. Confira os registros no aplicativo.",
        "app/cadastro-invalido": "Não foi possível identificar suas contas ou objetivos. Confira os cadastros no aplicativo.",
        "app/referencia-ausente": "Há movimentações vinculadas a uma conta ou objetivo não encontrado. Confira os registros no aplicativo.",
        "app/origem-invalida": "Não foi possível identificar o saldo inicial de uma conta ou objetivo. Confira os registros no aplicativo.",
        "app/ajuste-nao-interpretado": "Não foi possível calcular o patrimônio com os ajustes de saldo registrados.",
    };
    return mensagens[erro?.code] || "Não foi possível carregar os resultados. Tente novamente.";
}
