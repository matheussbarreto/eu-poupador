import AcumulosAmortizacoesCompromissoGlobal from "../Componentes/AcumulosAmortizacoesCompromissoGlobal";
import AcumulosAmortizacoesPlanejamentoGlobal from "../Componentes/AcumulosAmortizacoesPlanejamentoGlobal";
import AportesPagamentosCompromissoMensal from "../Componentes/AportesPagamentosCompromissoMensal";
import AportesPagamentosPlanejamentoMensal from "../Componentes/AportesPagamentosPlanejamentoMensal";
import AtualDesesjadoPlanejamentoGlobal from "../Componentes/AtualDesesjadoPlanejamentoGlobal";
import RealizadoPrevistoCompromissoMensal from "../Componentes/RealizadoPrevistoCompromissoMensal";
import TituloDaPagina from "../Componentes/TituloDaPagina"

const Objetivos = () => {

    return (
        <div className="container">
            <TituloDaPagina titulo="Objetivos" />
            <AportesPagamentosPlanejamentoMensal />
            <div className="container-left">
                <AportesPagamentosCompromissoMensal />
                <RealizadoPrevistoCompromissoMensal />
            </div>
            <AcumulosAmortizacoesPlanejamentoGlobal />
            <div className="container-left">
                <AcumulosAmortizacoesCompromissoGlobal />
                <AtualDesesjadoPlanejamentoGlobal />
            </div>
        </div>
    )
}

export default Objetivos;