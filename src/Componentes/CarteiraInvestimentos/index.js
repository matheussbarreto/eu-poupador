import React from "react";
import Chart from "react-apexcharts";
import './CarteiraInvestimentos.css';
import { formatCurrency } from "../utils/formatCurrency";

const paleta = ["#B0B0B0", "#717171", "#FF9900", "var(--primary-color)", "#FF0000", "#B50000", "#6fdb8f", "#84bc26", "#FFC04D", "#002776"];

function obterCorInvestimento(id) {
    // O identificador mantém a cor mesmo quando o nome, a ordem ou o mês mudam.
    const codigo = [...id].reduce((valor, letra) => (valor * 31 + letra.codePointAt(0)) >>> 0, 0);
    return paleta[codigo % paleta.length];
}

const CarteiraInvestimentos = ({ dados, carregando, erro, onTentarNovamente }) => {
    const itens = dados?.itens || [];
    const cores = itens.map((item) => obterCorInvestimento(item.id));
    const options = {
        chart: { type: "donut", fontFamily: '"Segoe UI", "Cocogoose", Arial, sans-serif' },
        plotOptions: {
            pie: {
                donut: {
                    size: "65%",
                    labels: {
                        show: true,
                        name: { fontSize: '14px', fontWeight: 700, color: "#373d3f" },
                        value: { fontSize: '16px', formatter: (valor) => formatCurrency(valor) },
                        total: {
                            show: true, showAlways: true, label: 'Saldo positivo',
                            fontSize: '14px', fontWeight: 700, color: '#373d3f',
                            formatter: () => formatCurrency(dados?.total || 0),
                        },
                    },
                },
            },
        },
        labels: itens.map((item) => item.nome),
        colors: cores,
        dataLabels: { enabled: false },
        legend: { show: false },
        tooltip: { enabled: false },
        responsive: [{
            breakpoint: 1300,
            options: {
                plotOptions: { pie: { donut: { labels: { value: { fontSize: '14px' }, total: { fontSize: '11px' } } } } },
            },
        }],
    };

    return (
        <section className="carteira-investimentos donut-chart" aria-busy={Boolean(carregando)}>
            <h2>Carteira de Investimentos</h2>
            {carregando || erro || !dados ? <div className="estado-carteira">
                {erro ? <><p role="alert">{erro}</p><button className="button" onClick={onTentarNovamente}>Tentar novamente</button></> :
                    <p role="status">Carregando carteira de investimentos...</p>}
            </div> : dados.semDados ? <div className="estado-carteira">
                <p role="status">Não há investimentos com saldo positivo no mês selecionado.</p>
                <p>Saldo positivo: {formatCurrency(0)}</p>
            </div> : <>
                <div className="area-grafico-carteira">
                    <Chart options={options} series={itens.map((item) => item.valor)} type="donut" height="100%" />
                </div>
                <ul className="legenda-carteira" aria-label="Participação nos saldos positivos dos investimentos" title={dados.categoria}>
                    {itens.map((item, indice) => <li key={item.id}>
                        <span className="cor-investimento" style={{ backgroundColor: cores[indice] }} aria-hidden="true" />
                        <span className="nome-investimento"><strong>{item.nome}</strong><br />Porcentagem</span>
                        <span className="valor-investimento">
                            <strong>{formatCurrency(item.valor)}</strong><br />
                            {item.percentual.toFixed(2).replace('.', ',')}%
                        </span>
                    </li>)}
                </ul>
            </>}
        </section>
    );
};

export default CarteiraInvestimentos;
