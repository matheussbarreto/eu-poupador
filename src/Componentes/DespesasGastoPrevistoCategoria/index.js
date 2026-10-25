import React from "react";
import Chart from "react-apexcharts";
import './DespesasGastoPrevistoCategoria.css';
import { formatCurrency } from "../utils/formatCurrency";

const DespesasGastoPrevistoCategoria = ({ dados, carregando, erro, onTentarNovamente }) => {
    const itens = dados?.itens || [];
    const series = [{
        name: 'Gasto',
        data: itens.map((item) => ({
            x: item.nome,
            y: item.gasto,
            goals: [{ name: 'Previsto', value: item.previsto, strokeWidth: 5, strokeColor: 'var(--tertiary-color)' }],
        })),
    }];
    const diferenca = dados?.diferenca || 0;
    const options = {
        chart: {
            type: 'bar',
            toolbar: { show: false },
            fontFamily: '"Segoe UI", "Cocogoose", Arial, sans-serif',
        },
        title: {
            text: 'Despesas: Gasto vs. Previsto',
            style: { color: "var(--primary-color)", fontSize: 20 },
        },
        plotOptions: { bar: { horizontal: true, barHeight: '40%' } },
        colors: ['var(--red-color)'],
        dataLabels: {
            textAnchor: 'middle',
            offsetY: 23,
            background: { enabled: true, foreColor: '#585858' },
            formatter: (valor, { dataPointIndex }) => {
                const percentual = itens[dataPointIndex]?.percentual;
                const texto = percentual == null ? '—' : percentual.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + '%';
                return `Gasto: ${formatCurrency(valor)} (${texto})`;
            },
        },
        legend: {
            show: true,
            fontSize: 16,
            offsetY: -20,
            position: 'top',
            horizontalAlign: 'right',
            showForSingleSeries: true,
            customLegendItems: [
                `<span>Gasto</span> <span>${formatCurrency(dados?.totalGasto || 0)}</span>`,
                `<span>Previsto</span> <span>${formatCurrency(dados?.totalPrevisto || 0)}</span>`,
                `<span>Diferença</span> <span style="color: ${diferenca < 0 ? 'var(--red-color)' : 'var(--primary-color)'};">${(diferenca >= 0 ? '+' : '') + formatCurrency(diferenca)}</span>`,
            ],
            markers: { fillColors: ['var(--red-color)', 'var(--tertiary-color)'], size: 7, shape: 'circle' },
            onItemClick: { toggleDataSeries: false },
            onItemHover: { highlightDataSeries: false },
        },
        xaxis: { labels: { formatter: (valor) => formatCurrency(valor, 0) } },
        tooltip: {
            marker: { show: false },
            followCursor: true,
            y: { formatter: (valor) => formatCurrency(valor) },
        },
        noData: { text: '' },
    };

    return (
        <section className="despesas-gasto-previsto-categoria" aria-busy={carregando}>
            {carregando || erro || !dados ? (
                <div className="estado-despesas">
                    <h2>Despesas: Gasto vs. Previsto</h2>
                    {erro ? <>
                        <p role="alert">{erro}</p>
                        <button className="button" onClick={onTentarNovamente}>Tentar novamente</button>
                    </> : <p role="status">Carregando despesas e previsões...</p>}
                </div>
            ) : dados.semDados ? (
                <div className="estado-despesas">
                    <h2>Despesas: Gasto vs. Previsto</h2>
                    <p role="status">Não há despesas realizadas ou previstas no mês selecionado.</p>
                </div>
            ) : (
                <Chart options={options} series={series} type="bar" height={Math.max(600, itens.length * 70 + 180)} />
            )}
        </section>
    );
};

export default DespesasGastoPrevistoCategoria;
