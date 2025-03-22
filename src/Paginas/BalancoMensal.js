import "../assets/pretty.css";
import TituloDaPagina from "../Componentes/TituloDaPagina";
import MonthSelector from "../Componentes/MonthSelector";
import SaldoReceitasDespesas from "../Componentes/SaldoReceitasDespesas";
import SaldoAcumuladoPrevisto from "../Componentes/SaldoAcumuladoPrevisto";
import ReceitasRecebidoPrevistoCategoria from "../Componentes/ReceitasRecebidoPrevistoCategoria";
import ReceitasRecebidoPrevisto from "../Componentes/ReceitasRecebidoPrevisto";
import DespesasPorCategoria from "../Componentes/DespesasPorCategoria";
import DespesasPorTipo from "../Componentes/DespesasPorTipo";
import DespesasPorUtilidade from "../Componentes/DespesasPorUtilidade";
import DespesasGastoPrevistoCategoria from "../Componentes/DespesasGastoPrevistoCategoria";
import DespesasGastoPrevisto from "../Componentes/DespesasGastoPrevisto";
import DespesasPorTipoGastoPrevisto from "../Componentes/DespesasPorTipoGastoPrevisto";

const BalancoMensal = () => {
    const handleDateChange = (date) => {
        console.log("Data selecionada:", date);
    };

    return (
            <div className="container">
                <TituloDaPagina titulo="Balanço Mensal" />
                <MonthSelector onDateChange={handleDateChange} />
                <SaldoReceitasDespesas />
                <SaldoAcumuladoPrevisto />
            {/* </div>
            <div className="container"> */}
                <ReceitasRecebidoPrevistoCategoria />
                <ReceitasRecebidoPrevisto />
                <DespesasGastoPrevistoCategoria />
                <DespesasGastoPrevisto />
                <DespesasPorCategoria/>
                <DespesasPorTipo/>
                <DespesasPorUtilidade/>
                <DespesasPorTipoGastoPrevisto />

                {/* <SaldoAcumuladoPrevisto /> */}
            </div>
    );
}

export default BalancoMensal;
