import React from "react";
import Chart from "react-apexcharts";
import './PatrimonioAtivosPassivos.css';
import { formatCurrency } from "../utils/formatCurrency";

const PatrimonioAtivosPassivos = ({ dados, carregando, erro, onTentarNovamente }) => {
  const chartSeries = [
    { name: "Ativos", data: dados?.ativos || [] },
    { name: "Passivos", data: dados?.passivos || [] },
    { name: "Patrimônio", data: dados?.patrimonios || [] },
  ];
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
    tooltip: { y: { formatter: (valor) => valor == null ? "—" : formatCurrency(valor) } },
    colors: ["var(--primary-color)", "var(--red-color)", "var(--dark-blue-color)"],
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      fontSize: 16,
      formatter: (nome, opcoes) => {
        // Os totais são do mês selecionado, mesmo ao ocultar uma série pela legenda.
        const valor = chartSeries[opcoes.seriesIndex].data.slice(-1)[0];
        const cor = nome === "Patrimônio" ? (valor < 0 ? '#ff1616' : '#24b7d9') : '#000';
        return `<span>${nome}</span><span style="color: ${cor};">${valor == null ? "—" : formatCurrency(valor)}</span>`;
      },
    },
    markers: { size: 5, shape: 'circle' },
  };

  return (
    <section className="patrimonio-ativos-passivos" aria-busy={Boolean(carregando)}>
      <h2>Patrimônio: Ativos vs. Passivos</h2>
      {carregando ? <p className="estado-patrimonio" role="status">Carregando patrimônio...</p> : erro ? (
        <div className="estado-patrimonio">
          <p role="alert">{erro}</p>
          <button className="button" onClick={onTentarNovamente}>Tentar novamente</button>
        </div>
      ) : !dados ? (
        <p className="estado-patrimonio" role="status">Não há histórico de patrimônio até o mês selecionado.</p>
      ) : <Chart options={chartOptions} series={chartSeries} type="line" height={400} />}
    </section>
  );
};

export default PatrimonioAtivosPassivos;
