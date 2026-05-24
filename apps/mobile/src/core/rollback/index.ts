export interface RollbackAction {
  id: string;
  action: string;
  payload: any;
  rollback: () => Promise<void>;
  timestamp: Date;
}

export class RollbackManager {
  private actions: RollbackAction[] = [];
  private maxActions: number;

  constructor(maxActions: number = 100) {
    this.maxActions = maxActions;
  }

  addAction(action: string, payload: any, rollback: () => Promise<void>): string {
    const id = Math.random().toString(36).substr(2, 9);
    const rollbackAction: RollbackAction = {
      id,
      action,
      payload,
      rollback,
      timestamp: new Date(),
    };

    this.actions.push(rollbackAction);
    
    if (this.actions.length > this.maxActions) {
      this.actions.shift();
    }
    
    return id;
  }

  async rollbackTo(actionId: string): Promise<void> {
    const actionIndex = this.actions.findIndex(action => action.id === actionId);
    
    if (actionIndex === -1) {
      throw new Error(`Action ${actionId} not found`);
    }
    
    const actionsToRollback = this.actions.slice(actionIndex);
    this.actions = this.actions.slice(0, actionIndex);
    
    for (const action of actionsToRollback.reverse()) {
      try {
        await action.rollback();
      } catch (error) {
        console.error(`Failed to rollback action ${action.id}:`, error);
      }
    }
  }

  async rollbackLast(): Promise<void> {
    if (this.actions.length === 0) {
      throw new Error('No actions to rollback');
    }
    
    const lastAction = this.actions.pop()!;
    
    try {
      await lastAction.rollback();
    } catch (error) {
      console.error(`Failed to rollback action ${lastAction.id}:`, error);
      throw error;
    }
  }

  async rollbackAll(): Promise<void> {
    const actionsToRollback = [...this.actions].reverse();
    this.actions = [];
    
    for (const action of actionsToRollback) {
      try {
        await action.rollback();
      } catch (error) {
        console.error(`Failed to rollback action ${action.id}:`, error);
      }
    }
  }

  getActions(): RollbackAction[] {
    return [...this.actions];
  }

  getAction(id: string): RollbackAction | undefined {
    return this.actions.find(action => action.id === id);
  }

  clear(): void {
    this.actions = [];
  }

  setMaxActions(maxActions: number): void {
    this.maxActions = maxActions;
  }
}

export const rollbackManager = new RollbackManager();
