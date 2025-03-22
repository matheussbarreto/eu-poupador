import { NavLink } from 'react-router-dom';
import { PiChartLineUpBold } from "react-icons/pi";
import { TbCalendarDollar, TbTargetArrow } from "react-icons/tb";
import { MdLogout } from "react-icons/md";

import './Header.css';

const Header = () => {
    return (
        <header className='header-app'>
            <nav>
                <ul>
                    <li>
                        <NavLink to="/" className={({ isActive }) => isActive ? "active" : ""}>
                            <TbCalendarDollar />
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/objetivos">
                            <TbTargetArrow />
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/resultados">
                            <PiChartLineUpBold />
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/sair">
                            <MdLogout />
                        </NavLink>
                    </li>
                </ul>
            </nav>
            <img src='/logo_eu_poupador_200.webp' alt='Logo Eu Poupador' />
        </header>
    )
}

export default Header;