import { useEffect, useMemo, useState } from "react";
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
import { calcularBalancoMensal, obterPeriodoBalanco, obterMensagemErroBalanco } from "../services/balancoService";
import { observarTransacoes } from "../services/transacoesService";

const BalancoMensal = ({ usuarioId }) => {
    const [dataSelecionada, setDataSelecionada] = useState(() => new Date());
    const [consulta, setConsulta] = useState({});
    const [tentativa, setTentativa] = useState(0);
    const ano = dataSelecionada.getFullYear();
    const mes = dataSelecionada.getMonth();
    const periodo = `${usuarioId}/${ano}/${mes}`;
    const carregando = consulta.periodo !== periodo || consulta.carregando;

    useEffect(() => {
        let ativo = true;
        let cancelar;
        setConsulta({ periodo, carregando: true });

        const tratarErro = (erro) => {
            if (ativo) setConsulta({ periodo, erro: obterMensagemErroBalanco(erro), carregando: false });
        };

        try {
            const intervalo = obterPeriodoBalanco(new Date(ano, mes, 1));
            cancelar = observarTransacoes(usuarioId, intervalo, (transacoes) => {
                if (ativo) setConsulta({ periodo, transacoes, carregando: false });
            }, tratarErro);
        } catch (erro) {
            tratarErro(erro);
        }

        return () => {
            ativo = false;
            if (cancelar) cancelar();
        };
    }, [usuarioId, ano, mes, periodo, tentativa]);

    const balanco = useMemo(() => {
        if (carregando || consulta.erro || !consulta.transacoes) return {};

        // O erro deste cálculo fica restrito ao gráfico; as transações continuam disponíveis.
        try {
            return { dados: calcularBalancoMensal(consulta.transacoes, new Date(ano, mes, 1)) };
        } catch (erro) {
            return { erro: obterMensagemErroBalanco(erro) };
        }
    }, [consulta.transacoes, consulta.erro, carregando, ano, mes]);

    return (
            <div className="container">
                <TituloDaPagina titulo="Balanço Mensal" />
                <MonthSelector onDateChange={setDataSelecionada} />
                <SaldoReceitasDespesas
                    dados={balanco.dados}
                    carregando={carregando}
                    erro={carregando ? "" : consulta.erro || balanco.erro}
                    onTentarNovamente={() => setTentativa((valor) => valor + 1)}
                />
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
