import { act } from "react";
import { createRoot } from "react-dom/client";
import { TextEncoder, TextDecoder } from "util";
import { observarSessao, sair } from "./services/authService";

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.IS_REACT_ACT_ENVIRONMENT = true;

// O Jest 27 do CRA não resolve o campo exports do react-router-dom 7.
// Estas APIs também são exportadas pelo pacote base, sem simular a navegação.
jest.mock("react-router-dom", () => jest.requireActual("react-router"), { virtual: true });

jest.mock("./services/authService", () => ({
    observarSessao: jest.fn(),
    sair: jest.fn(),
    obterMensagemErro: () => "Não foi possível confirmar seu acesso.",
}));
jest.mock("./Paginas/BalancoMensal", () => () => <p>Painel mensal autorizado</p>);
jest.mock("./Paginas/Objetivos", () => ({ usuarioId }) => <p>Objetivos autorizados: {usuarioId}</p>);
jest.mock("./Paginas/Resultados", () => ({ usuarioId }) => <p>Resultados autorizados: {usuarioId}</p>);

const App = require("./App").default;
let container;
let root;
let atualizarSessao;
let cancelar;

beforeEach(() => {
    jest.resetAllMocks();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    cancelar = jest.fn();
    observarSessao.mockImplementation((callback) => {
        atualizarSessao = callback;
        return cancelar;
    });
    window.history.replaceState({}, "", "/");
});

afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
});

test.each(["/", "/objetivos", "/resultados"])("protege acesso direto a %s", async (rota) => {
    window.history.replaceState({}, "", rota);
    await act(async () => root.render(<App />));
    expect(container.textContent).toContain("Verificando seu acesso");
    expect(container.querySelector("nav")).toBeNull();
    await act(async () => atualizarSessao({ usuario: null, carregando: false, erro: "" }));
    expect(window.location.pathname).toBe("/login");
    expect(container.querySelector('input[type="password"]')).not.toBeNull();
    expect(container.querySelector("nav")).toBeNull();
});

test("login autorizado abre o balanço e logout retorna ao formulário", async () => {
    window.history.replaceState({}, "", "/login");
    await act(async () => root.render(<App />));
    await act(async () => atualizarSessao({ usuario: { uid: "teste" }, carregando: false, erro: "" }));
    expect(window.location.pathname).toBe("/");
    expect(container.textContent).toContain("Painel mensal autorizado");
    sair.mockImplementation(async () => atualizarSessao({ usuario: null, carregando: false, erro: "" }));
    await act(async () => container.querySelector('button[aria-label="Sair"]').click());
    expect(sair).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe("/login");
    expect(container.querySelector("nav")).toBeNull();
});

test("falha de validação mostra o erro sem renderizar o painel", async () => {
    await act(async () => root.render(<App />));
    await act(async () => atualizarSessao({ usuario: null, carregando: false, erro: "Assinatura inativa." }));
    expect(container.querySelector('[role="alert"]').textContent).toBe("Assinatura inativa.");
    expect(container.textContent).not.toContain("Painel mensal autorizado");
});

test.each([["objetivos", "Objetivos"], ["resultados", "Resultados"]])("%s recebe o identificador da sessão e acompanha a troca de usuário", async (rota, pagina) => {
    window.history.replaceState({}, "", `/${rota}`);
    await act(async () => root.render(<App />));
    await act(async () => atualizarSessao({ usuario: { uid: "usuario-a" }, carregando: false, erro: "" }));
    expect(container.textContent).toContain(`${pagina} autorizados: usuario-a`);
    await act(async () => atualizarSessao({ usuario: { uid: "usuario-b" }, carregando: false, erro: "" }));
    expect(container.textContent).toContain(`${pagina} autorizados: usuario-b`);
    expect(container.textContent).not.toContain("usuario-a");
});

test("falha no logout informa o problema e permite tentar novamente", async () => {
    await act(async () => root.render(<App />));
    await act(async () => atualizarSessao({ usuario: { uid: "teste" }, carregando: false, erro: "" }));
    sair.mockRejectedValue(new Error("Falha ao sair"));
    await act(async () => container.querySelector('button[aria-label="Sair"]').click());
    expect(container.querySelector('[role="alert"]').textContent).toContain("Não foi possível sair");
    expect(container.querySelector('button[aria-label="Sair"]')).not.toBeNull();
});
