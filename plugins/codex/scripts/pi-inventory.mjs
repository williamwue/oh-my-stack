import { createPiRpcConnection } from './pi-delegation.mjs';

/** Native RPC set_model in Pi 1.1.0 uses setModel(model) without persist:true. */
export async function collectPiInventory({ binary, cwd = process.cwd(), signal, timeoutMs = 20000,
  maxModels = 256, env, connectionFactory = createPiRpcConnection } = {}) {
  const connection = connectionFactory({ binary, cwd, signal, timeoutMs, env, args: ['--no-tools'] });
  try {
    const available = await connection.request('get_available_models');
    const models = available?.models;
    if (!Array.isArray(models) || !models.length || models.length > maxModels) throw new Error('Pi inventory must advertise a bounded nonempty model list');
    const normalized = [];
    const ids = new Set();
    for (const model of models) {
      if (model.api === 'pi-virtual') throw new Error('Pi inventory includes an unsupported virtual route');
      if (typeof model.provider !== 'string' || !model.provider || typeof model.id !== 'string' || !model.id) throw new Error('Pi advertised invalid model identity');
      const id = `${model.provider}/${model.id}`;
      if (ids.has(id)) throw new Error(`Pi advertised duplicate model ${id}`);
      ids.add(id);
      await connection.request('set_model', { provider: model.provider, modelId: model.id });
      const state = await connection.request('get_state');
      if (state?.model?.provider !== model.provider || state?.model?.id !== model.id) throw new Error(`Pi did not select advertised model ${id}`);
      const result = await connection.request('get_available_thinking_levels');
      if (!Array.isArray(result?.levels) || !result.levels.length || result.levels.some(level => !['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'].includes(level))) throw new Error(`Pi did not advertise valid thinking levels for ${id}`);
      normalized.push({ id, reasoningEfforts: result.levels.map(level => level === 'off' ? 'none' : level) });
    }
    return { source: 'native Pi CLI/RPC get_available_models + get_available_thinking_levels', models: normalized };
  } finally {
    const exit = await connection.stop();
    if (exit.failure || exit.code !== 0) throw new Error(exit.failure ?? `Pi inventory exit ${exit.code}`);
  }
}
