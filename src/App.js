import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Header from "./Componentes/Header";
import BalancoMensal from "./Paginas/BalancoMensal";
import Resultados from "./Paginas/Resultados";
import Objetivos from "./Paginas/Objetivos";
import Login from "./Paginas/Login";
import { observarSessao, obterMensagemErro, sair } from "./services/authService";

function App() {
  const [sessao, setSessao] = useState({ usuario: null, carregando: true, erro: "" });
  const [saindo, setSaindo] = useState(false);
  const [erroSaida, setErroSaida] = useState("");

  useEffect(() => {
    try {
      return observarSessao(setSessao);
    } catch (erro) {
      setSessao({ usuario: null, carregando: false, erro: obterMensagemErro(erro) });
    }
  }, []);

  const encerrarSessao = async () => {
    if (saindo) return;
    setSaindo(true);
    setErroSaida("");
    try {
      await sair();
    } catch {
      setErroSaida("Não foi possível sair. Tente novamente.");
    } finally {
      setSaindo(false);
    }
  };

  return (
    <Router>
      {sessao.carregando || saindo ? (
        <Login verificando />
      ) : sessao.usuario ? (
        <div className="App">
          <Header onSair={encerrarSessao} />
          <main className="container-main">
            {erroSaida && <p className="aviso-sessao" role="alert">{erroSaida}</p>}
            <Routes>
              <Route path="/" element={<BalancoMensal usuarioId={sessao.usuario.uid} />} />
              <Route path="/objetivos" element={<Objetivos />} />
              <Route path="/resultados" element={<Resultados />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      ) : (
        <Routes>
          <Route path="/login" element={<Login erroSessao={sessao.erro} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </Router>
  );
}

export default App;
