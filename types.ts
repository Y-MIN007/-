
export interface CinematicShot {
  id: string;
  title: string;
  cinematography: string;
  lighting: string;
  colorPalette: string;
  description: string;
  vibe: string;
  imageUrl?: string;
  isGenerating?: boolean;
}

export type InputMode = 'text' | 'image';
export type Language = 'en' | 'zh';

export interface AnalysisResult {
  shots: CinematicShot[];
}
