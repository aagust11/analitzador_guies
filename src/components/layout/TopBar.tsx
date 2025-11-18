import './TopBar.css';

type TopBarProps = {
  title?: string;
  subtitle?: string;
};

export function TopBar({ title = 'Analitzador de guies', subtitle }: TopBarProps) {
  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      <div className="topbar__actions">
        <span className="topbar__hint">SPA local · React + Vite</span>
      </div>
    </header>
  );
}

export default TopBar;
