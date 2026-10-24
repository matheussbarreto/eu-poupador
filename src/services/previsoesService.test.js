import { collection, onSnapshot } from "firebase/firestore";
import { obterFirebase } from "./firebase";
import { observarPrevisoes } from "./previsoesService";

jest.mock("firebase/firestore", () => ({ collection: jest.fn(), onSnapshot: jest.fn() }));
jest.mock("./firebase", () => ({ obterFirebase: jest.fn() }));

let consultas;
const snapshot = (valor) => ({ docs: [{ id: "documento-1", data: () => ({ id: "antigo", expected: valor }) }] });

beforeEach(() => {
    jest.resetAllMocks();
    consultas = [];
    obterFirebase.mockReturnValue({ db: "banco" });
    collection.mockImplementation((db, ...caminho) => caminho.join("/"));
    onSnapshot.mockImplementation((caminho, receber, falhar) => {
        const cancelar = jest.fn();
        consultas.push({ caminho, receber, falhar, cancelar });
        return cancelar;
    });
});

test("aguarda as duas coleções do usuário e compartilha atualizações com os IDs corretos", () => {
    const atualizar = jest.fn();
    observarPrevisoes("usuario-a", atualizar, jest.fn());
    expect(consultas.map((consulta) => consulta.caminho)).toEqual(["users/usuario-a/incomes", "users/usuario-a/expenses"]);
    consultas[1].receber(snapshot(40));
    expect(atualizar).not.toHaveBeenCalled();
    consultas[0].receber(snapshot(100));
    expect(atualizar).toHaveBeenLastCalledWith({
        receitas: [{ id: "documento-1", expected: 100 }], despesas: [{ id: "documento-1", expected: 40 }],
    });
    consultas[0].receber(snapshot(200));
    expect(atualizar.mock.calls[1][0].receitas[0].expected).toBe(200);
    expect(atualizar.mock.calls[0][0].receitas[0].expected).toBe(100);
    expect(consultas).toHaveLength(2);
});

test("coleções vazias são dados válidos e o cancelamento ignora respostas atrasadas", () => {
    const atualizar = jest.fn();
    const falhar = jest.fn();
    const cancelar = observarPrevisoes("usuario-a", atualizar, falhar);
    consultas.forEach((consulta) => consulta.receber({ docs: [] }));
    expect(atualizar).toHaveBeenCalledWith({ receitas: [], despesas: [] });
    cancelar();
    cancelar();
    consultas.forEach((consulta) => {
        expect(consulta.cancelar).toHaveBeenCalledTimes(1);
        consulta.receber(snapshot(999));
        consulta.falhar(new Error("resposta antiga"));
    });
    expect(atualizar).toHaveBeenCalledTimes(1);
    expect(falhar).not.toHaveBeenCalled();
});

test("falha de uma fonte encerra as duas consultas sem publicar totais parciais", () => {
    const atualizar = jest.fn();
    const falhar = jest.fn();
    const cancelar = observarPrevisoes("usuario-a", atualizar, falhar);
    consultas[0].receber(snapshot(100));
    consultas[1].falhar({ code: "permission-denied" });
    consultas[1].receber(snapshot(50));
    cancelar();
    expect(atualizar).not.toHaveBeenCalled();
    expect(falhar).toHaveBeenCalledWith({ code: "permission-denied" });
    consultas.forEach((consulta) => expect(consulta.cancelar).toHaveBeenCalledTimes(1));
});

test("falha ao iniciar a segunda consulta encerra a primeira", () => {
    const encerrar = jest.fn();
    onSnapshot.mockImplementationOnce(() => encerrar).mockImplementationOnce(() => { throw new Error("inicialização"); });
    expect(() => observarPrevisoes("usuario-a", jest.fn(), jest.fn())).toThrow("inicialização");
    expect(encerrar).toHaveBeenCalledTimes(1);
});

test("erro imediato encerra a consulta e não inicia a próxima fonte", () => {
    const encerrar = jest.fn();
    const falhar = jest.fn();
    onSnapshot.mockImplementationOnce((caminho, receber, erro) => {
        erro({ code: "unavailable" });
        return encerrar;
    });
    observarPrevisoes("usuario-a", jest.fn(), falhar);
    expect(onSnapshot).toHaveBeenCalledTimes(1);
    expect(encerrar).toHaveBeenCalledTimes(1);
    expect(falhar).toHaveBeenCalledWith({ code: "unavailable" });
});

test("não consulta sem usuário autenticado", () => {
    expect(() => observarPrevisoes("", jest.fn(), jest.fn())).toThrow("entrar");
    expect(obterFirebase).not.toHaveBeenCalled();
});
