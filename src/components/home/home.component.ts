
import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Project } from '../../models/agent.model';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink]
})
export class HomeComponent implements OnInit {
  private apiService = inject(ApiService);
  private router = inject(Router);

  idea = signal('');
  isLoading = signal(false);
  projects = signal<Project[]>([]);
  projectsLoading = signal(true);

  ngOnInit() {
    this.loadProjects();
  }

  loadProjects() {
    this.projectsLoading.set(true);
    this.apiService.getProjects().subscribe({
      next: (projects) => {
        this.projects.set(projects.sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()));
        this.projectsLoading.set(false);
      },
      error: () => {
        this.projectsLoading.set(false);
      }
    });
  }

  onIdeaInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.idea.set(input.value);
  }

  startSimulation() {
    if (!this.idea().trim() || this.isLoading()) {
      return;
    }
    this.isLoading.set(true);
    this.apiService.createProject(this.idea()).subscribe({
      next: (project) => {
        this.isLoading.set(false);
        this.router.navigate(['/projects', project.id]);
      },
      error: () => {
        this.isLoading.set(false);
        // Handle error state in UI
      }
    });
  }
}
