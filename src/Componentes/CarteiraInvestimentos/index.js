import React, { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import './CarteiraInvestimentos.css';
import { formatCurrency } from "../utils/formatCurrency";

const CarteiraInvestimentos = () => {
    const [chartData, setChartData] = useState({
        categories: [],
        values: [],
    });

    useEffect(() => {
        setTimeout(() => {
            setChartData({
                categories: [
                    "Investimento 01",
                    "Investimento 02",
                    "Investimento 03",
                    "Investimento 04",
                    "Investimento 05",
                    "Investimento 06",
                    "Investimento 07",
                    "Investimento 08"
                ],
                values: [7105, 6090, 6090, 5080, 4580, 5080, 2540, 2150],
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
            text: "Carteira de Investimentos",
            align: "left",
            style: {
                fontFamily: '"Segoe UI", "Cocogoose", "Didact Gothic", sans-serif',
                color: "var(--primary-color)",
                fontSize: 20
            },
        },
        labels: chartData.categories,
        colors: ["#B0B0B0", "#717171", "#FF9900", "var(--primary-color)", "#FF0000", "#B50000", "#6fdb8f", "#84bc26", "#FFC04D", "#002776"],
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
                        // height: 560,
                    },
                },
            },
            {
                breakpoint: 1150,
                options: {
                    chart: {
                        height: 610,
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
        <section className='carteira-investimentos donut-chart'>
            <Chart options={chartOptions} series={chartData.values} type="donut" height={630} />
        </section>
    )
}

export default CarteiraInvestimentos;