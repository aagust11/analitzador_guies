import { ChangeEvent } from 'react';
import { GuideDocument } from '../../models';
import './GuideMetadataPanel.css';

interface GuideMetadataPanelProps {
  guide: GuideDocument;
  onChange: (changes: Partial<Pick<GuideDocument, 'title' | 'institution' | 'year'>>) => void;
}

export function GuideMetadataPanel({ guide, onChange }: GuideMetadataPanelProps) {
  const handleOptionalChange = (
    field: 'institution' | 'year',
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const value = event.target.value;
    const trimmed = value.trim();
    onChange({ [field]: trimmed ? value : undefined });
  };

  return (
    <div className="guide-metadata">
      <div className="guide-metadata__header">
        <h3>Metadades de la guia</h3>
        <p>Edita el nom del document i informació contextual sense sortir de l'anàlisi.</p>
      </div>
      <div className="guide-metadata__grid">
        <label className="guide-metadata__field">
          <span>Títol</span>
          <input
            type="text"
            value={guide.title}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder="Nom de la guia"
          />
        </label>
        <label className="guide-metadata__field">
          <span>Institució</span>
          <input
            type="text"
            value={guide.institution ?? ''}
            onChange={(event) => handleOptionalChange('institution', event)}
            placeholder="Institut, ajuntament..."
          />
        </label>
        <label className="guide-metadata__field">
          <span>Any</span>
          <input
            type="text"
            value={guide.year ?? ''}
            onChange={(event) => handleOptionalChange('year', event)}
            placeholder="2024"
          />
        </label>
      </div>
    </div>
  );
}
