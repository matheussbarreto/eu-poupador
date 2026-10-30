import { useEffect, useMemo, useState } from "react";
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
import { observarContas } from "../services/contasService";
import { observarInvestimentos } from "../services/investimentosService";
import { observarHistoricoTransacoes } from "../services/transacoesService";
import { calcularSaldosMensais, calcularPatrimonioMensal, calcularVariacaoPatrimonial, calcularResultadoAtivos, calcularResultadoPassivos, calcularResultadoAtivoPassivo, obterMensagemErroResultados } from "../services/resultadosService";

const Resultados = ({ usuarioId }) => {
    const [dataSelecionada, setDataSelecionada] = useState(() => new Date());
    const [fontes, setFontes] = useState({});
    const [tentativa, setTentativa] = useState(0);
    const ano = dataSelecionada.getFullYear();
    const mes = dataSelecionada.getMonth();
    const periodo = `${usuarioId}/${ano}/${mes}`;
    const fontesAtuais = fontes.usuarioId === usuarioId && fontes.tentativa === tentativa;
    const erroConsulta = fontesAtuais && fontes.erro;
    const carregando = !fontesAtuais || !fontes.contas || !fontes.investimentos || !fontes.transacoes;

    useEffect(() => {
        let ativo = true;
        const cancelar = [];
        setFontes({ usuarioId, tentativa });
        const tratarErro = (erro) => {
            if (ativo) setFontes({ usuarioId, tentativa, erro: obterMensagemErroResultados(erro) });
        };
        const receber = (fonte) => (dados) => {
            if (ativo) setFontes((anterior) => ({ ...anterior, [fonte]: dados }));
        };
        try {
            cancelar.push(observarContas(usuarioId, receber("contas"), tratarErro));
            cancelar.push(observarInvestimentos(usuarioId, receber("investimentos"), tratarErro));
            cancelar.push(observarHistoricoTransacoes(usuarioId, receber("transacoes"), tratarErro));
        } catch (erro) {
            tratarErro(erro);
        }
        return () => {
            ativo = false;
            cancelar.forEach((limpar) => limpar());
        };
    }, [usuarioId, tentativa]);

    const saldosMensais = useMemo(() => {
        if (carregando || erroConsulta) return {};
        try {
            return { dados: calcularSaldosMensais(fontes.transacoes, fontes.contas, fontes.investimentos, new Date(ano, mes, 1)) };
        } catch (erro) {
            return { erro: obterMensagemErroResultados(erro) };
        }
    }, [fontes.transacoes, fontes.contas, fontes.investimentos, carregando, erroConsulta, ano, mes]);
    const patrimonio = useMemo(() => {
        if (!saldosMensais.dados) return {};
        try {
            return { dados: calcularPatrimonioMensal(saldosMensais.dados) };
        } catch (erro) {
            return { erro: obterMensagemErroResultados(erro) };
        }
    }, [saldosMensais.dados]);
    const variacaoPatrimonial = useMemo(() => {
        if (!patrimonio.dados) return {};
        try {
            return { dados: calcularVariacaoPatrimonial(patrimonio.dados) };
        } catch (erro) {
            return { erro: obterMensagemErroResultados(erro) };
        }
    }, [patrimonio.dados]);
    const ativos = useMemo(() => {
        if (!saldosMensais.dados) return {};
        try {
            return { dados: calcularResultadoAtivos(saldosMensais.dados, fontes.contas, fontes.investimentos) };
        } catch (erro) {
            return { erro: obterMensagemErroResultados(erro) };
        }
    }, [saldosMensais.dados, fontes.contas, fontes.investimentos]);
    const passivos = useMemo(() => {
        if (!saldosMensais.dados) return {};
        try {
            return { dados: calcularResultadoPassivos(saldosMensais.dados, fontes.contas, fontes.investimentos) };
        } catch (erro) {
            return { erro: obterMensagemErroResultados(erro) };
        }
    }, [saldosMensais.dados, fontes.contas, fontes.investimentos]);
    const ativoPassivo = useMemo(() => {
        if (!patrimonio.dados) return {};
        try {
            return { dados: calcularResultadoAtivoPassivo(patrimonio.dados) };
        } catch (erro) {
            return { erro: obterMensagemErroResultados(erro) };
        }
    }, [patrimonio.dados]);
    const erro = erroConsulta || saldosMensais.erro || patrimonio.erro;
    const tentarNovamente = () => {
        setTentativa((valor) => valor + 1);
    };
    
    return (
        <div className="container">
            <TituloDaPagina titulo="Resultados" />
            <MonthSelector onDateChange={setDataSelecionada} />
            <PatrimonioAtivosPassivos
                key={periodo}
                dados={patrimonio.dados}
                carregando={!erro && carregando}
                erro={erro}
                onTentarNovamente={tentarNovamente}
            />
            <VariacaoPatrimonial
                key={`variacao-${periodo}`}
                dados={variacaoPatrimonial.dados}
                carregando={!erro && carregando}
                erro={erro || variacaoPatrimonial.erro}
                onTentarNovamente={tentarNovamente}
            />
            <ResultadoAtivos
                key={`ativos-${periodo}`}
                dados={ativos.dados}
                carregando={!erro && carregando}
                erro={erro || ativos.erro}
                onTentarNovamente={tentarNovamente}
            />
            <ResultadoPassivos
                key={`passivos-${periodo}`}
                dados={passivos.dados}
                carregando={!erro && carregando}
                erro={erro || passivos.erro}
                onTentarNovamente={tentarNovamente}
            />
            <ResultadoAtivoPassivo
                key={`ativo-passivo-${periodo}`}
                dados={ativoPassivo.dados}
                carregando={!erro && carregando}
                erro={erro || ativoPassivo.erro}
                onTentarNovamente={tentarNovamente}
            />
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
