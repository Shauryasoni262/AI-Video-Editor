import fs from 'fs';
import path from 'path';

export class ProjectManager {
  constructor(projectsDir) {
    this.projectsDir = projectsDir;
    if (!fs.existsSync(projectsDir)) {
      fs.mkdirSync(projectsDir, { recursive: true });
    }
  }

  saveProject(project) {
    const id = project.id || `proj_${Date.now()}`;
    const filename = `${id}.json`;
    const fullPath = path.join(this.projectsDir, filename);

    const dataToSave = {
      ...project,
      id,
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(fullPath, JSON.stringify(dataToSave, null, 2), 'utf-8');
    return dataToSave;
  }

  loadProject(id) {
    const filename = id.endsWith('.json') ? id : `${id}.json`;
    const fullPath = path.join(this.projectsDir, filename);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`Project with ID ${id} not found.`);
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    return JSON.parse(content);
  }

  listProjects() {
    const files = fs.readdirSync(this.projectsDir).filter(f => f.endsWith('.json'));
    const list = [];

    for (const f of files) {
      try {
        const fullPath = path.join(this.projectsDir, f);
        const stat = fs.statSync(fullPath);
        const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
        list.push({
          id: data.id || path.parse(f).name,
          name: data.name || 'Untitled Project',
          clipsCount: data.videoClips?.length || 0,
          updatedAt: data.updatedAt || stat.mtime.toISOString(),
          duration: data.totalDuration || 0
        });
      } catch (e) {
        console.warn('Could not read project file:', f, e);
      }
    }

    return list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }
}
