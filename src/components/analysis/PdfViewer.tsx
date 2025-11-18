import { useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { Highlight, HighlightRect } from '../../models';
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
  }) => void;
  onSelectHighlight: (highlightId: string) => void;
  activeHighlightId?: string | null;
}

interface SelectionInfo {
  text: string;
  rects: HighlightRect[];
  pageNumber: number;
  toolbarPosition: { top: number; left: number };
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
}: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [selectionInfo, setSelectionInfo] = useState<SelectionInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  useEffect(() => {
    setSelectionInfo(null);
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

  const handleMouseUp = () => {
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

  const handleConfirmHighlight = (dimensionId: string, comment: string) => {
    if (!selectionInfo) {
      return;
    }
    const trimmedText = selectionInfo.text.trim();
    if (!trimmedText) {
      setSelectionInfo(null);
      return;
    }
    onCreateHighlight({
      dimensionId,
      comment,
      text: trimmedText,
      pageNumber: selectionInfo.pageNumber,
      rects: selectionInfo.rects,
    });
    setSelectionInfo(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleCancelSelection = () => {
    setSelectionInfo(null);
    window.getSelection()?.removeAllRanges();
  };

  if (!fileUrl) {
    return <p className="pdf-viewer__placeholder">Carrega prèviament un document per activar el visor.</p>;
  }

  return (
    <div className="pdf-viewer" ref={containerRef} onMouseUp={handleMouseUp}>
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
          return (
            <div key={pageNumber} className="pdf-page" data-page-number={pageNumber}>
              <Page pageNumber={pageNumber} scale={SCALE} renderAnnotationLayer renderTextLayer />
              <div className="pdf-highlight-layer">
                {pageHighlights.map((highlight) =>
                  (highlight.rects ?? []).map((rect, idx) => (
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
                    />
                  )),
                )}
              </div>
            </div>
          );
        })}
      </Document>
      {loadError ? <p className="pdf-viewer__placeholder pdf-viewer__placeholder--error">{loadError}</p> : null}
      {selectionInfo && dimensions.length > 0 ? (
        <HighlightToolbar
          dimensions={dimensions}
          position={selectionInfo.toolbarPosition}
          onConfirm={handleConfirmHighlight}
          onCancel={handleCancelSelection}
        />
      ) : null}
    </div>
  );
}
