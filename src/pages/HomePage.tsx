import './PageStyles.css';

export function HomePage() {
  return (
    <section className="page">
      <header className="page__header">
        <div>
          <h2>Llista de guies</h2>
          <p>Gestiona els documents i prepara\'ls per a l\'anàlisi qualitativa.</p>
        </div>
        <button type="button" className="button button--primary" disabled>
          + Puja una guia (properament)
        </button>
      </header>
      <div className="card">
        <p>Encara no hi ha guies. Quan implementem la gestió podrem veure\'n el resum.</p>
      </div>
    </section>
  );
}

export default HomePage;
