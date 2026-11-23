import { Artifact, ProjectManifest } from '../../../api';

export interface SlideCard {
  id: string;
  badge?: string;
  stat?: string;
  title: string;
  body: string;
  citation?: string;
  icon?: string;
  bullets?: string[];
}

export interface SlideMetric {
  id: string;
  label: string;
  value: string;
  delta?: string;
}

export interface SlideImage {
  url: string;
  caption?: string;
  alt?: string;
}

export interface SlideContent {
  id?: string;
  slide_number?: number;
  title: string;
  subtitle?: string;
  badge?: string;
  postulate?: string;
  standard?: string;
  archetype?: string;
  template_id?: string;
  background?: string;
  cards?: SlideCard[];
  bullets?: string[];
  metrics?: SlideMetric[];
  image?: SlideImage;
  speaker_notes?: string;
  est_delivery?: string;
  layout?: string;
  [key: string]: any;
}

export interface PresentonSlideStudioProps {
  project: ProjectManifest | null;
  artifact: Artifact | null;
  passages?: Record<string, string>;
  isDarkMode?: boolean;
  onBack: () => void;
  onArtifactUpdated?: (art: Artifact) => void;
  currentMode?: 'pro' | 'classic';
  onSwitchMode?: (mode: 'pro' | 'classic') => void;
}
