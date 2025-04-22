import React, { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import './RendimentosPercentual.css';
import { formatCurrency } from "../utils/formatCurrency";

const RendimentosPercentual = () => {

  const categories = ["Jun/2024", "Jul/2024", "Ago/2024", "Set/2024", "Out/2024", "Nov/2024", "Dez/2024", "Jan/2025"];
  const totalCategories = categories.length;
  const categoriesToShow = 11;

  const [selicData, setSelicData] = useState([]);

  useEffect(() => {
    const fetchSelic = async () => {
      const response = await fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.4390/dados?formato=json");
      const data = await response.json();

      // Filtra os dados para os meses do seu gráfico
      const mesesFiltro = ["06/2024", "07/2024", "08/2024", "09/2024", "10/2024", "11/2024", "12/2024", "01/2025"];

      const selicMensal = mesesFiltro.map(mes => {
        const valorMes = data
          .filter(entry => entry.data.includes(mes))
          .map(e => parseFloat(e.valor));

        const media = valorMes.length
          ? (valorMes.reduce((a, b) => a + b, 0) / valorMes.length).toFixed(2)
          : null;

        return media ? parseFloat(media) : 0;
      });

      setSelicData(selicMensal);
    };

    fetchSelic();
  }, []);

  const chartOptions = {
    chart: {
      type: "line",
      toolbar: { show: false },
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
      categories: categories,
      min: totalCategories > categoriesToShow ? totalCategories - categoriesToShow : 1,
      max: totalCategories,
    },
    yaxis: {
      labels: {
        formatter: function (val, index) {
          return `${val} %`;
        }
      },
      min: 0,
    },
    title: {
      text: "Rendimentos (% a.a.)",
      align: "left",
      style: {
        color: "#24b7d9",
        fontSize: 20
      },
    },
    colors: ["#FF9900", "var(--dark-blue-color)"],
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
      offsetY: -19,
      fontSize: 16,
      formatter: function (seriesName, opts) {
        const { series, seriesNames } = opts.w.globals;
        const currentValue = series[opts.seriesIndex].slice(-1)[0] || 0;
        const currentName = seriesNames[opts.seriesIndex];
        const valueColor = currentName === 'Saldo'
          ? (currentValue < 0 ? '#ff1616' : '#24b7d9')
          : '';

        return `
          <span>${seriesName}</span>
          <span style="color: ${valueColor};">${currentValue.toFixed(2)}%</span>
        `;
      },
      // customLegendItems: [
      //   `<span>Gasto</span> <span>1221</span>`,
      //   `<span>Gasto</span> <span>1221</span>`,
      //   `<span>Previsto</span> <span>651651</span>`,
      // ]
    },
    markers: {
      size: 5,
      shape: 'circle',
    },
  };

  // Dados do gráfico
  const chartSeries = [
    {
      name: "Rendimento Atual",
      data: [0.57, 2.00, 0.29, 1.56, 1.24, 1.60, 0.61, 1.50],
    },
    {
      name: "Rendimento Selic",
      data: selicData,
    }
  ];

  return (
    <section className='rendimentos-percentual'>
      {/*<h2 className="">Rendimentos (% a.a.)</h2>
       <div className="legenda">
        <span className="legenda-serie ">
          <span className="pretty">
            <input type="checkbox" />
            <span className="state yellow"><label>Rendimento Atual</label></span>
          </span>
          <span>{1.5}%</span>
        </span>
      </div> */}
      <Chart
        options={chartOptions}
        series={chartSeries}
        type="line"
        height={360}
      />
    </section>
  )
}

export default RendimentosPercentual;