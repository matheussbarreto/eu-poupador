import React from "react";
import Chart from "react-apexcharts";
import './DespesasPorCategoria.css';
import { formatCurrency } from "../utils/formatCurrency";

const coresCategorias = new Map([
    ["Habitação", "#FF0000"], ["Saúde", "#B50000"], ["Transporte", "#B0B0B0"],
    ["Pessoal", "#717171"], ["Educação", "#FFC04D"], ["Lazer", "#002776"],
    ["Outros", "#FF9900"], ["Alimentação", "#84bc26"],
]);

function obterCorCategoria(nome) {
    if (coresCategorias.has(nome)) return coresCategorias.get(nome);
    // Categorias adicionais também mantêm a cor ao trocar de mês ou de ordem.
    const codigo = [...nome].reduce((valor, letra) => (valor * 31 + letra.codePointAt(0)) >>> 0, 0);
    return `hsl(${codigo % 360}, 55%, 45%)`;
}

const DespesasPorCategoria = ({ dados, carregando, erro, onTentarNovamente }) => {
    const itens = dados?.itens || [];
    const cores = itens.map((item) => obterCorCategoria(item.nome));

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
        <section className='despesas-por-categoria donut-chart' aria-busy={carregando}>
            <h2>Despesas Por Categoria</h2>
            {carregando || erro || !dados ? (
                <div className="estado-categorias">
                    {erro ? <>
                        <p role="alert">{erro}</p>
                        <button className="button" onClick={onTentarNovamente}>Tentar novamente</button>
                    </> : <p role="status">Carregando despesas...</p>}
                </div>
            ) : dados.semDados ? (
                <div className="estado-categorias">
                    <p role="status">Não há despesas realizadas no mês selecionado.</p>
                    <p>Total: {formatCurrency(0)}</p>
                </div>
            ) : <>
                <Chart options={chartOptions} series={itens.map((item) => item.gasto)} type="donut" height={300} />
                <ul className="legenda-categorias" aria-label="Gastos por categoria">
                    {itens.map((item, indice) => (
                        <li key={item.nome}>
                            <span className="cor-categoria" style={{ backgroundColor: cores[indice] }} aria-hidden="true" />
                            <span className="nome-categoria"><strong>{item.nome}</strong><br />Porcentagem</span>
                            <span className="valor-categoria">
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

export default DespesasPorCategoria;
