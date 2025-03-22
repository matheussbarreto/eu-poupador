import { useEffect, useState } from "react";
import { getUserData } from "../../services/apiService";
import './Footer.css';

const Footer = () => {
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        getUserData().then((data) => setUserData(data));
    }, []);

    console.log(userData);
    return (
        <div className="footer">
            <h1>Dados do Usuário</h1>

            {userData ? (
                <div>
                    {/* Transações */}
                    <h2>Transações</h2>
                    <ul>
                        {userData.userTransactionArray.map((tx) => (
                            <li key={tx.id}>
                                <strong>{tx.comment}</strong> - R$ {tx.amount} <br />
                                <em>{tx.date.toLocaleDateString()}</em> | <strong>Entrada:</strong> {tx.in} ({tx.incomingType}) | <strong>Saída:</strong> {tx.out} ({tx.outgoingType}) <br />
                                <strong>Tags:</strong> {tx.tags.join(", ")}
                            </li>
                        ))}
                    </ul>

                    {/* Receitas */}
                    <h2>Receitas</h2>
                    <ul>
                        {userData.userIncomeArray.map((income) => (
                            <li key={income.id}>
                                <strong>{income.nome}</strong> - Saldo: R$ {income.balance} <br />
                                Previsão: R$ {income.expected} <br />
                                Histórico de Previsões:{" "}
                                {income.expectedHistory.map((entry) => (
                                    <span key={entry.date}>{entry.date}: R$ {entry.goal} | </span>
                                ))}
                            </li>
                        ))}
                    </ul>

                    {/* Contas */}
                    <h2>Contas</h2>
                    <ul>
                        {userData.userAccountArray.map((acc) => (
                            <li key={acc.id}>
                                <strong>{acc.nome}</strong> - Saldo: R$ {acc.balance} <br />
                                Tipo: {acc.type} {acc.type === "Cartão" && `| Vencimento: dia ${acc.paydate}`}
                            </li>
                        ))}
                    </ul>

                    {/* Objetivos */}
                    <h2>Objetivos</h2>
                    <ul>
                        {userData.userInvestmentArray.map((inv) => (
                            <li key={inv.id}>
                                <strong>{inv.nome}</strong> - Tipo: {inv.objective} <br />
                                Saldo Atual: R$ {inv.current} | Aporte: R$ {inv.aporte} | Meta: R$ {inv.goal} <br />
                                Histórico de Metas:{" "}
                                {inv.goalHistory.map((entry) => (
                                    <span key={entry.date}>{entry.date}: R$ {entry.goal} | </span>
                                ))}
                            </li>
                        ))}
                    </ul>

                    {/* Despesas */}
                    <h2>Despesas</h2>
                    <ul>
                        {userData.userExpenseArray.map((exp) => (
                            <li key={exp.id}>
                                <strong>{exp.nome}</strong> - Categoria: {exp.category} <br />
                                Tipo: {exp.type} {exp.paydate !== -1 && `| Vencimento: dia ${exp.paydate}`} <br />
                                Valor Atual: R$ {exp.current} | Previsão: R$ {exp.expected} <br />
                                Histórico de Previsões:{" "}
                                {exp.expectedHistory.map((entry) => (
                                    <span key={entry.date}>{entry.date}: R$ {entry.goal} | </span>
                                ))}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : (
                <p>Carregando...</p>
            )}
        </div>
    );
}

export default Footer;
