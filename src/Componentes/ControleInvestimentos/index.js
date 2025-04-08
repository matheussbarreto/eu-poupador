import React, { useState, useEffect } from "react";
import Chart from "react-apexcharts";
import './ControleInvestimentos.css'
import { formatCurrency } from "../utils/formatCurrency";

const ControleInvestimentos = () => {

    const [totalAnterior, setTotalAnterior] = useState(0);
    const [totalAtual, setTotalAtual] = useState(0);
    const [diferencaGeral, setDiferencaGeral] = useState(0);
    const [diferencaPercentual, setDiferencaPercentual] = useState(0);

    const [chartOptions, setChartOptions] = useState({
        chart: {
            type: "bar",
            height: 350,
            // stacked: false, 
            toolbar: { show: false }
        },
        plotOptions: {
            bar: { horizontal: true, dataLabels: { position: "top" } }
        },
        colors: ["#A0A0A0", "#FFA500"],
        dataLabels: {
            enabled: true,
            style: {
                colors: ["#000"]
            },
            offsetX: 5,
            textAnchor: 'start',
            formatter: (val, opts) => {
                if (opts.seriesIndex === 1) {
                    const mesAnterior = opts.w.config.series[0].data[opts.dataPointIndex];
                    const diferenca = val - mesAnterior;
                    const percentual = ((diferenca / mesAnterior) * 100).toFixed(1).replace('.', ',');
                    return `${formatCurrency(val)} (${percentual}%)`;
                }
                return `${formatCurrency(val)}`;
            },
        },
        stroke: { width: 1, colors: ["#fff"] },
        xaxis: {categories: []},
        legend: { show: false },
        fill: { opacity: 1 }
    });

    const [chartSeries, setChartSeries] = useState([
        { name: "Mês Anterior", data: [] },
        { name: "Mês Atual", data: [] }
    ]);

    useEffect(() => {
        // Simulação de dados da API
        let data = [
            { nome: "Investimento 01", mes_anterior: 7000, mes_atual: 7105 },
            { nome: "Investimento 02", mes_anterior: 6000, mes_atual: 6090 },
            { nome: "Investimento 03", mes_anterior: 6000, mes_atual: 6090 },
            { nome: "Investimento 04", mes_anterior: 5000, mes_atual: 5080 },
            { nome: "Investimento 05", mes_anterior: 5000, mes_atual: 4580 },
            { nome: "Investimento 06", mes_anterior: 5000, mes_atual: 5080 },
            { nome: "Investimento 07", mes_anterior: 2500, mes_atual: 2540 },
            { nome: "Investimento 08", mes_anterior: 2115, mes_atual: 2150 }
        ];

        const totalAnterior = data.reduce((sum, item) => sum + item.mes_anterior, 0);
        const totalAtual = data.reduce((sum, item) => sum + item.mes_atual, 0);
        const diferencaGeral = totalAtual - totalAnterior;
        const diferencaPercentual = ((diferencaGeral / totalAnterior) * 100).toFixed(1).replace('.', ',');

        setTotalAnterior(totalAnterior);
        setTotalAtual(totalAtual);
        setDiferencaGeral(diferencaGeral);
        setDiferencaPercentual(diferencaPercentual);

        setChartOptions(prevOptions => ({
            ...prevOptions,
            xaxis: { categories: data.map(item => item.nome) }
        }));

        setChartSeries([
            { name: "Mês Anterior", data: data.map(item => item.mes_anterior) },
            { name: "Mês Atual", data: data.map(item => item.mes_atual) }
        ]);
    }, []);

    const valueColor = (diferencaGeral < 0 ? 'var(--red-color)' : 'var(--primary-color)');


    return (
        <section className="controle-investimentos">
            <div className="legenda">
            <h2>Controle dos Investimentos</h2>
                <span className="legenda-serie ">
                    <span className="pretty">
                        <input type="checkbox" />
                        <span className="state yellow"><label>Atual</label></span>
                    </span>
                    <span>{formatCurrency(totalAtual)}</span>
                </span>
                <span className="legenda-serie">
                    <span className="pretty">
                        <input type="checkbox" />
                        <span className="state gray"><label>Mês Anterior</label></span>
                    </span>
                    <span>{formatCurrency(totalAnterior)}</span>
                </span>
                <span className="legenda-serie ">
                    <span className="pretty diferenca">Diferença</span>
                    <span style={{ color: valueColor }}>{formatCurrency(diferencaGeral)}<br />({diferencaPercentual}%)</span>
                </span>
            </div>
            <Chart options={chartOptions} series={chartSeries} type="bar" height={400} />
        </section>
    );
};

export default ControleInvestimentos;