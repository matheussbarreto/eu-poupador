import React from "react";
import Chart from "react-apexcharts";
import { formatCurrency } from "../utils/formatCurrency";
import './AcumulosAmortizacoesCompromissoGlobal.css';

const AcumulosAmortizacoesCompromissoGlobal = ({ dados, carregando, erro, onTentarNovamente }) => {
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
        <section className="acumulos-amortizacoes-compromisso-global" aria-busy={carregando}>
            <h2>Grau de Compromisso Global:<br />Acúmulos e Amortizações</h2>
            {carregando || erro || !dados ? <div className="estado-compromisso-global">
                {erro ? <><p role="alert">{erro}</p><button className="button" onClick={onTentarNovamente}>Tentar novamente</button></> :
                    <p role="status">Carregando objetivos...</p>}
            </div> : dados.semDados ? <div className="estado-compromisso-global">
                <p role="status">Não há objetivos cadastrados.</p>
            </div> : <div className="objetivos">
                <div role="img" aria-label={`Compromisso global: ${percentual} do total desejado`}>
                    <Chart options={options} series={[Math.min(100, Math.max(0, dados.percentual || 0))]} type="radialBar" height={200} />
                </div>
                <p className="total-atual" style={{ color: dados.totalAtual < 0 ? 'var(--red-color)' : undefined }} aria-label={`Atual: ${formatCurrency(dados.totalAtual)}`}><span>Atual</span><strong>{formatCurrency(dados.totalAtual)}</strong></p>
                <p className="total-desejado" aria-label={`Desejado: ${formatCurrency(dados.totalDesejado)}`}><span>Desejado</span><strong>{formatCurrency(dados.totalDesejado)}</strong></p>
            </div>}
        </section>
    );
};

export default AcumulosAmortizacoesCompromissoGlobal;
