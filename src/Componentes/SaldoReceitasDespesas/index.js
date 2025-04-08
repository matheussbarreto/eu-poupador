import React, { useState, useEffect } from "react";
import Chart from "react-apexcharts";
import './SaldoReceitasDespesas.css';
import { formatCurrency } from "../utils/formatCurrency";

const SaldoReceitasDespesas = () => {
  const [zoomEnabled, setZoomEnabled] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey) setZoomEnabled(true);
    };

    const handleKeyUp = () => {
      setZoomEnabled(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const categories = ["Abr/2023", "Mai/2023", "Jun/2023", "Jul/2023", "Ago/2023", "Set/2023", "Out/2023", "Nov/2023", "Dez/2023", "Jan/2024", "Fev/2024", "Mar/2024", "Abr/2024", "Mai/2024", "Jun/2024", "Jul/2024", "Ago/2024", "Set/2024", "Out/2024", "Nov/2024", "Dez/2024", "Jan/2025"];
  const totalCategories = categories.length;
  const categoriesToShow = 11;

  const chartOptions = {
    chart: {
      type: "line",
      toolbar: {
        show: false, // Ocultar as opções de ferramentas, caso deseje
      },
      zoom: {
        enabled: zoomEnabled // Zoom ativado apenas quando Ctrl estiver pressionado
      },
      fontFamily: '"Segoe UI", "Cocogoose", sans-serif',
      fontWeight: '400',
    },
    dataLabels: {
      enabled: false,
    },
    stroke: { 
      curve: "smooth",
    },
    xaxis: {
      categories: categories,
      min: totalCategories > categoriesToShow ? totalCategories - categoriesToShow : 1,
      max: totalCategories,
    },
    yaxis: {
      labels: {
        formatter: function (val) {
          return formatCurrency(val, 0);
        }
      },
    },
    title: {
      text: "Saldo: Receitas vs. Despesas",
      align: "left",
      style: {
        color: "#24b7d9",
        fontSize: 20
      },
    },
    colors: ["var(--primary-color)", "var(--red-color)", "var(--secondary-color)"], 
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      offsetY: -18,
      fontSize: 16,
      formatter: function (seriesName, opts) {
        const { series, seriesNames } = opts.w.globals;
        const currentValue = series[opts.seriesIndex].slice(-1)[0] || 0;
        const currentName = seriesNames[opts.seriesIndex];
        const valueColor = currentName === 'Saldo'
          ? (currentValue < 0 ? '#ff1616' : '#24b7d9')
          : '#000';

        return `
          <span>${seriesName}</span>
          <span style="color: ${valueColor};">${(currentValue >= 0 && currentName === 'Saldo' ? '+' : '') + formatCurrency(currentValue)}</span>
        `;
      }
    },
    markers: {
      size: 5,
      shape: 'circle',
    },
  };

  const chartSeries = [
    {
      name: "Receitas",
      data: [3000, 4000, 3500, 5000, 4900, 6000, 7000, 4000, 3500, 5000, 4900, 6000, 7000, 4000, 3500, 5000, 4900, 6000, 7000, 4000, 3500, 5000],
    },
    {
      name: "Despesas",
      data: [1000, 3000, 3000, 6000, 6900, 4000, 9000, 3000, 3000, 6000, 6900, 4000, 9000, 3000, 3000, 6000, 6900, 4000, 9000, 3000, 3000, 6000],
    },
    {
      name: "Saldo",
      data: [2000, 1000, 500, -1000, -2000, 2000, -2000, 1000, 500, -1000, -2000, 2000, -2000, 1000, 500, -1000, -2000, 2000, -2000, 1000, 500, -1000]
    }
  ];

  return (
    <section className='saldo-receitas-despesas'>
      <Chart
        options={chartOptions}
        series={chartSeries}
        type="line"
        height={400}
      />
    </section>
  );
};

export default SaldoReceitasDespesas;
