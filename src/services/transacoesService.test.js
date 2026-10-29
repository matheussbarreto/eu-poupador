import { collection, onSnapshot, query, where } from "firebase/firestore";
import { obterFirebase } from "./firebase";
import { observarTransacoes, observarSaldosIniciais, observarHistoricoTransacoes } from "./transacoesService";

jest.mock("firebase/firestore", () => ({
    collection: jest.fn(),
    onSnapshot: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
}));
jest.mock("./firebase", () => ({ obterFirebase: jest.fn() }));

const intervalo = { inicio: new Date(2026, 9, 1), fim: new Date(2026, 10, 1) };

test("histórico inclui origens e movimentos antigos sem filtro mensal ou exclusão de campos ausentes", () => {
    collection.mockReturnValue("historico");
    const receber = jest.fn();
    const falhar = jest.fn();
    const cancelar = jest.fn();
    onSnapshot.mockReturnValue(cancelar);
    expect(observarHistoricoTransacoes("usuario-a", receber, falhar)).toBe(cancelar);
    expect(collection).toHaveBeenCalledWith(expect.anything(), "users", "usuario-a", "transactions");
    expect(where).not.toHaveBeenCalled();
    expect(onSnapshot).toHaveBeenCalledWith("historico", expect.any(Function), falhar);
    onSnapshot.mock.calls[0][1]({ docs: [{ id: "origem", data: () => ({ amount: -500, outgoingType: "create", date: "2020-01-01T00:00:00.000Z" }) }] });
    expect(receber.mock.calls[0][0][0]).toMatchObject({ id: "origem", amount: -500 });
});

test("histórico exige usuário autenticado", () => {
    expect(() => observarHistoricoTransacoes("", jest.fn(), jest.fn())).toThrow("entrar");
    expect(onSnapshot).not.toHaveBeenCalled();
});

test("saldos iniciais usam uma única consulta de criação por usuário, independente de período", () => {
    collection.mockReturnValue("transacoes");
    where.mockImplementation((...args) => args);
    query.mockReturnValue("criacao");
    const cancelar = jest.fn();
    onSnapshot.mockReturnValue(cancelar);
    const receber = jest.fn();
    const falhar = jest.fn();
    expect(observarSaldosIniciais("usuario-a", receber, falhar)).toBe(cancelar);
    expect(collection).toHaveBeenCalledWith(expect.anything(), "users", "usuario-a", "transactions");
    expect(query).toHaveBeenCalledWith("transacoes", ["outgoingType", "==", "create"]);
    expect(where).toHaveBeenCalledTimes(1);
    const [, atualizar, erro] = onSnapshot.mock.calls[0];
    atualizar({ docs: [{ id: "origem", data: () => ({ id: "antigo", amount: -1000, inID: "d", isDeleted: true }) }] });
    expect(receber).toHaveBeenCalledWith([{ id: "origem", amount: -1000, inID: "d", isDeleted: true }]);
    atualizar({ docs: [] });
    expect(receber).toHaveBeenLastCalledWith([]);
    erro({ code: "unavailable" });
    expect(falhar).toHaveBeenCalledWith({ code: "unavailable" });
    cancelar();
    expect(cancelar).toHaveBeenCalledTimes(1);
});

test("saldos iniciais exigem sessão e encaminham falhas de leitura", () => {
    expect(() => observarSaldosIniciais("", jest.fn(), jest.fn())).toThrow("entrar");
    expect(onSnapshot).not.toHaveBeenCalled();
    const falhar = jest.fn();
    observarSaldosIniciais("usuario-a", jest.fn(), falhar);
    const erro = new Error("leitura inválida");
    onSnapshot.mock.calls[0][1]({ docs: [{ data: () => { throw erro; } }] });
    expect(falhar).toHaveBeenCalledWith(erro);
});

beforeEach(() => {
    jest.resetAllMocks();
    obterFirebase.mockReturnValue({ db: {} });
});

