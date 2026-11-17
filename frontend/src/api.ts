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

export interface ProjectManifest {
  project_id: string;
  name: string;
  source_filename?: string;
  created_at: string;
  updated_at: string;
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

