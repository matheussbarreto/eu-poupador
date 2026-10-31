import React, { useState } from "react";
import Chart from "react-apexcharts";
import './ControleInvestimentos.css';
import { formatCurrency } from "../utils/formatCurrency";

const formatarPercentual = (valor) => valor == null ? '—' :
    (valor >= 0 ? '+' : '') + valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';

const ControleInvestimentos = ({ dados, carregando, erro, onTentarNovamente }) => {
    const [seriesVisiveis, setSeriesVisiveis] = useState({ Atual: true, 'Mês Anterior': true });
    const itens = dados?.itens || [];
    const legendas = [
        { nome: 'Atual', campo: 'atual', mes: dados?.categoria, classe: 'yellow', cor: 'var(--yellow-color)' },
        { nome: 'Mês Anterior', campo: 'anterior', mes: dados?.categoriaAnterior, classe: 'gray', cor: 'var(--tertiary-color)' },
    ];
    const visiveis = [...legendas].reverse().filter((legenda) => seriesVisiveis[legenda.nome]);
    const series = visiveis.map((legenda) => ({ name: legenda.nome, data: itens.map((item) => item[legenda.campo]) }));
    const options = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: '"Segoe UI", "Cocogoose", Arial, sans-serif' },
        plotOptions: { bar: { horizontal: true, barHeight: '65%' } },
        colors: visiveis.map((legenda) => legenda.cor),
        dataLabels: {
            enabled: true,
            style: { fontSize: '11px' },
            background: { enabled: true, foreColor: '#333', padding: 3, borderRadius: 2 },
            formatter: (valor) => formatCurrency(valor),
        },
        xaxis: { categories: itens.map((item) => item.nome), labels: { formatter: (valor) => formatCurrency(valor, 0) } },
        yaxis: { labels: { maxWidth: 180 } },
        legend: { show: false },
        tooltip: {
            y: {
                formatter: (valor, { seriesIndex, dataPointIndex }) => {
                    const atual = visiveis[seriesIndex]?.campo === 'atual';
                    return formatCurrency(valor) + (atual ? ` (${formatarPercentual(itens[dataPointIndex]?.diferencaPercentual)})` : '');
                },
            },
        },
    };

    return (
        <section className="controle-investimentos" aria-busy={Boolean(carregando)}>
            <h2>Controle dos Investimentos</h2>
            {carregando || erro || !dados ? <div className="estado-controle-investimentos">
                {erro ? <><p role="alert">{erro}</p><button className="button" onClick={onTentarNovamente}>Tentar novamente</button></> :
                    <p role="status">Carregando investimentos...</p>}
            </div> : <>
                <div className="legenda">
                    {legendas.map((legenda) => <div className="legenda-serie" key={legenda.nome} title={legenda.mes}>
                        <div className="pretty">
                            <input type="checkbox" aria-label={'Exibir ' + legenda.nome} checked={seriesVisiveis[legenda.nome]}
                                onChange={() => setSeriesVisiveis((anteriores) => ({ ...anteriores, [legenda.nome]: !anteriores[legenda.nome] }))} />
                            <div className={'state ' + legenda.classe}><label>{legenda.nome}</label></div>
                        </div>
                        <span>{formatCurrency(dados[legenda.campo])}</span>
                    </div>)}
                    <div className="legenda-serie diferenca-investimentos">
                        <span>Diferença</span>
                        <span style={{ color: dados.diferenca < 0 ? 'var(--red-color)' : 'var(--primary-color)' }}>
                            {(dados.diferenca >= 0 ? '+' : '') + formatCurrency(dados.diferenca)}<br />({formatarPercentual(dados.diferencaPercentual)})
                        </span>
                    </div>
                </div>
                {dados.semDados ? <p className="estado-controle-investimentos" role="status">Não há saldos de investimentos no mês selecionado ou no anterior.</p> :
                    visiveis.length > 0 ? <Chart options={options} series={series} type="bar" height={Math.max(320, itens.length * 80 + 80)} /> :
                        <p className="estado-controle-investimentos" role="status">Selecione uma série para visualizar.</p>}
            </>}
        </section>
    );
};

export default ControleInvestimentos;
