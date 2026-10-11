import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { Type } from 'typebox';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPiDelegationManager } from '../scripts/pi-delegation.mjs';

export default function (pi: ExtensionAPI) {
  const manager = createPiDelegationManager({ packageRoot: resolve(dirname(fileURLToPath(import.meta.url)), '..') });
  pi.on('session_shutdown', async () => { await manager.shutdown(); });
  pi.registerTool({
    name: 'oms_delegate',
    label: 'Oh My Stack delegation',
    description: 'Start one configured Pi route member, collect its bounded result, or cancel it. Writing roles require an explicit independent checkout. No automatic panel or synthesis.',
    parameters: Type.Object({
      action: Type.Union([Type.Literal('start'), Type.Literal('collect'), Type.Literal('cancel')]),
      route: Type.Optional(Type.String()), member: Type.Optional(Type.Integer({ minimum: 1 })),
      task: Type.Optional(Type.String()), cwd: Type.Optional(Type.String()),
      context: Type.Optional(Type.String()), independentCheckout: Type.Optional(Type.Boolean()),
      id: Type.Optional(Type.String()), wait: Type.Optional(Type.Boolean()),
    }),
    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const result = await manager.execute(params, {
        signal, cwd: ctx.cwd, parentModel: ctx.model, parentThinking: pi.getThinkingLevel(),
        onUpdate: update => onUpdate?.({ content: [{ type: 'text', text: JSON.stringify(update) }], details: update }),
      });
      return { content: [{ type: 'text', text: JSON.stringify(result) }], details: result };
    },
  });
}
