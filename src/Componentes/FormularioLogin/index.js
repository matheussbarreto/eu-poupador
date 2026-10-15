import { useRef, useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { entrar, obterMensagemErro, recuperarSenha } from "../../services/authService";
import "./FormularioLogin.css";

const FormularioLogin = ({ erroSessao = "" }) => {
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [recuperando, setRecuperando] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState("");
    const [aviso, setAviso] = useState("");
    const requisicaoEmAndamento = useRef(false);
    const campoEmail = useRef(null);

    const enviarFormulario = async (event) => {
        event.preventDefault();
        if (requisicaoEmAndamento.current) return;

        requisicaoEmAndamento.current = true;
        setEnviando(true);
        setErro("");
        setAviso("");

        try {
            if (recuperando) {
                await recuperarSenha(email);
                setAviso("Se este e-mail estiver cadastrado, você receberá as instruções para redefinir sua senha. Confira também a caixa de spam.");
            } else {
                await entrar(email, senha);
            }
        } catch (falha) {
            setErro(obterMensagemErro(falha));
        } finally {
            requisicaoEmAndamento.current = false;
            setEnviando(false);
        }
    };

    const alternarRecuperacao = () => {
        setRecuperando(!recuperando);
        setSenha("");
        setMostrarSenha(false);
        setErro("");
        setAviso("");
        campoEmail.current?.focus();
    };

    const mensagemErro = erro || (!recuperando ? erroSessao : "");

    return (
        <form className="login-formulario" onSubmit={enviarFormulario} aria-busy={enviando}>
            {recuperando && <p className="login-instrucao">Informe seu e-mail para recuperar a senha.</p>}

            <div className="login-campo">
                <label htmlFor="login-email">E-mail</label>
                <input
                    ref={campoEmail}
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="seuemail@exemplo.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    onBlur={() => setEmail(email.trim())}
                    disabled={enviando}
                    required
                />
            </div>

            {!recuperando && (
                <div className="login-campo">
                    <label htmlFor="login-senha">Senha</label>
                    <div className="login-senha">
                        <input
                            id="login-senha"
                            name="senha"
                            type={mostrarSenha ? "text" : "password"}
                            autoComplete="current-password"
                            placeholder="Digite sua senha"
                            value={senha}
                            onChange={(event) => setSenha(event.target.value)}
                            disabled={enviando}
                            required
                        />
                        <button
                            className="login-mostrar-senha"
                            type="button"
                            onClick={() => setMostrarSenha(!mostrarSenha)}
                            aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                            aria-pressed={mostrarSenha}
                            aria-controls="login-senha"
                            disabled={enviando}
                        >
                            {mostrarSenha ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
                        </button>
                    </div>
                </div>
            )}

            {mensagemErro && <p className="login-mensagem login-erro" role="alert">{mensagemErro}</p>}
            {aviso && <p className="login-mensagem login-aviso" role="status">{aviso}</p>}

            <button className="login-entrar" type="submit" disabled={enviando}>
                {enviando ? (recuperando ? "Enviando..." : "Entrando...") : (recuperando ? "Enviar instruções" : "Entrar")}
            </button>
            <button className="login-recuperar" type="button" onClick={alternarRecuperacao} disabled={enviando}>
                {recuperando ? "Voltar para o login" : "Esqueci minha senha"}
            </button>
            <p className="login-assinatura">Acesso exclusivo para assinantes do Eu Poupador.</p>
        </form>
    );
};

export default FormularioLogin;
