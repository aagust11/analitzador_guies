export type GuideStatus = 'not_started' | 'in_progress' | 'in_review' | 'completed';

export interface GuideDocument {
  id: string;
  title: string;
  description?: string;
  institution?: string;
  year?: string;
  status: GuideStatus;
  sourceFileName: string;
  storageFileName: string;
  mimeType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisDimension {
  id: string;
  name: string;
  description?: string;
  indicators: AnalysisIndicator[];
}

export interface AnalysisIndicator {
  id: string;
  dimensionId: string;
  label: string;
  description?: string;
}

export interface Highlight {
  id: string;
  guideId: string;
  dimensionId: string;
  indicatorId?: string;
  text: string;
  pageNumber: number;
  startOffset?: number;
  endOffset?: number;
  comment?: string;
  createdAt: string;
  rects?: HighlightRect[];
}

export interface HighlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Tag {
  id: string;
  guideId: string;
  dimensionId?: string;
  label: string;
  color: string;
  linkedHighlightIds: string[];
  createdAt: string;
}

export interface DrawingAnnotation {
  id: string;
  guideId: string;
  pageNumber: number;
  data: string;
  createdAt: string;
}

export interface AnalysisSheetNotes {
  descriptive: string;
  quotations: string;
  interpretive: string;
  emergentCodes: string[];
  memo?: string;
}

export interface AnalysisSheet {
  guideId: string;
  dimensionId: string;
  notes: AnalysisSheetNotes;
  customTitle?: string;
  isCustomDimension?: boolean;
}

export interface ProjectState {
  version: number;
  createdAt: string;
  updatedAt: string;
  guides: GuideDocument[];
  highlights: Highlight[];
  tags: Tag[];
  drawings: DrawingAnnotation[];
  analysisSheets: AnalysisSheet[];
}

export const PROJECT_STATE_VERSION = 1;

export function createEmptyProjectState(): ProjectState {
  const now = new Date().toISOString();
  return {
    version: PROJECT_STATE_VERSION,
    createdAt: now,
    updatedAt: now,
    guides: [],
    highlights: [],
    tags: [],
    drawings: [],
    analysisSheets: [],
  };
}
