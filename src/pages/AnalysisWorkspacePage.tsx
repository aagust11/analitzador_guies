import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useStorage } from '../services/storage/StorageContext';
import './PageStyles.css';
import './AnalysisWorkspacePage.css';

export function AnalysisWorkspacePage() {
  const { guideId } = useParams();
  const { projectState, storageService } = useStorage();
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const guide = projectState.guides.find((item) => item.id === guideId);

  useEffect(() => {
    let revokeUrl: string | null = null;
    async function loadFile() {
      if (!guideId) {
        setFileUrl(null);
        return;
      }
      try {
        const url = await storageService.getGuideFileUrl(guideId);
        revokeUrl = url;
        setFileUrl(url);
      } catch (error) {
        console.warn('No hem pogut carregar el fitxer de la guia', error);
        setFileUrl(null);
      }
    }
    loadFile();
    return () => {
      if (revokeUrl) {
        URL.revokeObjectURL(revokeUrl);
      }
    };
  }, [guideId, storageService]);

  if (!guide) {
    return (
      <section className="page">
        <div className="card">
          <p>Cap guia seleccionada. Torna a l'inici per escollir un document.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="workspace">
      <div className="workspace__panel workspace__panel--viewer">
        <h2>{guide.title}</h2>
        <p className="workspace__meta">
          {guide.institution ?? '—'} · {guide.year ?? 'Sense any'}
        </p>
        {fileUrl ? (
          <iframe title={guide.title} src={fileUrl} className="workspace__preview" />
        ) : (
          <p>Carrega del document pendent o sense suport al navegador.</p>
        )}
      </div>
      <div className="workspace__panel workspace__panel--sheet">
        <h2>Full d'anàlisi</h2>
        <p>Properament podrem afegir dimensions, cites i anotacions.</p>
      </div>
    </section>
  );
}

export default AnalysisWorkspacePage;
