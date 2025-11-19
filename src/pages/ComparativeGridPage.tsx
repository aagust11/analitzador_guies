import { ChangeEvent, useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnalysisSheet, DEFAULT_ANALYSIS_DIMENSIONS, GuideStatus } from '../models';
import { useStorage } from '../services/storage/StorageContext';
import './PageStyles.css';
import './ComparativeGridPage.css';

type DimensionColumn = {
  id: string;
  title: string;
  isCustom: boolean;
};

type FiltersState = {
  institution: string;
  status: 'all' | GuideStatus;
  fromYear: string;
  toYear: string;
};

const STATUS_LABELS: Record<GuideStatus, string> = {
  not_started: 'No iniciada',
  in_progress: 'En curs',
  in_review: 'En revisió',
  completed: 'Finalitzada',
};

const defaultFilters: FiltersState = {
  institution: 'all',
  status: 'all',
  fromYear: '',
  toYear: '',
};

const cellKey = (guideId: string, dimensionId: string) => `${guideId}::${dimensionId}`;

export function ComparativeGridPage() {
  const { projectState } = useStorage();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);

  const institutions = useMemo(() => {
    const items = new Set<string>();
    projectState.guides.forEach((guide) => {
      if (guide.institution) {
        items.add(guide.institution);
      }
    });
    return Array.from(items).sort((a, b) => a.localeCompare(b));
  }, [projectState.guides]);

  const dimensionColumns = useMemo<DimensionColumn[]>(() => {
    const overrideTitles = new Map<string, string>();
    const custom = new Map<string, string>();
    projectState.analysisSheets.forEach((sheet) => {
      const trimmedTitle = sheet.customTitle?.trim();
      if (sheet.isCustomDimension) {
        custom.set(sheet.dimensionId, trimmedTitle || sheet.dimensionId);
        return;
      }
      if (trimmedTitle) {
        overrideTitles.set(sheet.dimensionId, trimmedTitle);
      }
    });
    const defaults = DEFAULT_ANALYSIS_DIMENSIONS.map((dimension) => ({
      id: dimension.id,
      title: overrideTitles.get(dimension.id) ?? dimension.title,
      isCustom: false,
    }));
    const customColumns: DimensionColumn[] = Array.from(custom.entries())
      .map(([id, title]) => ({ id, title, isCustom: true }))
      .sort((a, b) => a.title.localeCompare(b.title));
    return [...defaults, ...customColumns];
  }, [projectState.analysisSheets]);

  const sheetLookup = useMemo(() => {
    const map = new Map<string, AnalysisSheet>();
    projectState.analysisSheets.forEach((sheet) => {
      map.set(cellKey(sheet.guideId, sheet.dimensionId), sheet);
    });
    return map;
  }, [projectState.analysisSheets]);

  const highlightCounts = useMemo(() => {
    const counts = new Map<string, number>();
    projectState.highlights.forEach((highlight) => {
      const key = cellKey(highlight.guideId, highlight.dimensionId);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return counts;
  }, [projectState.highlights]);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    projectState.tags.forEach((tag) => {
      const key = cellKey(tag.guideId, tag.dimensionId);
      counts.set(key, (counts.get(key) ?? 0) + tag.links.length);
    });
    return counts;
  }, [projectState.tags]);

  const filteredGuides = useMemo(() => {
    const fromYear = Number.parseInt(filters.fromYear, 10);
    const toYear = Number.parseInt(filters.toYear, 10);
    return projectState.guides
      .filter((guide) => {
        if (filters.institution !== 'all' && guide.institution !== filters.institution) {
          return false;
        }
        if (filters.status !== 'all' && guide.status !== filters.status) {
          return false;
        }
        if (!Number.isNaN(fromYear)) {
          const guideYear = Number.parseInt(guide.year ?? '', 10);
          if (Number.isNaN(guideYear) || guideYear < fromYear) {
            return false;
          }
        }
        if (!Number.isNaN(toYear)) {
          const guideYear = Number.parseInt(guide.year ?? '', 10);
          if (Number.isNaN(guideYear) || guideYear > toYear) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [projectState.guides, filters]);

  const getCellInfo = useCallback(
    (guideId: string, dimensionId: string) => {
      const key = cellKey(guideId, dimensionId);
      const sheet = sheetLookup.get(key);
      const summarySource =
        sheet?.notes?.interpretive?.trim() || sheet?.notes?.descriptive?.trim() || '';
      const summaryPreview = summarySource
        ? summarySource.length > 200
          ? `${summarySource.slice(0, 200)}…`
          : summarySource
        : 'Sense notes registrades';
      return {
        summary: summaryPreview,
        summaryRaw: summarySource,
        highlightCount: highlightCounts.get(key) ?? 0,
        tagCount: tagCounts.get(key) ?? 0,
      };
    },
    [highlightCounts, sheetLookup, tagCounts],
  );

  const handleChangeFilter = (field: keyof FiltersState, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleYearInput = (field: 'fromYear' | 'toYear') => (event: ChangeEvent<HTMLInputElement>) => {
    handleChangeFilter(field, event.target.value);
  };

  const handleResetFilters = () => {
    setFilters(defaultFilters);
  };

  const handleNavigateToCell = (guideId: string, dimensionId: string) => {
    navigate(`../analysis/${guideId}?dimension=${dimensionId}`);
  };

  const downloadBlob = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const payload = filteredGuides.flatMap((guide) =>
      dimensionColumns.map((dimension) => {
        const cell = getCellInfo(guide.id, dimension.id);
        return {
          guideId: guide.id,
          guideTitle: guide.title,
          institution: guide.institution ?? '',
          year: guide.year ?? '',
          status: guide.status,
          dimensionId: dimension.id,
          dimensionTitle: dimension.title,
          summary: cell.summaryRaw,
          highlightCount: cell.highlightCount,
          tagCount: cell.tagCount,
        };
      }),
    );
    downloadBlob(
      JSON.stringify({
        generatedAt: new Date().toISOString(),
        rows: payload,
      }, null, 2),
      `comparative-grid-${new Date().toISOString()}.json`,
      'application/json',
    );
  };

  const handleExportCSV = () => {
    const rows: string[][] = [
      ['Guide title', 'Institution', 'Year', 'Status', 'Dimension', 'Summary', 'Highlights', 'Tags'],
    ];
    filteredGuides.forEach((guide) => {
      dimensionColumns.forEach((dimension) => {
        const cell = getCellInfo(guide.id, dimension.id);
        rows.push([
          guide.title,
          guide.institution ?? '',
          guide.year ?? '',
          STATUS_LABELS[guide.status],
          dimension.title,
          cell.summaryRaw || '',
          cell.highlightCount.toString(),
          cell.tagCount.toString(),
        ]);
      });
    });
    const csv = rows
      .map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    downloadBlob(csv, `comparative-grid-${new Date().toISOString()}.csv`, 'text/csv');
  };

  const hasGuides = projectState.guides.length > 0;
  const hasRows = filteredGuides.length > 0;

  return (
    <section className="page">
      <header className="page__header">
        <div>
          <h2>Graella comparativa</h2>
          <p>Explora de manera transversal les dimensions analitzades i navega ràpidament a cada guia.</p>
        </div>
      </header>

      <div className="card comparative-grid__filters">
        <div className="comparative-grid__filters-row">
          <label>
            Institució
            <select
              value={filters.institution}
              onChange={(event) => handleChangeFilter('institution', event.target.value)}
            >
              <option value="all">Totes</option>
              {institutions.map((institution) => (
                <option key={institution} value={institution}>
                  {institution}
                </option>
              ))}
            </select>
          </label>
          <label>
            Estat
            <select value={filters.status} onChange={(event) => handleChangeFilter('status', event.target.value)}>
              <option value="all">Tots els estats</option>
              {(Object.keys(STATUS_LABELS) as GuideStatus[]).map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Any inicial
            <input
              type="number"
              value={filters.fromYear}
              placeholder="2020"
              onChange={handleYearInput('fromYear')}
            />
          </label>
          <label>
            Any final
            <input
              type="number"
              value={filters.toYear}
              placeholder="2024"
              onChange={handleYearInput('toYear')}
            />
          </label>
        </div>
        <div className="comparative-grid__filters-actions">
          <button type="button" className="button" onClick={handleResetFilters}>
            Restaura filtres
          </button>
          <div className="comparative-grid__export-actions">
            <button
              type="button"
              className="button button--primary"
              onClick={handleExportJSON}
              disabled={!hasRows}
            >
              Exporta JSON
            </button>
            <button type="button" className="button" onClick={handleExportCSV} disabled={!hasRows}>
              Exporta CSV
            </button>
          </div>
        </div>
        {!hasGuides && <p className="comparative-grid__empty">Encara no hi ha guies carregades. Puja documents des de la pàgina principal.</p>}
      </div>

      <div className="card comparative-grid__table-wrapper">
        {!hasRows ? (
          <p className="comparative-grid__empty">Cap guia coincideix amb els filtres seleccionats.</p>
        ) : (
          <>
            <p className="comparative-grid__hint">Fes clic en qualsevol cel·la per obrir l'espai d'anàlisi i centrar la dimensió.</p>
            <div className="comparative-grid__scroll">
              <table className="comparative-grid__table">
                <thead>
                  <tr>
                    <th>Guia</th>
                    {dimensionColumns.map((dimension) => (
                      <th key={dimension.id} data-custom={dimension.isCustom ? 'true' : 'false'}>
                        {dimension.title}
                        {dimension.isCustom && <span className="comparative-grid__custom-tag">Emergent</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredGuides.map((guide) => (
                    <tr key={guide.id}>
                      <th>
                        <div className="comparative-grid__guide-title">{guide.title}</div>
                        <p className="comparative-grid__guide-meta">
                          {guide.institution ?? 'Sense institució'} · {guide.year ?? 'Sense any'} ·{' '}
                          {STATUS_LABELS[guide.status]}
                        </p>
                      </th>
                      {dimensionColumns.map((dimension) => {
                        const cell = getCellInfo(guide.id, dimension.id);
                        return (
                          <td key={dimension.id}>
                            <button
                              type="button"
                              className="comparative-grid__cell-button"
                              onClick={() => handleNavigateToCell(guide.id, dimension.id)}
                              title={cell.summaryRaw || 'Sense notes registrades'}
                            >
                              <span className="comparative-grid__summary">{cell.summary}</span>
                              <div className="comparative-grid__counts">
                                <span>Highlights: {cell.highlightCount}</span>
                                <span>Etiquetes: {cell.tagCount}</span>
                              </div>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default ComparativeGridPage;
