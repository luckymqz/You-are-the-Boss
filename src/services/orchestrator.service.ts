
import { Injectable, signal } from '@angular/core';
import { Agent, Run, Message, Artifact, ArtifactType, RunStatus } from '../models/agent.model';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// In a real app, this would be a proper LLM service.
// Here we are mocking it for a self-contained example.
class MockLlmService {
    async generate(prompt: string): Promise<string> {
        await new Promise(res => setTimeout(res, 500 + Math.random() * 1000));
        if (prompt.includes("PRD")) {
            return `
# Product Requirements Document (PRD)

## 1. Introduction
- **Problem:** Small businesses struggle with providing 24/7 customer support.
- **Solution:** An AI-powered SaaS that offers an intelligent, trainable chatbot.

## 2. User Personas
- **Primary:** Sarah, a small e-commerce store owner.

## 3. Core Features
- Chatbot widget for websites.
- Knowledge base integration.
- Analytics dashboard.
            `;
        }
        if (prompt.includes("Technical Specification")) {
            return `
# Technical Specification

## 1. Architecture
- **Frontend:** Single Page Application (React/Angular).
- **Backend:** Microservices architecture using Python (FastAPI).
- **Database:** PostgreSQL for structured data, Redis for caching.
- **Deployment:** Docker containers orchestrated with Kubernetes.

## 2. API Design
- RESTful API for standard operations.
- WebSocket for real-time chat communication.
            `;
        }
        return `This is a mock response for a prompt about: ${prompt.substring(0, 100)}...`;
    }
}


@Injectable({ providedIn: 'root' })
export class OrchestratorService {
    private llm = new MockLlmService();
    private runs$ = new BehaviorSubject<Map<string, Run>>(new Map());

    start(runId: string, idea: string, agents: Agent[]): Run {
        const initialRun: Run = {
            id: runId,
            projectId: '', // will be set by caller
            status: 'running',
            messages: [],
            artifacts: [],
            startedAt: new Date(),
        };

        this.updateRunState(runId, initialRun);
        this.runSimulation(runId, idea, agents);
        return initialRun;
    }

    getRunUpdates(runId: string): Observable<Run> {
        return this.runs$.pipe(
            map(runs => runs.get(runId)),
            map(run => {
                if (!run) throw new Error('Run not found');
                return run;
            })
        );
    }
    
    private updateRunState(runId: string, run: Run | ((r: Run) => Run)) {
        const currentRuns = this.runs$.getValue();
        const existingRun = currentRuns.get(runId);
        if (!existingRun && typeof run === 'function') return;

        const newRun = typeof run === 'function' ? run(existingRun!) : run;
        
        const newRuns = new Map(currentRuns);
        newRuns.set(runId, newRun);
        this.runs$.next(newRuns);
    }
    
    private addMessage(runId: string, message: Omit<Message, 'id' | 'timestamp'>) {
         this.updateRunState(runId, (run) => ({
            ...run,
            messages: [...run.messages, { ...message, id: `msg_${Date.now()}`, timestamp: new Date() }]
        }));
    }

    private addOrUpdateArtifact(runId: string, artifact: Omit<Artifact, 'id' | 'updatedAt'>) {
        this.updateRunState(runId, (run) => {
            const existingArtifactIndex = run.artifacts.findIndex(a => a.type === artifact.type);
            const newArtifacts = [...run.artifacts];
            if (existingArtifactIndex > -1) {
                newArtifacts[existingArtifactIndex] = { ...newArtifacts[existingArtifactIndex], content: artifact.content, updatedAt: new Date() };
            } else {
                newArtifacts.push({ ...artifact, id: `art_${Date.now()}`, updatedAt: new Date() });
            }
            return { ...run, artifacts: newArtifacts };
        });
    }


    private async runSimulation(runId: string, idea: string, agents: Agent[]) {
        this.addMessage(runId, { agentRole: 'System', type: 'system', content: `Simulation started for idea: "${idea}" with agents: ${agents.map(a => a.role).join(', ')}.` });
        
        const agentMap = new Map(agents.map(a => [a.role, a]));

        // --- STAGE 1: PRD ---
        if (agentMap.has('PM')) {
            await this.runStage(runId, 'PM', `Generate a Product Requirements Document (PRD) for the idea: "${idea}"`, 'PRD');
        }

        // --- STAGE 2: Tech Spec ---
        if (agentMap.has('Engineer')) {
            const prd = this.runs$.getValue().get(runId)?.artifacts.find(a => a.type === 'PRD')?.content || 'No PRD available.';
            await this.runStage(runId, 'Engineer', `Based on the following PRD, create a Technical Specification. PRD: ${prd}`, 'TechSpec');
        }

        // --- STAGE 3: Cost Analysis ---
        if (agentMap.has('Finance')) {
             const techSpec = this.runs$.getValue().get(runId)?.artifacts.find(a => a.type === 'TechSpec')?.content || 'No Tech Spec available.';
             await this.runStage(runId, 'Finance', `Based on the following Tech Spec, create a Cost Analysis and Pricing model. Tech Spec: ${techSpec}`, 'CostAnalysis');
        }

        // --- STAGE 4: Compliance ---
        if (agentMap.has('Legal')) {
             await this.runStage(runId, 'Legal', `For the idea "${idea}", generate a basic Compliance checklist.`, 'Compliance');
        }
        
        // --- STAGE 5: Demo Code ---
        if (agentMap.has('Engineer')) {
             await this.runStage(runId, 'Engineer', `Generate a simple demo code snippet (e.g., a Python FastAPI endpoint) for the idea: "${idea}"`, 'DemoCode');
        }

        // --- FINALIZATION ---
        this.addMessage(runId, { agentRole: 'System', type: 'system', content: 'Simulation finished.' });
        this.updateRunState(runId, (run) => ({
             ...run, 
             status: 'succeeded' as RunStatus,
             finishedAt: new Date()
        }));
    }

    private async runStage(runId: string, agentRole: Agent['role'], prompt: string, artifactType: ArtifactType) {
        this.addMessage(runId, { agentRole, type: 'thought', content: `Thinking about the ${artifactType}...` });
        const result = await this.llm.generate(prompt);
        this.addMessage(runId, { agentRole, type: 'artifact-draft', content: `Generated a draft for the ${artifactType}.` });
        this.addOrUpdateArtifact(runId, { type: artifactType, content: result });
    }
}
