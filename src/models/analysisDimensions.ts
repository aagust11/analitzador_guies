export interface AnalysisDimensionDefinition {
  id: string;
  title: string;
  description?: string;
}

export const DEFAULT_ANALYSIS_DIMENSIONS: AnalysisDimensionDefinition[] = [
  {
    id: 'dimension-1',
    title: 'Caracterització del document',
    description: 'Informació contextual bàsica sobre l\'autor, el format, la institució i l\'any.',
  },
  {
    id: 'dimension-2',
    title: "Definició i conceptualització de la IA a l'ESO",
    description: 'Com es defineix la IA i quin marc teòric o pedagògic s\'hi associa.',
  },
  {
    id: 'dimension-3',
    title: 'Representacions de l\'alumnat i les seves pràctiques',
  },
  {
    id: 'dimension-4',
    title: 'Representacions i expectatives del professorat',
  },
  {
    id: 'dimension-5',
    title: 'Riscos, amenaces i preocupacions',
  },
  {
    id: 'dimension-6',
    title: 'Regulació, governança i responsabilitat',
  },
  {
    id: 'dimension-7',
    title: 'Llenguatge transversal, to i marc discursiu',
  },
];
