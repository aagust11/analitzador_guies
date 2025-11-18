import { useEffect, useRef, useState } from 'react';
import { AnalysisDimensionDefinition, AnalysisSheet, Highlight, Tag } from '../../models';
import { DimensionPanel } from './DimensionPanel';

type DimensionNoteField = 'descriptive' | 'quotations' | 'interpretive';

interface AnalysisSheetPanelProps {
  guideTitle: string;
  sheetEntries: AnalysisSheet[];
  dimensionDefinitions: AnalysisDimensionDefinition[];
  highlights: Highlight[];
  tags: Tag[];
  onChangeNotes: (dimensionId: string, field: DimensionNoteField, value: string) => void;
  onAddCustomDimension: (title: string) => void;
  onCreateTag: (dimensionId: string, label: string, color?: string) => void;
  onSelectHighlight: (highlightId: string) => void;
  activeHighlightId?: string | null;
  focusedDimensionId?: string | null;
  onFocusDimensionConsumed?: (dimensionId: string | null) => void;
}

export function AnalysisSheetPanel({
  guideTitle,
  sheetEntries,
  dimensionDefinitions,
  highlights,
  tags,
  onChangeNotes,
  onAddCustomDimension,
  onCreateTag,
  onSelectHighlight,
  activeHighlightId,
  focusedDimensionId,
  onFocusDimensionConsumed,
}: AnalysisSheetPanelProps) {
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});
  const panelRefs = useRef<Record<string, HTMLElement | null>>({});
  const [flashDimensionId, setFlashDimensionId] = useState<string | null>(null);

  const handleToggle = (dimensionId: string) => {
    setCollapsedMap((prev) => ({ ...prev, [dimensionId]: !prev[dimensionId] }));
  };

  const handleAddEmergentDimension = () => {
    const name = window.prompt('Nom de la nova dimensió emergent');
    if (!name) {
      return;
    }
    onAddCustomDimension(name.trim());
  };

  const resolveDefinition = (dimensionId: string): AnalysisDimensionDefinition | undefined =>
    dimensionDefinitions.find((dimension) => dimension.id === dimensionId);

  useEffect(() => {
    if (!focusedDimensionId) {
      return;
    }
    setCollapsedMap((prev) => ({ ...prev, [focusedDimensionId]: false }));
    const node = panelRefs.current[focusedDimensionId];
    if (node) {
      window.requestAnimationFrame(() => {
        node.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
      });
      setFlashDimensionId(focusedDimensionId);
      const timeout = window.setTimeout(() => {
        setFlashDimensionId((current) => (current === focusedDimensionId ? null : current));
        onFocusDimensionConsumed?.(focusedDimensionId);
      }, 1800);
      return () => window.clearTimeout(timeout);
    }
    onFocusDimensionConsumed?.(focusedDimensionId);
  }, [focusedDimensionId, onFocusDimensionConsumed]);

  return (
    <div className="analysis-sheet-panel">
      <div className="analysis-sheet-panel__intro">
        <h2>Full d'anàlisi per a «{guideTitle}»</h2>
        <p>
          Les dimensions següents serveixen per organitzar observacions, cites i interpretacions del document. Les
          anotacions es desen automàticament.
        </p>
      </div>
      <div className="analysis-sheet-panel__dimensions">
        {sheetEntries.map((entry) => {
          const definition = resolveDefinition(entry.dimensionId);
          const dimensionHighlights = highlights.filter(
            (highlight) => highlight.dimensionId === entry.dimensionId,
          );
          return (
            <DimensionPanel
              key={entry.dimensionId}
              entry={entry}
              defaultTitle={definition?.title}
              description={definition?.description}
              highlights={dimensionHighlights}
              tags={tags.filter((tag) => tag.dimensionId === entry.dimensionId)}
              isCollapsed={Boolean(collapsedMap[entry.dimensionId])}
              onToggleCollapse={handleToggle}
              onChange={onChangeNotes}
              onSelectHighlight={onSelectHighlight}
              onCreateTag={onCreateTag}
              activeHighlightId={activeHighlightId}
              isFocusTarget={flashDimensionId === entry.dimensionId}
              ref={(node) => {
                panelRefs.current[entry.dimensionId] = node;
              }}
            />
          );
        })}
      </div>
      <div className="analysis-sheet-panel__actions">
        <button type="button" onClick={handleAddEmergentDimension}>
          Afegir dimensió emergent
        </button>
      </div>
    </div>
  );
}
