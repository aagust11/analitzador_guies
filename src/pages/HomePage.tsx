import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GuideStatus } from '../models';
import { GuideList } from '../components/guides/GuideList';
import { GuideUploadDialog } from '../components/guides/GuideUploadDialog';
import { useStorage } from '../services/storage/StorageContext';
import './PageStyles.css';

export function HomePage() {
  const { projectState, updateProjectState, storageService } = useStorage();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const navigate = useNavigate();

  const handleStatusChange = (guideId: string, status: GuideStatus) => {
    updateProjectState((prev) => ({
      ...prev,
      guides: prev.guides.map((guide) =>
        guide.id === guideId ? { ...guide, status, updatedAt: new Date().toISOString() } : guide,
      ),
    }));
  };

  const handleUpload = async ({
    file,
    title,
    institution,
    year,
  }: {
    file: File;
    title: string;
    institution?: string;
    year?: string;
  }) => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `guide-${Date.now()}`;
    await storageService.saveGuideFile(file, id);
    const now = new Date().toISOString();
    updateProjectState((prev) => ({
      ...prev,
      guides: [
        ...prev.guides,
        {
          id,
          title,
          institution,
          year,
          status: 'not_started' as GuideStatus,
          sourceFileName: file.name,
          storageFileName: `${id}.bin`,
          mimeType: file.type,
          createdAt: now,
          updatedAt: now,
        },
      ],
    }));
  };

  const openGuide = (guideId: string) => {
    navigate(`analysis/${guideId}`);
  };

  return (
    <section className="page">
      <header className="page__header">
        <div>
          <h2>Llista de guies</h2>
          <p>Gestiona els documents i prepara'ls per a l'anàlisi qualitativa.</p>
        </div>
        <button type="button" className="button button--primary" onClick={() => setIsUploadOpen(true)}>
          + Puja una guia
        </button>
      </header>
      <GuideList guides={projectState.guides} onChangeStatus={handleStatusChange} onOpenGuide={openGuide} />
      <GuideUploadDialog isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} onSubmit={handleUpload} />
    </section>
  );
}

export default HomePage;
