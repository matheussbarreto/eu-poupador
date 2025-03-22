import React, { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import './ResultadoAtivos.css';
import { formatCurrency } from "../utils/formatCurrency";

const ResultadoAtivos = () => {
    const [chartData, setChartData] = useState({
        categories: [
            "Caixa",
            "Banco",
            "Investimentos",
            "Bens",
            "A Receber",
        ],
        values: [],
    });

    useEffect(() => {
        setTimeout(() => {
            setChartData({
                categories: [
                    "Caixa",
                    "Banco",
                    "Investimentos",
                    "Bens",
                    "A Receber",
                ],
                values: [2600, 400, 850, 100, 67.90],
            });
        }, 1000);
    }, []);

    const despesasTotal = chartData.values.reduce((acc, val) => acc + val, 0);

    const chartOptions = {
        chart: {
            type: "donut",
            fontFamily: '"Segoe UI", "Cocogoose", Arial, sans-serif',
        },
        plotOptions: {
            pie: {
                donut: {
                    size: "65%",
                    labels: {
                        show: true,
                        name: {
                            fontSize: '14px',
                            fontWeight: 700,
                            color: "#373d3f",
                            formatter: function (val) {
                                return val
                            }
                        },
                        value: {
                            fontSize: '16px',
                            offsetY: 0,
                            formatter: function (val) {
                                return formatCurrency(val)
                            }
                        },
                        total: {
                            show: true,
                            showAlways: false,
                            label: 'Total',
                            fontSize: '14px',
                            fontWeight: 700,
                            color: '#373d3f',
                            formatter: function (w) {
                                const total = w.globals.seriesTotals.reduce((a, b) => {
                                    return a + b
                                }, 0);
                                return formatCurrency(total)
                            }
                        }
                    },
                },
            },
        },
        title: {
            text: "Ativos",
            align: "left",
            style: {
                fontFamily: '"Segoe UI", "Cocogoose", "Didact Gothic", sans-serif',
                color: "var(--primary-color)",
                fontSize: 20
            },
        },
        labels: chartData.categories,
        colors: ["#B0B0B0", "#717171", "var(--primary-color)", "var(--dark-blue-color)", "#FF9900"],
        dataLabels: {
            enabled: false,
            formatter: (val) => `${val.toFixed(2)}%`,
        },
        legend: {
            position: "bottom",
            formatter: function (seriesName, opts) {
                const value = chartData.values[opts.seriesIndex];
                const percentage = ((value / despesasTotal) * 100).toFixed(2);
                return ` 
                    <span><strong>${seriesName}</strong><br/>Porcentagem</span>
                    <span style="margin-left: auto; text-align:right;">
                        <strong>${formatCurrency(value)}</strong>
                        <br/>${percentage}%
                    </span>`;
            },
        },
        tooltip: {
            enabled: false,
            theme: false,
            y: {
                formatter: (value) => `${formatCurrency(value)}`,
            },
        },
        responsive: [
            {
                breakpoint: 1300,
                options: {
                    chart: {
                        height: 520,
                    },
                },
            },
            {
                breakpoint: 1150,
                options: {
                    chart: {
                        height: 470,
                    },
                    plotOptions: {
                        pie: {
                            donut: {
                                labels: {
                                    value: {
                                        fontSize: '14px',
                                    },
                                    total: {
                                        fontSize: '12px',
                                    }
                                },
                            },
                        },
                    },
                },
            },
        ],
    };
    return (
        <section className='resultado-ativos'>
            <Chart options={chartOptions} series={chartData.values} type="donut" height={570} />
        </section>
    )
}

export default ResultadoAtivos;