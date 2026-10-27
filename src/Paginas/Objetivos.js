import { useEffect, useMemo, useState } from "react";
import AcumulosAmortizacoesCompromissoGlobal from "../Componentes/AcumulosAmortizacoesCompromissoGlobal";
import AcumulosAmortizacoesPlanejamentoGlobal from "../Componentes/AcumulosAmortizacoesPlanejamentoGlobal";
import AportesPagamentosCompromissoMensal from "../Componentes/AportesPagamentosCompromissoMensal";
import AportesPagamentosPlanejamentoMensal from "../Componentes/AportesPagamentosPlanejamentoMensal";
import AtualDesesjadoPlanejamentoGlobal from "../Componentes/AtualDesesjadoPlanejamentoGlobal";
import RealizadoPrevistoPlanejamentoMensal from "../Componentes/RealizadoPrevistoPlanejamentoMensal";
import TituloDaPagina from "../Componentes/TituloDaPagina";
import MonthSelector from "../Componentes/MonthSelector";
import { observarInvestimentos } from "../services/investimentosService";
import { observarTransacoes } from "../services/transacoesService";
import { calcularPlanejamentoMensal, calcularCompromissoMensal, obterPeriodoObjetivos, obterMensagemErroObjetivos } from "../services/objetivosService";

const Objetivos = ({ usuarioId }) => {
    const [dataSelecionada, setDataSelecionada] = useState(() => new Date());
    const [consulta, setConsulta] = useState({});
    const [cadastros, setCadastros] = useState({});
    const [tentativa, setTentativa] = useState(0);
    const [tentativaCadastros, setTentativaCadastros] = useState(0);
    const ano = dataSelecionada.getFullYear();
    const mes = dataSelecionada.getMonth();
    const periodo = `${usuarioId}/${ano}/${mes}`;
    const carregandoTransacoes = consulta.periodo !== periodo || consulta.carregando;
    const carregandoCadastros = cadastros.usuarioId !== usuarioId || cadastros.carregando;

    useEffect(() => {
        let ativo = true;
        let cancelar;
        setConsulta({ periodo, carregando: true });
        const tratarErro = (erro) => {
            if (ativo) setConsulta({ periodo, carregando: false, erro: obterMensagemErroObjetivos(erro) });
        };
        try {
            cancelar = observarTransacoes(usuarioId, obterPeriodoObjetivos(new Date(ano, mes, 1)), (transacoes) => {
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
        setCadastros({ usuarioId, carregando: true });
        const tratarErro = (erro) => {
            if (ativo) setCadastros({ usuarioId, carregando: false, erro: obterMensagemErroObjetivos(erro) });
        };
        try {
            cancelar = observarInvestimentos(usuarioId, (investimentos) => {
                if (ativo) setCadastros({ usuarioId, investimentos, carregando: false });
            }, tratarErro);
        } catch (erro) {
            tratarErro(erro);
        }
        return () => {
            ativo = false;
            if (cancelar) cancelar();
        };
    }, [usuarioId, tentativaCadastros]);

    const planejamentoMensal = useMemo(() => {
        if (carregandoTransacoes || carregandoCadastros || consulta.erro || cadastros.erro || !consulta.transacoes || !cadastros.investimentos) return {};
        try {
            return { dados: calcularPlanejamentoMensal(consulta.transacoes, cadastros.investimentos, new Date(ano, mes, 1)) };
        } catch (erro) {
            return {
                erro: obterMensagemErroObjetivos(erro),
                origemErro: erro.code === "app/previsao-invalida" ? "cadastros" : "transacoes",
            };
        }
    }, [consulta.transacoes, consulta.erro, cadastros.investimentos, cadastros.erro, carregandoTransacoes, carregandoCadastros, ano, mes]);

    const compromissoMensal = useMemo(() => planejamentoMensal.dados
        ? calcularCompromissoMensal(planejamentoMensal.dados)
        : undefined, [planejamentoMensal.dados]);

    const erro = (!carregandoTransacoes && consulta.erro) || (!carregandoCadastros && cadastros.erro) || planejamentoMensal.erro;
    const tentarNovamente = () => {
        if (consulta.erro || planejamentoMensal.origemErro === "transacoes") setTentativa((valor) => valor + 1);
        if (cadastros.erro || planejamentoMensal.origemErro === "cadastros") setTentativaCadastros((valor) => valor + 1);
    };

    return (
        <div className="container">
            <TituloDaPagina titulo="Objetivos" />
            <MonthSelector onDateChange={setDataSelecionada} />
            <AportesPagamentosPlanejamentoMensal
                key={periodo}
                dados={planejamentoMensal.dados}
                carregando={!erro && (carregandoTransacoes || carregandoCadastros)}
                erro={erro}
                onTentarNovamente={tentarNovamente}
            />
            <div className="container-left">
                <AportesPagamentosCompromissoMensal
                    dados={compromissoMensal}
                    carregando={!erro && (carregandoTransacoes || carregandoCadastros)}
                    erro={erro}
                    onTentarNovamente={tentarNovamente}
                />
                <RealizadoPrevistoPlanejamentoMensal />
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
