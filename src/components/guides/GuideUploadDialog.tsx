import { FormEvent, useState } from 'react';
import './GuideUploadDialog.css';

interface GuideUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: { file: File }) => Promise<void>;
  statusMessage?: string;
}

export function GuideUploadDialog({ isOpen, onClose, onSubmit, statusMessage }: GuideUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError('Cal seleccionar un arxiu PDF.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({ file });
      setFile(null);
      onClose();
    } catch (err) {
      console.error(err);
      setError("No s'ha pogut desar la guia. Torna-ho a provar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="guide-upload__backdrop" role="dialog" aria-modal="true">
      <div className="guide-upload__panel">
        <header>
          <h3>Puja una nova guia</h3>
          {statusMessage && <p className="guide-upload__status">{statusMessage}</p>}
        </header>
        <form onSubmit={handleSubmit} className="guide-upload__form">
          <label className="guide-upload__field">
            <span>Arxiu PDF o similar</span>
            <input
              type="file"
              accept="application/pdf,application/octet-stream"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          {error && <p className="guide-upload__error">{error}</p>}
          <div className="guide-upload__actions">
            <button type="button" className="button" onClick={onClose} disabled={isSubmitting}>
              Cancel·la
            </button>
            <button type="submit" className="button button--primary" disabled={isSubmitting}>
              Desa la guia
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
