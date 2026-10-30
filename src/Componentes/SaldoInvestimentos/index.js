import React, { useState } from "react";
import Chart from "react-apexcharts";
import './SaldoInvestimentos.css';
import { formatCurrency } from "../utils/formatCurrency";

const SaldoInvestimentos = ({ dados, carregando, erro, onTentarNovamente }) => {
  const [exibirSaldo, setExibirSaldo] = useState(true);
  const percentual = dados?.diferencaPercentual == null ? null : Number(dados.diferencaPercentual.toFixed(2));
  const textoPercentual = percentual === null ? '—' :
    (dados.diferencaPercentual >= 0 ? '+' : '') + percentual.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  const chartSeries = [{ name: "Investimentos", data: dados?.saldos || [] }];
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
    colors: ["#FF9900"],
    legend: { show: false },
    markers: { size: 5, shape: 'circle' },
  };

  return (
    <section className="saldo-investimentos" aria-busy={Boolean(carregando)}>
      <h2>Saldo dos Investimentos</h2>
      {carregando || erro || !dados ? (
        <div className="estado-saldo-investimentos">
          {erro ? <>
            <p role="alert">{erro}</p>
            <button className="button" onClick={onTentarNovamente}>Tentar novamente</button>
          </> : <p role="status">Carregando investimentos...</p>}
        </div>
      ) : <>
        <div className="legenda">
          <span className="legenda-serie" title={dados.categoria}>
            <span className="pretty">
              <input type="checkbox" aria-label="Exibir saldo dos investimentos" checked={exibirSaldo} onChange={() => setExibirSaldo((anterior) => !anterior)} />
              <span className="state yellow"><label>Atual</label></span>
            </span>
            <span>{formatCurrency(dados.atual)}</span>
          </span>
          <span className="legenda-serie" title={dados.categoriaAnterior}>
            <span className="pretty diferenca">Mês Anterior</span>
            <span>{formatCurrency(dados.anterior)}</span>
          </span>
          <span className="legenda-serie diferenca-investimentos">
            <span className="pretty diferenca">Diferença</span>
            <span style={{ color: dados.diferenca < 0 ? 'var(--red-color)' : 'var(--primary-color)' }}>
              {(dados.diferenca >= 0 ? '+' : '') + formatCurrency(dados.diferenca)}<br />({textoPercentual})
            </span>
          </span>
        </div>
        {exibirSaldo ? <Chart options={chartOptions} series={chartSeries} type="line" height={300} /> :
          <p className="estado-saldo-investimentos" role="status">Selecione a série para visualizar.</p>}
      </>}
    </section>
  );
};

export default SaldoInvestimentos;
