import React, { useEffect, useRef, useState } from "react";
import Chart from "react-apexcharts";
import './DespesasGastoPrevisto.css';
import { formatCurrency } from "../utils/formatCurrency";

const DespesasGastoPrevisto = ({ dados, carregando, erro, onTentarNovamente }) => {
    const [seriesVisiveis, setSeriesVisiveis] = useState({ Gasto: true, Previsto: true });
    const [alturaGrafico, setAlturaGrafico] = useState(300);
    const areaGrafico = useRef(null);
    const exibirGrafico = !carregando && !erro && Boolean(dados);

    useEffect(() => {
        if (!exibirGrafico || typeof ResizeObserver === 'undefined') return;

        const observador = new ResizeObserver(([entrada]) => {
            setAlturaGrafico(Math.max(300, Math.floor(entrada.contentRect.height)));
        });
        observador.observe(areaGrafico.current);
        return () => observador.disconnect();
    }, [exibirGrafico]);

    const legendas = [
        { name: "Gasto", value: dados?.gasto || 0, color: 'red', corGrafico: 'var(--red-color)' },
        { name: "Previsto", value: dados?.previsto || 0, color: 'gray', corGrafico: 'var(--tertiary-color)' },
    ];
    const visiveis = legendas.filter((legenda) => seriesVisiveis[legenda.name]);
    const series = visiveis.map((legenda) => ({ name: legenda.name, data: [legenda.value] }));
    const percentual = dados?.diferencaPercentual == null ? null : Number(dados.diferencaPercentual.toFixed(2));
    const textoPercentual = percentual === null ? "—" :
        (dados.diferencaPercentual >= 0 ? '+' : '') + percentual.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';

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
        <section className='despesas-gasto-previsto' aria-busy={carregando}>
            <h2>Despesas: Gasto vs. Previsto</h2>
            {carregando || erro || !dados ? (
                <div className="estado-previsoes">
                    {erro ? <>
                        <p role="alert">{erro}</p>
                        <button className="button" onClick={onTentarNovamente}>Tentar novamente</button>
                    </> : <p role="status">Carregando despesas e previsões...</p>}
                </div>
            ) : <>
                {dados.semDados && <p role="status">Não há despesas realizadas ou previstas no mês selecionado.</p>}
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
                <div className="area-grafico-despesas" ref={areaGrafico}>
                    <Chart options={options} series={series} type="bar" height={alturaGrafico} />
                </div>
            </>}
        </section>
    );
};

export default DespesasGastoPrevisto;