test("consulta somente o usuário e o intervalo solicitado, entregando atualizações e cancelamento", () => {
    const db = {};
    const cancelar = jest.fn();
    const atualizar = jest.fn();
    const tratarErro = jest.fn();
    obterFirebase.mockReturnValue({ db });
    collection.mockReturnValue("colecao-transacoes");
    where.mockImplementation((...argumentos) => argumentos);
    query.mockReturnValue("consulta-periodo");
    onSnapshot.mockReturnValue(cancelar);

    const limpar = observarTransacoes("usuario-autenticado", intervalo, atualizar, tratarErro);
    expect(collection).toHaveBeenCalledWith(db, "users", "usuario-autenticado", "transactions");
    expect(query).toHaveBeenCalledWith("colecao-transacoes",
        ["date", ">=", intervalo.inicio.toISOString()],
        ["date", "<", intervalo.fim.toISOString()]);
    expect(onSnapshot).toHaveBeenCalledWith("consulta-periodo", expect.any(Function), tratarErro);

    const [, receber] = onSnapshot.mock.calls[0];
    receber({ docs: [{ id: "transacao-1", data: () => ({ amount: 90 }) }] });
    expect(atualizar).toHaveBeenLastCalledWith([{ id: "transacao-1", amount: 90 }]);
    receber({ docs: [{ id: "transacao-1", data: () => ({ amount: 120 }) }] });
    expect(atualizar).toHaveBeenLastCalledWith([{ id: "transacao-1", amount: 120 }]);
    expect(tratarErro).not.toHaveBeenCalled();
    expect(limpar).toBe(cancelar);
    limpar();
    expect(cancelar).toHaveBeenCalledTimes(1);
});

test("preserva os campos e os IDs dos documentos sem aplicar regras de um gráfico", () => {
    const atualizar = jest.fn();
    const tratarErro = jest.fn();
    const registros = [
        { outgoingType: "income", amount: "100.50", inID: "conta-1" },
        { outgoingType: "account", incomingType: "expense", amount: 30, isDeleted: true },
        { outgoingType: "create", amount: 500 },
        { outgoingType: "income", amount: "inválido", id: "id-antigo" },
    ];
    observarTransacoes("usuario-autenticado", intervalo, atualizar, tratarErro);
    const [, receber] = onSnapshot.mock.calls[0];
    receber({ docs: registros.map((registro, indice) => ({ id: `documento-${indice}`, data: () => registro })) });

    expect(atualizar).toHaveBeenCalledWith(registros.map((registro, indice) => ({ ...registro, id: `documento-${indice}` })));
    expect(registros[0].id).toBeUndefined();
    expect(registros[3].id).toBe("id-antigo");
    expect(tratarErro).not.toHaveBeenCalled();
});

test("consulta vazia entrega uma lista vazia", () => {
    const atualizar = jest.fn();
    const tratarErro = jest.fn();
    observarTransacoes("usuario-autenticado", intervalo, atualizar, tratarErro);
    const [, receber] = onSnapshot.mock.calls[0];
    receber({ docs: [] });
    expect(atualizar).toHaveBeenCalledWith([]);
    expect(tratarErro).not.toHaveBeenCalled();
});

test("encaminha erros do Firebase sem convertê-los em uma lista vazia", () => {
    const atualizar = jest.fn();
    const tratarErro = jest.fn();
    observarTransacoes("usuario-autenticado", intervalo, atualizar, tratarErro);
    const [, , falhar] = onSnapshot.mock.calls[0];
    falhar({ code: "permission-denied" });
    expect(tratarErro).toHaveBeenCalledWith({ code: "permission-denied" });
    expect(atualizar).not.toHaveBeenCalled();
});

test("não consulta sem usuário autenticado", () => {
    expect(() => observarTransacoes("", intervalo, jest.fn(), jest.fn())).toThrow("entrar");
    expect(obterFirebase).not.toHaveBeenCalled();
    expect(collection).not.toHaveBeenCalled();
    expect(onSnapshot).not.toHaveBeenCalled();
});
