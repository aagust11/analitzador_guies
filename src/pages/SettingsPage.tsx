import './PageStyles.css';

export function SettingsPage() {
  return (
    <section className="page">
      <header className="page__header">
        <div>
          <h2>Configuració</h2>
          <p>Triarem la carpeta local i les preferències de desament més endavant.</p>
        </div>
      </header>
      <div className="card">
        <p>Encara no hi ha configuració disponible. Aquesta pantalla servirà per gestionar l\'emmagatzematge local.</p>
      </div>
    </section>
  );
}

export default SettingsPage;
