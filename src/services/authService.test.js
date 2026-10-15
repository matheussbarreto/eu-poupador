import { onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getDocFromServer } from "firebase/firestore";
import { obterFirebase } from "./firebase";
import { entrar, observarSessao, recuperarSenha, validarAssinatura } from "./authService";

jest.mock("firebase/auth", () => ({
    onAuthStateChanged: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
}));
jest.mock("firebase/firestore", () => ({
    doc: jest.fn(),
    getDocFromServer: jest.fn(),
}));
jest.mock("./firebase", () => ({ obterFirebase: jest.fn() }));

let auth;
let usuario;
let receberUsuario;
let cancelar;

beforeEach(() => {
    jest.resetAllMocks();
    receberUsuario = null;
    usuario = { uid: "usuario-teste", getIdTokenResult: jest.fn().mockResolvedValue({ claims: {} }) };
    auth = { currentUser: usuario };
    obterFirebase.mockReturnValue({ auth, db: {} });
    getDocFromServer.mockResolvedValue({ exists: () => true, data: () => ({ subscription: { status: "active" } }) });
    cancelar = jest.fn();
    onAuthStateChanged.mockImplementation((auth, callback) => {
        receberUsuario = callback;
        return cancelar;
    });
    signOut.mockImplementation(async () => {
        auth.currentUser = null;
        if (receberUsuario) await receberUsuario(null);
    });
});

test("aceita claim premium booleano e atualiza o token antes de liberar", async () => {
    usuario.getIdTokenResult.mockResolvedValue({ claims: { isPremium: true } });
    await expect(validarAssinatura(usuario)).resolves.toBeUndefined();
    expect(usuario.getIdTokenResult).toHaveBeenCalledWith(true);
    expect(getDocFromServer).not.toHaveBeenCalled();
});

test("aceita assinatura ativa no servidor quando o claim está ausente", async () => {
    await expect(validarAssinatura(usuario)).resolves.toBeUndefined();
    expect(getDocFromServer).toHaveBeenCalledTimes(1);
});

test.each(["canceled", "expired", "past_due", undefined])("recusa assinatura %s", async (status) => {
    getDocFromServer.mockResolvedValue({ exists: () => true, data: () => ({ subscription: { status } }) });
    await expect(validarAssinatura(usuario)).rejects.toMatchObject({ code: "auth/assinatura-inativa" });
});

test("texto no claim e documento inexistente não concedem acesso", async () => {
    usuario.getIdTokenResult.mockResolvedValue({ claims: { isPremium: "true" } });
    getDocFromServer.mockResolvedValue({ exists: () => false });
    await expect(validarAssinatura(usuario)).rejects.toMatchObject({ code: "auth/assinatura-inativa" });
});

test("restauração da sessão mantém o painel bloqueado até a confirmação", async () => {
    let confirmar;
    usuario.getIdTokenResult.mockReturnValue(new Promise((resolve) => { confirmar = resolve; }));
    const atualizar = jest.fn();
    observarSessao(atualizar);
    const validacao = receberUsuario(usuario);
    expect(atualizar).toHaveBeenLastCalledWith({ usuario: null, carregando: true, erro: "" });
    confirmar({ claims: { isPremium: true } });
    await validacao;
    expect(atualizar).toHaveBeenLastCalledWith({ usuario, carregando: false, erro: "" });
});

test.each(["permission-denied", "unavailable", "auth/network-request-failed"])("falha %s bloqueia e encerra a sessão", async (code) => {
    getDocFromServer.mockRejectedValue({ code });
    const atualizar = jest.fn();
    observarSessao(atualizar);
    await receberUsuario(usuario);
    expect(signOut).toHaveBeenCalledWith(auth);
    expect(atualizar).toHaveBeenLastCalledWith({ usuario: null, carregando: false, erro: expect.any(String) });
    expect(atualizar.mock.calls.every(([sessao]) => sessao.usuario === null)).toBe(true);
});

