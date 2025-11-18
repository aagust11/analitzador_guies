import './PageStyles.css';
import './AnalysisWorkspacePage.css';

export function AnalysisWorkspacePage() {
  return (
    <section className="workspace">
      <div className="workspace__panel workspace__panel--viewer">
        <h2>Visor de guia</h2>
        <p>Aquí es mostrarà el PDF i les anotacions.</p>
      </div>
      <div className="workspace__panel workspace__panel--sheet">
        <h2>Full d\'anàlisi</h2>
        <p>Configurarem les dimensions i notes en els propers passos.</p>
      </div>
    </section>
  );
}

export default AnalysisWorkspacePage;
