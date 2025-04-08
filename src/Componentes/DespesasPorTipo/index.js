import React, { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import './DespesasPorTipo.css';
import { formatCurrency } from "../utils/formatCurrency";

const DespesasPorTipo = () => {
    const [chartData, setChartData] = useState({
        categories: [
            "Desp. Fixa Essencial",
            "Desp. Variável Essencial",
            "Desp. Fixa Não Essencial",
            "Desp. Variável Não Essencial",
        ],
        values: [],
    });

    useEffect(() => {
        setTimeout(() => {
            setChartData({
                categories: [
                    "Desp. Fixa Essencial",
                    "Desp. Variável Essencial",
                    "Desp. Fixa Não Essencial",
                    "Desp. Variável Não Essencial",
                ],
                values: [3000, 950, 217.90, 6547.14],
                // values: [100, 100, 100, 100, 100, 100, 100],
            });
        }, 1000);
    }, []);

    const despesasTotal = chartData.values.reduce((acc, val) => acc + val, 0);

    const chartOptions = {
        chart: {
            type: "donut",
            width: 350,
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
            text: "Despesas Por Tipo",
            align: "left",
            style: {
                color: "var(--primary-color)",
                fontSize: 20
            },
        },
        labels: chartData.categories,
        colors: ["#B0B0B0", "#717171", "#FF0000", "#B50000", "#FFC04D", "#002776", "#FF9900"],
        dataLabels: {
            enabled: false,
            formatter: (val) => `${val.toFixed(2)}%`,
        },
        legend: {
            position: "bottom",
            formatter: function (seriesName, opts) {
                const value = chartData.values[opts.seriesIndex];
                const percentage = ((value / despesasTotal) * 100).toFixed(2).replace('.', ',');
                return ` 
                    <span><strong>${seriesName}</strong><br/>Porcentagem</span>
                    <span style="margin-left: auto; text-align:right;">
                        <strong>${formatCurrency(value)}</strong>
                        <br/>${percentage}%
                    </span>`;
            },
            fontSize: '13px',
            markers: {
                size: 10,
                offsetX: -3,
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
                        height: 480,
                    },
                },
            },
            {
                breakpoint: 1150,
                options: {
                    // chart: {
                    //     height: 465,
                    // },
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
        <section className='despesas-por-tipo donut-chart'>
            <Chart options={chartOptions} series={chartData.values} type="donut" height={515} />
        </section>
    )
}

export default DespesasPorTipo;