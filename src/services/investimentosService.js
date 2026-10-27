import { collection, onSnapshot } from "firebase/firestore";
import { obterFirebase } from "./firebase";

export function observarInvestimentos(usuarioId, atualizarInvestimentos, tratarErro) {
    if (!usuarioId) throw new Error("É necessário entrar para consultar os objetivos.");

    const { db } = obterFirebase();
    return onSnapshot(collection(db, "users", usuarioId, "investments"), (snapshot) => {
        try {
            // Mantém os campos para os cálculos mensais e globais da página.
            atualizarInvestimentos(snapshot.docs.map((documento) => ({ ...documento.data(), id: documento.id })));
        } catch (erro) {
            tratarErro(erro);
        }
    }, tratarErro);
}
