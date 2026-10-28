import React, { useState } from "react";
import Chart from "react-apexcharts";
import './RealizadoPrevistoPlanejamentoMensal.css';
import { formatCurrency } from "../utils/formatCurrency";

const RealizadoPrevistoPlanejamentoMensal = ({ dados, carregando, erro, onTentarNovamente }) => {
    const [seriesVisiveis, setSeriesVisiveis] = useState({ Realizado: true, Previsto: true });
    const legendas = [
        { nome: 'Realizado', valor: dados?.realizado || 0, classe: 'blue', cor: 'var(--primary-color)' },
        { nome: 'Previsto', valor: dados?.previsto || 0, classe: 'gray', cor: 'var(--tertiary-color)' },
    ];
    const visiveis = legendas.filter((legenda) => seriesVisiveis[legenda.nome]);
    const series = visiveis.map((legenda) => ({ name: legenda.nome, data: [legenda.valor] }));
    const percentual = dados?.diferencaPercentual == null ? null : Number(dados.diferencaPercentual.toFixed(2));
    const textoPercentual = percentual === null ? '—' :
        (dados.diferencaPercentual >= 0 ? '+' : '') + percentual.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
    const options = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: '"Segoe UI", "Cocogoose", Arial, sans-serif' },
        legend: { show: false },
        plotOptions: { bar: { borderRadius: 5, horizontal: false, columnWidth: '50%', distributed: false } },
        dataLabels: { enabled: false },
        colors: visiveis.map((legenda) => legenda.cor),
        stroke: { show: true, width: 6, colors: ['transparent'] },
        xaxis: { categories: dados ? [dados.categoria] : [] },
        yaxis: { labels: { formatter: (valor) => formatCurrency(valor, 0) } },
        tooltip: { y: { formatter: (valor) => formatCurrency(valor) } },
    };

    return (
        <section className="realizado-previsto-planejamento-mensal" aria-busy={carregando}>
            <h2>Planejamento Mensal:<br />Realizado vs. Previsto</h2>
            {carregando || erro || !dados ? <div className="estado-realizado-previsto">
                {erro ? <><p role="alert">{erro}</p><button className="button" onClick={onTentarNovamente}>Tentar novamente</button></> :
                    <p role="status">Carregando objetivos e movimentações...</p>}
            </div> : dados.semDados ? <div className="estado-realizado-previsto">
                <p role="status">Não há aportes, pagamentos ou previsões no mês selecionado.</p>
            </div> : <>
                <div className="legenda">
                    {legendas.map((legenda) => <div className="legenda-serie" key={legenda.nome}>
                        <div className="pretty">
                            <input type="checkbox" aria-label={'Exibir ' + legenda.nome} checked={seriesVisiveis[legenda.nome]}
                                onChange={() => setSeriesVisiveis((anteriores) => ({ ...anteriores, [legenda.nome]: !anteriores[legenda.nome] }))} />
                            <div className={'state ' + legenda.classe}><label>{legenda.nome}</label></div>
                        </div>
                        <span>{formatCurrency(legenda.valor)}</span>
                    </div>)}
                    <div className="legenda-serie diferenca-mensal">
                        <span>Diferença</span>
                        <span style={{ color: dados.diferenca < 0 ? 'var(--red-color)' : 'var(--primary-color)' }}>
                            {(dados.diferenca >= 0 ? '+' : '') + formatCurrency(dados.diferenca)}<br />({textoPercentual})
                        </span>
                    </div>
                </div>
                {visiveis.length > 0 ? <Chart options={options} series={series} type="bar" height={250} /> :
                    <p className="estado-realizado-previsto" role="status">Selecione uma série para visualizar.</p>}
            </>}
        </section>
    );
};

export default RealizadoPrevistoPlanejamentoMensal;
