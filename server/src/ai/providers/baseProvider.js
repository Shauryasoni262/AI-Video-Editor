/**
 * Base AI Provider Interface
 * All providers (Gemini, Ollama, LocalBrain) must implement this interface.
 */

export class BaseAiProvider {
  constructor(name) {
    this.name = name;
  }

  /**
   * Generates a structured Edit Plan given natural language prompt, video analysis, and timeline context.
   */
  async generateEditPlan({ prompt, videoAnalysis, projectContext, activeClip }) {
    throw new Error('generateEditPlan must be implemented by subclass');
  }

  /**
   * Tests connection/health of the provider.
   */
  async testConnection() {
    return { success: true, message: 'Provider ready' };
  }

  /**
   * Checks whether the provider is currently available/configured.
   */
  isAvailable() {
    return true;
  }
}
