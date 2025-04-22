import React, { useState, useEffect } from "react";
import Chart from "react-apexcharts";
import './VariacaoRendimentosPercentual.css';
import { formatCurrency } from "../utils/formatCurrency";

const VariacaoRendimentosPercentual = () => {

    const [chartData, setChartData] = useState({
        mes_atual: 0,
        mes_anterior: 0,
    });

    useEffect(() => {
        // Simulação de requisição à API
        setTimeout(() => {
            setChartData({ mes_atual: 20, mes_anterior: 15 });
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
        colors: ["var(--tertiary-color)", "var(--yellow-color)"],
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
                formatter: (val) => `${val}%`,
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
            data: [chartData.mes_anterior],
        },
        {
            name: "Mês Atual",
            data: [chartData.mes_atual],
        },
    ];

    const diferencaGeral = chartData.mes_atual - chartData.mes_anterior;
    // const diferencaPercentual = chartData.mes_anterior
        // ? ((diferencaGeral / chartData.mes_anterior) * 100).toFixed(2).replace('.', ',')
        // : 0;

    const valueColor = (diferencaGeral < 0 ? 'var(--red-color)' : 'var(--primary-color)');

    return (
        <section className="variacao-rendimentos-percentual">
            <h2 className="">Variação dos Rendimentos</h2>
            <div className="legenda">
                <span className="legenda-serie ">
                    <span className="pretty">
                        <input type="checkbox" />
                        <span className="state yellow">
                            <label>
                                Mês Atual
                            </label>
                        </span>
                    </span>
                    <span>{chartData.mes_atual.toFixed(2)}% a.a.</span>
                </span>
                <span className="legenda-serie">
                    <span className="pretty">
                        <input type="checkbox" />
                        <span className="state gray">
                            <label>
                                Mês Anterior
                            </label>
                        </span>
                    </span>
                    <span>{chartData.mes_anterior.toFixed(2)}% a.a.</span>
                </span>
                <span className="legenda-serie ">
                    <span className="pretty diferenca">Variação</span>
                    <span style={{ color: valueColor }}>{diferencaGeral.toFixed(2)}% a.a.</span>
                </span>
            </div>
            <Chart
                options={chartOptions}
                series={chartSeries}
                type="bar"
                height={250}
            />
        </section>
    );
};

export default VariacaoRendimentosPercentual;
