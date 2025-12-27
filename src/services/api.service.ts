
import { Injectable, signal } from '@angular/core';
import { Observable, of, throwError, timer } from 'rxjs';
import { map, delay } from 'rxjs/operators';
import { Project, Run, Artifact, Agent } from '../models/agent.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private projects = signal<Project[]>([]);
  private runs = signal<Map<string, Run>>(new Map());

  constructor() {
    // Load from localStorage for persistence
    const savedProjects = localStorage.getItem('agent-sim-projects');
    if (savedProjects) {
      const parsed = JSON.parse(savedProjects, (key, value) => {
        if (['createdAt', 'updatedAt', 'startedAt', 'finishedAt', 'timestamp'].includes(key)) {
          return new Date(value);
        }
        return value;
      });
      this.projects.set(parsed);
      const allRuns = new Map();
      parsed.forEach((p: Project) => p.runs.forEach(r => allRuns.set(r.id, r)));
      this.runs.set(allRuns);
    }
  }

  private saveState() {
    localStorage.setItem('agent-sim-projects', JSON.stringify(this.projects()));
  }

  getProjects(): Observable<Project[]> {
    return of(this.projects()).pipe(delay(300));
  }

  getProject(id: string): Observable<Project | undefined> {
    const project = this.projects().find(p => p.id === id);
    return of(project).pipe(delay(300));
  }

  createProject(idea: string): Observable<Project> {
    const newProject: Project = {
      id: `proj_${Date.now()}`,
      idea,
      createdAt: new Date(),
      runs: [],
    };
    this.projects.update(projects => [...projects, newProject]);
    this.saveState();
    return of(newProject).pipe(delay(500));
  }

  createRun(projectId: string, activeAgents: Agent[]): Observable<{ runId: string }> {
    const project = this.projects().find(p => p.id === projectId);
    if (!project) {
      return throwError(() => new Error('Project not found'));
    }

    const newRun: Run = {
      id: `run_${Date.now()}`,
      projectId,
      status: 'idle',
      messages: [],
      artifacts: [],
      startedAt: new Date(),
    };
    
    this.runs.update(runs => runs.set(newRun.id, newRun));
    
    this.projects.update(projects => {
      const pIndex = projects.findIndex(p => p.id === projectId);
      if (pIndex > -1) {
        projects[pIndex].runs.push(newRun);
      }
      return [...projects];
    });
    this.saveState();

    return of({ runId: newRun.id }).pipe(delay(200));
  }
  
  getRun(runId: string): Observable<Run | undefined> {
    const run = this.runs().get(runId);
    return of(run).pipe(delay(100));
  }
  
   updateRun(run: Run): void {
        this.runs.update(runs => runs.set(run.id, { ...run }));
        this.projects.update(projects => {
            const project = projects.find(p => p.id === run.projectId);
            if (project) {
                const runIndex = project.runs.findIndex(r => r.id === run.id);
                if (runIndex !== -1) {
                    project.runs[runIndex] = { ...run };
                }
            }
            return [...projects];
        });
        this.saveState();
    }
}
