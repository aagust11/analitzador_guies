import { useEffect, useState } from 'react';

interface HighlightToolbarProps {
  dimensions: { id: string; title: string }[];
  position: { top: number; left: number };
  tagsByDimension: Record<string, { id: string; label: string; color?: string }[]>;
  onConfirm: (payload: { dimensionId: string; comment: string; tagId?: string; tagComment?: string }) => void;
  onCancel: () => void;
}

export function HighlightToolbar({ dimensions, position, tagsByDimension, onConfirm, onCancel }: HighlightToolbarProps) {
  const [dimensionId, setDimensionId] = useState(dimensions[0]?.id ?? '');
  const [comment, setComment] = useState('');
  const [tagId, setTagId] = useState('');
  const [tagComment, setTagComment] = useState('');

  useEffect(() => {
    setDimensionId(dimensions[0]?.id ?? '');
    setComment('');
    setTagId('');
    setTagComment('');
  }, [dimensions, position]);

  const handleSubmit = () => {
    if (!dimensionId) {
      return;
    }
    onConfirm({
      dimensionId,
      comment: comment.trim(),
      tagId: tagId || undefined,
      tagComment: tagComment.trim() || undefined,
    });
    setComment('');
    setTagComment('');
    setTagId('');
  };

  const availableTags = tagsByDimension[dimensionId] ?? [];

  if (dimensions.length === 0) {
    return null;
  }

  return (
    <div className="pdf-toolbar" style={{ top: position.top, left: position.left }}>
      <select value={dimensionId} onChange={(event) => setDimensionId(event.target.value)}>
        {dimensions.map((dimension) => (
          <option key={dimension.id} value={dimension.id}>
            {dimension.title}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Comentari opcional"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
      />
      <select
        value={tagId}
        onChange={(event) => setTagId(event.target.value)}
        disabled={availableTags.length === 0}
        title={availableTags.length === 0 ? 'Cap etiqueta creada per aquesta dimensió' : undefined}
      >
        <option value="">Sense etiqueta</option>
        {availableTags.map((tag) => (
          <option key={tag.id} value={tag.id}>
            {tag.label}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Nota específica de l'etiqueta"
        value={tagComment}
        onChange={(event) => setTagComment(event.target.value)}
        disabled={!tagId}
      />
      <button type="button" onClick={handleSubmit}>
        Afegir highlight
      </button>
      <button type="button" className="pdf-toolbar__cancel" onClick={onCancel}>
        Cancel·lar
      </button>
    </div>
  );
}
