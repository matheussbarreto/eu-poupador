import React, { useState } from "react";
import Chart from "react-apexcharts";
import './ReceitasRecebidoPrevisto.css';
import { formatCurrency } from "../utils/formatCurrency";

const ReceitasRecebidoPrevisto = ({ dados, carregando, erro, onTentarNovamente }) => {
    const [seriesVisiveis, setSeriesVisiveis] = useState({ Recebido: true, Previsto: true });
    const legendas = [
        { name: "Recebido", value: dados?.recebido || 0, color: 'blue', corGrafico: 'var(--primary-color)' },
        { name: "Previsto", value: dados?.previsto || 0, color: 'gray', corGrafico: 'var(--tertiary-color)' },
    ];
    const visiveis = legendas.filter((legenda) => seriesVisiveis[legenda.name]);
    const series = visiveis.map((legenda) => ({ name: legenda.name, data: [legenda.value] }));
    const percentual = dados?.diferencaPercentual == null ? null : Number(dados.diferencaPercentual.toFixed(2));
    const textoPercentual = percentual === null ? "—" :
        (percentual >= 0 ? '+' : '') + percentual.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';

    const options = {
        chart: {
            type: 'bar',
            toolbar: { show: false },
            fontFamily: '"Segoe UI", "Cocogoose", Arial, sans-serif',
            fontWeight: '700',
        },
        legend: { show: false },
        plotOptions: {
            bar: {
                borderRadius: 5,
                columnWidth: '50%',
                distributed: false,
            },
        },
        dataLabels: { enabled: false },
        colors: visiveis.map((legenda) => legenda.corGrafico),
        stroke: { show: true, width: 6, colors: ['transparent'] },
        xaxis: { categories: dados ? [dados.categoria] : [] },
        yaxis: { labels: { formatter: (valor) => formatCurrency(valor, 0) } },
        tooltip: { y: { formatter: (valor) => formatCurrency(valor) } },
        noData: { text: "Selecione uma série para visualizar." },
    };

    return (
        <section className='receitas-recebido-previsto' aria-busy={carregando}>
            <h2>Receitas: Recebido vs. Previsto</h2>
            {carregando || erro || !dados ? (
                <div className="estado-previsoes">
                    {erro ? <>
                        <p role="alert">{erro}</p>
                        <button className="button" onClick={onTentarNovamente}>Tentar novamente</button>
                    </> : <p role="status">Carregando receitas e previsões...</p>}
                </div>
            ) : <>
                {dados.semDados && <p role="status">Não há receitas recebidas ou previstas no mês selecionado.</p>}
                <table className="legend">
                    <tbody>
                        {legendas.map((legenda) => (
                            <tr key={legenda.name}>
                                <td>
                                    <div className="pretty">
                                        <input
                                            type="checkbox"
                                            aria-label={"Exibir " + legenda.name}
                                            checked={seriesVisiveis[legenda.name]}
                                            onChange={() => setSeriesVisiveis((anteriores) => ({ ...anteriores, [legenda.name]: !anteriores[legenda.name] }))}
                                        />
                                        <div className={"state " + legenda.color}>
                                            <label>{legenda.name}</label>
                                        </div>
                                    </div>
                                </td>
                                <td><span>{formatCurrency(legenda.value)}</span></td>
                            </tr>
                        ))}
                        <tr>
                            <td style={{ paddingLeft: 18, alignContent: 'start', fontWeight: 'bold' }}>Diferença</td>
                            <td style={{ color: dados.diferenca < 0 ? 'var(--red-color)' : 'var(--primary-color)', fontWeight: 'bold' }}>
                                {(dados.diferenca >= 0 ? '+' : '') + formatCurrency(dados.diferenca)}<br />
                                ({textoPercentual})
                            </td>
                        </tr>
                    </tbody>
                </table>
                <Chart options={options} series={series} type="bar" height={300} />
            </>}
        </section>
    );
};

export default ReceitasRecebidoPrevisto;
