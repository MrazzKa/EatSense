import { randomUUID } from 'crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { CacheService } from '../src/cache/cache.service';
import { FlowDefinition, FlowResponse, FlowState } from './assistant-flow.types';
import { injuryTriageFlow } from './flows/injury-triage.flow';
import { nutritionGoalFlow } from './flows/nutrition-goal.flow';
import { hydrationCheckFlow } from './flows/hydration-check.flow';

const SESSION_NAMESPACE = 'assistant:session';
const ACTIVE_NAMESPACE = 'assistant:active';

const registry: Record<string, FlowDefinition> = {
  [injuryTriageFlow.id]: injuryTriageFlow,
  [nutritionGoalFlow.id]: nutritionGoalFlow,
  [hydrationCheckFlow.id]: hydrationCheckFlow,
};

@Injectable()
export class AssistantOrchestratorService {
  private readonly sessionTtl = parseInt(process.env.ASSISTANT_SESSION_TTL_SEC || '1800', 10);

  constructor(private readonly cache: CacheService) {}

  listFlows() {
    return Object.values(registry).map(({ id, title, description }) => ({ id, title, description }));
  }

  async startSession(flowId: string, userId: string, allowResume: boolean = true): Promise<FlowResponse> {
    const flow = this.ensureFlow(flowId);

    if (allowResume) {
      const existingSessionId = await this.getActiveSessionId(flowId, userId);
      if (existingSessionId) {
        const existingState = await this.getState(existingSessionId);
        if (existingState) {
          const existingResponse = this.buildResponse(flow, existingState);
          if (!existingResponse.complete) {
            return existingResponse;
          }
        }
      }
    }

    const sessionId = randomUUID();
    const firstStep = flow.steps[0];
    const state: FlowState = {
      sessionId,
      flowId: flow.id,
      userId,
      stepId: firstStep.id,
      collected: {},
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.saveState(state);
    await this.setActiveSession(flowId, userId, sessionId);

    return this.buildResponse(flow, state, firstStep);
  }

  async resumeSession(sessionId: string, userId?: string): Promise<FlowResponse | null> {
    const state = await this.getState(sessionId);
    if (!state) {
      return null;
    }
    // Another user's session is reported as missing, not as forbidden, so
    // session ids cannot be probed.
    if (userId !== undefined && state.userId !== userId) {
      return null;
    }
    const flow = this.ensureFlow(state.flowId);
    return this.buildResponse(flow, state);
  }

  async submitStep(sessionId: string, userId: string, input: string): Promise<FlowResponse> {
    const state = await this.getState(sessionId);
    if (!state) {
      throw new BadRequestException('Session not found or expired.');
    }
    if (state.userId !== userId) {
      throw new BadRequestException('Session does not belong to this user.');
    }

    const flow = this.ensureFlow(state.flowId);
    const currentStep = flow.steps.find((s) => s.id === state.stepId) ?? flow.steps[0];

    if (currentStep.type === 'summary') {
      await this.clearSession(state);
      const response = this.buildResponse(flow, state, currentStep);
      return response;
    }

    if (currentStep.validation) {
      const validationError = currentStep.validation(input || '');
      if (validationError) {
        return {
          flowId: state.flowId,
          sessionId: state.sessionId,
          step: currentStep,
          collected: state.collected,
          complete: false,
          suggestions: currentStep.quickReplies,
        };
      }
    }

    const field = currentStep.expectedField ?? currentStep.id;
    state.collected[field] = input;

    const nextStepId = currentStep.next ?? this.nextStepId(flow, currentStep.id);
    const nextStep = flow.steps.find((s) => s.id === nextStepId) ?? flow.steps[flow.steps.length - 1];

    state.stepId = nextStep.id;
    state.updatedAt = new Date().toISOString();

    await this.saveState(state);

    const response = this.buildResponse(flow, state, nextStep);

    if (response.complete) {
      await this.clearSession(state);
    }

    return response;
  }

  async cancelSession(sessionId: string, userId: string): Promise<void> {
    const state = await this.getState(sessionId);
    if (!state) {
      return;
    }
    if (state.userId !== userId) {
      throw new BadRequestException('Session does not belong to this user.');
    }
    await this.clearSession(state);
  }

  async submitStepForFlow(flowId: string, userId: string, input: string): Promise<FlowResponse> {
    let sessionId = await this.getActiveSessionId(flowId, userId);
    if (!sessionId) {
      const response = await this.startSession(flowId, userId, false);
      sessionId = response.sessionId;
    }
    return this.submitStep(sessionId, userId, input);
  }

  async cancelActiveFlow(flowId: string, userId: string): Promise<void> {
    const sessionId = await this.getActiveSessionId(flowId, userId);
    if (!sessionId) {
      return;
    }
    await this.cancelSession(sessionId, userId);
  }

  private buildResponse(flow: FlowDefinition, state: FlowState, overrideStep?: FlowDefinition['steps'][number]): FlowResponse {
    const step = overrideStep ?? flow.steps.find((s) => s.id === state.stepId) ?? flow.steps[0];
    const complete = step.type === 'summary';
    const summary = complete ? flow.summaryTemplate(state.collected) : undefined;

    return {
      flowId: state.flowId,
      sessionId: state.sessionId,
      step,
      collected: state.collected,
      complete,
      summary,
      suggestions: step.quickReplies,
    };
  }

  private ensureFlow(flowId: string): FlowDefinition {
    const flow = registry[flowId];
    if (!flow) {
      throw new Error(`Unknown assistant flow ${flowId}`);
    }
    return flow;
  }

  private nextStepId(flow: FlowDefinition, currentId: string) {
    const index = flow.steps.findIndex((s) => s.id === currentId);
    return index >= 0 && index < flow.steps.length - 1 ? flow.steps[index + 1].id : flow.steps[flow.steps.length - 1].id;
  }

  private async getState(sessionId: string): Promise<FlowState | null> {
    return this.cache.get<FlowState>(sessionId, SESSION_NAMESPACE);
  }

  private async saveState(state: FlowState) {
    await this.cache.set(state.sessionId, state, SESSION_NAMESPACE, this.sessionTtl);
  }

  private async clearSession(state: FlowState) {
    await this.cache.delete(state.sessionId, SESSION_NAMESPACE);
    await this.cache.delete(this.activeKey(state.flowId, state.userId), ACTIVE_NAMESPACE);
  }

  private async setActiveSession(flowId: string, userId: string, sessionId: string) {
    await this.cache.set(this.activeKey(flowId, userId), sessionId, ACTIVE_NAMESPACE, this.sessionTtl);
  }

  private async getActiveSessionId(flowId: string, userId: string): Promise<string | null> {
    return this.cache.get<string>(this.activeKey(flowId, userId), ACTIVE_NAMESPACE);
  }

  private activeKey(flowId: string, userId: string) {
    return `${flowId}:${userId}`;
  }
}