test("preserva a orientação de assinatura após o evento de logout", async () => {
    getDocFromServer.mockResolvedValue({ exists: () => false });
    const atualizar = jest.fn();
    observarSessao(atualizar);
    await receberUsuario(usuario);
    expect(atualizar).toHaveBeenLastCalledWith({ usuario: null, carregando: false, erro: expect.stringContaining("assinatura ativa") });
});

test("logout durante a validação impede que uma resposta atrasada reabra o painel", async () => {
    let confirmar;
    usuario.getIdTokenResult.mockReturnValue(new Promise((resolve) => { confirmar = resolve; }));
    const atualizar = jest.fn();
    observarSessao(atualizar);
    const validacao = receberUsuario(usuario);
    await signOut(auth);
    confirmar({ claims: { isPremium: true } });
    await validacao;
    expect(atualizar).toHaveBeenLastCalledWith({ usuario: null, carregando: false, erro: "" });
    expect(atualizar.mock.calls.every(([sessao]) => sessao.usuario === null)).toBe(true);
});

test("falha atrasada de outra conta não encerra a sessão atual", async () => {
    let recusar;
    usuario.getIdTokenResult.mockReturnValue(new Promise((resolve, reject) => { recusar = reject; }));
    const atualizar = jest.fn();
    observarSessao(atualizar);
    const validacaoAntiga = receberUsuario(usuario);
    const outroUsuario = { uid: "outro", getIdTokenResult: jest.fn().mockResolvedValue({ claims: { isPremium: true } }) };
    auth.currentUser = outroUsuario;
    await receberUsuario(outroUsuario);
    recusar({ code: "auth/network-request-failed" });
    await validacaoAntiga;
    expect(signOut).not.toHaveBeenCalled();
    expect(atualizar).toHaveBeenLastCalledWith({ usuario: outroUsuario, carregando: false, erro: "" });
});

test("desmontagem cancela a observação e ignora validação pendente", async () => {
    let confirmar;
    usuario.getIdTokenResult.mockReturnValue(new Promise((resolve) => { confirmar = resolve; }));
    const atualizar = jest.fn();
    const limpar = observarSessao(atualizar);
    const validacao = receberUsuario(usuario);
    limpar();
    atualizar.mockClear();
    confirmar({ claims: { isPremium: true } });
    await validacao;
    expect(cancelar).toHaveBeenCalledTimes(1);
    expect(atualizar).not.toHaveBeenCalled();
});

test("mantém o acesso bloqueado mesmo se o encerramento da sessão falhar", async () => {
    getDocFromServer.mockResolvedValue({ exists: () => false });
    signOut.mockRejectedValue(new Error("Falha ao sair"));
    const atualizar = jest.fn();
    observarSessao(atualizar);
    await receberUsuario(usuario);
    expect(atualizar).toHaveBeenLastCalledWith({ usuario: null, carregando: false, erro: expect.stringContaining("encerrar a sessão") });
});

test("login normaliza o e-mail e preserva a senha exatamente como digitada", async () => {
    await entrar("  Pessoa@Exemplo.com  ", " senha com espaços ");
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(auth, "pessoa@exemplo.com", " senha com espaços ");
});

test("nova tentativa de login encerra uma sessão que permaneceu sem autorização", async () => {
    await entrar("pessoa@exemplo.com", "senha");
    expect(signOut).toHaveBeenCalledWith(auth);
    expect(signInWithEmailAndPassword).toHaveBeenCalledTimes(1);
    expect(auth.currentUser).toBeNull();
});

test("recuperação não revela se o e-mail existe", async () => {
    sendPasswordResetEmail.mockRejectedValue({ code: "auth/user-not-found" });
    await expect(recuperarSenha("  Pessoa@Exemplo.com ")).resolves.toBeUndefined();
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(auth, "pessoa@exemplo.com");
});

test("recuperação informa falhas de rede", async () => {
    sendPasswordResetEmail.mockRejectedValue({ code: "auth/network-request-failed" });
    await expect(recuperarSenha("pessoa@exemplo.com")).rejects.toMatchObject({ code: "auth/network-request-failed" });
});
