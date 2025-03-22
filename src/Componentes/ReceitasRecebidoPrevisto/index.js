import React, { useState, useEffect } from "react";
import Chart from "react-apexcharts";
import './ReceitasRecebidoPrevisto.css';
import { formatCurrency } from "../utils/formatCurrency";

const ReceitasRecebidoPrevisto = () => {

    const [chartData, setChartData] = useState({
        received: 0,
        expected: 0,
    });

    useEffect(() => {
        // Simulação de requisição à API
        setTimeout(() => {
            setChartData({ received: 10800, expected: 11900 });
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
        colors: ["var(--primary-color)", "var(--tertiary-color)"],
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
            name: "Recebido",
            data: [chartData.received],
        },
        {
            name: "Previsto",
            data: [chartData.expected],
        },
    ];

    const diferencaGeral = chartData.received - chartData.expected;
    const diferencaPercentual = chartData.expected
        ? ((diferencaGeral / chartData.expected) * 100).toFixed(2)
        : 0;

    const valueColor = (diferencaGeral < 0 ? 'var(--red-color)' : 'var(--primary-color)');

    return (
        <section className="receitas-recebido-previsto">
            <h2 className="">Receitas: Recebido vs. Previsto</h2>
            <div className="legenda">
                <span className="legenda-serie ">
                    <span className="pretty">
                        <input
                            type="checkbox"
                        // checked={legend.checked}
                        // onChange={() => toggleSeries(legend.name)}
                        />
                        <span className="state blue">
                            <label>
                                Recebido
                            </label>
                        </span>
                    </span>
                    <span>{formatCurrency(chartData.received)}</span>
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
                                Previsto
                            </label>
                        </span>
                    </span>
                    <span>{formatCurrency(chartData.expected)}</span>
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

export default ReceitasRecebidoPrevisto;
