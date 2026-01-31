import * as weave from 'weave'

let initialized = false

/**
 * Initialize Weave for LLM observability
 * Call this once at app startup or before first trace
 */
export async function initWeave() {
  if (initialized) return

  const projectName = process.env.WANDB_PROJECT || 'customer-service-voice-agent'

  await weave.init(projectName)
  initialized = true
  console.log(`Weave initialized for project: ${projectName}`)
}

/**
 * Ensure Weave is initialized before operations
 */
export async function ensureWeaveInitialized() {
  if (!initialized) {
    await initWeave()
  }
}

export { weave }
