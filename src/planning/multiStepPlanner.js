/**
 * Multi-Step Planning (Simplified for Android)
 * Linear planning with limited backtracking
 */

export class MultiStepPlanner {
  constructor(maxSteps = 6) {
    this.maxSteps = maxSteps;
  }

  /**
   * Create a simple plan
   */
  createPlan(goal, _context = {}) {
    const steps = [];
    const lowerGoal = goal.toLowerCase();

    if (lowerGoal.includes('refactor') || lowerGoal.includes('modernize')) {
      steps.push({ step: 'Analyze current code structure', status: 'pending' });
      steps.push({ step: 'Identify files to change', status: 'pending' });
      steps.push({ step: 'Generate updated code', status: 'pending' });
      steps.push({ step: 'Apply changes with approval', status: 'pending' });
    } else if (lowerGoal.includes('research') || lowerGoal.includes('investigate')) {
      steps.push({ step: 'Perform initial research query', status: 'pending' });
      steps.push({ step: 'Scrape key sources', status: 'pending' });
      steps.push({ step: 'Synthesize findings', status: 'pending' });
    } else {
      steps.push({ step: 'Understand the request', status: 'pending' });
      steps.push({ step: 'Gather necessary context', status: 'pending' });
      steps.push({ step: 'Execute main action', status: 'pending' });
    }

    return {
      goal,
      steps: steps.slice(0, this.maxSteps),
      currentStep: 0,
      status: 'planning',
      alternatives: [],
    };
  }

  /**
   * Mark step as completed and move forward
   */
  advancePlan(plan, success = true) {
    if (!plan.steps[plan.currentStep]) return plan;

    plan.steps[plan.currentStep].status = success ? 'success' : 'failed';

    if (success) {
      plan.currentStep++;
    } else {
      // Simple backtracking
      plan.currentStep = Math.max(0, plan.currentStep - 1);
    }

    if (plan.currentStep >= plan.steps.length) {
      plan.status = 'completed';
    }

    return plan;
  }
}

export const multiStepPlanner = new MultiStepPlanner();