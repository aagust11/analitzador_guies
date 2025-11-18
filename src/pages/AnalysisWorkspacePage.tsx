import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  AnalysisSheet,
  AnalysisSheetNotes,
  DEFAULT_ANALYSIS_DIMENSIONS,
  DrawingAnnotation,
  Highlight,
  HighlightRect,
  Tag,
  TagLink,
} from '../models';
import { AnalysisSheetPanel } from '../components/analysis/AnalysisSheetPanel';
import { PdfViewer } from '../components/analysis/PdfViewer';
import { useStorage } from '../services/storage/StorageContext';
import './PageStyles.css';
import './AnalysisWorkspacePage.css';

function createEmptyNotes(): AnalysisSheetNotes {
  return {
    descriptive: '',
    quotations: '',
    interpretive: '',
    emergentCodes: [],
  };
}

function cloneSheetEntry(entry: AnalysisSheet): AnalysisSheet {
  return {
    ...entry,
    notes: {
      descriptive: entry.notes.descriptive,
      quotations: entry.notes.quotations,
      interpretive: entry.notes.interpretive,
      emergentCodes: [...entry.notes.emergentCodes],
      memo: entry.notes.memo,
    },
  };
}

type EditableField = 'descriptive' | 'quotations' | 'interpretive';

const EDITABLE_FIELDS: EditableField[] = ['descriptive', 'quotations', 'interpretive'];

