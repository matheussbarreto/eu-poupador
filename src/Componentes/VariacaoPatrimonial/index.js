import React, { useState, useEffect } from "react";
import Chart from "react-apexcharts";
import './VariacaoPatrimonial.css';
import { formatCurrency } from "../utils/formatCurrency";

const VariacaoPatrimonial = () => {

    const [chartData, setChartData] = useState({
        mesAtual: 0,
        mesAnterior: 0,
    });

    useEffect(() => {
        // Simulação de requisição à API
        setTimeout(() => {
            setChartData({ 
                    mesAtual: 10800, 
                    mesAnterior: 11900 
                });
        }, 1000);
    }, []);

    const chartOptions = {
        chart: {
            type: "bar",
            toolbar: {
                show: false, // Ocultar as opções de ferramentas
            },
            fontFamily: '"Segoe UI", "Cocogoose", Arial, sans-serif',
        },
        legend: {
            show: false,
        },
        plotOptions: {
            bar: {
                borderRadius: 5,
                horizontal: false,
                columnWidth: "50%",
                distributed: false,
            },
        },
        dataLabels: {
            enabled: false,
        },
        colors: ["var(--tertiary-color)", "var(--dark-blue-color)"],
        stroke: {
            show: true,
            width: 6,
            colors: ['transparent'],
        },
        xaxis: {
            categories: ["Fev/2025"],
        },
        yaxis: {
            labels: {
                formatter: (val) => `R$ ${val.toLocaleString("pt-BR")}`,
            },
        },
        tooltip: {
            y: {
                formatter: (val) => `${formatCurrency(val, 2)}`,
            },
        },
    };

    const chartSeries = [
        {
            name: "Mês Anterior",
            data: [chartData.mesAnterior],
        },
        {
            name: "Atual",
            data: [chartData.mesAtual],
        },
    ];

    const diferencaGeral = chartData.mesAtual - chartData.mesAnterior;
    const diferencaPercentual = chartData.mesAnterior
        ? ((diferencaGeral / chartData.mesAnterior) * 100).toFixed(2).replace('.', ',')
        : 0;

    const valueColor = (diferencaGeral < 0 ? 'var(--red-color)' : 'var(--primary-color)');

    return (
        <section className="variacao-patrimonial">
            <h2 className="">Variação Patrimonial</h2>
            <div className="legenda">
                <span className="legenda-serie ">
                    <span className="pretty">
                        <input
                            type="checkbox"
                        // checked={legend.checked}
                        // onChange={() => toggleSeries(legend.name)}
                        />
                        <span className="state dark-blue">
                            <label>
                                Atual
                            </label>
                        </span>
                    </span>
                    <span>{formatCurrency(chartData.mesAtual)}</span>
                </span>
                <span className="legenda-serie ">
                    <span className="pretty">
                        <input
                            type="checkbox"
                        // checked={legend.checked}
                        // onChange={() => toggleSeries(legend.name)}
                        />
                        <span className="state gray">
                            <label>
                                Mês Anterior
                            </label>
                        </span>
                    </span>
                    <span>{formatCurrency(chartData.mesAnterior)}</span>
                </span>
                <span className="legenda-serie ">
                    <span className="pretty diferenca">Diferença</span>
                    <span style={{ color: valueColor }}>{formatCurrency(diferencaGeral)}<br />({diferencaPercentual}%)</span>
                </span>
            </div>
            <Chart
                options={chartOptions}
                series={chartSeries}
                type="bar"
                height={300}
            />
        </section>
    );
};

export default VariacaoPatrimonial;
