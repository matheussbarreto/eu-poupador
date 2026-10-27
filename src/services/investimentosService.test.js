import { collection, onSnapshot } from "firebase/firestore";
import { obterFirebase } from "./firebase";
import { observarInvestimentos } from "./investimentosService";

jest.mock("firebase/firestore", () => ({ collection: jest.fn(), onSnapshot: jest.fn() }));
jest.mock("./firebase", () => ({ obterFirebase: jest.fn() }));

beforeEach(() => {
    jest.resetAllMocks();
    obterFirebase.mockReturnValue({ db: "banco" });
    collection.mockReturnValue("objetivos");
});

test("compartilha uma consulta por usuário, com IDs dos documentos e todos os campos", () => {
    const atualizar = jest.fn();
    const falhar = jest.fn();
    const cancelar = jest.fn();
    onSnapshot.mockReturnValue(cancelar);
    const limpar = observarInvestimentos("usuario-a", atualizar, falhar);
    expect(collection).toHaveBeenCalledWith("banco", "users", "usuario-a", "investments");
    const [consulta, receber] = onSnapshot.mock.calls[0];
    expect(consulta).toBe("objetivos");
    receber({ docs: [{ id: "documento-a", data: () => ({ id: "antigo", goal: 100, current: -500, objective: "Dívida", isDeleted: true }) }] });
    expect(atualizar).toHaveBeenLastCalledWith([{ id: "documento-a", goal: 100, current: -500, objective: "Dívida", isDeleted: true }]);
    receber({ docs: [] });
    expect(atualizar).toHaveBeenLastCalledWith([]);
    expect(onSnapshot).toHaveBeenCalledTimes(1);
    expect(limpar).toBe(cancelar);
    limpar();
    expect(cancelar).toHaveBeenCalledTimes(1);
});

test("encaminha erros de acesso e leitura sem produzir dados vazios", () => {
    const atualizar = jest.fn();
    const falhar = jest.fn();
    observarInvestimentos("usuario-a", atualizar, falhar);
    const [, receber, erro] = onSnapshot.mock.calls[0];
    erro({ code: "permission-denied" });
    expect(falhar).toHaveBeenCalledWith({ code: "permission-denied" });
    const invalido = new Error("documento inválido");
    receber({ docs: [{ data: () => { throw invalido; } }] });
    expect(falhar).toHaveBeenCalledWith(invalido);
    expect(atualizar).not.toHaveBeenCalled();
});

test("não consulta sem usuário autenticado", () => {
    expect(() => observarInvestimentos("", jest.fn(), jest.fn())).toThrow("entrar");
    expect(obterFirebase).not.toHaveBeenCalled();
});
