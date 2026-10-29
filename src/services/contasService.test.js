import { collection, onSnapshot } from "firebase/firestore";
import { obterFirebase } from "./firebase";
import { observarContas } from "./contasService";

jest.mock("firebase/firestore", () => ({ collection: jest.fn(), onSnapshot: jest.fn() }));
jest.mock("./firebase", () => ({ obterFirebase: jest.fn() }));
beforeEach(() => { jest.resetAllMocks(); obterFirebase.mockReturnValue({ db: "banco" }); });

test("consulta contas somente do usuário, preserva campos e entrega atualizações e cancelamento", () => {
    const receber = jest.fn();
    const falhar = jest.fn();
    const cancelar = jest.fn();
    onSnapshot.mockReturnValue(cancelar);
    expect(observarContas("usuario-a", receber, falhar)).toBe(cancelar);
    expect(collection).toHaveBeenCalledWith("banco", "users", "usuario-a", "accounts");
    const [, atualizar, erro] = onSnapshot.mock.calls[0];
    atualizar({ docs: [{ id: "conta", data: () => ({ id: "antigo", balance: -100, type: "Cartão", isDeleted: true }) }] });
    expect(receber).toHaveBeenCalledWith([{ id: "conta", balance: -100, type: "Cartão", isDeleted: true }]);
    atualizar({ docs: [] });
    expect(receber).toHaveBeenLastCalledWith([]);
    erro({ code: "permission-denied" });
    expect(falhar).toHaveBeenCalledWith({ code: "permission-denied" });
    const invalido = new Error("leitura");
    atualizar({ docs: [{ data: () => { throw invalido; } }] });
    expect(falhar).toHaveBeenCalledWith(invalido);
});

test("não inicia leitura sem sessão", () => {
    expect(() => observarContas("", jest.fn(), jest.fn())).toThrow("entrar");
    expect(obterFirebase).not.toHaveBeenCalled();
});
