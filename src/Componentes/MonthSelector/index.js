import React, { useState } from 'react';
import './MonthSelector.css';

const MonthSelector = ({ onDateChange }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isAnimating, setIsAnimating] = useState(false);

    const today = new Date();
    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const prevMonth = () => {
        setIsAnimating(true);
        setCurrentDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setMonth(newDate.getMonth() - 1);
            return newDate;
        });
        setTimeout(() => setIsAnimating(false), 200);
    };

    const formatDate = (date) => {
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `${month} de ${year}`;
    };

    const nextMonth = () => {
        if (currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear()) {
            return;
        }
        setIsAnimating(true);
        setCurrentDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setMonth(newDate.getMonth() + 1);
            if (onDateChange) onDateChange(newDate);
            return newDate;
        });
        setTimeout(() => setIsAnimating(false), 200);
    };

    return (
        <section className="mounth-selector">
            <button className="button" onClick={prevMonth} disabled={isAnimating}>
                ←
            </button>
            <span className="date-display">
                {formatDate(currentDate)}
            </span>
            <button className="button" onClick={nextMonth} disabled={isAnimating || (currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear())}>
                →
            </button>
        </section>
    );
};

export default MonthSelector;
