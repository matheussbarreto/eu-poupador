import React from "react";
import Chart from "react-apexcharts";
import './SaldoInvestimentos.css';
import { formatCurrency } from "../utils/formatCurrency";

const SaldoInvestimentos = () => {

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
      curve: "straight",
    },
    xaxis: {
      categories: categories, // Exemplo de categorias
      min: totalCategories > categoriesToShow ? totalCategories - categoriesToShow : 1,
      max: totalCategories,
    },
    yaxis: {
      labels: {
        formatter: function (val, index) {
          return formatCurrency(val, 0);
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
      data: [30000, 30500, 31000, 31500, 32000, 32500, 33000, 33500],
    },
  ];

  return (
    <section className='saldo-investimentos'>
      <h2 className="">Saldo dos Investimentos</h2>
      <div className="legenda">
        <span className="legenda-serie ">
          <span className="pretty">
            <input type="checkbox" />
            <span className="state yellow">
              <label>
                Atual
              </label>
            </span>
          </span>
          <span>{formatCurrency(33500)}</span>
        </span>
        <span className="legenda-serie ">
          <span className="pretty">
            <input type="checkbox" />
            <span className="state gray">
              <label>
                Mês Anterior
              </label>
            </span>
          </span>
          <span>{formatCurrency(33000)}</span>
        </span>
        <span className="legenda-serie ">
          <span className="pretty diferenca">Diferença</span>
          <span style={{ color: 'var(--primary-color)' }}>{formatCurrency(500)}<br />({1.49}%)</span>
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

export default SaldoInvestimentos;