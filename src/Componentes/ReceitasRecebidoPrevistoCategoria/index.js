import React, { useState, useEffect } from "react";
import Chart from "react-apexcharts";
import './ReceitasRecebidoPrevistoCategoria.css';
import { formatCurrency } from "../utils/formatCurrency";

const ReceitasRecebidoPrevistoCategoria = () => {

    // // Calcula a soma dos valores de Recebido e Previsto antes de definir o estado
    // let totalRecebido = 0;
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
    //     totalRecebido += item.y;
    //     if (item.goals && item.goals.length) {
    //         totalPrevisto += item.goals[0].value;
    //     }
    // });

    const [goalChart, setGoalChart] = useState({
        series: [],
        options: {
            chart: {
                type: 'bar',
                toolbar: {
                    show: false, // Ocultar as opções de ferramentas, caso deseje
                },
                fontFamily: '"Segoe UI", "Cocogoose", Arial, sans-serif',
            },
            title: {
                text: 'Receitas: Recebido Vs. Previsto',
                style: {
                    color: "var(--primary-color)",
                    fontSize: 20
                },
            },
            plotOptions: {
                bar: {
                    horizontal: true,
                    barHeight: '40%',
                }
            },
            colors: ['var(--primary-color)'],
            markers: {
                // colors: ['#8a8a8a'],
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
                        return `Recebido:  ${formatCurrency(val)} (${percentage}%)`;
                    }
                    return `Recebido: ${formatCurrency(val)}`;
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
                //     `<span>Recebido</span> <span>${formatCurrency(totalRecebido)}</span>`,
                //     `<span>Previsto</span> <span>${formatCurrency(totalPrevisto)}</span>`
                // ],
                customLegendItems: ['Recebido', 'Previsto'],
                markers: {
                    fillColors: ['var(--primary-color)', 'var(--tertiary-color)'],
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
                    { trabalho: 'Trabalho 01', recebido: 1000, previsto: 1500 },
                    { trabalho: 'Trabalho 02', recebido: 4400, previsto: 5400 },
                    { trabalho: 'Renda Extra', recebido: 5400, previsto: 5000 }
                ]), 1000)
            );

            // Transformando os dados no formato esperado pelo gráfico
            const formattedData = response.map(item => ({
                x: item.trabalho,
                y: item.recebido,
                goals: [{
                    name: 'Previsto',
                    value: item.previsto || 0,
                    strokeWidth: 3,
                    strokeColor: 'var(--tertiary-color)'
                }]
            }));

            // Calculando a soma total de Recebido + Previsto
            const totalRecebido = response.reduce((acc, item) => {
                const valor = parseFloat(item.recebido) || 0; // Converte para número ou assume 0 se for inválido
                return acc + valor;
            }, 0);
            const totalPrevisto = response.reduce((acc, item) => {
                const valor = parseFloat(item.previsto) || 0; // Converte para número ou assume 0 se for inválido
                return acc + valor;
            }, 0);
            const diferencaGeral = (totalPrevisto - totalRecebido) * -1;
            const valueColor = diferencaGeral < 0 ? 'var(--red-color)' : 'var(--primary-color)';

            // Atualizando o estado do gráfico com os novos dados
            setGoalChart(prev => ({
                ...prev,
                series: [{ name: 'Recebido', data: formattedData }],
                totalValue: diferencaGeral, // Armazena o total
                options: {
                    ...prev.options,
                    legend: {
                        ...prev.options.legend,
                        customLegendItems: [
                            `<span>Recebido</span> <span>${formatCurrency(totalRecebido)}</span>`,
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
        <section className="receitas-recebido-previsto-categoria">
            <Chart
                options={goalChart.options}
                series={goalChart.series}
                type="bar"
                height={400}
            />
        </section>
    );
}

export default ReceitasRecebidoPrevistoCategoria;
