#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, realpathSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { resolveActiveResolution, resolveTaskSelection } from './model-resolution.mjs';

const defaultRoot = fileURLToPath(new URL('../', import.meta.url));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const efforts = new Set(['low', 'medium', 'high', 'xhigh', 'max']);
const identity = value => typeof value === 'string' && value.length > 0 && value.length <= 256;
const scopePath = path => existsSync(path) ? realpathSync(path) : resolve(path);
function supportedVersion(version) {
  const parts = /^(\d+)\.(\d+)\.(\d+)$/.exec(version ?? '');
  assert(parts, 'An exact observed Claude Code version is required');
  const [major, minor, patch] = parts.slice(1).map(Number);
  return major > 2 || major === 2 && (minor > 1 || minor === 1 && patch >= 292);
}

function checkedCapabilities(capabilities) {
  assert(capabilities?.runtime === 'claude-code' && identity(capabilities.source)
    && Array.isArray(capabilities.models) && Array.isArray(capabilities.agentTypes), 'Captured native Agent capabilities are required');
  assert(Number.isFinite(Date.parse(capabilities.observedAt)), 'Captured capabilities need an observation timestamp');
  return supportedVersion(capabilities.version);
}

/** Prepare native Agent fields only. Never dispatch, probe or rewrite configuration. */
export async function prepareClaudeDelegation({ bundleRoot = defaultRoot, cwd = process.cwd(), userRoot,
  roleName, routeName, entry = 1, task, capabilities, jobContext, env = process.env,
  rejectedAdjustment, rejectedPreparedRequest } = {}) {
  assert(Boolean(roleName) !== Boolean(routeName), 'Select exactly one role or route');
  assert(typeof task === 'string' && task.trim() && task.length <= 65536, 'A bounded task is required');
  assert(Number.isInteger(entry) && entry > 0, 'Entry must be a positive integer');
  const versionSupported = checkedCapabilities(capabilities);
  const contracts = JSON.parse(await readFile(join(bundleRoot, 'config/role-contracts.json'), 'utf8'));
  assert(contracts.schemaVersion === 1 && contracts.target === 'claude-code', 'Native Claude role contracts are required');
  const active = await resolveActiveResolution({ runtime: 'claude-code', cwd, userRoot,
    claudeConfigDir: env.CLAUDE_CONFIG_DIR ?? null });
  const manifest = active?.manifest;
  const route = routeName ? manifest?.routes?.[routeName] : null;
  if (routeName) assert(route && (route.kind === 'panel' || entry === 1), 'Configured route/member is required');
  else assert(entry === 1, 'Canonical roles have only one entry');
  const role = routeName ? contracts.routeRoles?.[routeName] : roleName;
  const contract = contracts.roles?.[role];
  assert(contract?.instructions && contract.description, 'Unknown packaged role');
  const saved = routeName ? route.entries?.[entry - 1] : manifest?.roles?.[roleName] ?? { inheritParent: true };
  assert(saved, 'Configured route entry is absent');
  const buildRequest = (basis, rejection, current = basis) => {
    const inventory = { schemaVersion: 1, runtime: 'claude-code', source: basis.source,
      observedAt: basis.observedAt, models: basis.models };
    const choice = resolveTaskSelection({ selection: saved, inventory, runtime: 'claude-code', jobContext, rejectedAdjustment: rejection });
    const selected = choice.selection;
    const agentType = selected.agent ?? `oh-my-stack:${role}`;
    assert(identity(agentType) && current.agentTypes.includes(agentType), 'Selected subagent_type is not advertised');
    const args = { subagent_type: agentType, description: contract.description.slice(0, 80),
      prompt: `${contract.instructions.trim()}\n\nInstalled package: ${resolve(bundleRoot)}\nRuntime binding: ${join(resolve(bundleRoot), 'docs/runtime-binding.md')}\nAssigned task:\n${task.trim()}` };
    if (!selected.inheritParent) {
      assert(env.CLAUDE_CODE_SUBAGENT_MODEL_FORCE !== '1', 'Forced subagent model prevents the configured per-call model selection');
      const models = current.models.filter(model => model?.id === selected.model);
      assert(models.length === 1 && identity(models[0].selector), 'Saved model needs one observed Agent model selector');
      assert(Array.isArray(models[0].reasoningEfforts) && models[0].reasoningEfforts.includes(selected.reasoning)
        && (selected.reasoning === 'none' || efforts.has(selected.reasoning)), 'Selected effort is not advertised for this model');
      args.model = models[0].selector;
      if (selected.reasoning !== 'none') {
        assert(current === capabilities ? versionSupported : supportedVersion(current.version), 'Per-invocation Agent.effort requires Claude Code 2.1.292 or later');
        args.effort = selected.reasoning;
      }
    }
    const override = env.CLAUDE_CODE_EFFORT_LEVEL || null;
    if (override) {
      assert(efforts.has(override), 'Unsupported CLAUDE_CODE_EFFORT_LEVEL override');
      if (!selected.inheritParent) assert(current.models.find(model => model.id === selected.model).reasoningEfforts.includes(override),
        'Environment effort override is not advertised for the selected model');
    }
    const result = { schemaVersion: 1, tool: 'Agent', arguments: args, audit: {
      role, route: routeName ?? null, entry, version: current.version, capabilitySource: current.source,
      requestScope: { bundleRoot: scopePath(bundleRoot), cwd: scopePath(cwd), userRoot: scopePath(userRoot ?? homedir()),
        claudeConfigDir: env.CLAUDE_CONFIG_DIR ? scopePath(env.CLAUDE_CONFIG_DIR) : null,
        resolutionPath: active?.path ? scopePath(active.path) : null, resolutionScope: active?.scope ?? null },
      contractSha256: hash(contract), resolutionSha256: manifest ? hash(manifest) : null,
      taskSelection: { ...choice.audit, capabilities: structuredClone(basis) },
      requestedModel: selected.model ?? null, requestedEffort: args.effort ?? null,
      environmentEffort: override, expectedEffectiveEffort: override ?? args.effort ?? null,
      observedEffectiveEffort: null, executionVerified: false,
      limits: ['Preparation is not dispatch or backend identity evidence.', 'Speed is not an emitted native field.'],
    } };
    return { ...result, sha256: hash(result) };
  };
  if (rejectedPreparedRequest === undefined) {
    assert(rejectedAdjustment === undefined, 'A rejected adjustment requires rejectedPreparedRequest');
    return buildRequest(capabilities);
  }
  const { sha256, ...receipt } = rejectedPreparedRequest ?? {};
  assert(receipt.tool === 'Agent' && sha256 === hash(receipt)
    && receipt.audit?.taskSelection?.capabilities, 'Invalid rejected prepared request fingerprint or capability receipt');
  const captured = receipt.audit.taskSelection.capabilities;
  let expected;
  try {
    checkedCapabilities(captured);
    expected = buildRequest(captured);
  } catch (error) {
    throw new Error(`Invalid rejected prepared request: ${error.message}`);
  }
  assert(isDeepStrictEqual(rejectedPreparedRequest, expected),
    'The rejected prepared request differs from this task, role, configuration, job, or request scope');
  assert(rejectedAdjustment !== undefined, 'A rejected prepared request requires rejectedAdjustment with the host rejection reason');
  const restored = buildRequest(captured, rejectedAdjustment, capabilities);
  restored.audit.taskSelection = { ...restored.audit.taskSelection, currentCapabilities: structuredClone(capabilities),
    rejectedPreparedRequestSha256: sha256, hostRejectionVerified: false };
  delete restored.sha256;
  return { ...restored, sha256: hash(restored) };
}

