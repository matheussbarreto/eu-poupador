import FormularioLogin from "../Componentes/FormularioLogin";

const Login = ({ verificando = false, erroSessao = "" }) => {
    return (
        <main className="login-pagina">
            <section className="login-cartao" aria-labelledby="login-titulo">
                <img className="login-logo" src="/logo_eu_poupador_200.webp" alt="Eu Poupador" width="160" height="160" />
                <h1 id="login-titulo">Bem-vindo ao Eu Poupador</h1>
                <p className="login-descricao">Seu próximo passo para cuidar melhor do seu dinheiro.</p>
                {verificando ? (
                    <p className="login-carregando" role="status">Verificando seu acesso...</p>
                ) : (
                    <FormularioLogin erroSessao={erroSessao} />
                )}
            </section>
        </main>
    );
};

export default Login;
