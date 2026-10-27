import React from "react";
import Chart from "react-apexcharts";
import './DespesasPorTipoGastoPrevisto.css';
import { formatCurrency } from "../utils/formatCurrency";

const DespesasPorTipoGastoPrevisto = ({ dados, carregando, erro, onTentarNovamente }) => {
    const itens = dados?.itens || [];
    const diferenca = dados?.diferenca || 0;
    const percentual = dados?.diferencaPercentual == null ? null : Number(dados.diferencaPercentual.toFixed(2));
    const textoPercentual = percentual === null ? '—' :
        (dados.diferencaPercentual >= 0 ? '+' : '') + percentual.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
    const series = [{
        name: 'Gasto',
        data: itens.map((item) => ({
            x: item.nome, y: item.gasto,
            goals: [{ name: 'Previsto', value: item.previsto, strokeWidth: 5, strokeColor: 'var(--tertiary-color)' }],
        })),
    }];
    const options = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: '"Segoe UI", "Cocogoose", Arial, sans-serif' },
        plotOptions: { bar: { horizontal: true, barHeight: '40%' } },
        colors: ['var(--red-color)'],
        dataLabels: {
            textAnchor: 'middle', offsetY: 23,
            background: { enabled: true, foreColor: '#585858' },
            formatter: (valor, { dataPointIndex }) => {
                const percentual = itens[dataPointIndex]?.percentual;
                const texto = percentual == null ? '—' : percentual.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + '%';
                return `Gasto: ${formatCurrency(valor)} (${texto})`;
            },
        },
        legend: {
            show: true, fontSize: 16, position: 'top', horizontalAlign: 'right', showForSingleSeries: true,
            customLegendItems: [
                `<span>Gasto</span> <span>${formatCurrency(dados?.totalGasto || 0)}</span>`,
                `<span>Previsto</span> <span>${formatCurrency(dados?.totalPrevisto || 0)}</span>`,
                `<span>Diferença</span> <span style="color: ${diferenca < 0 ? 'var(--red-color)' : 'var(--primary-color)'};">${(diferenca >= 0 ? '+' : '') + formatCurrency(diferenca)}<br />(${textoPercentual})</span>`,
            ],
            markers: { fillColors: ['var(--red-color)', 'var(--tertiary-color)'], size: 7, shape: 'circle' },
            onItemClick: { toggleDataSeries: false }, onItemHover: { highlightDataSeries: false },
        },
        xaxis: { labels: { formatter: (valor) => formatCurrency(valor, 0) } },
        yaxis: { labels: { maxWidth: 230 } },
        tooltip: { marker: { show: false }, followCursor: true, y: { formatter: (valor) => formatCurrency(valor) } },
        noData: { text: '' },
    };

    return (
        <section className="despesas-por-tipo-gasto-previsto" aria-busy={carregando}>
            <h2>Método 4D (Despesas Por Tipo): Gasto vs. Previsto</h2>
            {carregando || erro || !dados ? <div className="estado-despesas-tipo-previsto">
                {erro ? <><p role="alert">{erro}</p><button className="button" onClick={onTentarNovamente}>Tentar novamente</button></> :
                    <p role="status">Carregando despesas e previsões...</p>}
            </div> : dados.semDados ? <div className="estado-despesas-tipo-previsto">
                <p role="status">Não há despesas realizadas ou previstas no mês selecionado.</p>
            </div> : <Chart options={options} series={series} type="bar" height={Math.max(475, itens.length * 70 + 180)} />}
        </section>
    );
};

export default DespesasPorTipoGastoPrevisto;
