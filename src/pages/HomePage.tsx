import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GuideStatus } from '../models';
import { GuideList } from '../components/guides/GuideList';
import { GuideUploadDialog } from '../components/guides/GuideUploadDialog';
import { useStorage } from '../services/storage/StorageContext';
import './PageStyles.css';

async function computeGuideFingerprint(file: File): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle?.digest) {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');
    }
  } catch (error) {
    console.warn('Unable to compute SHA-256 fingerprint. Falling back to name+size.', error);
  }
  return `${file.name}::${file.size}`;
}

function generateGuideId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `guide-${Date.now()}`;
}

function deriveTitleFromFilename(filename: string): string {
  const withoutExtension = filename.replace(/\.[^.]+$/, '');
  const trimmed = withoutExtension.trim();
  return trimmed || filename;
}

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

  const handleUpload = async ({ file }: { file: File }) => {
    const fingerprint = await computeGuideFingerprint(file);
    const existingGuide = projectState.guides.find((guide) => guide.fingerprint === fingerprint);
    const guideId = existingGuide?.id ?? generateGuideId();
    const title = deriveTitleFromFilename(file.name);
    await storageService.saveGuideFile(file, guideId);
    const now = new Date().toISOString();
    updateProjectState((prev) => {
      const previousGuide = prev.guides.find((guide) => guide.fingerprint === fingerprint);
      if (previousGuide) {
        return {
          ...prev,
          guides: prev.guides.map((guide) =>
            guide.id === previousGuide.id
              ? {
                  ...guide,
                  title,
                  institution: undefined,
                  year: undefined,
                  sourceFileName: file.name,
                  mimeType: file.type,
                  updatedAt: now,
                  fingerprint,
                }
              : guide,
          ),
        };
      }

      const storageFileName = `${guideId}.bin`;
      return {
        ...prev,
        guides: [
          ...prev.guides,
          {
            id: guideId,
            title,
            institution: undefined,
            year: undefined,
            status: 'not_started' as GuideStatus,
            sourceFileName: file.name,
            storageFileName,
            mimeType: file.type,
            createdAt: now,
            updatedAt: now,
            fingerprint,
          },
        ],
      };
    });
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
