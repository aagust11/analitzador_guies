import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { DrawingAnnotation, Highlight, HighlightRect, Tag, TagLink } from '../../models';
import { HighlightToolbar } from './HighlightToolbar';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).toString();

interface PdfViewerProps {
  fileUrl: string | null;
  highlights: Highlight[];
  dimensions: { id: string; title: string }[];
  onCreateHighlight: (highlight: {
    dimensionId: string;
    comment: string;
    text: string;
    pageNumber: number;
    rects: HighlightRect[];
  }) => Highlight | null;
  onSelectHighlight: (highlightId: string) => void;
  activeHighlightId?: string | null;
  tags: Tag[];
  onAttachTagToHighlight: (tagId: string, highlightId: string, comment?: string) => void;
  onCreateTagPin: (
    tagId: string,
    pageNumber: number,
    position: { x: number; y: number },
    comment?: string,
  ) => void;
  onUpdateTagLinkComment: (tagId: string, linkId: string, comment: string) => void;
  onRemoveTagLink: (tagId: string, linkId: string) => void;
  drawings: DrawingAnnotation[];
  onAddDrawingAnnotation: (pageNumber: number, data: string) => void;
  onRemoveDrawingAnnotation: (annotationId: string) => void;
}

interface SelectionInfo {
  text: string;
  rects: HighlightRect[];
  pageNumber: number;
  toolbarPosition: { top: number; left: number };
}

interface TagPopoverBase {
  position: { top: number; left: number };
}

interface ViewTagPopover extends TagPopoverBase {
  type: 'view';
  tagId: string;
  linkId: string;
  label: string;
  color?: string;
  comment: string;
}

interface CreateTagPopover extends TagPopoverBase {
  type: 'create';
  highlightId: string;
  dimensionId: string;
  selectedTagId: string;
  comment: string;
}

interface CreatePinTagPopover extends TagPopoverBase {
  type: 'create-pin';
  dimensionId: string;
  selectedTagId: string;
  comment: string;
  pageNumber: number;
  pinPosition: { x: number; y: number };
}

type TagPopoverState = ViewTagPopover | CreateTagPopover | CreatePinTagPopover;

interface StrokeState {
  pageNumber: number;
  points: { x: number; y: number }[];
}

const SCALE = 1.1;

function getPageElement(node: Node | null): HTMLElement | null {
  if (!node) {
    return null;
  }
  if (node instanceof HTMLElement) {
    return node.closest('[data-page-number]');
  }
  if (node.parentElement) {
    return node.parentElement.closest('[data-page-number]');
  }
  return null;
}

