import React, { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import { formatCurrency } from "../utils/formatCurrency";
import './AcumulosAmortizacoesPlanejamentoGlobal.css';

const AcumulosAmortizacoesPlanejamentoGlobal = ({ dados, carregando, erro, onTentarNovamente }) => {
    const [ocultarConcluidos, setOcultarConcluidos] = useState(false);
    const [pagina, setPagina] = useState(0);
    const itens = dados?.itens || [];
    const filtrados = ocultarConcluidos ? itens.filter((item) => !item.concluido) : itens;
    const totalPaginas = Math.ceil(filtrados.length / 12);
    const paginaAtual = Math.min(pagina, Math.max(0, totalPaginas - 1));
    const itensDaPagina = filtrados.slice(paginaAtual * 12, (paginaAtual + 1) * 12);
    const diferenca = dados?.diferenca || 0;

    useEffect(() => {
        setPagina((anterior) => Math.min(anterior, Math.max(0, totalPaginas - 1)));
    }, [totalPaginas]);

    return (
        <section className="acumulo-amortizacoes-planejamento-global" aria-busy={carregando}>
            <h2>Planejamento Global:<br />Acúmulos e Amortizações</h2>
            {carregando || erro || !dados ? <div className="estado-objetivos-globais">
                {erro ? <><p role="alert">{erro}</p><button className="button" onClick={onTentarNovamente}>Tentar novamente</button></> :
                    <p role="status">Carregando objetivos...</p>}
            </div> : dados.semDados ? <div className="estado-objetivos-globais">
                <p role="status">Não há objetivos cadastrados.</p>
            </div> : <>
                <div className="legenda" aria-label="Totais atuais dos objetivos">
                    <div className="legenda-serie"><span>Atual</span><span>{formatCurrency(dados.totalAtual)}</span></div>
                    <div className="legenda-serie"><span>Desejado</span><span>{formatCurrency(dados.totalDesejado)}</span></div>
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
                                <div role="img" aria-label={`${item.nome}: ${item.percentual == null ? 'percentual indisponível' : percentual + (item.divida ? ' da dívida quitada' : ' da meta global')}`}>
                                    <Chart options={options} series={[Math.min(100, Math.max(0, item.percentual || 0))]} type="radialBar" height={130} />
                                </div>
                                <p className="subtitulo" style={{ color: item.atual < 0 ? 'var(--red-color)' : undefined }} aria-label={`Atual: ${formatCurrency(item.atual)}`}>{formatCurrency(item.atual)}</p>
                                <p className="meta-global" aria-label={`Desejado: ${formatCurrency(item.desejado)}`}>{formatCurrency(item.desejado)}</p>
                            </div>
                        );
                    })}
                    {filtrados.length === 0 && <p role="status">Nenhum objetivo corresponde ao filtro selecionado.</p>}
                </div>
                {totalPaginas > 1 && <div className="paginacao">
                    <button type="button" aria-label="Página anterior de objetivos globais" onClick={() => setPagina(paginaAtual - 1)} disabled={paginaAtual === 0}>&lt;</button>
                    <span>Página {paginaAtual + 1} de {totalPaginas}</span>
                    <button type="button" aria-label="Próxima página de objetivos globais" onClick={() => setPagina(paginaAtual + 1)} disabled={paginaAtual === totalPaginas - 1}>&gt;</button>
                </div>}
                <label className="ocultar-objetivos">
                    <input type="checkbox" checked={ocultarConcluidos} onChange={() => { setOcultarConcluidos(!ocultarConcluidos); setPagina(0); }} />
                    <span>Ocultar objetivos concluídos</span>
                </label>
            </>}
        </section>
    );
};

export default AcumulosAmortizacoesPlanejamentoGlobal;
