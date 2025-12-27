
import { Routes } from '@angular/router';

export const appRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent),
    pathMatch: 'full',
  },
  {
    path: 'projects/:id',
    loadComponent: () => import('./components/project/project.component').then(m => m.ProjectComponent),
  },
  {
    path: '**',
    redirectTo: ''
  }
];
