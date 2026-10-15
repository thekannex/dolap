import type { Project } from '../models/project';
import { normalizeProject } from '../project/project-factory';

export const PROJECT_FILE_VERSION = '2.0';

export function exportProjectJSON(project: Project): string {
  return JSON.stringify({
    app: 'dolap',
    version: PROJECT_FILE_VERSION,
    exportedAt: new Date().toISOString(),
    project,
  }, null, 2);
}

export function importProjectJSON(json: string): { project: Project; version: string } {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('Dosya okunamadı: geçerli bir JSON değil.');
  }
  const d = data as { project?: Partial<Project> & { id?: string }; version?: string };
  if (!d || typeof d !== 'object' || !d.project || typeof d.project.id !== 'string') {
    throw new Error('Geçersiz proje dosyası.');
  }
  return { project: normalizeProject(d.project as Partial<Project> & { id: string }), version: d.version || '1.0' };
}
