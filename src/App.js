import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./Componentes/Header";
import BalancoMensal from "./Paginas/BalancoMensal";
import Resultados from "./Paginas/Resultados";
import Objetivos from "./Paginas/Objetivos";

function App() {

  return (
    <Router>
      <div className="App">
        <Header />
        <main className="container-main">
          <Routes>
            <Route path="/" element={<BalancoMensal />} />
            <Route path="/objetivos" element={<Objetivos />} />
            <Route path="/resultados" element={<Resultados />} />
          </Routes>
          <div className="conteiner">
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
