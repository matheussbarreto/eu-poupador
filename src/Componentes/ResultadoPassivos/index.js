import React from "react";
import Chart from "react-apexcharts";
import './ResultadoPassivos.css';
import { formatCurrency } from "../utils/formatCurrency";

const coresCategorias = new Map([
    ['Cartões de Crédito', '#FF0000'], ['Dívidas', '#B50000'], ['Outros', '#B0B0B0'],
]);

const ResultadoPassivos = ({ dados, carregando, erro, onTentarNovamente }) => {
    const itens = dados?.itens || [];
    const cores = itens.map((item) => coresCategorias.get(item.nome));

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
                            formatter: function () {
                                return formatCurrency(dados?.total || 0)
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
        <section className='resultado-passivos donut-chart' aria-busy={carregando}>
            <h2>Passivos</h2>
            {carregando || erro || !dados ? (
                <div className="estado-categorias">
                    {erro ? <>
                        <p role="alert">{erro}</p>
                        <button className="button" onClick={onTentarNovamente}>Tentar novamente</button>
                    </> : <p role="status">Carregando passivos...</p>}
                </div>
            ) : dados.semDados ? (
                <div className="estado-categorias">
                    <p role="status">Não há saldos negativos no mês selecionado.</p>
                    <p>Total: {formatCurrency(0)}</p>
                </div>
            ) : <>
                <Chart options={chartOptions} series={itens.map((item) => item.valor)} type="donut" height={300} />
                <ul className="legenda-categorias" aria-label="Passivos por categoria">
                    {itens.map((item, indice) => (
                        <li key={item.nome}>
                            <span className="cor-categoria" style={{ backgroundColor: cores[indice] }} aria-hidden="true" />
                            <span className="nome-categoria"><strong>{item.nome}</strong><br />Porcentagem</span>
                            <span className="valor-categoria">
                                <strong>{formatCurrency(item.valor)}</strong><br />
                                {item.percentual.toFixed(2).replace('.', ',')}%
                            </span>
                        </li>
                    ))}
                </ul>
            </>}
        </section>
    )
}

export default ResultadoPassivos;
