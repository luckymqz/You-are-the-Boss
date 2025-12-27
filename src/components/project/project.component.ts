import { Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Project, Agent, AgentRole, Message, Artifact, ArtifactType, Run, RunStatus } from '../../models/agent.model';
import { OrchestratorService } from '../../services/orchestrator.service';
import { Subscription } from 'rxjs';

const AGENT_DATA: Record<AgentRole, Omit<Agent, 'enabled'>> = {
    'CEO': { role: 'CEO', name: 'Casey E. O.', avatar: '💼', color: 'text-purple-400', weight: 2 },
    'PM': { role: 'PM', name: 'Pat M.', avatar: '📋', color: 'text-blue-400', weight: 1 },
    'Engineer': { role: 'Engineer', name: 'Gene N. Eer', avatar: '💻', color: 'text-green-400', weight: 1 },
    'Research': { role: 'Research', name: 'Reese Earch', avatar: '🔬', color: 'text-yellow-400', weight: 1 },
    'Legal': { role: 'Legal', name: 'Lee Gall', avatar: '⚖️', color: 'text-red-400', weight: 1 },
    'Finance': { role: 'Finance', name: 'Finn Ance', avatar: '💰', color: 'text-teal-400', weight: 1 },
};

@Component({
  selector: 'app-project',
  templateUrl: './project.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink]
})
export class ProjectComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private apiService = inject(ApiService);
  private orchestrator = inject(OrchestratorService);
  private runSubscription: Subscription | null = null;

  project = signal<Project | null>(null);
  currentRun = signal<Run | null>(null);
  
  agents = signal<Agent[]>(Object.values(AGENT_DATA).map(a => ({...a, enabled: true})));
  
  messages = signal<Message[]>([]);
  artifacts = signal<Map<ArtifactType, Artifact>>(new Map());
  
  isLoading = signal(true);
  error = signal<string | null>(null);
  
  activeTab = signal<ArtifactType>('PRD');

  canRun = computed(() => {
    const runStatus = this.currentRun()?.status;
    return !runStatus || runStatus === 'succeeded' || runStatus === 'failed';
  });

  constructor() {
    effect(() => {
      const run = this.currentRun();
      if (run) {
        this.messages.set(run.messages);
        const artifactMap = new Map<ArtifactType, Artifact>();
        run.artifacts.forEach(a => artifactMap.set(a.type, a));
        this.artifacts.set(artifactMap);
      }
    });
  }

  ngOnInit() {
    const projectId = this.route.snapshot.paramMap.get('id');
    if (!projectId) {
      this.router.navigate(['/']);
      return;
    }

    this.apiService.getProject(projectId).subscribe({
      next: (project) => {
        if (project) {
          this.project.set(project);
          const latestRun = project.runs.length > 0 ? project.runs[project.runs.length - 1] : null;
          if (latestRun) {
            this.currentRun.set(latestRun);
          }
        } else {
          this.error.set('Project not found.');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load project.');
        this.isLoading.set(false);
      }
    });
  }

  ngOnDestroy() {
    if (this.runSubscription) {
      this.runSubscription.unsubscribe();
    }
  }

  toggleAgent(role: AgentRole) {
    this.agents.update(agents => 
      agents.map(a => a.role === role ? { ...a, enabled: !a.enabled } : a)
    );
  }

  startRun() {
    const proj = this.project();
    if (!proj || !this.canRun()) return;

    const activeAgents = this.agents().filter(a => a.enabled);
    if (activeAgents.length === 0) {
      // show error
      return;
    }

    this.apiService.createRun(proj.id, activeAgents).subscribe(({ runId }) => {
      this.messages.set([]);
      this.artifacts.set(new Map());
      const run = this.orchestrator.start(runId, proj.idea, activeAgents);
      this.currentRun.set(run);
      this.runSubscription = this.orchestrator.getRunUpdates(runId).subscribe(updatedRun => {
        this.currentRun.set(updatedRun);
        this.apiService.updateRun(updatedRun);
      });
    });
  }

  // FIX: Adjusted the return type to correctly handle the 'System' role, which is not part of AgentRole.
  // The new type more accurately reflects the object returned for any agent, including the special 'System' case.
  getAgent(role: AgentRole | 'System'): { role: AgentRole | 'System'; name: string; avatar: string; color: string; } {
    if (role === 'System') {
      return { role: 'System', name: 'System', avatar: '⚙️', color: 'text-gray-500' };
    }
    return this.agents().find(a => a.role === role) || { role, name: role, avatar: '👤', color: 'text-gray-200'};
  }
  
  copyContent(content: string) {
    navigator.clipboard.writeText(content);
  }

  downloadContent(filename: string, content: string) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }
  
  getArtifact(type: ArtifactType): Artifact | undefined {
    return this.artifacts().get(type);
  }

  get artifactTypes(): ArtifactType[] {
    return ['PRD', 'TechSpec', 'CostAnalysis', 'Compliance', 'DemoCode'];
  }
}