import CarteiraInvestimentos from "../Componentes/CarteiraInvestimentos";
import ControleInvestimentos from "../Componentes/ControleInvestimentos";
import MonthSelector from "../Componentes/MonthSelector";
import PatrimonioAtivosPassivos from "../Componentes/PatrimonioAtivosPassivos";
import RendimentosMoeda from "../Componentes/RendimentosMoeda";
import RendimentosPercentual from "../Componentes/RendimentosPercentual";
import ResultadoAtivoPassivo from "../Componentes/ResultadoAtivoPassivo";
import ResultadoAtivos from "../Componentes/ResultadoAtivos";
import ResultadoPassivos from "../Componentes/ResultadoPassivos";
import SaldoInvestimentos from "../Componentes/SaldoInvestimentos";
import TituloDaPagina from "../Componentes/TituloDaPagina";
import VariacaoPatrimonial from "../Componentes/VariacaoPatrimonial";
import VariacaoSaldoInvestimentos from "../Componentes/VariacaoSaldoInvestimentos";
import VariacaoRendimentosMoeda from "../Componentes/VariacaoRendimentosMoeda";
import VariacaoRendimentosPercentual from "../Componentes/VariacaoRendimentosPercentual";

const Resultados = () => {
    const handleDateChange = (date) => {
        console.log("Data selecionada:", date);
    };
    
    return (
        <div className="container">
            <TituloDaPagina titulo="Resultados" />
            <MonthSelector onDateChange={handleDateChange} />
            <PatrimonioAtivosPassivos />
            <VariacaoPatrimonial />
            <ResultadoAtivos />
            <ResultadoPassivos />
            <ResultadoAtivoPassivo />
            <SaldoInvestimentos />
            <VariacaoSaldoInvestimentos />
            <ControleInvestimentos />
            <CarteiraInvestimentos />
            <RendimentosMoeda />
            <VariacaoRendimentosMoeda />
            <RendimentosPercentual />
            <VariacaoRendimentosPercentual />
        </div>
    )
}

export default Resultados;