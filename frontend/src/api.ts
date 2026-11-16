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

export interface ProjectManifest {
  project_id: string;
  name: string;
  source_filename?: string;
  created_at: string;
  updated_at: string;
  schema_version: string;
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