function generateId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function AnalysisWorkspacePage() {
  const { guideId } = useParams();
  const { projectState, storageService, updateProjectState } = useStorage();
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [sheetDraft, setSheetDraft] = useState<AnalysisSheet[]>([]);
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);

  const guide = projectState.guides.find((item) => item.id === guideId);

  useEffect(() => {
    setActiveHighlightId(null);
  }, [guideId]);

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

  useEffect(() => {
    if (!guideId) {
      setSheetDraft([]);
      return;
    }
    const storedEntries = projectState.analysisSheets.filter((entry) => entry.guideId === guideId);
    const defaults = DEFAULT_ANALYSIS_DIMENSIONS.map((definition) => {
      const match = storedEntries.find((entry) => entry.dimensionId === definition.id);
      if (match) {
        return cloneSheetEntry(match);
      }
      return {
        guideId,
        dimensionId: definition.id,
        notes: createEmptyNotes(),
      } satisfies AnalysisSheet;
    });
    const customEntries = storedEntries
      .filter((entry) => entry.isCustomDimension || !DEFAULT_ANALYSIS_DIMENSIONS.some((dimension) => dimension.id === entry.dimensionId))
      .map((entry) => cloneSheetEntry(entry));
    setSheetDraft([...defaults, ...customEntries]);
  }, [guideId, projectState.analysisSheets]);

  useEffect(() => {
    if (!guideId) {
      return;
    }
    if (sheetDraft.length === 0) {
      return;
    }
    const timeout = window.setTimeout(() => {
      updateProjectState((state) => {
        const others = state.analysisSheets.filter((entry) => entry.guideId !== guideId);
        return {
          ...state,
          analysisSheets: [...others, ...sheetDraft],
        };
      });
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [sheetDraft, guideId, updateProjectState]);

  if (!guide || !guideId) {
    return (
      <section className="page">
        <div className="card">
          <p>Cap guia seleccionada. Torna a l'inici per escollir un document.</p>
        </div>
      </section>
    );
  }

  const guideHighlights = useMemo(
    () => projectState.highlights.filter((highlight) => highlight.guideId === guideId),
    [projectState.highlights, guideId],
  );

  const guideTags = useMemo(() => projectState.tags.filter((tag) => tag.guideId === guideId), [
    projectState.tags,
    guideId,
  ]);

  const guideDrawings = useMemo(
    () => projectState.drawings.filter((drawing) => drawing.guideId === guideId),
    [projectState.drawings, guideId],
  );

  const dimensionOptions = useMemo(
    () =>
      sheetDraft.map((entry) => {
        const defaultTitle = DEFAULT_ANALYSIS_DIMENSIONS.find((dimension) => dimension.id === entry.dimensionId)?.title;
        return {
          id: entry.dimensionId,
          title: entry.isCustomDimension ? entry.customTitle ?? 'Dimensió emergent' : defaultTitle ?? entry.dimensionId,
        };
      }),
    [sheetDraft],
  );

  const handleChangeNotes = (dimensionId: string, field: EditableField, value: string) => {
    if (!EDITABLE_FIELDS.includes(field)) {
      return;
    }
    setSheetDraft((prev) =>
      prev.map((entry) =>
        entry.dimensionId === dimensionId
          ? {
              ...entry,
              notes: {
                ...entry.notes,
                [field]: value,
              },
            }
          : entry,
      ),
    );
  };

  const handleAddCustomDimension = (title: string) => {
    const trimmed = title.trim();
    if (!guideId || !trimmed) {
      return;
    }
    const dimensionId = generateId('custom-dimension');
    setSheetDraft((prev) => [
      ...prev,
      {
        guideId,
        dimensionId,
        notes: createEmptyNotes(),
        customTitle: trimmed,
        isCustomDimension: true,
      },
    ]);
  };

  const handleCreateHighlight = ({
    dimensionId,
    comment,
    text,
    pageNumber,
    rects,
  }: {
    dimensionId: string;
    comment: string;
    text: string;
    pageNumber: number;
    rects: HighlightRect[];
  }): Highlight | null => {
    if (!guideId) {
      return null;
    }
    const highlight: Highlight = {
      id: generateId('highlight'),
      guideId,
      dimensionId,
      text,
      pageNumber,
      comment: comment || undefined,
      createdAt: new Date().toISOString(),
      rects,
    };
    updateProjectState((state) => ({
      ...state,
      highlights: [...state.highlights, highlight],
    }));
    setActiveHighlightId(highlight.id);
    return highlight;
  };

  const handleSelectHighlight = (highlightId: string) => {
    setActiveHighlightId(highlightId);
  };

  const handleCreateTag = (dimensionId: string, label: string, color?: string) => {
    if (!guideId) {
      return;
    }
    const trimmed = label.trim();
    if (!trimmed) {
      return;
    }
    const tag: Tag = {
      id: generateId('tag'),
      guideId,
      dimensionId,
      label: trimmed,
      color: color?.trim() || undefined,
      links: [],
      createdAt: new Date().toISOString(),
    };
    updateProjectState((state) => ({
      ...state,
      tags: [...state.tags, tag],
    }));
  };

  const handleAttachTagToHighlight = (tagId: string, highlightId: string, comment?: string) => {
    if (!guideId) {
      return;
    }
    updateProjectState((state) => {
      const highlight = state.highlights.find((item) => item.id === highlightId);
      if (!highlight) {
        return state;
      }
      const trimmedComment = comment?.trim();
      return {
        ...state,
        tags: state.tags.map((tag) => {
          if (tag.id !== tagId) {
            return tag;
          }
          const existingLink = tag.links.find((link) => link.highlightId === highlightId);
          if (existingLink) {
            if (comment === undefined) {
              return tag;
            }
            return {
              ...tag,
              links: tag.links.map((link) =>
                link.id === existingLink.id
                  ? {
                      ...link,
                      comment: trimmedComment || undefined,
                    }
                  : link,
              ),
            };
          }
          const link: TagLink = {
            id: generateId('tag-link'),
            highlightId,
            pageNumber: highlight.pageNumber,
            createdAt: new Date().toISOString(),
            comment: trimmedComment || undefined,
          };
          return {
            ...tag,
            links: [...tag.links, link],
          };
        }),
      };
    });
  };

  const handleUpdateTagLinkComment = (tagId: string, linkId: string, comment: string) => {
    updateProjectState((state) => ({
      ...state,
      tags: state.tags.map((tag) =>
        tag.id === tagId
          ? {
              ...tag,
              links: tag.links.map((link) =>
                link.id === linkId
                  ? {
                      ...link,
                      comment: comment.trim() || undefined,
                    }
                  : link,
              ),
            }
          : tag,
      ),
    }));
  };

  const handleRemoveTagLink = (tagId: string, linkId: string) => {
    updateProjectState((state) => ({
      ...state,
      tags: state.tags.map((tag) =>
        tag.id === tagId
          ? {
              ...tag,
              links: tag.links.filter((link) => link.id !== linkId),
            }
          : tag,
      ),
    }));
  };

  const handleAddDrawingAnnotation = (pageNumber: number, data: string) => {
    if (!guideId || !data.trim()) {
      return;
    }
    const annotation: DrawingAnnotation = {
      id: generateId('drawing'),
      guideId,
      pageNumber,
      data,
      createdAt: new Date().toISOString(),
    };
    updateProjectState((state) => ({
      ...state,
      drawings: [...state.drawings, annotation],
    }));
  };

  const handleRemoveDrawingAnnotation = (annotationId: string) => {
    updateProjectState((state) => ({
      ...state,
      drawings: state.drawings.filter((annotation) => annotation.id !== annotationId),
    }));
  };

  return (
    <section className="workspace">
      <div className="workspace__panel workspace__panel--viewer">
        <div className="workspace__panel-heading">
          <div>
            <h2>Visor de la guia</h2>
            <p className="workspace__meta">
              {guide.title} · {guide.institution ?? 'Institució desconeguda'} · {guide.year ?? 'Sense any'}
            </p>
          </div>
        </div>
        <PdfViewer
          fileUrl={fileUrl}
          highlights={guideHighlights}
          dimensions={dimensionOptions}
          onCreateHighlight={handleCreateHighlight}
          onSelectHighlight={handleSelectHighlight}
          activeHighlightId={activeHighlightId}
          tags={guideTags}
          onAttachTagToHighlight={handleAttachTagToHighlight}
          onUpdateTagLinkComment={handleUpdateTagLinkComment}
          onRemoveTagLink={handleRemoveTagLink}
          drawings={guideDrawings}
          onAddDrawingAnnotation={handleAddDrawingAnnotation}
          onRemoveDrawingAnnotation={handleRemoveDrawingAnnotation}
        />
      </div>
      <div className="workspace__panel workspace__panel--sheet">
        <AnalysisSheetPanel
          guideTitle={guide.title}
          sheetEntries={sheetDraft}
          dimensionDefinitions={DEFAULT_ANALYSIS_DIMENSIONS}
          highlights={guideHighlights}
          tags={guideTags}
          onChangeNotes={handleChangeNotes}
          onAddCustomDimension={handleAddCustomDimension}
          onCreateTag={handleCreateTag}
          onSelectHighlight={handleSelectHighlight}
          activeHighlightId={activeHighlightId}
        />
      </div>
    </section>
  );
}

export default AnalysisWorkspacePage;
