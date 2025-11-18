import { GuideDocument, GuideStatus } from '../../models';
import { GuideStatusBadge } from './GuideStatusBadge';
import './GuideList.css';

interface GuideListProps {
  guides: GuideDocument[];
  onChangeStatus: (guideId: string, status: GuideStatus) => void;
  onOpenGuide: (guideId: string) => void;
}

export function GuideList({ guides, onChangeStatus, onOpenGuide }: GuideListProps) {
  if (guides.length === 0) {
    return (
      <div className="card">
        <p>Encara no hi ha cap guia. Puja un PDF per començar.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="guide-list">
        <div className="guide-list__header guide-list__row">
          <span>Títol</span>
          <span>Any</span>
          <span>Institució</span>
          <span>Estat</span>
          <span>Darrera actualització</span>
        </div>
        {guides.map((guide) => (
          <div
            key={guide.id}
            role="button"
            tabIndex={0}
            className="guide-list__row guide-list__item"
            onClick={() => onOpenGuide(guide.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onOpenGuide(guide.id);
              }
            }}
          >
            <span>
              <strong>{guide.title}</strong>
            </span>
            <span>{guide.year ?? '-'}</span>
            <span>{guide.institution ?? '-'}</span>
            <span className="guide-list__status">
              <GuideStatusBadge status={guide.status} />
              <select
                value={guide.status}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => onChangeStatus(guide.id, event.target.value as GuideStatus)}
              >
                <option value="not_started">No iniciada</option>
                <option value="in_progress">En curs</option>
                <option value="in_review">En revisió</option>
                <option value="completed">Finalitzada</option>
              </select>
            </span>
            <span>{new Date(guide.updatedAt).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
