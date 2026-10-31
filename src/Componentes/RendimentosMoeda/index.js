import React, { useState } from "react";
import Chart from "react-apexcharts";
import './RendimentosMoeda.css';
import { formatCurrency } from "../utils/formatCurrency";

const RendimentosMoeda = ({ dados, carregando, erro, onTentarNovamente }) => {
  const [exibirRendimentos, setExibirRendimentos] = useState(true);
  const chartOptions = {
    chart: {
      type: "line",
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: '"Segoe UI", "Cocogoose", sans-serif',
    },
    dataLabels: { enabled: false },
    stroke: { curve: "straight" },
    xaxis: { categories: dados?.categorias || [] },
    yaxis: { labels: { formatter: (valor) => formatCurrency(valor, 0) } },
    tooltip: { y: { formatter: (valor) => formatCurrency(valor) } },
    colors: ["#FF9900"],
    legend: { show: false },
    markers: { size: 5, shape: 'circle' },
  };
  const chartSeries = [{ name: "Rendimento Atual", data: dados?.rendimentos || [] }];

  return (
    <section className="rendimentos-moeda" aria-busy={Boolean(carregando)}>
      <h2>Rendimentos (R$)</h2>
      {carregando || erro || !dados ? <div className="estado-rendimentos">
        {erro ? <>
          <p role="alert">{erro}</p>
          <button className="button" onClick={onTentarNovamente}>Tentar novamente</button>
        </> : <p role="status">Carregando rendimentos...</p>}
      </div> : <>
        <div className="legenda">
          <span className="legenda-serie" title={dados.categoria}>
            <span className="pretty">
              <input type="checkbox" aria-label="Exibir rendimentos" checked={exibirRendimentos}
                onChange={() => setExibirRendimentos((anterior) => !anterior)} />
              <span className="state yellow"><label>Rendimento Atual</label></span>
            </span>
            <span>{formatCurrency(dados.atual)}</span>
          </span>
        </div>
        {exibirRendimentos ? <Chart options={chartOptions} series={chartSeries} type="line" height={310} /> :
          <p className="estado-rendimentos" role="status">Selecione a série para visualizar.</p>}
      </>}
    </section>
  );
};

export default RendimentosMoeda;
