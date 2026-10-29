import { collection, onSnapshot, query, where } from "firebase/firestore";
import { obterFirebase } from "./firebase";

export function observarTransacoes(usuarioId, { inicio, fim }, atualizarTransacoes, tratarErro) {
    if (!usuarioId) throw new Error("É necessário entrar para consultar os lançamentos.");

    const { db } = obterFirebase();
    // As datas são strings ISO UTC no modelo do aplicativo; o limite final é exclusivo.
    const consulta = query(
        collection(db, "users", usuarioId, "transactions"),
        where("date", ">=", inicio.toISOString()),
        where("date", "<", fim.toISOString()),
    );

    return observarConsulta(consulta, atualizarTransacoes, tratarErro);
}

export function observarSaldosIniciais(usuarioId, atualizarTransacoes, tratarErro) {
    if (!usuarioId) throw new Error("É necessário entrar para consultar os lançamentos.");

    const { db } = obterFirebase();
    // Uma consulta compartilhada dos registros de criação, sem ler todo o histórico.
    const consulta = query(collection(db, "users", usuarioId, "transactions"), where("outgoingType", "==", "create"));
    return observarConsulta(consulta, atualizarTransacoes, tratarErro);
}

export function observarHistoricoTransacoes(usuarioId, atualizarTransacoes, tratarErro) {
    if (!usuarioId) throw new Error("É necessário entrar para consultar os lançamentos.");

    const { db } = obterFirebase();
    // O patrimônio precisa das origens e das movimentações anteriores à janela do gráfico.
    // Uma leitura compartilhada permite trocar de mês sem consultar novamente o histórico.
    return observarConsulta(collection(db, "users", usuarioId, "transactions"), atualizarTransacoes, tratarErro);
}

function observarConsulta(consulta, atualizarTransacoes, tratarErro) {
    return onSnapshot(consulta, (snapshot) => {
        try {
            // Cada cálculo decide quais registros incluir, inclusive os que não têm isDeleted.
            const transacoes = snapshot.docs.map((documento) => ({ ...documento.data(), id: documento.id }));
            atualizarTransacoes(transacoes);
        } catch (erro) {
            tratarErro(erro);
        }
    }, tratarErro);
}