/** Correlate an authorized hook observation with the actual dispatch and child ID. */
export function verifyClaudeEffort({ prepared, dispatch, agentId, observation } = {}) {
  const { sha256, ...request } = prepared ?? {};
  assert(sha256 === hash(request) && request.tool === 'Agent', 'Invalid prepared request fingerprint');
  assert(isDeepStrictEqual(dispatch, request.arguments), 'Actual dispatch differs from the prepared request');
  if (!identity(agentId) || observation?.agentId !== agentId || observation.agentType !== dispatch.subagent_type
    || observation.hookEvent !== 'PreToolUse' || !efforts.has(observation.effort)) {
    return { status: 'inconclusive', observedEffort: null, modelVerified: false, reason: 'Missing correlated native child effort evidence' };
  }
  const expected = request.audit.expectedEffectiveEffort;
  return { status: expected === null ? 'inconclusive' : expected === observation.effort ? 'effort-matched' : 'effort-mismatch',
    expectedEffort: expected, observedEffort: observation.effort, modelVerified: false,
    reason: 'Correlated hook evidence reports effort only; model and backend enforcement require separate evidence' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [operation, option, path, ...extra] = process.argv.slice(2);
    assert(['prepare', 'verify'].includes(operation) && option === '--input' && path && extra.length === 0,
      'Usage: claude-delegation.mjs prepare|verify --input JSON_FILE');
    const input = JSON.parse(await readFile(path, 'utf8'));
    const result = operation === 'prepare' ? await prepareClaudeDelegation(input) : verifyClaudeEffort(input);
    console.log(JSON.stringify(result, null, 2));
    if (operation === 'verify' && result.status !== 'effort-matched') process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 2; }
}
