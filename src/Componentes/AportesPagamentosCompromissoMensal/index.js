import React from "react";
import Chart from "react-apexcharts";
import './AportesPagamentosCompromissoMensal.css';
import { formatCurrency } from "../utils/formatCurrency";

const AportesPagamentosCompromissoMensal = ({ dados, carregando, erro, onTentarNovamente }) => {
    const percentual = dados?.percentual == null ? '—' : dados.percentual.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';
    const options = {
        chart: { type: 'radialBar' },
        colors: ['var(--primary-color)'],
        plotOptions: { radialBar: {
            hollow: { size: '75%', background: 'var(--primary-color)' },
            track: { background: 'var(--tertiary-color)' },
            dataLabels: {
                name: { show: false },
                value: { color: '#ffffff', fontSize: 22, offsetY: 6, formatter: () => percentual },
            },
        } },
    };

    return (
        <section className="aportes-pagamentos-compromisso-mensal" aria-busy={carregando}>
            <h2>Grau de Compromisso Mensal:<br />Aportes e Pagamentos</h2>
            {carregando || erro || !dados ? <div className="estado-compromisso-mensal">
                {erro ? <><p role="alert">{erro}</p><button className="button" onClick={onTentarNovamente}>Tentar novamente</button></> :
                    <p role="status">Carregando objetivos e movimentações...</p>}
            </div> : dados.semDados ? <div className="estado-compromisso-mensal">
                <p role="status">Não há aportes, pagamentos ou previsões no mês selecionado.</p>
            </div> : <div className="objetivos">
                <div role="img" aria-label={`Compromisso mensal: ${percentual} da previsão realizada`}>
                    <Chart options={options} series={[Math.min(100, Math.max(0, dados.percentual || 0))]} type="radialBar" height={200} />
                </div>
                <p style={{ fontWeight: 'bold' }} aria-label={`Realizado: ${formatCurrency(dados.totalRealizado)}`}>{formatCurrency(dados.totalRealizado)}</p>
                <p style={{ color: 'var(--tertiary-color)' }} aria-label={`Previsto: ${formatCurrency(dados.totalPrevisto)}`}>{formatCurrency(dados.totalPrevisto)}</p>
            </div>}
        </section>
    );
};

export default AportesPagamentosCompromissoMensal;