export function PdfViewer({
  fileUrl,
  highlights,
  dimensions,
  onCreateHighlight,
  onSelectHighlight,
  activeHighlightId,
  tags,
  onAttachTagToHighlight,
  onCreateTagPin,
  onUpdateTagLinkComment,
  onRemoveTagLink,
  drawings,
  onAddDrawingAnnotation,
  onRemoveDrawingAnnotation,
}: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [selectionInfo, setSelectionInfo] = useState<SelectionInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tagPopover, setTagPopover] = useState<TagPopoverState | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isPlacingTag, setIsPlacingTag] = useState(false);
  const [activeStroke, setActiveStroke] = useState<StrokeState | null>(null);

  const highlightsByPage = useMemo(() => {
    const map = new Map<number, Highlight[]>();
    highlights.forEach((highlight) => {
      if (!map.has(highlight.pageNumber)) {
        map.set(highlight.pageNumber, []);
      }
      map.get(highlight.pageNumber)?.push(highlight);
    });
    return map;
  }, [highlights]);

  const tagsByHighlight = useMemo(() => {
    const map = new Map<string, { tag: Tag; link: TagLink }[]>();
    tags.forEach((tag) => {
      tag.links.forEach((link) => {
        if (!link.highlightId) {
          return;
        }
        if (!map.has(link.highlightId)) {
          map.set(link.highlightId, []);
        }
        map.get(link.highlightId)?.push({ tag, link });
      });
    });
    return map;
  }, [tags]);

  const tagsByDimension = useMemo(() => {
    const record: Record<string, { id: string; label: string; color?: string }[]> = {};
    tags.forEach((tag) => {
      if (!record[tag.dimensionId]) {
        record[tag.dimensionId] = [];
      }
      record[tag.dimensionId].push({ id: tag.id, label: tag.label, color: tag.color });
    });
    return record;
  }, [tags]);

  const tagPinsByPage = useMemo(() => {
    const map = new Map<number, { tag: Tag; link: TagLink }[]>();
    tags.forEach((tag) => {
      tag.links.forEach((link) => {
        if (!link.position || typeof link.position.x !== 'number' || typeof link.position.y !== 'number') {
          return;
        }
        if (!link.pageNumber) {
          return;
        }
        if (!map.has(link.pageNumber)) {
          map.set(link.pageNumber, []);
        }
        map.get(link.pageNumber)?.push({ tag, link });
      });
    });
    return map;
  }, [tags]);

  const drawingsByPage = useMemo(() => {
    const map = new Map<number, DrawingAnnotation[]>();
    drawings.forEach((annotation) => {
      if (!map.has(annotation.pageNumber)) {
        map.set(annotation.pageNumber, []);
      }
      map.get(annotation.pageNumber)?.push(annotation);
    });
    return map;
  }, [drawings]);

  useEffect(() => {
    setSelectionInfo(null);
    setTagPopover(null);
    setActiveStroke(null);
    setIsDrawingMode(false);
    setIsPlacingTag(false);
  }, [fileUrl]);

  useEffect(() => {
    if (!activeHighlightId || !containerRef.current) {
      return;
    }
    const element = containerRef.current.querySelector<HTMLElement>(
      `[data-highlight-id="${activeHighlightId}"]`,
    );
    if (!element) {
      return;
    }
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.classList.add('pdf-highlight--pulse');
    const timeout = window.setTimeout(() => {
      element.classList.remove('pdf-highlight--pulse');
    }, 1500);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [activeHighlightId]);

  useEffect(() => {
    if (isDrawingMode) {
      setSelectionInfo(null);
      window.getSelection()?.removeAllRanges();
    }
    if (!isDrawingMode) {
      setActiveStroke(null);
    }
  }, [isDrawingMode]);

  useEffect(() => {
    if (isPlacingTag) {
      setSelectionInfo(null);
      setIsDrawingMode(false);
      window.getSelection()?.removeAllRanges();
    }
  }, [isPlacingTag]);

  useEffect(() => {
    if (!tagPopover) {
      return;
    }
    if (tagPopover.type === 'create') {
      const available = tagsByDimension[tagPopover.dimensionId] ?? [];
      if (available.length === 0) {
        setTagPopover(null);
        return;
      }
      if (!available.some((option) => option.id === tagPopover.selectedTagId)) {
        setTagPopover({ ...tagPopover, selectedTagId: available[0].id });
      }
      return;
    }
    if (tagPopover.type === 'create-pin') {
      const availableDimensions = dimensions.filter(
        (dimension) => (tagsByDimension[dimension.id] ?? []).length > 0,
      );
      if (availableDimensions.length === 0) {
        setTagPopover(null);
        return;
      }
      if (!availableDimensions.some((dimension) => dimension.id === tagPopover.dimensionId)) {
        const fallbackDimension = availableDimensions[0];
        setTagPopover({
          ...tagPopover,
          dimensionId: fallbackDimension.id,
          selectedTagId: tagsByDimension[fallbackDimension.id]?.[0]?.id ?? '',
        });
        return;
      }
      const availableTags = tagsByDimension[tagPopover.dimensionId] ?? [];
      if (availableTags.length === 0) {
        const fallbackDimension = availableDimensions.find(
          (dimension) => (tagsByDimension[dimension.id] ?? []).length > 0,
        );
        if (fallbackDimension) {
          setTagPopover({
            ...tagPopover,
            dimensionId: fallbackDimension.id,
            selectedTagId: tagsByDimension[fallbackDimension.id]?.[0]?.id ?? '',
          });
        } else {
          setTagPopover(null);
        }
        return;
      }
      if (!availableTags.some((option) => option.id === tagPopover.selectedTagId)) {
        setTagPopover({ ...tagPopover, selectedTagId: availableTags[0].id });
      }
    }
  }, [tagPopover, tagsByDimension, dimensions]);

  useEffect(() => {
    if (!tagPopover || tagPopover.type !== 'view') {
      return;
    }
    const tag = tags.find((item) => item.id === tagPopover.tagId);
    const link = tag?.links.find((item) => item.id === tagPopover.linkId);
    if (!link) {
      setTagPopover(null);
      return;
    }
    const currentComment = link.comment ?? '';
    if (currentComment !== tagPopover.comment) {
      setTagPopover({ ...tagPopover, comment: currentComment });
    }
  }, [tagPopover, tags]);

  const handleMouseUp = () => {
    if (isDrawingMode || isPlacingTag) {
      return;
    }
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setSelectionInfo(null);
      return;
    }
    const text = selection.toString();
    if (!text.trim()) {
      setSelectionInfo(null);
      return;
    }
    const range = selection.getRangeAt(0);
    const pageElement = getPageElement(range.commonAncestorContainer);
    if (!pageElement) {
      setSelectionInfo(null);
      return;
    }
    const pageNumber = Number(pageElement.getAttribute('data-page-number'));
    if (!Number.isFinite(pageNumber)) {
      setSelectionInfo(null);
      return;
    }
    const rects = Array.from(range.getClientRects());
    if (rects.length === 0) {
      setSelectionInfo(null);
      return;
    }
    const pageRect = pageElement.getBoundingClientRect();
    const normalizedRects: HighlightRect[] = rects
      .map((rect) => ({
        x: (rect.left - pageRect.left) / pageRect.width,
        y: (rect.top - pageRect.top) / pageRect.height,
        width: rect.width / pageRect.width,
        height: rect.height / pageRect.height,
      }))
      .filter((rect) => rect.width > 0 && rect.height > 0);
    if (normalizedRects.length === 0) {
      setSelectionInfo(null);
      return;
    }
    const containerRect = containerRef.current?.getBoundingClientRect();
    const boundingRect = range.getBoundingClientRect();
    const toolbarPosition = containerRect
      ? {
          top: Math.max(0, boundingRect.top - containerRect.top - 40),
          left: Math.max(0, boundingRect.left - containerRect.left),
        }
      : { top: 0, left: 0 };
    setSelectionInfo({
      text,
      rects: normalizedRects,
      pageNumber,
      toolbarPosition,
    });
  };

  const handleConfirmHighlight = ({
    dimensionId,
    comment,
    tagId,
    tagComment,
  }: {
    dimensionId: string;
    comment: string;
    tagId?: string;
    tagComment?: string;
  }) => {
    if (!selectionInfo) {
      return;
    }
    const trimmedText = selectionInfo.text.trim();
    if (!trimmedText) {
      setSelectionInfo(null);
      return;
    }
    const created = onCreateHighlight({
      dimensionId,
      comment,
      text: trimmedText,
      pageNumber: selectionInfo.pageNumber,
      rects: selectionInfo.rects,
    });
    if (created && tagId) {
      onAttachTagToHighlight(tagId, created.id, tagComment);
    }
    setSelectionInfo(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleCancelSelection = () => {
    setSelectionInfo(null);
    window.getSelection()?.removeAllRanges();
  };

  const getPopoverPosition = (element: HTMLElement) => {
    const containerRect = containerRef.current?.getBoundingClientRect();
    const targetRect = element.getBoundingClientRect();
    if (!containerRect) {
      return { top: 0, left: 0 };
    }
    return {
      top: Math.max(0, targetRect.bottom - containerRect.top + 8),
      left: Math.max(0, targetRect.left - containerRect.left),
    };
  };

  const handleOpenTagPopover = (event: ReactMouseEvent<HTMLButtonElement>, tag: Tag, link: TagLink) => {
    event.preventDefault();
    event.stopPropagation();
    const position = getPopoverPosition(event.currentTarget);
    setTagPopover({
      type: 'view',
      tagId: tag.id,
      linkId: link.id,
      label: tag.label,
      color: tag.color,
      comment: link.comment ?? '',
      position,
    });
  };

  const handleOpenCreateTagPopover = (event: ReactMouseEvent<HTMLButtonElement>, highlight: Highlight) => {
    event.preventDefault();
    event.stopPropagation();
    const options = tagsByDimension[highlight.dimensionId] ?? [];
    if (options.length === 0) {
      return;
    }
    const position = getPopoverPosition(event.currentTarget);
    setTagPopover({
      type: 'create',
      highlightId: highlight.id,
      dimensionId: highlight.dimensionId,
      selectedTagId: options[0].id,
      comment: '',
      position,
    });
  };

  const handleTagPopoverCommentChange = (value: string) => {
    if (!tagPopover || tagPopover.type !== 'view') {
      return;
    }
    setTagPopover({ ...tagPopover, comment: value });
    onUpdateTagLinkComment(tagPopover.tagId, tagPopover.linkId, value);
  };

  const handleRemoveTagAssociation = () => {
    if (!tagPopover || tagPopover.type !== 'view') {
      return;
    }
    onRemoveTagLink(tagPopover.tagId, tagPopover.linkId);
    setTagPopover(null);
  };

  const handleConfirmTagCreation = () => {
    if (!tagPopover || tagPopover.type !== 'create' || !tagPopover.selectedTagId) {
      return;
    }
    onAttachTagToHighlight(tagPopover.selectedTagId, tagPopover.highlightId, tagPopover.comment);
    setTagPopover(null);
  };

  const handleConfirmPinCreation = () => {
    if (!tagPopover || tagPopover.type !== 'create-pin' || !tagPopover.selectedTagId) {
      return;
    }
    onCreateTagPin(
      tagPopover.selectedTagId,
      tagPopover.pageNumber,
      tagPopover.pinPosition,
      tagPopover.comment,
    );
    setTagPopover(null);
  };

  const handleTagPlacementClick = (
    event: ReactMouseEvent<HTMLDivElement>,
    pageNumber: number,
  ) => {
    if (!isPlacingTag) {
      return;
    }
    event.preventDefault();
    const availableDimensions = dimensions.filter(
      (dimension) => (tagsByDimension[dimension.id] ?? []).length > 0,
    );
    if (availableDimensions.length === 0) {
      setIsPlacingTag(false);
      window.alert('Cal crear prèviament etiquetes per poder col·locar-les al document.');
      return;
    }
    const target = event.currentTarget;
    const bounds = target.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    const containerBounds = containerRef.current?.getBoundingClientRect();
    const popoverPosition = containerBounds
      ? {
          top: Math.max(0, event.clientY - containerBounds.top),
          left: Math.max(0, event.clientX - containerBounds.left),
        }
      : { top: 0, left: 0 };
    const firstDimensionId = availableDimensions[0].id;
    const firstTag = tagsByDimension[firstDimensionId]?.[0];
    setTagPopover({
      type: 'create-pin',
      dimensionId: firstDimensionId,
      selectedTagId: firstTag?.id ?? '',
      comment: '',
      pageNumber,
      pinPosition: { x, y },
      position: popoverPosition,
    });
    setIsPlacingTag(false);
  };

  const getNormalizedPoint = (event: ReactPointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) / bounds.width,
      y: (event.clientY - bounds.top) / bounds.height,
    };
  };

  const pointsToPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) {
      return '';
    }
    return points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${(point.x * 1000).toFixed(2)} ${(point.y * 1000).toFixed(2)}`)
      .join(' ');
  };

  const handleDrawingPointerDown = (event: ReactPointerEvent<SVGSVGElement>, pageNumber: number) => {
    if (!isDrawingMode) {
      return;
    }
    event.preventDefault();
    const svg = event.currentTarget;
    svg.setPointerCapture(event.pointerId);
    const point = getNormalizedPoint(event);
    setActiveStroke({ pageNumber, points: [point] });
  };

  const handleDrawingPointerMove = (event: ReactPointerEvent<SVGSVGElement>, pageNumber: number) => {
    if (!isDrawingMode) {
      return;
    }
    event.preventDefault();
    const nextPoint = getNormalizedPoint(event);
    setActiveStroke((prev) => {
      if (!prev || prev.pageNumber !== pageNumber) {
        return prev;
      }
      return {
        ...prev,
        points: [...prev.points, nextPoint],
      };
    });
  };

  const handleDrawingPointerUp = (event: ReactPointerEvent<SVGSVGElement>, pageNumber: number) => {
    if (!activeStroke || activeStroke.pageNumber !== pageNumber) {
      return;
    }
    event.preventDefault();
    const svg = event.currentTarget;
    if (svg.hasPointerCapture(event.pointerId)) {
      svg.releasePointerCapture(event.pointerId);
    }
    if (activeStroke.points.length > 1) {
      const path = pointsToPath(activeStroke.points);
      onAddDrawingAnnotation(pageNumber, path);
    }
    setActiveStroke(null);
  };

  if (!fileUrl) {
    return <p className="pdf-viewer__placeholder">Carrega prèviament un document per activar el visor.</p>;
  }

  return (
    <div className="pdf-viewer" data-drawing={isDrawingMode} ref={containerRef} onMouseUp={handleMouseUp}>
      <div className="pdf-viewer__controls">
        <button type="button" data-active={isPlacingTag} onClick={() => setIsPlacingTag((prev) => !prev)}>
          {isPlacingTag ? 'Cancel·lar posició' : 'Col·locar etiqueta'}
        </button>
        <button type="button" data-active={isDrawingMode} onClick={() => setIsDrawingMode((prev) => !prev)}>
          {isDrawingMode ? 'Desactivar dibuix' : 'Mode dibuix'}
        </button>
      </div>
      <Document
        file={fileUrl}
        onLoadSuccess={(pdfDocument: { numPages: number }) => {
          setNumPages(pdfDocument.numPages);
          setLoadError(null);
        }}
        onLoadError={(error: Error) => setLoadError(error.message)}
        loading={<p className="pdf-viewer__placeholder">Carregant el document…</p>}
        error={<p className="pdf-viewer__placeholder">No s'ha pogut obrir el document.</p>}
      >
        {Array.from(new Array(numPages), (_, index) => index + 1).map((pageNumber) => {
          const pageHighlights = highlightsByPage.get(pageNumber) ?? [];
          const pageDrawings = drawingsByPage.get(pageNumber) ?? [];
          const activeStrokePath =
            activeStroke && activeStroke.pageNumber === pageNumber ? pointsToPath(activeStroke.points) : '';
          return (
            <div key={pageNumber} className="pdf-page" data-page-number={pageNumber}>
              <Page pageNumber={pageNumber} scale={SCALE} renderAnnotationLayer renderTextLayer />
              <div className="pdf-overlay">
                <div className="pdf-highlight-layer">
                  {pageHighlights.map((highlight) => {
                    const highlightTags = tagsByHighlight.get(highlight.id) ?? [];
                    const availableDimensionTags = tagsByDimension[highlight.dimensionId] ?? [];
                    return (highlight.rects ?? []).map((rect, idx) => (
                      <button
                        key={`${highlight.id}-${idx}`}
                        type="button"
                        className={`pdf-highlight ${highlight.id === activeHighlightId ? 'pdf-highlight--active' : ''}`}
                        data-highlight-id={highlight.id}
                        style={{
                          left: `${rect.x * 100}%`,
                          top: `${rect.y * 100}%`,
                          width: `${rect.width * 100}%`,
                          height: `${rect.height * 100}%`,
                        }}
                        aria-label={`Highlight pàgina ${highlight.pageNumber}`}
                        title={highlight.comment || highlight.text}
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelectHighlight(highlight.id);
                        }}
                      >
                        {idx === 0 ? (
                          <span
                            className="pdf-highlight__tag-controls"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {highlightTags.map(({ tag, link }) => (
                              <button
                                key={link.id}
                                type="button"
                                className="pdf-highlight__tag"
                                style={{ backgroundColor: tag.color || '#4c1d95' }}
                                onClick={(event) => handleOpenTagPopover(event, tag, link)}
                              >
                                {tag.label}
                              </button>
                            ))}
                            <button
                              type="button"
                              className="pdf-highlight__tag-add"
                              onClick={(event) => handleOpenCreateTagPopover(event, highlight)}
                              disabled={availableDimensionTags.length === 0}
                              title={
                                availableDimensionTags.length === 0
                                  ? 'Crea una etiqueta per aquesta dimensió des del full d\'anàlisi'
                                  : 'Vincular una etiqueta'
                              }
                            >
                              +
                            </button>
                          </span>
                        ) : null}
                      </button>
                    ));
                  })}
                </div>
                <div className="pdf-tag-pin-layer">
                  {(tagPinsByPage.get(pageNumber) ?? []).map(({ tag, link }) => (
                    <button
                      key={link.id}
                      type="button"
                      className="pdf-tag-pin"
                      style={{
                        left: `${(link.position?.x ?? 0) * 100}%`,
                        top: `${(link.position?.y ?? 0) * 100}%`,
                        backgroundColor: tag.color || '#4c1d95',
                      }}
                      onClick={(event) => handleOpenTagPopover(event, tag, link)}
                      title={tag.label}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
                <svg
                  className="pdf-drawing-layer"
                  data-active={isDrawingMode}
                  onPointerDown={(event) => handleDrawingPointerDown(event, pageNumber)}
                  onPointerMove={(event) => handleDrawingPointerMove(event, pageNumber)}
                  onPointerUp={(event) => handleDrawingPointerUp(event, pageNumber)}
                  onPointerLeave={(event) => handleDrawingPointerUp(event, pageNumber)}
                  onPointerCancel={(event) => handleDrawingPointerUp(event, pageNumber)}
                  viewBox="0 0 1000 1000"
                  preserveAspectRatio="none"
                >
                  {pageDrawings.map((annotation) => (
                    <path key={annotation.id} d={annotation.data} className="pdf-drawing-layer__path" />
                  ))}
                  {activeStrokePath ? (
                    <path d={activeStrokePath} className="pdf-drawing-layer__path pdf-drawing-layer__path--preview" />
                  ) : null}
                </svg>
                <div
                  className="pdf-tag-placement-layer"
                  data-active={isPlacingTag}
                  onClick={(event) => handleTagPlacementClick(event, pageNumber)}
                />
              </div>
              {pageDrawings.length > 0 ? (
                <div className="pdf-drawing-list">
                  <span className="pdf-drawing-list__title">
                    Anotacions dibuixades ({pageDrawings.length})
                  </span>
                  <ul>
                    {pageDrawings.map((annotation, index) => (
                      <li key={annotation.id}>
                        <span>Traç {index + 1}</span>
                        <button type="button" onClick={() => onRemoveDrawingAnnotation(annotation.id)}>
                          Esborrar
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          );
        })}
      </Document>
      {loadError ? <p className="pdf-viewer__placeholder pdf-viewer__placeholder--error">{loadError}</p> : null}
      {selectionInfo && dimensions.length > 0 ? (
        <HighlightToolbar
          dimensions={dimensions}
          position={selectionInfo.toolbarPosition}
          tagsByDimension={tagsByDimension}
          onConfirm={handleConfirmHighlight}
          onCancel={handleCancelSelection}
        />
      ) : null}
      {tagPopover ? (
        <div className="pdf-tag-popover" style={{ top: tagPopover.position.top, left: tagPopover.position.left }}>
          {tagPopover.type === 'view' ? (
            <>
              <div
                className="pdf-tag-popover__badge"
                style={{ backgroundColor: tagPopover.color || '#1e3a8a' }}
              >
                {tagPopover.label}
              </div>
              <textarea
                value={tagPopover.comment}
                onChange={(event) => handleTagPopoverCommentChange(event.target.value)}
                placeholder="Comentari contextual de l'etiqueta"
              />
              <div className="pdf-tag-popover__actions">
                <button type="button" className="pdf-tag-popover__delete" onClick={handleRemoveTagAssociation}>
                  Eliminar vincle
                </button>
                <button type="button" onClick={() => setTagPopover(null)}>
                  Tancar
                </button>
              </div>
            </>
          ) : tagPopover.type === 'create' ? (
            <>
              <p className="pdf-tag-popover__title">Vincular etiqueta</p>
              <select
                value={tagPopover.selectedTagId}
                onChange={(event) =>
                  setTagPopover({ ...tagPopover, selectedTagId: event.target.value })
                }
              >
                {(tagsByDimension[tagPopover.dimensionId] ?? []).map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <textarea
                value={tagPopover.comment}
                onChange={(event) =>
                  setTagPopover({ ...tagPopover, comment: event.target.value })
                }
                placeholder="Comentari específic"
              />
              <div className="pdf-tag-popover__actions">
                <button type="button" onClick={handleConfirmTagCreation} disabled={!tagPopover.selectedTagId}>
                  Vincular
                </button>
                <button type="button" onClick={() => setTagPopover(null)}>
                  Cancel·lar
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="pdf-tag-popover__title">Col·locar etiqueta</p>
              <select
                value={tagPopover.dimensionId}
                onChange={(event) => {
                  const nextDimensionId = event.target.value;
                  const nextTags = tagsByDimension[nextDimensionId] ?? [];
                  setTagPopover({
                    ...tagPopover,
                    dimensionId: nextDimensionId,
                    selectedTagId: nextTags[0]?.id ?? '',
                  });
                }}
              >
                {dimensions
                  .filter((dimension) => (tagsByDimension[dimension.id] ?? []).length > 0)
                  .map((dimension) => (
                    <option key={dimension.id} value={dimension.id}>
                      {dimension.title}
                    </option>
                  ))}
              </select>
              <select
                value={tagPopover.selectedTagId}
                onChange={(event) =>
                  setTagPopover({ ...tagPopover, selectedTagId: event.target.value })
                }
                disabled={(tagsByDimension[tagPopover.dimensionId] ?? []).length === 0}
              >
                {(tagsByDimension[tagPopover.dimensionId] ?? []).map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <textarea
                value={tagPopover.comment}
                onChange={(event) =>
                  setTagPopover({ ...tagPopover, comment: event.target.value })
                }
                placeholder="Comentari contextual de l'etiqueta"
              />
              <div className="pdf-tag-popover__actions">
                <button type="button" onClick={handleConfirmPinCreation} disabled={!tagPopover.selectedTagId}>
                  Guardar
                </button>
                <button type="button" onClick={() => setTagPopover(null)}>
                  Cancel·lar
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
