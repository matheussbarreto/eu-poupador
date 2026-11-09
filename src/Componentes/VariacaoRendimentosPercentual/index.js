import React, { useState } from "react";
import Chart from "react-apexcharts";
import './VariacaoRendimentosPercentual.css';

const formatarPercentual = (valor) => valor == null ? '—' :
    valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';

const VariacaoRendimentosPercentual = ({ dados, carregando, erro, onTentarNovamente }) => {
    const [seriesVisiveis, setSeriesVisiveis] = useState({ 'Mês Atual': true, 'Mês Anterior': true });
    const legendas = [
        { nome: 'Mês Atual', valor: dados?.atual ?? null, mes: dados?.categoria, classe: 'yellow', cor: 'var(--yellow-color)' },
        { nome: 'Mês Anterior', valor: dados?.anterior ?? null, mes: dados?.categoriaAnterior, classe: 'gray', cor: 'var(--tertiary-color)' },
    ];
    const visiveis = [...legendas].reverse().filter((legenda) => seriesVisiveis[legenda.nome]);
    const temValores = visiveis.some((legenda) => legenda.valor !== null);
    const diferenca = dados?.diferenca == null ? null : Number(dados.diferenca.toFixed(2)) || 0;
    const textoDiferenca = diferenca === null ? '—' : (diferenca >= 0 ? '+' : '') +
        diferenca.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' p.p.';
    const options = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: '"Segoe UI", "Cocogoose", Arial, sans-serif' },
        legend: { show: false },
        plotOptions: { bar: { borderRadius: 5, horizontal: false, columnWidth: '50%', distributed: false } },
        dataLabels: { enabled: false },
        colors: visiveis.map((legenda) => legenda.cor),
        stroke: { show: true, width: 6, colors: ['transparent'] },
        xaxis: { categories: dados ? [dados.categoria] : [] },
        yaxis: { labels: { formatter: formatarPercentual } },
        tooltip: {
            x: { formatter: (_, { seriesIndex }) => visiveis[seriesIndex].mes +
                (visiveis[seriesIndex].nome === 'Mês Atual' && dados.parcial ? ' · parcial até ' + dados.dataReferencia : '') },
            y: { formatter: (valor) => valor == null ? 'Indisponível' : formatarPercentual(valor) + ' no mês' },
        },
    };

    return (
        <section className="variacao-rendimentos-percentual" aria-busy={Boolean(carregando)}>
            <h2>Variação dos Rendimentos</h2>
            {carregando || erro || !dados ? <div className="estado-variacao">
                {erro ? <><p role="alert">{erro}</p><button className="button" onClick={onTentarNovamente}>Tentar novamente</button></> :
                    <p role="status">Carregando rendimentos...</p>}
            </div> : <>
                <div className="legenda">
                    {legendas.map((legenda) => <div className="legenda-serie" key={legenda.nome} title={legenda.mes}>
                        <div className="pretty">
                            <input type="checkbox" aria-label={'Exibir ' + legenda.nome} checked={seriesVisiveis[legenda.nome]}
                                onChange={() => setSeriesVisiveis((anteriores) => ({ ...anteriores, [legenda.nome]: !anteriores[legenda.nome] }))} />
                            <div className={'state ' + legenda.classe}><label>{legenda.nome}</label></div>
                        </div>
                        <span>{formatarPercentual(legenda.valor)}</span>
                    </div>)}
                    <div className="legenda-serie diferenca-rendimentos" title="Diferença em pontos percentuais">
                        <span>Variação</span>
                        <span style={{ color: diferenca === null ? undefined : diferenca < 0 ? 'var(--red-color)' : 'var(--primary-color)' }}>
                            {textoDiferenca}
                        </span>
                    </div>
                </div>
                {temValores ? <div className="area-grafico-variacao">
                    <Chart options={options} series={visiveis.map((legenda) => ({ name: legenda.nome, data: [legenda.valor] }))} type="bar" height="100%" />
                </div> : <p className="estado-variacao" role="status">
                    {visiveis.length ? 'Sem taxas disponíveis para os meses comparados.' : 'Selecione uma série para visualizar.'}
                </p>}
            </>}
        </section>
    );
};

export default VariacaoRendimentosPercentual;
