import { FormEvent, forwardRef, useEffect, useMemo, useState } from 'react';
import { AnalysisSheet, Highlight, Tag } from '../../models';

type DimensionNoteField = 'descriptive' | 'quotations' | 'interpretive';

interface DimensionPanelProps {
  entry: AnalysisSheet;
  defaultTitle?: string;
  description?: string;
  highlights: Highlight[];
  tags: Tag[];
  isCollapsed: boolean;
  onToggleCollapse: (dimensionId: string) => void;
  onChange: (dimensionId: string, field: DimensionNoteField, value: string) => void;
  onSelectHighlight: (highlightId: string) => void;
  onCreateTag: (dimensionId: string, label: string, color?: string) => void;
  activeHighlightId?: string | null;
  isFocusTarget?: boolean;
  onUpdateTagLinkComment: (tagId: string, linkId: string, comment: string) => void;
  onRenameDimension: (dimensionId: string, title: string) => void;
}

export const DimensionPanel = forwardRef<HTMLElement, DimensionPanelProps>(function DimensionPanel(
  {
    entry,
    defaultTitle,
    description,
    highlights,
    tags,
    isCollapsed,
    onToggleCollapse,
    onChange,
    onSelectHighlight,
    onCreateTag,
    activeHighlightId,
    isFocusTarget,
    onUpdateTagLinkComment,
    onRenameDimension,
  },
  ref,
) {
  const title = entry.customTitle?.trim()
    ? entry.customTitle.trim()
    : entry.isCustomDimension
      ? 'Dimensió emergent'
      : defaultTitle ?? entry.dimensionId;

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [pendingTitle, setPendingTitle] = useState(title);

  useEffect(() => {
    if (!isEditingTitle) {
      setPendingTitle(title);
    }
  }, [isEditingTitle, title]);

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

  const highlightLookup = useMemo(() => {
    const map = new Map<string, Highlight>();
    highlights.forEach((highlight) => {
      map.set(highlight.id, highlight);
    });
    return map;
  }, [highlights]);

  const [newTagLabel, setNewTagLabel] = useState('');
  const [newTagColor, setNewTagColor] = useState('#0ea5e9');

  const dimensionTags = useMemo(() => tags, [tags]);

  const handleAddTag = () => {
    if (!newTagLabel.trim()) {
      return;
    }
    onCreateTag(entry.dimensionId, newTagLabel, newTagColor);
    setNewTagLabel('');
  };

  const handleSubmitTitle = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onRenameDimension(entry.dimensionId, pendingTitle);
    setIsEditingTitle(false);
  };

  const handleCancelTitle = () => {
    setPendingTitle(title);
    setIsEditingTitle(false);
  };

  return (
    <article
      className="dimension-panel"
      data-collapsed={isCollapsed}
      data-focused={isFocusTarget ? 'true' : 'false'}
      ref={ref}
    >
      <header className="dimension-panel__header">
        <div className="dimension-panel__header-main">
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
          {!isEditingTitle ? (
            <button
              type="button"
              className="dimension-panel__edit-button"
              onClick={() => {
                setPendingTitle(title);
                setIsEditingTitle(true);
              }}
            >
              Editar títol
            </button>
          ) : null}
        </div>
        {isEditingTitle ? (
          <form className="dimension-panel__title-form" onSubmit={handleSubmitTitle}>
            <label htmlFor={`dimension-title-${entry.dimensionId}`}>
              Nom personalitzat de la dimensió
            </label>
            <input
              id={`dimension-title-${entry.dimensionId}`}
              type="text"
              className="dimension-panel__title-input"
              value={pendingTitle}
              onChange={(event) => setPendingTitle(event.target.value)}
              placeholder="Nom de la dimensió"
              autoFocus
            />
            <div className="dimension-panel__title-form-actions">
              <button type="button" onClick={handleCancelTitle}>
                Cancel·lar
              </button>
              <button type="submit">Desar títol</button>
            </div>
          </form>
        ) : null}
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
            <div className="dimension-panel__tags-intro">
              <div className="dimension-panel__tag-form">
                <input
                  type="text"
                  placeholder="Nom de l'etiqueta"
                  value={newTagLabel}
                  onChange={(event) => setNewTagLabel(event.target.value)}
                />
                <label className="dimension-panel__color-label">
                  Color
                  <input
                    type="color"
                    value={newTagColor}
                    onChange={(event) => setNewTagColor(event.target.value)}
                  />
                </label>
                <button type="button" onClick={handleAddTag}>
                  Crear etiqueta
                </button>
              </div>
            </div>
            {dimensionTags.length === 0 ? (
              <p className="dimension-panel__empty">Encara no hi ha etiquetes creades per aquesta dimensió.</p>
            ) : (
              <ul className="dimension-panel__tags">
                {dimensionTags.map((tag) => (
                  <li key={tag.id}>
                    <details>
                      <summary>
                        <span
                          className="dimension-panel__tag-dot"
                          style={{ backgroundColor: tag.color || '#0ea5e9' }}
                        />
                        <span>{tag.label}</span>
                        <span className="dimension-panel__field-count">{tag.links.length}</span>
                      </summary>
                      {tag.links.length === 0 ? (
                        <p className="dimension-panel__empty">Sense usos vinculats encara.</p>
                      ) : (
                        <ul className="dimension-panel__tag-links">
                          {tag.links.map((link) => {
                            const linkedHighlight = link.highlightId ? highlightLookup.get(link.highlightId) : null;
                            const locationLabel = linkedHighlight
                              ? `Pàg. ${linkedHighlight.pageNumber}`
                              : link.pageNumber
                                ? `Posició pàg. ${link.pageNumber}`
                                : 'Posició sense referència';
                            return (
                              <li key={link.id}>
                                <div className="dimension-panel__tag-link-header">
                                  <span className="dimension-panel__tag-link-page">{locationLabel}</span>
                                  {linkedHighlight ? (
                                    <button type="button" onClick={() => onSelectHighlight(linkedHighlight.id)}>
                                      Centrar el highlight
                                    </button>
                                  ) : null}
                                </div>
                                <textarea
                                  className="dimension-panel__tag-comment-input"
                                  value={link.comment ?? ''}
                                  placeholder="Comentari contextual de l'etiqueta"
                                  onChange={(event) =>
                                    onUpdateTagLinkComment(tag.id, link.id, event.target.value)
                                  }
                                />
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </article>
  );
});
