export interface DoctorComponent {
  status: 'ok' | 'warning' | 'missing' | 'info';
  message: string;
}

export interface DoctorReport {
  status: 'ok' | 'degraded';
  app_name: string;
  app_version: string;
  components: Record<string, DoctorComponent>;
}

export interface GroundingRef {
  passage_id: string;
  quote: string;
  verified: boolean;
}

export interface Artifact {
  id: string;
  tool_name: string;
  project_id: string;
  status: 'draft' | 'generating' | 'needs_review' | 'approved' | 'reprompted' | 'failed';
  files: string[];
  source_data: Record<string, any>;
  grounding_refs: GroundingRef[];
  cost_estimate_usd: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface ConceptItem {
  concept: string;
  explanation: string;
  grounding?: GroundingRef;
}

export interface VocabularyItem {
  term: string;
  definition: string;
  grounding?: GroundingRef;
}

export interface ChapterOutline {
  title: string;
  subject: string;
  grade_level: string;
  summary: string;
  learning_objectives: string[];
  concepts: ConceptItem[];
  vocabulary: VocabularyItem[];
}

export interface ProjectManifest {
  project_id: string;
  name: string;
  source_filename?: string;
  created_at: string;
  updated_at: string;
  outline?: ChapterOutline;
  artifacts?: Record<string, Artifact>;
}

export interface ToolMetadata {
  name: string;
  description: string;
  brief_schema?: Record<string, any>;
}

export async function fetchDoctor(): Promise<DoctorReport> {
  const res = await fetch('/api/doctor');
  if (!res.ok) throw new Error('Failed to fetch doctor diagnostics');
  return res.json();
}

export async function fetchProjects(): Promise<ProjectManifest[]> {
  const res = await fetch('/api/projects');
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}

export async function fetchProject(projectId: string): Promise<ProjectManifest> {
  const res = await fetch(`/api/projects/${projectId}`);
  if (!res.ok) throw new Error('Failed to fetch project');
  return res.json();
}

export async function createProject(name: string): Promise<ProjectManifest> {
  const formData = new FormData();
  formData.append('name', name);
  const res = await fetch('/api/projects', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to create project');
  return res.json();
}

export async function uploadChapterFile(projectId: string, file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`/api/projects/${projectId}/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload file');
  return res.json();
}

export async function fetchPassages(projectId: string): Promise<Record<string, string>> {
  const res = await fetch(`/api/projects/${projectId}/passages`);
  if (!res.ok) return {};
  return res.json();
}

export async function runTool(toolName: string, projectId: string, brief: Record<string, any>): Promise<Artifact> {
  const res = await fetch(`/api/tools/${toolName}/run?project_id=${projectId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(brief),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Tool execution failed' }));
    throw new Error(err.detail || 'Tool execution failed');
  }
  return res.json();
}

export async function fetchTools(): Promise<ToolMetadata[]> {
  const res = await fetch('/api/tools');
  if (!res.ok) return [];
  return res.json();
}

export async function updateProjectSlides(
  projectId: string,
  payload: { artifact_id?: string; theme?: string; slides: any[] }
): Promise<Artifact> {
  const res = await fetch(`/api/projects/${projectId}/slides`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update slides' }));
    throw new Error(err.detail || 'Failed to update slides');
  }
  return res.json();
}

export interface SuggestEditsResponse {
  original_slide: Record<string, any>;
  suggested_slide: Record<string, any>;
  explanation: string;
}

export async function suggestSlideEdits(
  projectId: string,
  slide: Record<string, any>,
  instruction: string,
  customPrompt?: string
): Promise<SuggestEditsResponse> {
  const res = await fetch(`/api/projects/${projectId}/slides/suggest-edits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slide,
      instruction,
      custom_prompt: customPrompt,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to generate slide edit suggestion' }));
    throw new Error(err.detail || 'Failed to generate slide edit suggestion');
  }
  return res.json();
}

export interface SlideOutlineItem {
  id: string;
  slide_number: number;
  title: string;
  content: string;
  bullets: string[];
}

export interface GenerateSlideOutlineResponse {
  project_id: string;
  prompt: string;
  outlines: SlideOutlineItem[];
}

export async function generateSlideOutline(
  projectId: string,
  prompt?: string,
  numSlides: number = 6,
  language: string = 'en'
): Promise<GenerateSlideOutlineResponse> {
  const res = await fetch(`/api/projects/${projectId}/slides/generate-outline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, num_slides: numSlides, language }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to generate slide outline' }));
    throw new Error(err.detail || 'Failed to generate slide outline');
  }
  return res.json();
}

export async function compileSlideFromOutline(
  projectId: string,
  outlines: SlideOutlineItem[],
  theme: string = 'solar',
  artifactId?: string
): Promise<Artifact> {
  const res = await fetch(`/api/projects/${projectId}/slides/compile-from-outline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ outlines, theme, artifact_id: artifactId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to compile slides from outline' }));
    throw new Error(err.detail || 'Failed to compile slides from outline');
  }
  return res.json();
}

export interface SlideTemplateItem {
  id: string;
  name: string;
  description: string;
  layout_count?: number;
  thumbnail: string;
  themeKey: string;
  tags?: string[];
}

export async function fetchSlideTemplates(): Promise<SlideTemplateItem[]> {
  try {
    const res = await fetch('/api/projects/slides/templates');
    if (res.ok) {
      const data = await res.json();
      return data.templates || [];
    }
  } catch (err) {
    console.warn('Failed to fetch slide templates from API, using default list:', err);
  }
  return [];
}

export interface GenerateSlideScriptResponse {
  slide_number: number;
  title: string;
  speaker_notes: string;
  discussion_prompt?: string;
  est_delivery: string;
}

export async function generateSlideScript(
  projectId: string,
  slideData: {
    slide_number?: number;
    title: string;
    subtitle?: string;
    archetype?: string;
    cards?: any[];
    bullets?: string[];
    grade_level?: string;
    subject?: string;
  }
): Promise<GenerateSlideScriptResponse> {
  const res = await fetch(`/api/projects/${projectId}/slides/generate-script`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(slideData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to generate slide script' }));
    throw new Error(err.detail || 'Failed to generate slide script');
  }
  return res.json();
}







