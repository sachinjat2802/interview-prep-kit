import { describe, it, expect } from 'vitest';
import { PipelineRunner, BasePipelineStep, PipelineContext } from '../server/src/core/pipeline';
import { eventBus, PipelineEvent } from '../server/src/core/eventBus';

class MockStepOne extends BasePipelineStep {
  readonly name = 'Mock Step One';
  readonly order = 1;
  protected async run(context: PipelineContext): Promise<void> {
    context.data.stepOneExecuted = true;
  }
}

class MockStepTwo extends BasePipelineStep {
  readonly name = 'Mock Step Two';
  readonly order = 2;
  protected async run(context: PipelineContext): Promise<void> {
    context.data.stepTwoExecuted = true;
  }
}

class FailingNonCriticalStep extends BasePipelineStep {
  readonly name = 'Failing Non-Critical';
  readonly order = 3;
  readonly critical = false;
  protected async run(): Promise<void> {
    throw new Error('Minor step error');
  }
}

describe('Pipeline Engine (Chain of Responsibility)', () => {
  it('should execute steps in sorted order of order property', async () => {
    const runner = new PipelineRunner();
    runner.addStep(new MockStepTwo());
    runner.addStep(new MockStepOne());

    const context: PipelineContext = {
      runId: 'test-run-1',
      errors: [],
      data: {},
    };

    const eventsFired: string[] = [];
    const listener = (payload: { kitId: string; stepName: string }) => {
      if (payload.kitId === 'test-run-1') {
        eventsFired.push(payload.stepName);
      }
    };
    eventBus.on(PipelineEvent.STEP_START, listener);

    await runner.execute(context);
    eventBus.off(PipelineEvent.STEP_START, listener);

    expect(context.data.stepOneExecuted).toBe(true);
    expect(context.data.stepTwoExecuted).toBe(true);
    expect(eventsFired).toEqual(['Mock Step One', 'Mock Step Two']);
  });

  it('should capture errors for non-critical steps without halting execution', async () => {
    const runner = new PipelineRunner();
    runner.addStep(new MockStepOne());
    runner.addStep(new FailingNonCriticalStep());

    const context: PipelineContext = {
      runId: 'test-run-2',
      errors: [],
      data: {},
    };

    await runner.execute(context);
    expect(context.data.stepOneExecuted).toBe(true);
    expect(context.errors).toHaveLength(1);
    expect(context.errors[0]).toContain('Failing Non-Critical: Minor step error');
  });
});
