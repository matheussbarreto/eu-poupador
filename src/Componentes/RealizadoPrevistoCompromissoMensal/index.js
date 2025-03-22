import React, { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import { formatCurrency } from "../utils/formatCurrency";
import './RealizadoPrevistoCompromissoMensal.css';

const RealizadoPrevistoCompromissoMensal = () => {
    // const [data, setData] = useState([]);
    // const [labels, setLabels] = useState([]);
    // // const [loading, setLoading] = useState(true);

    // useEffect(() => {
    //     setTimeout(() => {
    //         const fakeData = {
    //             valores: [2, 50, 100, 100, 0, 0, 0, 0, 0, 0],
    //             labels: [
    //                 "Reserva de Emergência",
    //                 "Viagem Final de Ano",
    //                 "Troca do Carro",
    //                 "Financiamento Apartamento",
    //                 "Objetivo 5",
    //                 "Objetivo 6",
    //                 "Objetivo 7",
    //                 "Objetivo 8",
    //                 "Objetivo 9",
    //                 "Objetivo 10",
    //             ],
    //         };
    //         setData(fakeData.valores);
    //         setLabels(fakeData.labels);
    //         setLoading(false);
    //     }, 100); 
    // }, []);

    // const options = {
    //     chart: {
    //         type: "radialBar",
    //     },
    //     colors: ["var(--primary-color)"],
    //     plotOptions: {
    //         radialBar: {
    //             hollow: {
    //                 size: "60%",
    //                 background: "var(--primary-color)",
    //             },
    //             track: {
    //                 color: "#000",
    //                 background: "var(--tertiary-color)",
    //             },
    //             dataLabels: {
    //                 name: {
    //                     show: false,
    //                 },
    //                 value: {
    //                     // fontSize: "16px",
    //                     // show: true,
    //                     color: "#ffffff",
    //                     offsetY: 6,
    //                     // formatter: (val) => `${val}%`,
    //                 },
    //             },
    //         },
    //     },
    //     dataLabels: {
    //         total: {
    //             color: 'var(--primary-color)',
    //         },
    //     },
    //     labels,
    // };

    // return (
    //     <section className='aportes-pagamentos-planejamento-mensal'>
    //         {data.map((value, index) => (
    //             <div key={index} className="objetivos">
    //                 <p className="titulo">{labels[index]}</p>
    //                 <Chart options={options} series={[value]} type="radialBar" height={130} />
    //             </div>
    //         ))}
    //     </section>
    // )
    const [userInvestmentArray, setUserInvestmentArray] = useState([]);

    useEffect(() => {
        setTimeout(() => {
            const fakeData = [
                {
                    id: "inv_001",
                    nome: "Fundo de Ações",
                    current: 15000.0,
                    aporte: 500.0,
                    goal: 20000.0,
                    goalHistory: [
                        { date: "2024-01", goal: 18000.0 },
                        { date: "2024-02", goal: 20000.0 },
                    ],
                    objective: "Investimento",
                    montante: 50000.0,
                    icon: "images.PorquinhoGerais",
                },
                {
                    id: "inv_002",
                    nome: "Compra de Casa",
                    current: 50000.0,
                    aporte: 1000.0,
                    goal: 100000.0,
                    goalHistory: [
                        { date: "2024-01", goal: 95000.0 },
                        { date: "2024-02", goal: 100000.0 },
                    ],
                    objective: "Bem",
                    montante: 500000.0,
                    icon: "images.PorquinhoGerais",
                },
                {
                    id: "inv_003",
                    nome: "Compra de Carro",
                    current: 0,
                    aporte: 1000.0,
                    goal: 80000.0,
                    goalHistory: [
                        { date: "2024-01", goal: 50000.0 },
                        { date: "2024-02", goal: 80000.0 },
                    ],
                    objective: "Bem",
                    montante: 0,
                    icon: "images.PorquinhoGerais",
                },
                {
                    id: "inv_004",
                    nome: "Carteira de Motorista do Junior",
                    current: 0,
                    aporte: 100.0,
                    goal: 1000.0,
                    goalHistory: [
                        { date: "2024-02", goal: 1000.0 },
                    ],
                    objective: "Investimento",
                    montante: 0,
                    icon: "images.PorquinhoGerais",
                },
                {
                    id: "inv_005",
                    nome: "Reserva de emergência",
                    current: 1500,
                    aporte: 500.0,
                    goal: 10000.0,
                    goalHistory: [
                        { date: "2024-02", goal: 10000.0 },
                    ],
                    objective: "Reserva",
                    montante: 1500,
                    icon: "images.PorquinhoGerais",
                },
                {
                    id: "inv_006",
                    nome: "Viagem de férias",
                    current: 2500,
                    aporte: 500.0,
                    goal: 15000.0,
                    goalHistory: [
                        { date: "2024-02", goal: 15000.0 },
                    ],
                    objective: "Bem",
                    montante: 1500,
                    icon: "images.PorquinhoGerais",
                },
            ];
            setUserInvestmentArray(fakeData);
        }, 100);
    }, []);

    const totalAportado = userInvestmentArray.reduce((sum, inv) => sum + inv.current, 0);
    const totalObjetivo = userInvestmentArray.reduce((sum, inv) => sum + inv.goal, 0);
    const diferencaGeral = totalAportado - totalObjetivo;
    const diferencaPercentual = ((totalAportado / totalObjetivo) * 100).toFixed(1);
    const valueColor = (diferencaGeral < 0 ? 'var(--red-color)' : 'var(--primary-color)');

    const chartSeries = [
        {
            name: "Realizado",
            data: [totalAportado],
        },
        {
            name: "Previsto",
            data: [totalObjetivo],
        },
    ];

    const options = {
        chart: {
            type: "bar",
            toolbar: {
                show: false,
            },
            fontFamily: '"Segoe UI", "Cocogoose", sans-serif',
            fontWeight: '700',
        },
        legend: {
            show: false,
        },
        plotOptions: {
            bar: {
                borderRadius: 5,
                horizontal: false,
                columnWidth: "50%",
                distributed: false,
            },
        },
        dataLabels: {
            enabled: false,
        },
        colors: ["var(--primary-color)", "var(--tertiary-color)"],
        stroke: {
            show: true,
            width: 6,
            colors: ['transparent'],
        },
        xaxis: {
            categories: ["Fev/2025"],
        },
        yaxis: {
            labels: {
                formatter: (val) => `R$ ${val.toLocaleString("pt-BR")}`,
            },
        },
        tooltip: {
            y: {
                formatter: (val) => `${formatCurrency(val, 2)}`,
            },
        },
    };
    return (
        <section className='realizado-previsto-compromisso-mensal'>
            <h2>Planejamento Mensal: Realizado vs. previsto</h2>
            <div className="legenda">
                <span className="legenda-serie ">
                    <span className="pretty">
                        <input
                            type="checkbox"
                        // checked={legend.checked}
                        // onChange={() => toggleSeries(legend.name)}
                        />
                        <span className="state blue">
                            <label>
                                Realizado
                            </label>
                        </span>
                    </span>
                    <span>{formatCurrency(totalAportado)}</span>
                </span>
                <span className="legenda-serie ">
                    <span className="pretty">
                        <input
                            type="checkbox"
                        // checked={legend.checked}
                        // onChange={() => toggleSeries(legend.name)}
                        />
                        <span className="state gray">
                            <label>
                                Previsto
                            </label>
                        </span>
                    </span>
                    <span>{formatCurrency(totalObjetivo)}</span>
                </span>
                <span className="legenda-serie ">
                    <span className="pretty diferenca">Diferença</span>
                    <span style={{ color: valueColor }}>{formatCurrency(diferencaGeral)}<br />({diferencaPercentual}%)</span>
                </span>
            </div>
            <Chart
                options={options}
                series={chartSeries}
                type="bar"
                height={250}
            />
        </section>
    );
}

export default RealizadoPrevistoCompromissoMensal;