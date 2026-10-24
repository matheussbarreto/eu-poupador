import { collection, onSnapshot } from "firebase/firestore";
import { obterFirebase } from "./firebase";

export function observarPrevisoes(usuarioId, atualizarPrevisoes, tratarErro) {
    if (!usuarioId) throw new Error("É necessário entrar para consultar as previsões.");

    const { db } = obterFirebase();
    const dados = {};
    const cancelamentos = [];
    let ativo = true;

    const cancelar = () => {
        ativo = false;
        cancelamentos.splice(0).forEach((encerrar) => encerrar());
    };
    const falhar = (erro) => {
        if (!ativo) return;
        cancelar();
        tratarErro(erro);
    };

    try {
        [["incomes", "receitas"], ["expenses", "despesas"]].forEach(([colecao, campo]) => {
            if (!ativo) return;
            const encerrar = onSnapshot(collection(db, "users", usuarioId, colecao), (snapshot) => {
                if (!ativo) return;
                try {
                    dados[campo] = snapshot.docs.map((documento) => ({ ...documento.data(), id: documento.id }));
                    // Aguarda as duas fontes para não exibir um saldo previsto parcial.
                    if (dados.receitas && dados.despesas) atualizarPrevisoes({ ...dados });
                } catch (erro) {
                    falhar(erro);
                }
            }, falhar);
            if (!ativo) {
                encerrar();
                return;
            }
            cancelamentos.push(encerrar);
        });
    } catch (erro) {
        cancelar();
        throw erro;
    }

    return cancelar;
}
