import { useEffect, useState } from 'react';

interface HighlightToolbarProps {
  dimensions: { id: string; title: string }[];
  position: { top: number; left: number };
  onConfirm: (dimensionId: string, comment: string) => void;
  onCancel: () => void;
}

export function HighlightToolbar({ dimensions, position, onConfirm, onCancel }: HighlightToolbarProps) {
  const [dimensionId, setDimensionId] = useState(dimensions[0]?.id ?? '');
  const [comment, setComment] = useState('');

  useEffect(() => {
    setDimensionId(dimensions[0]?.id ?? '');
    setComment('');
  }, [dimensions, position]);

  const handleSubmit = () => {
    if (!dimensionId) {
      return;
    }
    onConfirm(dimensionId, comment.trim());
    setComment('');
  };

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
      <button type="button" onClick={handleSubmit}>
        Afegir highlight
      </button>
      <button type="button" className="pdf-toolbar__cancel" onClick={onCancel}>
        Cancel·lar
      </button>
    </div>
  );
}
