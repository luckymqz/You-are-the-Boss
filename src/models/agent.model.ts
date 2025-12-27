
export type AgentRole = 'CEO' | 'PM' | 'Engineer' | 'Research' | 'Legal' | 'Finance';

export interface Agent {
  role: AgentRole;
  name: string;
  avatar: string;
  color: string;
  weight: number;
  enabled: boolean;
}

export type MessageType = 'thought' | 'proposal' | 'objection' | 'vote' | 'decision' | 'artifact-draft' | 'system';

export interface Message {
  id: string;
  timestamp: Date;
  agentRole: AgentRole | 'System';
  type: MessageType;
  content: string;
  metadata?: Record<string, any>;
}

export type ArtifactType = 'PRD' | 'TechSpec' | 'CostAnalysis' | 'Compliance' | 'DemoCode';

export interface Artifact {
  id: string;
  type: ArtifactType;
  content: string;
  updatedAt: Date;
}

export type RunStatus = 'idle' | 'running' | 'succeeded' | 'failed';

export interface Run {
  id: string;
  projectId: string;
  status: RunStatus;
  messages: Message[];
  artifacts: Artifact[];
  startedAt: Date;
  finishedAt?: Date;
}

export interface Project {
  id: string;
  idea: string;
  createdAt: Date;
  runs: Run[];
}
