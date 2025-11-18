import { useState } from 'react';
import { AnalysisDimensionDefinition, AnalysisSheet, Highlight } from '../../models';
import { DimensionPanel } from './DimensionPanel';

type DimensionNoteField = 'descriptive' | 'quotations' | 'interpretive';

interface AnalysisSheetPanelProps {
  guideTitle: string;
  sheetEntries: AnalysisSheet[];
  dimensionDefinitions: AnalysisDimensionDefinition[];
  highlights: Highlight[];
  onChangeNotes: (dimensionId: string, field: DimensionNoteField, value: string) => void;
  onAddCustomDimension: (title: string) => void;
  onSelectHighlight: (highlightId: string) => void;
  activeHighlightId?: string | null;
}

export function AnalysisSheetPanel({
  guideTitle,
  sheetEntries,
  dimensionDefinitions,
  highlights,
  onChangeNotes,
  onAddCustomDimension,
  onSelectHighlight,
  activeHighlightId,
}: AnalysisSheetPanelProps) {
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});

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
              isCollapsed={Boolean(collapsedMap[entry.dimensionId])}
              onToggleCollapse={handleToggle}
              onChange={onChangeNotes}
              onSelectHighlight={onSelectHighlight}
              activeHighlightId={activeHighlightId}
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
