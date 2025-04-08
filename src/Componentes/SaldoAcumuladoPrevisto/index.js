import React from "react";
import { useRef, useState } from "react";
import Chart from "react-apexcharts";
import './SaldoAcumuladoPrevisto.css';
import { formatCurrency } from "../utils/formatCurrency";

const SaldoAcumuladoPrevisto = () => {

    const chartRef = useRef(null); // Referência para o gráfico
    const [checkboxes, setCheckboxes] = useState([
        { name: "Acumulado", value: 887998, color: 'green', checked: true },
        { name: "Previsto", value: 888888, color: 'gray', checked: true }
    ]);

    var options = {
        series: checkboxes.map((legend) => ({
            name: legend.name,
            data: [legend.value]
        })),
        chart: {
            type: 'bar',
            toolbar: {
                show: false, // Ocultar as opções de ferramentas
            },
            fontFamily: '"Segoe UI", "Cocogoose", Arial, sans-serif',
            fontWeight: '700',
            events: {
                mounted: function (chart) {
                    chartRef.current = chart; // Salva a referência do gráfico
                    checkLegends();
                }
            },
        },
        legend: {
            show: false,
            position: 'top',
            horizontalAlign: 'right',
            fontSize: 16,
            offsetY: -6,
            formatter: function (seriesName, opts) {
                // Obtém a série atual usando o índice da série
                const currentSeries = opts.w.globals.series[opts.seriesIndex];
                // Retorna o último item da série
                const val = currentSeries[currentSeries.length - 1] || 0;
                // Verifica se estamos na última execução
                // const isLastSeries = opts.seriesIndex === opts.w.globals.series.length - 1;

                return `${seriesName} ${formatCurrency(val)}`
                // return [seriesName + ' ' + formatCurrency(val)]
            },
            markers: {
                size: 7,
                shape: 'circle',
            },
        },
        plotOptions: {
            bar: {
                borderRadius: 5,
                columnWidth: '50%',
                distributed: false,
                dataLabels: {
                    position: "top",
                },
            },
        },
        dataLabels: {
            enabled: false,
            formatter: function (val) {
                return formatCurrency(val);
            },
            offsetY: -18,
            style: {
                fontSize: '12px',
                colors: ["#304758"],
                align: 'center',
            },
        },
        colors: ["var(--secondary-color)", "var(--tertiary-color)"],
        stroke: {
            show: true,
            width: 6,
            colors: ['transparent'],
        },
        title: {
            // text: "Saldo: Acumulado vs. Previsto",
            align: "left",
            style: {
                fontFamily: '"Segoe UI", "Cocogoose", Arial, sans-serif',
                color: "#24b7d9",
                fontSize: 20
            },
        },
        xaxis: {
            categories: ['Jan/2025'],
        },
        yaxis: {
            // title: {
            //     text: 'Saldo: Acumulado vs. Previsto'
            // },
            labels: {
                formatter: function (val, index) {
                    // return `R$ ${val}`;
                    return formatCurrency(val, 0);
                }
            },
        },
        // fill: {
        //     opacity: 1
        // },
        tooltip: {
            y: {
                formatter: function (val) {
                    return formatCurrency(val);
                }
            }
        }

    };

    // Função para verificar quais checkboxes estão desmarcados e ocultar séries
    const checkLegends = () => {
        checkboxes.forEach((legend) => {
            if (!legend.checked && chartRef.current) {
                chartRef.current.toggleSeries(legend.name);
            }
        });
    };

    // Função para alternar a visibilidade da série
    const toggleSeries = (name) => {
        setCheckboxes((prev) =>
            prev.map((legend) =>
                legend.name === name ? { ...legend, checked: !legend.checked } : legend
            )
        );

        if (chartRef.current) {
            chartRef.current.toggleSeries(name);
        }
    };

    return (
        <section className='saldo-acumulado-previsto' >
            {/* Checkboxes para controlar a visibilidade das séries */}

            <h2>
                Saldo: Acumulado vs. Previsto
            </h2>

            <table className="legend">
                <tbody>
                    {checkboxes.map((legend) => (
                        <tr key={legend.name}>
                            <td>
                                <div className="pretty">
                                    <input
                                        type="checkbox"
                                        checked={legend.checked}
                                        onChange={() => toggleSeries(legend.name)}
                                    />
                                    <div className={"state " + legend.color}>
                                        <label>
                                            {legend.name}
                                        </label>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <span>
                                    {formatCurrency(legend.value)}
                                </span>
                            </td>
                        </tr>
                    ))}
                    <tr>
                        <td style={{ paddingLeft: 18, alignContent: 'start', fontWeight: 'bold' }}>Diferença</td>
                        <td style={{color: 'red', fontWeight: 'bold'}}>-R$ 1.300,00 <br/>(-42,11%)</td>
                    </tr>
                </tbody>
            </table>

            <Chart
                options={options}
                series={options.series}
                type="bar"
                height={285}
            />
        </section >
    )
}

export default SaldoAcumuladoPrevisto;