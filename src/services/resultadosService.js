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

export function calcularResultadoAtivos({ meses }, contas, investimentos) {
    const cadastros = new Map([
        ...contas.map((item) => [`account/${item.id}`, item.type]),
        ...investimentos.map((item) => [`investment/${item.id}`, item.objective]),
    ]);
    const grupos = new Map([['Caixa', 0], ['Banco', 0], ['Investimentos', 0], ['Bens', 0], ['A Receber', 0], ['Cartão', 0], ['Outros', 0]]);
    const mes = meses[meses.length - 1];
    let total = 0;
    (mes.saldos || []).forEach(({ id, tipo, centavos }) => {
        if (!Number.isSafeInteger(centavos)) falhar('app/movimentacao-invalida');
        if (centavos <= 0) return;
        const chave = `${tipo}/${id}`;
        if (!cadastros.has(chave)) falhar('app/referencia-ausente');
        const classificacao = cadastros.get(chave);
        const nome = tipo === 'investment' ? (classificacao === 'Investimento' ? 'Investimentos' : classificacao === 'Bem' ? 'Bens' : 'Outros') :
            (['Caixa', 'Banco', 'A Receber', 'Cartão'].includes(classificacao) ? classificacao : 'Outros');
        grupos.set(nome, grupos.get(nome) + centavos);
        total += centavos;
        if (!Number.isSafeInteger(total)) falhar('app/movimentacao-invalida');
    });
    return {
        categoria: mes.categoria,
        itens: Array.from(grupos, ([nome, centavos]) => ({ nome, valor: centavos / 100, percentual: total ? centavos / total * 100 : 0 })).filter((item) => item.valor > 0),
        total: total / 100,
        semDados: total === 0,
    };
}

export function calcularResultadoPassivos({ meses }, contas, investimentos) {
    const cadastros = new Map([
        ...contas.map((item) => [`account/${item.id}`, item.type]),
        ...investimentos.map((item) => [`investment/${item.id}`, item.objective]),
    ]);
    const grupos = new Map([['Cartões de Crédito', 0], ['Dívidas', 0], ['Outros', 0]]);
    const mes = meses[meses.length - 1];
    let total = 0;
    (mes.saldos || []).forEach(({ id, tipo, centavos }) => {
        if (!Number.isSafeInteger(centavos)) falhar('app/movimentacao-invalida');
        if (centavos >= 0) return;
        const chave = `${tipo}/${id}`;
        if (!cadastros.has(chave)) falhar('app/referencia-ausente');
        const classificacao = cadastros.get(chave);
        const nome = tipo === 'account' && classificacao === 'Cartão' ? 'Cartões de Crédito' :
            tipo === 'investment' && classificacao === 'Dívida' ? 'Dívidas' : 'Outros';
        grupos.set(nome, grupos.get(nome) - centavos);
        total -= centavos;
        if (!Number.isSafeInteger(total)) falhar('app/movimentacao-invalida');
    });
    return {
        categoria: mes.categoria,
        itens: Array.from(grupos, ([nome, centavos]) => ({ nome, valor: centavos / 100, percentual: total ? centavos / total * 100 : 0 })).filter((item) => item.valor > 0),
        total: total / 100,
        semDados: total === 0,
    };
}

export function calcularResultadoAtivoPassivo({ categorias, ativos, passivos }) {
    const indice = categorias.length - 1;
    const ativo = obterCentavos(ativos[indice]);
    const passivo = obterCentavos(passivos[indice]);
    const total = ativo + passivo;
    if (ativo < 0 || passivo < 0 || !Number.isSafeInteger(total)) falhar('app/movimentacao-invalida');
    return {
        categoria: categorias[indice],
        itens: [['Ativos', ativo], ['Passivos', passivo]].map(([nome, centavos]) => ({
            nome, valor: centavos / 100, percentual: total ? centavos / total * 100 : 0,
        })),
        total: total / 100,
        semDados: total === 0,
    };
}

export function calcularSaldoInvestimentos({ meses }, investimentos) {
    const cadastros = new Map(investimentos.map((item) => [item.id, item]));
    const categorias = meses.map((mes) => mes.categoria);
    const saldos = meses.map((mes) => {
        let total = 0;
        obterSaldosInvestimentos(mes.saldos, cadastros).forEach(({ centavos }) => {
            total += centavos;
            if (!Number.isSafeInteger(total)) falhar('app/movimentacao-invalida');
        });
        return total / 100;
    });
    return { categorias, saldos, ...calcularVariacaoMensal(categorias, saldos) };
}

function obterSaldosInvestimentos(saldos, cadastros) {
    return (saldos || []).filter(({ id, tipo, centavos }) => {
        if (tipo !== 'investment') return false;
        if (!cadastros.has(id)) falhar('app/referencia-ausente');
        if (cadastros.get(id).objective !== 'Investimento') return false;
        if (!Number.isSafeInteger(centavos)) falhar('app/movimentacao-invalida');
        return true;
    });
}

export function calcularControleInvestimentos({ meses }, investimentos) {
    const cadastros = new Map(investimentos.map((item) => [item.id, item]));
    const comparados = meses.slice(-2);
    const categorias = comparados.map((mes) => mes.categoria);
    const porInvestimento = new Map();
    const totais = comparados.map((mes, indice) => {
        let total = 0;
        obterSaldosInvestimentos(mes.saldos, cadastros).forEach(({ id, centavos }) => {
            if (!porInvestimento.has(id)) porInvestimento.set(id, [0, 0]);
            porInvestimento.get(id)[indice] = centavos / 100;
            total += centavos;
            if (!Number.isSafeInteger(total)) falhar('app/movimentacao-invalida');
        });
        return total / 100;
    });
    const itens = Array.from(porInvestimento, ([id, saldos]) => {
        const cadastro = cadastros.get(id);
        const nome = typeof cadastro.nome === 'string' && cadastro.nome.trim() ? cadastro.nome.trim() : 'Investimento sem nome';
        return {
            id, nome: cadastro.isDeleted === true ? `${nome} (removido)` : nome,
            ordem: Number.isFinite(cadastro.order) ? cadastro.order : Infinity,
            ...calcularVariacaoMensal(categorias, saldos),
        };
    }).filter((item) => item.anterior !== 0 || item.atual !== 0)
        .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-BR') || a.id.localeCompare(b.id));
    return { itens, semDados: itens.length === 0, ...calcularVariacaoMensal(categorias, totais) };
}

export function calcularCarteiraInvestimentos({ categoria, itens }) {
    // A rosca distribui os saldos positivos; não transforma posições negativas em fatias.
    const posicoes = itens.map((item) => ({ id: item.id, nome: item.nome, centavos: obterCentavos(item.atual) }))
        .filter((item) => item.centavos > 0);
    const total = posicoes.reduce((soma, item) => {
        const valor = soma + item.centavos;
        if (!Number.isSafeInteger(valor)) falhar('app/movimentacao-invalida');
        return valor;
    }, 0);
    return {
        categoria,
        itens: posicoes.map(({ id, nome, centavos }) => ({ id, nome, valor: centavos / 100, percentual: centavos / total * 100 })),
        total: total / 100,
        semDados: total === 0,
    };
}

export function calcularVariacaoPatrimonial({ categorias, patrimonios }) {
    return calcularVariacaoMensal(categorias, patrimonios);
}

function calcularVariacaoMensal(categorias, valores) {
    const indice = valores.length - 1;
    const anterior = obterCentavos(valores[indice - 1]);
    const atual = obterCentavos(valores[indice]);
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
