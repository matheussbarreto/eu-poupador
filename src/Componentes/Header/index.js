import { NavLink } from 'react-router-dom';
import { PiChartLineUpBold } from "react-icons/pi";
import { TbCalendarDollar, TbTargetArrow } from "react-icons/tb";
import { MdLogout } from "react-icons/md";

import './Header.css';

const Header = ({ onSair }) => {
    return (
        <header className='header-app'>
            <nav>
                <ul>
                    <li>
                        <NavLink to="/" aria-label="Balanço mensal" className={({ isActive }) => isActive ? "active" : ""}>
                            <TbCalendarDollar />
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/objetivos" aria-label="Objetivos">
                            <TbTargetArrow />
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/resultados" aria-label="Resultados">
                            <PiChartLineUpBold />
                        </NavLink>
                    </li>
                    <li>
                        <button type="button" onClick={onSair} aria-label="Sair" title="Sair">
                            <MdLogout />
                        </button>
                    </li>
                </ul>
            </nav>
            <img src='/logo_eu_poupador_200.webp' alt='Logo Eu Poupador' />
        </header>
    )
}

export default Header;
