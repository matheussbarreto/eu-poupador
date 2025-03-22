import React from "react";
import Chart from "react-apexcharts";
import './RendimentosPercentual.css';
import { formatCurrency } from "../utils/formatCurrency";

const RendimentosPercentual = () => {

  const categories = ["Jun/2024", "Jul/2024", "Ago/2024", "Set/2024", "Out/2024", "Nov/2024", "Dez/2024", "Jan/2025"];
  const totalCategories = categories.length;
  const categoriesToShow = 11;

  const chartOptions = {
    chart: {
      type: "line",
      toolbar: {
        show: false, // Ocultar as opções de ferramentas, caso deseje
      },
      fontFamily: '"Segoe UI", "Cocogoose", sans-serif',
      fontWeight: '400',
    },
    dataLabels: {
      enabled: false, // Habilitar os rótulos de dados
    },
    stroke: {
      curve: "monotoneCubic",
    },
    xaxis: {
      categories: categories, // Exemplo de categorias
      min: totalCategories > categoriesToShow ? totalCategories - categoriesToShow : 1,
      max: totalCategories,
    },
    yaxis: {
      labels: {
        formatter: function (val, index) {
          return `% ${val}`;
        }
      },
      min: 0,
    },
    colors: ["#FF9900"],
    legend: {
      show: false,
    },
    markers: {
      size: 5,
      shape: 'circle',
    },
  };

  // Dados do gráfico
  const chartSeries = [
    {
      name: "Ativos",
      data: [0.5, 2, 0.2, 1.5, 1.2, 1.6, 0.6, 1.5],
    },
  ];

  return (
    <section className='rendimentos-percentual'>
      <h2 className="">Rendimentos (% a.a.)</h2>
      <div className="legenda">
        <span className="legenda-serie ">
          <span className="pretty">
            <input type="checkbox" />
            <span className="state yellow"><label>Rendimento Atual</label></span>
          </span>
          <span>{1.5}%</span>
        </span>
      </div>
      <Chart
        options={chartOptions}
        series={chartSeries}
        type="line"
        height={300}
      />
    </section>
  )
}

export default RendimentosPercentual;