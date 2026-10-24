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
import { calcularBalancoMensal, calcularSaldoAcumuladoPrevisto, calcularReceitasPorFonte, obterPeriodoBalanco, obterMensagemErroBalanco, obterMensagemErroPrevisoes } from "../services/balancoService";
import { observarTransacoes } from "../services/transacoesService";
import { observarPrevisoes } from "../services/previsoesService";

const BalancoMensal = ({ usuarioId }) => {
    const [dataSelecionada, setDataSelecionada] = useState(() => new Date());
    const [consulta, setConsulta] = useState({});
    const [tentativa, setTentativa] = useState(0);
    const [previsoes, setPrevisoes] = useState({});
    const [tentativaPrevisoes, setTentativaPrevisoes] = useState(0);
    const ano = dataSelecionada.getFullYear();
    const mes = dataSelecionada.getMonth();
    const periodo = `${usuarioId}/${ano}/${mes}`;
    const carregando = consulta.periodo !== periodo || consulta.carregando;
    const carregandoPrevisoes = previsoes.usuarioId !== usuarioId || previsoes.carregando;

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

    useEffect(() => {
        let ativo = true;
        let cancelar;
        setPrevisoes({ usuarioId, carregando: true });
        const tratarErro = (erro) => {
            if (ativo) setPrevisoes({ usuarioId, erro: obterMensagemErroPrevisoes(erro), carregando: false });
        };
        try {
            cancelar = observarPrevisoes(usuarioId, (dados) => {
                if (ativo) setPrevisoes({ usuarioId, dados, carregando: false });
            }, tratarErro);
        } catch (erro) {
            tratarErro(erro);
        }
        return () => {
            ativo = false;
            if (cancelar) cancelar();
        };
    }, [usuarioId, tentativaPrevisoes]);

    const balanco = useMemo(() => {
        if (carregando || consulta.erro || !consulta.transacoes) return {};

        // Um erro de cálculo não descarta as transações compartilhadas.
        try {
            return { dados: calcularBalancoMensal(consulta.transacoes, new Date(ano, mes, 1)) };
        } catch (erro) {
            return { erro: obterMensagemErroBalanco(erro) };
        }
    }, [consulta.transacoes, consulta.erro, carregando, ano, mes]);

    const saldoPrevisto = useMemo(() => {
        if (carregando || carregandoPrevisoes || previsoes.erro || !previsoes.dados || !balanco.dados) return {};
        try {
            return { dados: calcularSaldoAcumuladoPrevisto(balanco.dados, previsoes.dados, new Date(ano, mes, 1)) };
        } catch (erro) {
            return { erro: obterMensagemErroPrevisoes(erro) };
        }
    }, [balanco.dados, previsoes.dados, previsoes.erro, carregando, carregandoPrevisoes, ano, mes]);

    const receitasPorFonte = useMemo(() => {
        if (carregando || carregandoPrevisoes || consulta.erro || previsoes.erro || !consulta.transacoes || !previsoes.dados) return {};
        try {
            return { dados: calcularReceitasPorFonte(consulta.transacoes, previsoes.dados.receitas, new Date(ano, mes, 1)) };
        } catch (erro) {
            const erroPrevisao = erro.code === "app/previsao-invalida";
            return {
                erro: erroPrevisao ? obterMensagemErroPrevisoes(erro) : obterMensagemErroBalanco(erro),
                origemErro: erroPrevisao ? "previsoes" : "transacoes",
            };
        }
    }, [consulta.transacoes, consulta.erro, previsoes.dados, previsoes.erro, carregando, carregandoPrevisoes, ano, mes]);

    const erroBalanco = carregando ? "" : consulta.erro || balanco.erro;
    const erroComparacao = erroBalanco || (!carregandoPrevisoes && previsoes.erro) || saldoPrevisto.erro;
    const erroReceitas = (!carregando && consulta.erro) || (!carregandoPrevisoes && previsoes.erro) || receitasPorFonte.erro;
    const tentarComparacaoNovamente = () => {
        if (erroBalanco) setTentativa((valor) => valor + 1);
        if (previsoes.erro || saldoPrevisto.erro) setTentativaPrevisoes((valor) => valor + 1);
    };
    const tentarReceitasNovamente = () => {
        if (consulta.erro || receitasPorFonte.origemErro === "transacoes") setTentativa((valor) => valor + 1);
        if (previsoes.erro || receitasPorFonte.origemErro === "previsoes") setTentativaPrevisoes((valor) => valor + 1);
    };

    return (
            <div className="container">
                <TituloDaPagina titulo="Balanço Mensal" />
                <MonthSelector onDateChange={setDataSelecionada} />
                <SaldoReceitasDespesas
                    dados={balanco.dados}
                    carregando={carregando}
                    erro={erroBalanco}
                    onTentarNovamente={() => setTentativa((valor) => valor + 1)}
                />
                <SaldoAcumuladoPrevisto
                    dados={saldoPrevisto.dados}
                    carregando={!erroComparacao && (carregando || carregandoPrevisoes)}
                    erro={erroComparacao}
                    onTentarNovamente={tentarComparacaoNovamente}
                />
            {/* </div>
            <div className="container"> */}
                <ReceitasRecebidoPrevistoCategoria
                    dados={receitasPorFonte.dados}
                    carregando={!erroReceitas && (carregando || carregandoPrevisoes)}
                    erro={erroReceitas}
                    onTentarNovamente={tentarReceitasNovamente}
                />
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
