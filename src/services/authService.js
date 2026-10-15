import { onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDocFromServer } from "firebase/firestore";
import { obterFirebase } from "./firebase";

export function obterMensagemErro(erro) {
    switch (erro?.code) {
        case "auth/invalid-email":
            return "Informe um e-mail válido.";
        case "auth/invalid-credential":
        case "auth/invalid-login-credentials":
        case "auth/user-not-found":
        case "auth/wrong-password":
            return "E-mail ou senha incorretos. Confira os dados e tente novamente.";
        case "auth/user-disabled":
            return "Esta conta está desativada. Entre em contato com o suporte.";
        case "auth/too-many-requests":
            return "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.";
        case "auth/network-request-failed":
        case "unavailable":
            return "Não foi possível conectar. Verifique sua internet e tente novamente.";
        case "auth/assinatura-inativa":
            return "Seu acesso exige uma assinatura ativa. Assine ou regularize seu plano para entrar.";
        case "permission-denied":
            return "Não foi possível confirmar seu acesso. Entre em contato com o suporte.";
        default:
            return "Não foi possível concluir o acesso. Tente novamente em instantes.";
    }
}

export async function validarAssinatura(usuario) {
    const token = await usuario.getIdTokenResult(true);
    if (token.claims.isPremium === true) return;

    const { db } = obterFirebase();
    // A autorização deve usar o estado do servidor, sem aceitar uma cópia antiga do cache.
    const documento = await getDocFromServer(doc(db, "users", usuario.uid));
    if (documento.exists() && documento.data().subscription?.status === "active") return;

    const erro = new Error("Assinatura inativa.");
    erro.code = "auth/assinatura-inativa";
    throw erro;
}

export async function entrar(email, senha) {
    const { auth } = obterFirebase();
    // Permite uma nova validação mesmo após uma falha ao encerrar a sessão anterior.
    if (auth.currentUser) await signOut(auth);
    // A liberação do painel acontece somente após a validação em observarSessao.
    return signInWithEmailAndPassword(auth, email.trim().toLowerCase(), senha);
}

export async function recuperarSenha(email) {
    const { auth } = obterFirebase();
    try {
        await sendPasswordResetEmail(auth, email.trim().toLowerCase());
    } catch (erro) {
        // A resposta é a mesma para e-mails cadastrados ou não cadastrados.
        if (erro.code !== "auth/user-not-found") throw erro;
    }
}

export function sair() {
    const { auth } = obterFirebase();
    return signOut(auth);
}

export function observarSessao(atualizarSessao) {
    const { auth } = obterFirebase();
    let ativo = true;
    let versao = 0;
    let erroSessao = "";

    const cancelar = onAuthStateChanged(auth, async (usuario) => {
        const versaoAtual = ++versao;
        if (!ativo) return;

        if (!usuario) {
            atualizarSessao({ usuario: null, carregando: false, erro: erroSessao });
            return;
        }

        erroSessao = "";
        atualizarSessao({ usuario: null, carregando: true, erro: "" });

        try {
            await validarAssinatura(usuario);
            // Ignora respostas que chegaram depois do logout, troca de conta ou desmontagem.
            if (ativo && versaoAtual === versao && auth.currentUser === usuario) {
                atualizarSessao({ usuario, carregando: false, erro: "" });
            }
        } catch (erro) {
            if (!ativo || versaoAtual !== versao || auth.currentUser !== usuario) return;

            erroSessao = obterMensagemErro(erro);
            try {
                // Mantém o carregamento até concluir a saída, evitando outro login durante ela.
                await signOut(auth);
            } catch {
                if (ativo && versaoAtual === versao) {
                    atualizarSessao({
                        usuario: null,
                        carregando: false,
                        erro: `${erroSessao} Não foi possível encerrar a sessão. Tente entrar novamente.`,
                    });
                }
            }
        }
    }, (erro) => {
        if (ativo) {
            ++versao;
            atualizarSessao({ usuario: null, carregando: false, erro: obterMensagemErro(erro) });
        }
    });

    return () => {
        ativo = false;
        ++versao;
        cancelar();
    };
}
