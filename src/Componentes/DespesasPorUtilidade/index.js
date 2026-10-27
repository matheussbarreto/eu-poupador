import React from "react";
import Chart from "react-apexcharts";
import './DespesasPorUtilidade.css';
import { formatCurrency } from "../utils/formatCurrency";

const coresUtilidades = new Map([
    ["Essencial", "#B0B0B0"], ["Não Essencial", "#FF0000"], ["Não classificado", "#FF9900"],
]);

const DespesasPorUtilidade = ({ dados, carregando, erro, onTentarNovamente }) => {
    const itens = dados?.itens || [];
    const cores = itens.map((item) => coresUtilidades.get(item.nome) || '#FF9900');

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
                            showAlways: true,
                            label: 'Total',
                            fontSize: '14px',
                            fontWeight: 700,
                            color: '#373d3f',
                            formatter: function () {
                                return formatCurrency(dados?.totalGasto || 0)
                            }
                        }
                    },
                },
            },
        },
        labels: itens.map((item) => item.nome),
        colors: cores,
        dataLabels: {
            enabled: false,
            formatter: (val) => `${val.toFixed(2)}%`,
        },
        legend: { show: false },
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
                        height: 270,
                    },
                    plotOptions: {
                        pie: {
                            donut: {
                                labels: {
                                    value: {
                                        fontSize: '14px',
                                    },
                                    total: {
                                        fontSize: '11px',
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
        <section className='despesas-por-utilidade donut-chart' aria-busy={carregando}>
            <h2>Despesas Por Utilidade</h2>
            {carregando || erro || !dados ? (
                <div className="estado-utilidades">
                    {erro ? <>
                        <p role="alert">{erro}</p>
                        <button className="button" onClick={onTentarNovamente}>Tentar novamente</button>
                    </> : <p role="status">Carregando despesas...</p>}
                </div>
            ) : dados.semDados ? (
                <div className="estado-utilidades">
                    <p role="status">Não há despesas realizadas no mês selecionado.</p>
                    <p>Total: {formatCurrency(0)}</p>
                </div>
            ) : <>
                <Chart options={chartOptions} series={itens.map((item) => item.gasto)} type="donut" height={300} />
                <ul className="legenda-utilidades" aria-label="Gastos por utilidade">
                    {itens.map((item, indice) => (
                        <li key={item.nome}>
                            <span className="cor-utilidade" style={{ backgroundColor: cores[indice] }} aria-hidden="true" />
                            <span className="nome-utilidade"><strong>{item.nome}</strong><br />Porcentagem</span>
                            <span className="valor-utilidade">
                                <strong>{formatCurrency(item.gasto)}</strong><br />
                                {item.percentual.toFixed(2).replace('.', ',')}%
                            </span>
                        </li>
                    ))}
                </ul>
            </>}
        </section>
    )
}

export default DespesasPorUtilidade;
