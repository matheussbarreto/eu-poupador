import React, { useEffect, useState } from 'react';
import './MonthSelector.css';

const MonthSelector = ({ onDateChange }) => {
    const [currentDate, setCurrentDate] = useState(() => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), 1);
    });
    const [isAnimating, setIsAnimating] = useState(false);

    const today = new Date();
    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    useEffect(() => {
        if (!isAnimating) return;
        const timer = setTimeout(() => setIsAnimating(false), 200);
        return () => clearTimeout(timer);
    }, [isAnimating]);

    const changeMonth = (offset) => {
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
        const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        if (isAnimating || newDate > currentMonth) return;

        setIsAnimating(true);
        setCurrentDate(newDate);
        if (onDateChange) onDateChange(newDate);
    };

    const formatDate = (date) => {
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `${month} de ${year}`;
    };

    return (
        <section className="mounth-selector">
            <button className="button" aria-label="Mês anterior" onClick={() => changeMonth(-1)} disabled={isAnimating}>
                ←
            </button>
            <span className="date-display">
                {formatDate(currentDate)}
            </span>
            <button className="button" aria-label="Próximo mês" onClick={() => changeMonth(1)} disabled={isAnimating || (currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear())}>
                →
            </button>
        </section>
    );
};

export default MonthSelector;
