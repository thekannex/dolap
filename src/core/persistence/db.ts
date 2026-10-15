import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { Project } from '../models/project';

export interface SavedProject {
  id: string;
  data: Project;
  savedAt: string;
}

export class DolapDB extends Dexie {
  projects!: Table<SavedProject>;

  constructor() {
    super('DolapDB');
    this.version(1).stores({
      projects: 'id, savedAt'
    });
  }
}

export const db = new DolapDB();

export async function saveProject(project: Project): Promise<void> {
  await db.projects.put({
    id: project.id,
    data: project,
    savedAt: new Date().toISOString()
  });
}

export async function loadProject(id: string): Promise<Project | undefined> {
  const saved = await db.projects.get(id);
  return saved?.data;
}

export async function listProjects(): Promise<SavedProject[]> {
  return db.projects.orderBy('savedAt').reverse().toArray();
}

export async function deleteProject(id: string): Promise<void> {
  await db.projects.delete(id);
}
