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
