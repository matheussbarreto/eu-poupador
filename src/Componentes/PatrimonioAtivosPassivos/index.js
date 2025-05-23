import React from "react";
import Chart from "react-apexcharts";
import './PatrimonioAtivosPassivos.css';
import { formatCurrency } from "../utils/formatCurrency";

const PatrimonioAtivosPassivos = () => {

  const categories = ["Abr/2023", "Mai/2023", "Jun/2023", "Jul/2023", "Ago/2023", "Set/2023", "Out/2023", "Nov/2023", "Dez/2023", "Jan/2024", "Fev/2024", "Mar/2024", "Abr/2024", "Mai/2024", "Jun/2024", "Jul/2024", "Ago/2024", "Set/2024", "Out/2024", "Nov/2024", "Dez/2024", "Jan/2025"];
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
      curve: "smooth", // Linha suave
    },
    xaxis: {
      categories: categories, // Exemplo de categorias
      min: totalCategories > categoriesToShow ? totalCategories - categoriesToShow : 1,
      max: totalCategories,
    },
    yaxis: {
      labels: {
        formatter: function (val, index) {
          // return `R$ ${val}`;
          return formatCurrency(val, 0);
        }
      },
    },
    title: {
      text: "Patrimônio: Ativos vs. Passivos",
      align: "left",
      style: {
        color: "#24b7d9",
        fontSize: 20
      },
    },
    colors: ["var(--primary-color)", "var(--red-color)", "var(--dark-blue-color)"], 
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      offsetY: -20,
      fontSize: 16,
      formatter: function (seriesName, opts) {
        const { series, seriesNames } = opts.w.globals;
        const currentValue = series[opts.seriesIndex].slice(-1)[0] || 0;
        const currentName = seriesNames[opts.seriesIndex];
        const valueColor = currentName === 'Patrimônio'
          ? (currentValue < 0 ? '#ff1616' : '#24b7d9')
          : '#000';

        return `
          <span>${seriesName}</span>
          <span style="color: ${valueColor};">${formatCurrency(currentValue)}</span>
        `;
      }
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
      data: [3000, 4000, 3500, 5000, 4900, 6000, 7000, 4000, 3500, 5000, 4900, 6000, 7000, 4000, 3500, 5000, 4900, 6000, 7000, 4000, 3500, 5000],
    },
    {
      name: "Passivos",
      data: [1000, 3000, 3000, 6000, 6900, 4000, 9000, 3000, 3000, 6000, 6900, 4000, 9000, 3000, 3000, 6000, 6900, 4000, 9000, 3000, 3000, 6000],
    },
    {
      name: "Patrimônio",
      data: [2000, 1000, 500, -1000, -2000, 2000, -2000, 1000, 500, -1000, -2000, 2000, -2000, 1000, 500, -1000, -2000, 2000, -2000, 1000, 500, -1000]
    }
  ];

  return (
    <section className='patrimonio-ativos-passivos'>
      <Chart
        options={chartOptions}
        series={chartSeries}
        type="line"
        height={400}
      />
    </section>
  )
}

export default PatrimonioAtivosPassivos;