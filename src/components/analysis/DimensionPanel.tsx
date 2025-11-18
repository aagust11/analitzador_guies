import { useMemo } from 'react';
import { AnalysisSheet, Highlight } from '../../models';

type DimensionNoteField = 'descriptive' | 'quotations' | 'interpretive';

interface DimensionPanelProps {
  entry: AnalysisSheet;
  defaultTitle?: string;
  description?: string;
  highlights: Highlight[];
  isCollapsed: boolean;
  onToggleCollapse: (dimensionId: string) => void;
  onChange: (dimensionId: string, field: DimensionNoteField, value: string) => void;
  onSelectHighlight: (highlightId: string) => void;
  activeHighlightId?: string | null;
}

export function DimensionPanel({
  entry,
  defaultTitle,
  description,
  highlights,
  isCollapsed,
  onToggleCollapse,
  onChange,
  onSelectHighlight,
  activeHighlightId,
}: DimensionPanelProps) {
  const title = entry.isCustomDimension
    ? entry.customTitle ?? 'Dimensió emergent'
    : defaultTitle ?? entry.dimensionId;

  const highlightItems = useMemo(
    () =>
      highlights.map((highlight) => {
        const preview = highlight.text.length > 200 ? `${highlight.text.slice(0, 200)}…` : highlight.text;
        return {
          id: highlight.id,
          text: preview,
          comment: highlight.comment,
          pageNumber: highlight.pageNumber,
        };
      }),
    [highlights],
  );

  return (
    <article className="dimension-panel" data-collapsed={isCollapsed}>
      <header className="dimension-panel__header">
        <button
          type="button"
          className="dimension-panel__toggle"
          onClick={() => onToggleCollapse(entry.dimensionId)}
          aria-expanded={!isCollapsed}
        >
          <span className="dimension-panel__chevron" aria-hidden="true">
            {isCollapsed ? '▸' : '▾'}
          </span>
          <span className="dimension-panel__title">{title}</span>
        </button>
        {description ? <p className="dimension-panel__description">{description}</p> : null}
      </header>
      {!isCollapsed && (
        <div className="dimension-panel__body">
          <div className="dimension-panel__field">
            <label>Notes descriptives i contextuals</label>
            <textarea
              value={entry.notes.descriptive}
              onChange={(event) => onChange(entry.dimensionId, 'descriptive', event.target.value)}
              rows={4}
            />
          </div>
          <div className="dimension-panel__field">
            <label>Cites clau</label>
            <textarea
              value={entry.notes.quotations}
              onChange={(event) => onChange(entry.dimensionId, 'quotations', event.target.value)}
              rows={3}
            />
          </div>
          <div className="dimension-panel__field">
            <label>Notes interpretatives / reflexives</label>
            <textarea
              value={entry.notes.interpretive}
              onChange={(event) => onChange(entry.dimensionId, 'interpretive', event.target.value)}
              rows={4}
            />
          </div>
          <div className="dimension-panel__field dimension-panel__field--highlights">
            <div className="dimension-panel__field-header">
              <span>Highlights vinculats</span>
              <span className="dimension-panel__field-count">{highlightItems.length}</span>
            </div>
            {highlightItems.length === 0 ? (
              <p className="dimension-panel__empty">Encara no hi ha seleccions vinculades.</p>
            ) : (
              <ul className="dimension-panel__highlights">
                {highlightItems.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="dimension-panel__highlight"
                      data-active={item.id === activeHighlightId}
                      onClick={() => onSelectHighlight(item.id)}
                    >
                      <span className="dimension-panel__highlight-page">Pàg. {item.pageNumber}</span>
                      <span className="dimension-panel__highlight-text">{item.text}</span>
                      {item.comment ? (
                        <span className="dimension-panel__highlight-comment">{item.comment}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="dimension-panel__field dimension-panel__field--placeholder">
            <label>Etiquetes i memos vinculats</label>
            <p className="dimension-panel__empty">Encara no hi ha etiquetes o memos associats.</p>
          </div>
        </div>
      )}
    </article>
  );
}
