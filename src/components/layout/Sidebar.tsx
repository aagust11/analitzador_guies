import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const navItems = [
  { to: '/', label: 'Guies' },
  { to: '/comparative', label: 'Graella comparativa' },
  { to: '/settings', label: 'Configuració' },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span role="img" aria-label="analysis">📝</span>
        <span>Analitzador</span>
      </div>
      <nav className="sidebar__nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
            }
            end={item.to === '/'}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
