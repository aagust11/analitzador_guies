import { GuideStatus } from '../../models';
import './GuideStatusBadge.css';

const STATUS_LABELS: Record<GuideStatus, string> = {
  not_started: 'No iniciada',
  in_progress: 'En curs',
  in_review: 'En revisió',
  completed: 'Finalitzada',
};

export function GuideStatusBadge({ status }: { status: GuideStatus }) {
  return <span className={`guide-status guide-status--${status}`}>{STATUS_LABELS[status]}</span>;
}
