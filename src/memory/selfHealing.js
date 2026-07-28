/**
 * Self-Healing & Error Recovery System
 * Android-optimized with battery awareness
 */

export class SelfHealing {
  constructor(maxRetries = 3) {
    this.maxRetries = maxRetries;
    this.successfulFixes = [];
  }

  /**
   * Diagnose an error and suggest recovery
   */
  diagnose(error, context = {}) {
    const message = error?.message || String(error);
    let strategy = 'retry';

    if (message.includes('not found') || message.includes('ENOENT')) {
      strategy = 'create_missing';
    } else if (message.includes('permission') || message.includes('denied')) {
      strategy = 'user_approval_needed';
    } else if (message.includes('syntax') || message.includes('parse')) {
      strategy = 'fix_syntax';
    }

    return {
      error: message,
      strategy,
      suggestedAction: this.getSuggestedAction(strategy, context),
      retryCount: context.retryCount || 0,
    };
  }

  getSuggestedAction(strategy, context) {
    switch (strategy) {
      case 'create_missing':
        return `Create the missing file: ${context.path || 'unknown'}`;
      case 'fix_syntax':
        return 'Review and fix syntax errors in the generated code';
      default:
        return 'Retry the action with adjusted parameters';
    }
  }

  /**
   * Record a successful fix for future learning
   */
  recordSuccessfulFix(errorType, fix) {
    this.successfulFixes.push({
      errorType,
      fix,
      timestamp: Date.now(),
    });

    // Keep only last 20
    if (this.successfulFixes.length > 20) {
      this.successfulFixes.shift();
    }
  }

  shouldAttemptRecovery(retryCount) {
    return retryCount < this.maxRetries;
  }
}

export const selfHealing = new SelfHealing();