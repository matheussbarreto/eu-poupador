import React, { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import './AportesPagamentosPlanejamentoMensal.css';
import { formatCurrency } from "../utils/formatCurrency";

const AportesPagamentosPlanejamentoMensal = ({ dados, carregando, erro, onTentarNovamente }) => {
    const [ocultarConcluidos, setOcultarConcluidos] = useState(false);
    const [pagina, setPagina] = useState(0);
    const itens = dados?.itens || [];
    const filtrados = ocultarConcluidos
        ? itens.filter((item) => item.previsto > 0 && item.realizado < item.previsto)
        : itens;
    const totalPaginas = Math.ceil(filtrados.length / 12);
    const paginaAtual = Math.min(pagina, Math.max(0, totalPaginas - 1));
    const itensDaPagina = filtrados.slice(paginaAtual * 12, (paginaAtual + 1) * 12);
    const diferenca = dados?.diferenca || 0;

    useEffect(() => {
        setPagina((anterior) => Math.min(anterior, Math.max(0, totalPaginas - 1)));
    }, [totalPaginas]);

    return (
        <section className="aportes-pagamentos-planejamento-mensal" aria-busy={carregando}>
            <h2>Planejamento Mensal:<br />Aportes e Pagamentos</h2>
            {carregando || erro || !dados ? <div className="estado-objetivos-mensais">
                {erro ? <><p role="alert">{erro}</p><button className="button" onClick={onTentarNovamente}>Tentar novamente</button></> :
                    <p role="status">Carregando objetivos e movimentações...</p>}
            </div> : dados.semDados ? <div className="estado-objetivos-mensais">
                <p role="status">Não há aportes, pagamentos ou previsões no mês selecionado.</p>
            </div> : <>
                <div className="legenda" aria-label="Totais do mês">
                    <div className="legenda-serie"><span>Realizado</span><span>{formatCurrency(dados.totalRealizado)}</span></div>
                    <div className="legenda-serie"><span>Previsto</span><span>{formatCurrency(dados.totalPrevisto)}</span></div>
                    <div className="legenda-serie"><span>Diferença</span><span style={{ color: diferenca < 0 ? 'var(--red-color)' : 'var(--primary-color)' }}>{formatCurrency(diferenca)}</span></div>
                </div>
                <div className="grid-objetivos">
                    {itensDaPagina.map((item) => {
                        const percentual = item.percentual == null ? '—' : item.percentual.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';
                        const options = {
                            chart: { type: 'radialBar' },
                            colors: ['var(--primary-color)'],
                            plotOptions: { radialBar: {
                                hollow: { size: '65%', background: 'var(--primary-color)' },
                                track: { background: 'var(--tertiary-color)' },
                                dataLabels: { name: { show: false }, value: { color: '#ffffff', offsetY: 6, formatter: () => percentual } },
                            } },
                        };
                        return (
                            <div key={item.id} className="objetivos">
                                <p className="titulo">{item.nome}</p>
                                <div role="img" aria-label={`${item.nome}: ${percentual} da previsão mensal`}>
                                    <Chart options={options} series={[Math.min(100, Math.max(0, item.percentual || 0))]} type="radialBar" height={130} />
                                </div>
                                <p className="subtitulo" aria-label={`Realizado: ${formatCurrency(item.realizado)}`}>{formatCurrency(item.realizado)}</p>
                                <p className="previsao" aria-label={`Previsto: ${formatCurrency(item.previsto)}`}>{formatCurrency(item.previsto)}</p>
                            </div>
                        );
                    })}
                    {filtrados.length === 0 && <p role="status">Nenhum objetivo corresponde ao filtro selecionado.</p>}
                </div>
                {totalPaginas > 1 && <div className="paginacao">
                    <button type="button" aria-label="Página anterior de objetivos" onClick={() => setPagina(paginaAtual - 1)} disabled={paginaAtual === 0}>&lt;</button>
                    <span>Página {paginaAtual + 1} de {totalPaginas}</span>
                    <button type="button" aria-label="Próxima página de objetivos" onClick={() => setPagina(paginaAtual + 1)} disabled={paginaAtual === totalPaginas - 1}>&gt;</button>
                </div>}
                <label className="ocultar-objetivos">
                    <input type="checkbox" checked={ocultarConcluidos} onChange={() => { setOcultarConcluidos(!ocultarConcluidos); setPagina(0); }} />
                    <span>Ocultar objetivos sem previsão ou com meta mensal atingida</span>
                </label>
            </>}
        </section>
    );
};

export default AportesPagamentosPlanejamentoMensal;
