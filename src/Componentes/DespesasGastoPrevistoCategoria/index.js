import React, { useState, useEffect } from "react";
import Chart from "react-apexcharts";
import './DespesasGastoPrevistoCategoria.css';
import { formatCurrency } from "../utils/formatCurrency";

const DespesasGastoPrevistoCategoria = () => {

    // // Calcula a soma dos valores de Recebido e Previsto antes de definir o estado
    // let totalGasto = 0;
    // let totalPrevisto = 0;

    // const seriesData = [
    //     {
    //         x: 'Trabalho 01',
    //         y: 100,
    //         // goals: [
    //         //     {
    //         //         name: 'Previsto',
    //         //         value: 1500,
    //         //         strokeWidth: 3,
    //         //         // strokeHeight: 10,
    //         //         // strokeDashArray: 2,
    //         //         strokeColor: '#8a8a8a'
    //         //     }
    //         // ]
    //     },
    //     {
    //         x: 'Trabalho 02',
    //         y: 4400,
    //         goals: [
    //             {
    //                 name: 'Previsto',
    //                 value: 5400,
    //                 strokeWidth: 3,
    //                 // strokeHeight: 10,
    //                 strokeColor: '#8a8a8a'
    //             }
    //         ]
    //     },
    //     {
    //         x: 'Renda Extra',
    //         y: 5400,
    //         goals: [
    //             {
    //                 name: 'Previsto',
    //                 value: 5200,
    //                 strokeWidth: 3,
    //                 // strokeHeight: 10,
    //                 // strokeLineCap: 'round',
    //                 strokeColor: '#8a8a8a'
    //             }
    //         ]
    //     }
    // ];

    // // Calcula os totais
    // seriesData.forEach(item => {
    //     totalGasto += item.y;
    //     if (item.goals && item.goals.length) {
    //         totalPrevisto += item.goals[0].value;
    //     }
    // });

    const [despGastoCatChart, setDespGastoCatChart] = useState({
        series: [],
        options: {
            chart: {
                type: 'bar',
                toolbar: {
                    show: false, // Ocultar as opções de ferramentas, caso deseje
                },
                fontFamily: '"Segoe UI", "Cocogoose", sans-serif',
                fontWeight: '400',
            },
            title: {
                text: 'Despesas: Gasto Vs. Previsto',
                style: {
                    fontFamily: '"Segoe UI", "Cocogoose", sans-serif',
                    color: "var(--primary-color)",
                    fontSize: 20,
                    fontWeight: '700',
                },
            },
            plotOptions: {
                bar: {
                    horizontal: true,
                    barHeight: '40%',
                }
            },
            colors: ['var(--red-color)'],
            markers: {
                // colors: ['#8a8a8a'],
                // size: 10,
            },
            dataLabels: {
                // enabled: true,
                textAnchor: 'middle',
                // offsetX: -50,
                offsetY: 23,
                background: {
                    enabled: true,
                    foreColor: '#585858',
                },
                formatter: function (val, opt) {
                    const goals = opt.w.config.series[opt.seriesIndex].data[opt.dataPointIndex].goals;
                    if (goals && goals.length) {
                        const goalExpected = goals[0].value;
                        const percentage = ((val / goalExpected) * 100).toFixed(0);
                        return `Gasto:  ${formatCurrency(val)} (${percentage}%)`;
                    }
                    return `Gasto: ${formatCurrency(val)}`;
                },
            },
            legend: {
                show: true,
                fontSize: 16,
                offsetY: -20,
                position: 'top',
                horizontalAlign: 'right',
                showForSingleSeries: true,
                // customLegendItems: [
                //     `<span>Recebido</span> <span>${formatCurrency(totalGasto)}</span>`,
                //     `<span>Previsto</span> <span>${formatCurrency(totalPrevisto)}</span>`
                // ],
                customLegendItems: ['Gasto', 'Previsto'],
                markers: {
                    fillColors: ['var(--red-color)', 'var(--tertiary-color)'],
                    size: 7,
                    shape: 'circle',
                },
            },
            xaxis: {
                labels: {
                    formatter: function (val, index) {
                        // return `R$ ${val}`;
                        return formatCurrency(val, 0);
                    }
                },
            },
            tooltip: {
                marker: {
                    show: false,
                },
                followCursor: true,
                y: {
                    formatter: function (val) {
                        return formatCurrency(val);
                    }
                }
            }
        },
    });

    // Simulação da API (substituir com fetch/axios no futuro)
    const fetchChartData = async () => {
        try {
            // Simulação de resposta da API
            const response = await new Promise((resolve) =>
                setTimeout(() => resolve([
                    { despesa: 'Despesa 01', gasto: 1000, previsto: 1500 },
                    { despesa: 'Despesa 02', gasto: 2000, previsto: 2000 },
                    { despesa: 'Despesa 03', gasto: 500, previsto: 800 },
                    // { despesa: 'Despesa 03', gasto: 500, previsto: 800 },
                    // { despesa: 'Despesa 03', gasto: 500, previsto: 800 },
                    // { despesa: 'Despesa 03', gasto: 500, previsto: 800 },
                    // { despesa: 'Despesa 03', gasto: 500, previsto: 800 },
                    // { despesa: 'Despesa 03', gasto: 500, previsto: 800 },
                    { despesa: 'Despesa 04', gasto: 100, previsto: 500 },
                    { despesa: 'Despesa 05', gasto: 500, previsto: 200 }
                ]), 1000)
            );

            // Transformando os dados no formato esperado pelo gráfico
            const formattedData = response.map(item => ({
                x: item.despesa,
                y: item.gasto,
                goals: [{
                    name: 'Previsto',
                    value: item.previsto || 0,
                    strokeWidth: 5,
                    strokeColor: 'var(--tertiary-color)'
                }]
            }));

            // Calculando a soma total de Recebido + Previsto
            const totalGasto = response.reduce((acc, item) => {
                const valor = parseFloat(item.gasto) || 0; // Converte para número ou assume 0 se for inválido
                return acc + valor;
            }, 0);
            const totalPrevisto = response.reduce((acc, item) => {
                const valor = parseFloat(item.previsto) || 0; // Converte para número ou assume 0 se for inválido
                return acc + valor;
            }, 0);
            const diferencaGeral = (totalPrevisto - totalGasto);
            const valueColor = diferencaGeral < 0 ? 'var(--red-color)' : 'var(--primary-color)';

            // Atualizando o estado do gráfico com os novos dados
            setDespGastoCatChart(prev => ({
                ...prev,
                series: [{ name: 'Gasto', data: formattedData }],
                totalValue: diferencaGeral,
                options: {
                    ...prev.options,
                    legend: {
                        ...prev.options.legend,
                        customLegendItems: [
                            `<span>Gasto</span> <span>${formatCurrency(totalGasto)}</span>`,
                            `<span>Previsto</span> <span>${formatCurrency(totalPrevisto)}</span>`,
                            `<span>Diferença</span> <span style="color: ${valueColor};">${(diferencaGeral >= 0 ? '+' : '') + formatCurrency(diferencaGeral)}</span>`
                        ]
                    }
                }
            }));

        } catch (error) {
            console.error("Erro ao buscar os dados da API", error);
        }
    };

    // Chamar API quando o componente for montado
    useEffect(() => {
        fetchChartData();
    }, []);

    return (
        <section className="despesas-gasto-previsto-categoria">
            <Chart
                options={despGastoCatChart.options}
                series={despGastoCatChart.series}
                type="bar"
                height={600}
            />
        </section>
    );
}

export default DespesasGastoPrevistoCategoria;
