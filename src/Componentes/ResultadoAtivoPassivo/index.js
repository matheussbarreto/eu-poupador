import React from "react";
import Chart from "react-apexcharts";
import './ResultadoAtivoPassivo.css';
import { formatCurrency } from "../utils/formatCurrency";

const coresCategorias = new Map([
    ['Ativos', 'var(--primary-color)'], ['Passivos', '#FF0000'],
]);

const ResultadoAtivoPassivo = ({ dados, carregando, erro, onTentarNovamente }) => {
    const itens = dados?.itens || [];
    const fatias = itens.filter((item) => item.valor > 0);
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
        labels: fatias.map((item) => item.nome),
        colors: fatias.map((item) => coresCategorias.get(item.nome)),
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
        <section className='resultado-ativo-passivo donut-chart' aria-busy={carregando}>
            <h2>Patrimônio: Ativos vs. Passivos</h2>
            {carregando || erro || !dados ? (
                <div className="estado-categorias">
                    {erro ? <>
                        <p role="alert">{erro}</p>
                        <button className="button" onClick={onTentarNovamente}>Tentar novamente</button>
                    </> : <p role="status">Carregando patrimônio...</p>}
                </div>
            ) : dados.semDados ? (
                <div className="estado-categorias">
                    <p role="status">Não há saldos no mês selecionado.</p>
                    <p>Ativos + Passivos: {formatCurrency(0)}</p>
                </div>
            ) : <>
                <Chart options={chartOptions} series={fatias.map((item) => item.valor)} type="donut" height={300} />
                <ul className="legenda-categorias" aria-label="Comparação de ativos e passivos">
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

export default ResultadoAtivoPassivo;
