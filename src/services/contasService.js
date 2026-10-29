import { collection, onSnapshot } from "firebase/firestore";
import { obterFirebase } from "./firebase";

export function observarContas(usuarioId, atualizarContas, tratarErro) {
    if (!usuarioId) throw new Error("É necessário entrar para consultar as contas.");

    const { db } = obterFirebase();
    return onSnapshot(collection(db, "users", usuarioId, "accounts"), (snapshot) => {
        try {
            atualizarContas(snapshot.docs.map((documento) => ({ ...documento.data(), id: documento.id })));
        } catch (erro) {
            tratarErro(erro);
        }
    }, tratarErro);
}
