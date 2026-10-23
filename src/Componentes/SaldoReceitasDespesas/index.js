import React, { useState, useEffect } from "react";
import Chart from "react-apexcharts";
import './SaldoReceitasDespesas.css';
import { formatCurrency } from "../utils/formatCurrency";

const SaldoReceitasDespesas = ({ dados, carregando, erro, onTentarNovamente }) => {
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
    window.addEventListener("blur", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleKeyUp);
    };
  }, []);

  const chartSeries = [
    { name: "Receitas", data: dados?.receitas || [] },
    { name: "Despesas", data: dados?.despesas || [] },
    { name: "Saldo", data: dados?.saldos || [] },
  ];

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
      categories: dados?.categorias || [],
    },
    yaxis: {
      labels: {
        formatter: function (val) {
          return formatCurrency(val, 0);
        }
      },
    },
    tooltip: {
      y: { formatter: (valor) => formatCurrency(valor) },
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
        const currentValue = chartSeries[opts.seriesIndex].data.slice(-1)[0] || 0;
        const currentName = seriesName;
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

  return (
    <section className='saldo-receitas-despesas' aria-busy={carregando}>
      {carregando || erro ? (
        <div className="estado-balanco">
          <h2>Saldo: Receitas vs. Despesas</h2>
          {carregando ? <p role="status">Carregando balanço...</p> : (
            <>
              <p role="alert">{erro}</p>
              <button className="button" onClick={onTentarNovamente}>Tentar novamente</button>
            </>
          )}
        </div>
      ) : (
        <>
          {dados?.semMovimentacoes && <p role="status">Não há receitas ou despesas no período selecionado.</p>}
          <Chart
            options={chartOptions}
            series={chartSeries}
            type="line"
            height={400}
          />
        </>
      )}
    </section>
  );
};

export default SaldoReceitasDespesas;
