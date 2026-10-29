import React, { useState } from "react";
import Chart from "react-apexcharts";
import './VariacaoPatrimonial.css';
import { formatCurrency } from "../utils/formatCurrency";

const VariacaoPatrimonial = ({ dados, carregando, erro, onTentarNovamente }) => {
    const [seriesVisiveis, setSeriesVisiveis] = useState({ Atual: true, 'Mês Anterior': true });
    const legendas = [
        { nome: 'Atual', valor: dados?.atual ?? 0, mes: dados?.categoria, classe: 'dark-blue', cor: 'var(--dark-blue-color)' },
        { nome: 'Mês Anterior', valor: dados?.anterior ?? 0, mes: dados?.categoriaAnterior, classe: 'gray', cor: 'var(--tertiary-color)' },
    ];
    const visiveis = [...legendas].reverse().filter((legenda) => seriesVisiveis[legenda.nome]);
    const series = visiveis.map((legenda) => ({ name: legenda.nome, data: [legenda.valor] }));
    const percentual = dados?.diferencaPercentual == null ? null : Number(dados.diferencaPercentual.toFixed(2));
    const textoPercentual = percentual === null ? '—' :
        (dados.diferencaPercentual >= 0 ? '+' : '') + percentual.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
    const options = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: '"Segoe UI", "Cocogoose", Arial, sans-serif' },
        legend: { show: false },
        plotOptions: { bar: { borderRadius: 5, horizontal: false, columnWidth: '50%', distributed: false } },
        dataLabels: { enabled: false },
        colors: visiveis.map((legenda) => legenda.cor),
        stroke: { show: true, width: 6, colors: ['transparent'] },
        xaxis: { categories: dados ? [dados.categoria] : [] },
        yaxis: { labels: { formatter: (valor) => formatCurrency(valor, 0) } },
        tooltip: { y: { formatter: (valor) => formatCurrency(valor) } },
    };

    return (
        <section className="variacao-patrimonial" aria-busy={Boolean(carregando)}>
            <h2>Variação Patrimonial</h2>
            {carregando || erro || !dados ? <div className="estado-variacao">
                {erro ? <><p role="alert">{erro}</p><button className="button" onClick={onTentarNovamente}>Tentar novamente</button></> :
                    <p role="status">Carregando patrimônio...</p>}
            </div> : <>
                <div className="legenda">
                    {legendas.map((legenda) => <div className="legenda-serie" key={legenda.nome} title={legenda.mes}>
                        <div className="pretty">
                            <input type="checkbox" aria-label={'Exibir ' + legenda.nome} checked={seriesVisiveis[legenda.nome]}
                                onChange={() => setSeriesVisiveis((anteriores) => ({ ...anteriores, [legenda.nome]: !anteriores[legenda.nome] }))} />
                            <div className={'state ' + legenda.classe}><label>{legenda.nome}</label></div>
                        </div>
                        <span>{formatCurrency(legenda.valor)}</span>
                    </div>)}
                    <div className="legenda-serie diferenca-patrimonial">
                        <span>Diferença</span>
                        <span style={{ color: dados.diferenca < 0 ? 'var(--red-color)' : 'var(--primary-color)' }}>
                            {(dados.diferenca >= 0 ? '+' : '') + formatCurrency(dados.diferenca)}<br />({textoPercentual})
                        </span>
                    </div>
                </div>
                {visiveis.length > 0 ? <div className="area-grafico-variacao">
                    <Chart options={options} series={series} type="bar" height="100%" />
                </div> : <p className="estado-variacao" role="status">Selecione uma série para visualizar.</p>}
            </>}
        </section>
    );
};

export default VariacaoPatrimonial;
