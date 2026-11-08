import React, { useState } from "react";
import Chart from "react-apexcharts";
import './RendimentosPercentual.css';

const formatarPercentual = (valor) => valor == null ? '—' :
  valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';

const RendimentosPercentual = ({ dados, carregando, erro, onTentarNovamente, selic, carregandoSelic, erroSelic, onTentarSelic }) => {
  const [seriesVisiveis, setSeriesVisiveis] = useState({ atual: true, selic: true });
  const legendas = [
    { id: 'atual', nome: 'Rendimento Atual', taxas: dados?.taxas || [], acumulado: dados?.acumuladoAno, classe: 'yellow', cor: '#FF9900' },
    { id: 'selic', nome: 'Rendimento Selic', taxas: selic?.taxas || [], acumulado: selic?.acumuladoAno, classe: 'dark-blue', cor: 'var(--dark-blue-color)' },
  ];
  const visiveis = legendas.filter((item) => seriesVisiveis[item.id] && (item.id !== 'selic' || selic));
  const temPontos = visiveis.some((item) => item.taxas.some((taxa) => taxa !== null));
  const options = {
    chart: { type: 'line', toolbar: { show: false }, zoom: { enabled: false }, fontFamily: '"Segoe UI", "Cocogoose", sans-serif' },
    dataLabels: { enabled: false },
    stroke: { curve: 'straight' },
    xaxis: { categories: dados?.categorias || [] },
    yaxis: { labels: { formatter: formatarPercentual } },
    tooltip: {
      x: { formatter: (_, { dataPointIndex }) => dados.categorias[dataPointIndex] +
        (dados.parcial && dataPointIndex === dados.categorias.length - 1 ? ' · parcial até ' + dados.dataReferencia : '') },
      y: { formatter: (valor) => valor == null ? 'Indisponível' : formatarPercentual(valor) + ' no mês' },
    },
    colors: visiveis.map((item) => item.cor),
    legend: { show: false },
    markers: { size: 5, shape: 'circle' },
  };

  return (
    <section className="rendimentos-percentual" aria-busy={Boolean(carregando)}>
      <h2>Rendimentos (% a.a.)</h2>
      {carregando || erro || !dados ? <div className="estado-rendimentos-percentual">
        {erro ? <><p role="alert">{erro}</p><button className="button" onClick={onTentarNovamente}>Tentar novamente</button></> :
          <p role="status">Carregando rendimentos...</p>}
      </div> : <>
        <div className="legenda">
          {legendas.map((item) => <div className="legenda-serie" key={item.id}>
            <div className="pretty">
              <input type="checkbox" aria-label={'Exibir ' + item.nome} checked={seriesVisiveis[item.id]}
                onChange={() => setSeriesVisiveis((anterior) => ({ ...anterior, [item.id]: !anterior[item.id] }))} />
              <div className={'state ' + item.classe}><label>{item.nome}</label></div>
            </div>
            <span title={item.acumulado == null ? 'Sem dados suficientes para o acumulado do período' : 'Acumulado no ano, sem anualização'}>{formatarPercentual(item.acumulado)}</span>
          </div>)}
        </div>
        {carregandoSelic ? <p role="status">Carregando Selic...</p> : erroSelic ?
          <div className="estado-selic"><p role="alert">{erroSelic}</p><button className="button" onClick={onTentarSelic}>Tentar Selic novamente</button></div> : null}
        {temPontos ? <Chart options={options} series={visiveis.map((item) => ({ name: item.nome, data: item.taxas }))} type="line" height={310} /> :
          <p className="estado-rendimentos-percentual" role="status">{visiveis.length ? 'Sem taxas disponíveis para as séries selecionadas.' : 'Selecione uma série para visualizar.'}</p>}
      </>}
    </section>
  );
};

export default RendimentosPercentual;
