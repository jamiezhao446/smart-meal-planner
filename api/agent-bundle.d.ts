declare module './agent-bundle.cjs' {
  import type { AgentContext } from '../src/utils/agentTools'

  export function handleAgentChat(
    history: { role: 'user' | 'assistant'; content: string }[],
    ctx: AgentContext,
  ): Promise<string>
}
