#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveTaskSelection } from './model-resolution.mjs';

const terminalStatuses = new Set(['completed', 'failed', 'cancelled', 'interrupted']);
const statuses = new Set(['queued', 'running', 'waiting', ...terminalStatuses]);
const runtimeModes = new Set(['approval-required', 'auto-accept-edits', 'auto', 'full-access']);
const manifestName = '.oh-my-stack/t3/resolution.json';
const modelFallbackStrategies = { 'interrogate.reviewers': 'interrogate', 'arena.runners': 'arena', 'architect.runners': 'arena' };
const inheritedAliases = new Set(['auto', 'inherit-parent']);
const effortKeys = new Set(['effort', 'reasoningEffort', 'reasoning_effort']);
const effortLadder = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra'];
const jobEffortSteps = { routine: -2, judgment: -1, hardest: 1, verification: 0 };
const speedSettings = {
  fast: { type: 'boolean', standard: false, fast: true },
  fastMode: { type: 'boolean', standard: false, fast: true },
  speed: { type: 'select', standard: 'standard', fast: 'fast' },
  serviceTier: { type: 'select', standard: 'default', fast: 'priority' }
};

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value;
}

function string(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a nonempty string`);
  return value;
}

function keys(value, allowed, label) {
  object(value, label);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new Error(`Unsupported ${label} field ${key}`);
}

function boolean(value, label) {
  if (typeof value !== 'boolean') throw new Error(`${label} must be a boolean`);
  return value;
}

function list(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value;
}

function unique(values, label) {
  if (new Set(values).size !== values.length) throw new Error(`Duplicate ${label}`);
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}

function hash(value) {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

function clone(value) {
  return structuredClone(value);
}

export function parseT3Catalog(input) {
  const catalog = clone(object(typeof input === 'string' ? JSON.parse(input) : input, 'catalog'));
  string(catalog.parentThreadId, 'parentThreadId');
  string(catalog.inheritedProviderInstanceId, 'inheritedProviderInstanceId');
  const providers = list(catalog.providers, 'providers');
  unique(providers.map(provider => string(provider.providerInstanceId, 'providerInstanceId')), 'provider instance');
  for (const provider of providers) {
    boolean(provider.canRunChildTask, 'canRunChildTask');
    boolean(provider.canRunCrossProviderChildTask, 'canRunCrossProviderChildTask');
    if (provider.runtimeModes !== undefined && provider.runtimeModes !== null) {
      for (const mode of list(provider.runtimeModes, 'runtimeModes')) if (!runtimeModes.has(mode)) throw new Error(`Unsupported advertised runtimeMode ${mode}`);
      unique(provider.runtimeModes, 'runtimeMode');
    }
    const models = list(provider.models, 'models');
    unique(models.map(model => string(model.id, 'model id')), 'model id');
    for (const model of models) {
      const options = list(model.options ?? [], 'model options');
      model.options = options;
      unique(options.map(option => string(option.id, 'option id')), 'option id');
      for (const option of options) {
        if (option.type === 'select') {
          const values = list(option.options, 'select options').map(value => string(value.id, 'select value'));
          if (!values.length) throw new Error(`Empty select option ${option.id}`);
          unique(values, 'select value');
        } else if (option.type !== 'boolean') throw new Error(`Unsupported option type ${option.type}`);
      }
    }
  }
  return catalog;
}

function contractsFrom(input) {
  const contracts = object(input, 'contracts');
  if (contracts.schemaVersion !== 1 || contracts.orchestration !== 't3' || !['codex', 'claude-code'].includes(contracts.host)) throw new Error('Unsupported T3 role contracts');
  object(contracts.roles, 'contract roles');
  object(contracts.routes, 'contract routes');
  for (const [name, role] of Object.entries(contracts.roles)) {
    string(name, 'role name');
    string(role.description, 'role description');
    string(role.instructions, 'role instructions');
    boolean(role.writes, 'role writes');
    list(role.constraints, 'role constraints').forEach(value => string(value, 'role constraint'));
  }
  for (const [name, route] of Object.entries(contracts.routes)) {
    string(name, 'route name');
    if (!['single', 'panel'].includes(route.kind) || !Object.hasOwn(contracts.roles, route.role)) throw new Error(`Invalid route contract ${name}`);
    if (!Number.isInteger(route.defaultCount) || route.defaultCount < 1 || (route.kind === 'single' && route.defaultCount !== 1)) throw new Error(`Invalid defaultCount for ${name}`);
  }
  return contracts;
}

function targetFrom(input, catalog) {
  object(input, 'target');
  if (input.inheritParent === true) {
    keys(input, ['inheritParent'], 'inherited target');
    return { inheritParent: true };
  }
  keys(input, ['providerInstanceId', 'model', 'options'], 'explicit target');
  string(input.providerInstanceId, 'target providerInstanceId');
  string(input.model, 'target model');
  const options = object(input.options, 'target options');
  for (const [id, value] of Object.entries(options)) {
    string(id, 'target option id');
    if (typeof value !== 'string' && typeof value !== 'boolean') throw new Error(`Invalid option value for ${id}`);
  }
  const efforts = Object.entries(options).filter(([id]) => effortKeys.has(id)).map(([, value]) => value);
  if (new Set(efforts).size > 1) throw new Error('Ambiguous reasoning effort options');
  if (catalog) {
    const provider = catalog.providers.find(value => value.providerInstanceId === input.providerInstanceId);
    if (!provider) throw new Error(`Unknown provider instance ${input.providerInstanceId}`);
    const model = provider.models.find(value => value.id === input.model);
    if (!model) throw new Error(`Model ${input.model} is unavailable on ${input.providerInstanceId}`);
    for (const [id, value] of Object.entries(options)) {
      const option = model.options.find(value => value.id === id);
      if (!option) throw new Error(`Unsupported option ${id} for ${input.model}`);
      if (option.type === 'boolean' ? typeof value !== 'boolean' : typeof value !== 'string' || !option.options.some(choice => choice.id === value)) throw new Error(`Unsupported value for option ${id}`);
    }
  }
  return clone(input);
}

export function t3ModelFamily(model, assignments = {}) {
  if (typeof model !== 'string' || !model.trim()) return null;
  const segment = model.split('/').at(-1);
  const known = /^(?:cursor-grok-|composer-)/.test(segment) ? 'grok' : /^(gpt|claude|grok|gemini)(?:-|$)/.exec(segment)?.[1] ?? null;
  const assigned = Object.hasOwn(assignments, model) ? string(assignments[model], 'model family') : null;
  if (known && assigned && known !== assigned) throw new Error(`Family assignment contradicts model ${model}`);
  return assigned ?? known;
}

function policyFrom(input, contracts, catalog) {
  keys(input, ['modelFamilies', 'roleCandidates', 'fallbackTargets', 'minimumPanelFamilies', 'modelFallbacks'], 'selectionPolicy');
  for (const [model, family] of Object.entries(object(input.modelFamilies ?? {}, 'modelFamilies'))) {
    string(model, 'family model');
    string(family, 'model family');
    t3ModelFamily(model, input.modelFamilies);
  }
  const concrete = target => {
    const checked = targetFrom(target, catalog);
    if (checked.inheritParent) throw new Error('Selection candidates must name explicit targets');
    return checked;
  };
  for (const [role, candidates] of Object.entries(object(input.roleCandidates ?? {}, 'roleCandidates'))) {
    if (contracts && !Object.hasOwn(contracts.roles, role)) throw new Error(`Unknown candidate role ${role}`);
    if (role !== 'trail-reviewer') throw new Error(`Role ${role} has no required cross-family selection contract`);
    const values = list(candidates, 'role candidates');
    values.forEach(concrete);
    unique(values.map(hash), 'role candidate');
  }
  const fallbacks = list(input.fallbackTargets ?? [], 'fallbackTargets');
  fallbacks.forEach(concrete);
  unique(fallbacks.map(hash), 'fallback target');
  for (const [route, policy] of Object.entries(object(input.modelFallbacks ?? {}, 'modelFallbacks'))) {
    if (!Object.hasOwn(modelFallbackStrategies, route) || (contracts && contracts.routes[route]?.kind !== 'panel')) throw new Error(`Unsupported model fallback route ${route}`);
    keys(policy, ['strategy', 'familyDefaults', 'unknownFamilyDefault', 'hostFallback', 'providerDefaults'], 'model fallback policy');
    if (policy.strategy !== modelFallbackStrategies[route]) throw new Error(`Invalid model fallback strategy for ${route}`);
    const defaults = value => {
      for (const [family, target] of Object.entries(object(value.familyDefaults, 'familyDefaults'))) {
        string(family, 'default family');
        concrete(target);
        if (inheritedAliases.has(target.model) || t3ModelFamily(target.model, input.modelFamilies) !== family) throw new Error(`Invalid family default for ${family}`);
      }
      for (const target of [value.unknownFamilyDefault, ...(value.hostFallback ? [value.hostFallback] : [])]) {
        concrete(target);
        if (inheritedAliases.has(target.model)) throw new Error('Model fallback defaults cannot be inherited aliases');
      }
    };
    defaults(policy);
    for (const [providerId, value] of Object.entries(object(policy.providerDefaults ?? {}, 'providerDefaults'))) {
      string(providerId, 'default provider');
      keys(value, ['familyDefaults', 'unknownFamilyDefault', 'hostFallback'], 'provider defaults');
      defaults(value);
      if ([...Object.values(value.familyDefaults), value.unknownFamilyDefault, value.hostFallback].filter(Boolean).some(target => target.providerInstanceId !== providerId)) throw new Error('Provider defaults must preserve their provider instance');
    }
  }
  for (const [route, count] of Object.entries(object(input.minimumPanelFamilies ?? {}, 'minimumPanelFamilies'))) {
    if (contracts && contracts.routes[route]?.kind !== 'panel') throw new Error(`Unknown panel route ${route}`);
    if (!Number.isInteger(count) || count < 2) throw new Error('Panel family minimum must be an integer of at least two');
  }
  return clone(input);
}

function resolutionFrom(input, contracts, catalog) {
  keys(input, ['schemaVersion', 'owner', 'orchestration', 'preset', 'roles', 'routes', 'selectionPolicy'], 'resolution');
  if (input.schemaVersion !== 1 || input.owner !== 'oh-my-stack' || input.orchestration !== 't3') throw new Error('Resolution is not owned by Oh My Stack T3');
  string(input.preset, 'preset');
  object(input.roles, 'resolution roles');
  object(input.routes, 'resolution routes');
  if (contracts && (Object.keys(input.roles).sort().join('\0') !== Object.keys(contracts.roles).sort().join('\0') || Object.keys(input.routes).sort().join('\0') !== Object.keys(contracts.routes).sort().join('\0'))) throw new Error('Resolution roles and routes must match contracts');
  for (const target of Object.values(input.roles)) targetFrom(target, catalog);
  for (const [name, route] of Object.entries(input.routes)) {
    keys(route, ['kind', 'entries'], 'resolution route');
    if (!['single', 'panel'].includes(route.kind) || (contracts && route.kind !== contracts.routes[name].kind)) throw new Error(`Route kind mismatch for ${name}`);
    const entries = list(route.entries, 'route entries');
    if (route.kind === 'single' && entries.length !== 1) throw new Error(`Invalid entry count for ${name}`);
    entries.forEach(target => targetFrom(target, catalog));
  }
  if (input.selectionPolicy !== undefined) policyFrom(input.selectionPolicy, contracts, catalog);
  return clone(input);
}

export function configureT3Resolution(input) {
  keys(input, ['catalog', 'contracts', 'preset', 'previous', 'overrides'], 'configuration');
  const { catalog: rawCatalog, contracts: rawContracts, preset = 'inherit-parent', previous, overrides = {} } = input;
  const catalog = parseT3Catalog(rawCatalog);
  const contracts = contractsFrom(rawContracts);
  string(preset, 'preset');
  keys(overrides, ['roles', 'routes', 'selectionPolicy'], 'overrides');
  const saved = previous ? resolutionFrom(previous, contracts) : null;
  const resolution = saved?.preset === preset ? saved : {
    schemaVersion: 1, owner: 'oh-my-stack', orchestration: 't3', preset,
    roles: Object.fromEntries(Object.keys(contracts.roles).map(name => [name, { inheritParent: true }])),
    routes: Object.fromEntries(Object.entries(contracts.routes).map(([name, route]) => [name, { kind: route.kind, entries: Array.from({ length: route.defaultCount }, () => ({ inheritParent: true })) }]))
  };
  for (const [name, target] of Object.entries(object(overrides.roles ?? {}, 'role overrides'))) {
    if (!Object.hasOwn(contracts.roles, name)) throw new Error(`Unknown role ${name}`);
    resolution.roles[name] = targetFrom(target, catalog);
    executableTarget(resolution.roles[name], catalog);
  }
  for (const [name, entries] of Object.entries(object(overrides.routes ?? {}, 'route overrides'))) {
    if (!Object.hasOwn(contracts.routes, name)) throw new Error(`Unknown route ${name}`);
    resolution.routes[name].entries = list(entries, 'route override entries').map(target => targetFrom(target, catalog));
    resolution.routes[name].entries.forEach(target => executableTarget(target, catalog));
  }
  if (overrides.selectionPolicy !== undefined) {
    resolution.selectionPolicy = policyFrom(overrides.selectionPolicy, contracts, catalog);
    for (const targets of Object.values(resolution.selectionPolicy.roleCandidates ?? {})) targets.forEach(target => executableTarget(target, catalog));
    (resolution.selectionPolicy.fallbackTargets ?? []).forEach(target => executableTarget(target, catalog));
    for (const policy of Object.values(resolution.selectionPolicy.modelFallbacks ?? {})) {
      for (const value of [policy, ...Object.values(policy.providerDefaults ?? {})]) {
        [...Object.values(value.familyDefaults), value.unknownFamilyDefault, value.hostFallback].filter(Boolean).forEach(target => executableTarget(target, catalog));
      }
    }
  }
  const checked = resolutionFrom(resolution, contracts);
  if (saved?.preset !== preset || Object.keys(overrides).length) validatePanelFamilies(checked, catalog);
  return checked;
}

async function readJSON(filename) {
  return JSON.parse(await readFile(filename, 'utf8'));
}

export async function resolveT3Resolution(input) {
  keys(input, ['cwd', 'userRoot', 'contracts'], 'resolution scope');
  const { cwd, userRoot, contracts } = input;
  if (!path.isAbsolute(string(cwd, 'cwd')) || !path.isAbsolute(string(userRoot, 'userRoot'))) throw new Error('Scope roots must be absolute');
  const checkedContracts = contracts === undefined ? undefined : contractsFrom(contracts);
  for (let directory = path.resolve(cwd); ; directory = path.dirname(directory)) {
    const filename = path.join(directory, manifestName);
    if (directory === path.resolve(userRoot)) break;
    try {
      return { scope: 'project', path: filename, resolution: resolutionFrom(await readJSON(filename), checkedContracts) };
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (directory === path.dirname(directory)) break;
  }
  const filename = path.join(userRoot, manifestName);
  try {
    return { scope: 'user', path: filename, resolution: resolutionFrom(await readJSON(filename), checkedContracts) };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return { scope: 'inherit-parent', path: null, resolution: null };
  }
}

function executableProvider(target, catalog, runtimeMode) {
  const providerId = target.inheritParent ? catalog.inheritedProviderInstanceId : target.providerInstanceId;
  const provider = catalog.providers.find(value => value.providerInstanceId === providerId);
  if (!provider || !provider.canRunChildTask) throw new Error(`Provider ${providerId} cannot run child tasks`);
  if (providerId !== catalog.inheritedProviderInstanceId && !provider.canRunCrossProviderChildTask) throw new Error(`Provider ${providerId} cannot run cross-provider child tasks`);
  if (runtimeMode !== undefined && runtimeMode !== 'inherit' && !provider.runtimeModes?.includes(runtimeMode)) throw new Error(`Provider ${providerId} does not advertise runtimeMode ${runtimeMode}`);
  return provider;
}

function executableTarget(target, catalog, runtimeMode) {
  targetFrom(target);
  const provider = executableProvider(target, catalog, runtimeMode);
  targetFrom(target, catalog);
  const providerId = provider.providerInstanceId;
  const modelId = target.inheritParent ? catalog.inheritedModel : target.model;
  if (target.inheritParent && modelId === null) return { requested: clone(target), options: {}, inheritedModelKnown: false };
  const model = provider.models.find(value => value.id === modelId);
  if (!model) throw new Error(`Inherited or selected model ${modelId} is unavailable on ${providerId}`);
  const pinned = target.inheritParent ? {} : target.options;
  return {
    requested: clone(target),
    options: Object.fromEntries(model.options.map(option => [option.id, Object.hasOwn(pinned, option.id) ? { source: 'explicit', requested: pinned[option.id], verified: false } : { source: 'inherited-or-unpinned', verified: false }]))
  };
}

function compatibleOption(option, value) {
  return option.type === 'boolean' ? typeof value === 'boolean' : typeof value === 'string' && option.options.some(choice => choice.id === value);
}

function replacementOptions(source, model) {
  const options = {};
  for (const [id, value] of Object.entries(source.options)) {
    const exact = model.options.find(option => option.id === id);
    const translated = effortKeys.has(id) && typeof value === 'string'
      ? model.options.find(option => effortKeys.has(option.id) && option.type === 'select' && compatibleOption(option, value)) : null;
    const option = exact && compatibleOption(exact, value) ? exact : translated;
    if (option && !Object.hasOwn(options, option.id)) options[option.id] = value;
  }
  return options;
}

function optionChanges(source, target, model) {
  const changes = [];
  for (const [id, value] of Object.entries(source.options)) {
    if (Object.hasOwn(target.options, id) && target.options[id] === value) continue;
    const translated = effortKeys.has(id) && Object.keys(target.options).find(key => effortKeys.has(key) && target.options[key] === value);
    changes.push(translated ? { option: id, change: 'translated', toOption: translated, value }
      : Object.hasOwn(target.options, id) ? { option: id, change: 'changed', from: value, to: target.options[id] }
        : { option: id, change: 'dropped', value });
  }
  for (const option of model.options) {
    if (!Object.hasOwn(target.options, option.id)) changes.push({ option: option.id, change: 'inherited-or-unpinned' });
    else if (!Object.hasOwn(source.options, option.id) && !changes.some(change => change.toOption === option.id)) changes.push({ option: option.id, change: 'added', value: target.options[option.id] });
  }
  return changes;
}

function modelDistance(left, right) {
  let row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 0; i < left.length; i++) {
    const next = [i + 1];
    for (let j = 0; j < right.length; j++) next.push(Math.min(next[j] + 1, row[j + 1] + 1, row[j] + (left[i] === right[j] ? 0 : 1)));
    row = next;
  }
  return row[right.length];
}

function observedFallbackPolicy(routes, catalog) {
  const modelFallbacks = {};
  for (const [routeName, strategy] of Object.entries(modelFallbackStrategies)) {
    const providerDefaults = {};
    for (const target of routes[routeName]?.entries ?? []) {
      if (target.inheritParent || inheritedAliases.has(target.model) || providerDefaults[target.providerInstanceId]) continue;
      let provider;
      try { provider = executableProvider(target, catalog); } catch { continue; }
      const models = provider.models.filter(model => !inheritedAliases.has(model.id));
      if (!models.length) continue;
      const choose = choices => [...choices].sort((a, b) =>
        Number(a.id === target.model) - Number(b.id === target.model)
        || Number(t3ModelFamily(a.id) === 'claude' && !a.id.includes('opus')) - Number(t3ModelFamily(b.id) === 'claude' && !b.id.includes('opus'))
        || modelDistance(target.model, a.id) - modelDistance(target.model, b.id) || a.id.localeCompare(b.id))[0];
      const explicit = model => ({ providerInstanceId: target.providerInstanceId, model: model.id, options: replacementOptions(target, model) });
      const families = [...new Set(models.map(model => t3ModelFamily(model.id)).filter(Boolean))];
      const familyDefaults = Object.fromEntries(families.map(family => [family, explicit(choose(models.filter(model => t3ModelFamily(model.id) === family)))]));
      const hostFallback = explicit(choose(models.filter(model => model.id === catalog.inheritedModel).length
        ? models.filter(model => model.id === catalog.inheritedModel) : models));
      providerDefaults[target.providerInstanceId] = { familyDefaults, unknownFamilyDefault: familyDefaults.claude ?? hostFallback, hostFallback };
    }
    const values = Object.values(providerDefaults);
    if (values.length) modelFallbacks[routeName] = { strategy, ...values[0], ...(values.length > 1 ? { providerDefaults } : {}) };
  }
  return { modelFallbacks };
}

function jobProfileFrom(profile) {
  if (profile === undefined) return;
  keys(profile, ['kind', 'urgent'], 'jobProfile');
  if (!Object.hasOwn(jobEffortSteps, profile.kind)) throw new Error('Unsupported jobProfile kind');
  if (profile.urgent !== undefined) boolean(profile.urgent, 'jobProfile urgent');
}

function jobSelection(target, profile, catalog) {
  jobProfileFrom(profile);
  if (profile === undefined) return { target, limitations: [] };
  if (target.inheritParent || inheritedAliases.has(target.model)) return { target, limitations: [] };
  const provider = executableProvider(target, catalog);
  targetFrom(target, catalog);
  if (profile.kind === 'verification') return { target, limitations: [] };
  const model = provider.models.find(model => model.id === target.model);
  const selected = clone(target);
  const limitations = [];
  const slugPattern = /^(.*)-(none|minimal|low|medium|high|xhigh|max|ultra)(-fast)?$/;
  const slug = slugPattern.exec(target.model);
  const efforts = model.options.filter(option => effortKeys.has(option.id) && option.type === 'select');
  const effort = efforts[0];
  const speedsFor = model => model.options.filter(option => Object.hasOwn(speedSettings, option.id) && option.type === speedSettings[option.id].type);
  const speeds = speedsFor(model);
  const desiredEffort = (value, values) => {
    const supported = effortLadder.filter(level => values.includes(level));
    if (!supported.includes(value)) return null;
    return resolveTaskSelection({ selection: { model: target.model, reasoning: value }, jobContext: profile, runtime: 't3',
      inventory: { schemaVersion: 1, runtime: 't3', source: 'captured-t3-catalog', observedAt: '1970-01-01T00:00:00Z',
        models: [{ id: target.model, reasoningEfforts: supported }] } }).selection.reasoning;
  };
  if (effort) {
    const pinned = efforts.map(option => selected.options[option.id]).filter(value => value !== undefined);
    const baselines = pinned.length ? pinned : efforts.map(option => option.defaultValue).filter(value => value !== undefined);
    if (new Set(baselines).size > 1) throw new Error('Ambiguous reasoning effort defaults');
    const configured = baselines[0] ?? slug?.[2];
    const supported = effort.options.map(option => option.id).filter(value => efforts.every(option => compatibleOption(option, value)));
    if (efforts.length > 1 && configured !== undefined && !supported.includes(configured)) throw new Error('Ambiguous reasoning effort baseline across advertised selectors');
    const wanted = desiredEffort(configured, supported);
    if (wanted) for (const option of efforts) selected.options[option.id] = wanted;
    else limitations.push('Reasoning adjustment needs a configured or advertised default effort on the known ladder.');
  }
  for (const speed of speeds) {
    const wanted = speedSettings[speed.id][profile.urgent === true ? 'fast' : 'standard'];
    if (compatibleOption(speed, wanted)) selected.options[speed.id] = wanted;
    else limitations.push(`Requested speed for ${speed.id} is not advertised by this model.`);
  }
  if (!slug) {
    if (!effort) limitations.push('This model advertises no supported reasoning adjustment.');
    if (!speeds.length) limitations.push('This model advertises no supported speed adjustment.');
  }
  if (slug) {
    const variants = provider.models.map(model => ({ model, slug: slugPattern.exec(model.id) }))
      .filter(candidate => candidate.slug?.[1] === slug[1]);
    const wantedEffort = effort ? selected.options[effort.id] : desiredEffort(slug[2], variants.map(candidate => candidate.slug[2]));
    const wantedFast = profile.urgent === true;
    const typedSelectors = Boolean(effort || speeds.length);
    const distance = candidate => Math.abs(effortLadder.indexOf(candidate.slug[2]) - effortLadder.indexOf(wantedEffort));
    const candidates = variants.filter(candidate => Boolean(candidate.slug[3]) === wantedFast
      && (typedSelectors ? candidate.slug[2] === wantedEffort : jobEffortSteps[profile.kind] > 0 || effortLadder.indexOf(candidate.slug[2]) <= effortLadder.indexOf(slug[2]))
      && (typedSelectors || profile.kind !== 'hardest' || effortLadder.indexOf(candidate.slug[2]) <= Math.max(effortLadder.indexOf(slug[2]), effortLadder.indexOf('max')))
      && (typedSelectors || profile.kind !== 'hardest' || effortLadder.indexOf(slug[2]) <= effortLadder.indexOf('max') || candidate.slug[2] === slug[2]))
      .map(candidate => {
        const options = replacementOptions(selected, candidate.model);
        const selectors = candidate.model.options.filter(option => effortKeys.has(option.id) && option.type === 'select');
        for (const option of selectors) {
          if (!compatibleOption(option, candidate.slug[2])) return null;
          options[option.id] = candidate.slug[2];
        }
        for (const option of speedsFor(candidate.model)) {
          const wanted = speedSettings[option.id][wantedFast ? 'fast' : 'standard'];
          if (!compatibleOption(option, wanted)) return null;
          options[option.id] = wanted;
        }
        return { ...candidate, options };
      }).filter(Boolean)
      .sort((a, b) => distance(a) - distance(b) || effortLadder.indexOf(a.slug[2]) - effortLadder.indexOf(b.slug[2]));
    if (candidates.length) {
      selected.model = candidates[0].model.id;
      selected.options = candidates[0].options;
      return { target: selected, limitations: [] };
    }
    limitations.push('No advertised variant of the configured model identity supports the requested job settings.');
    return { target, limitations };
  }
  return { target: selected, limitations };
}

function rejectionFrom(rejection) {
  keys(rejection, ['target', 'code', 'rawError', 'validModelIds'], 'model rejection');
  const rejected = targetFrom(rejection.target);
  if (rejected.inheritParent || inheritedAliases.has(rejected.model)) throw new Error('Inherited aliases cannot be rejected model slugs');
  if (rejection.code !== 'model-rejected') throw new Error('Model fallback requires model-rejected evidence');
  string(rejection.rawError, 'rawError');
  list(rejection.validModelIds, 'validModelIds').forEach(model => string(model, 'valid model id'));
  return rejected;
}

export function resolveT3ModelFallback(input) {
  keys(input, ['target', 'catalog', 'rejectionCatalog', 'policy', 'routeName', 'modelRejections', 'runtimeMode'], 'model fallback input');
  const { routeName, runtimeMode } = input;
  const catalog = parseT3Catalog(input.catalog);
  const target = targetFrom(input.target);
  const rejectionCatalog = input.rejectionCatalog === undefined ? catalog : parseT3Catalog(input.rejectionCatalog);
  const policy = policyFrom(input.policy ?? {});
  const routePolicy = policy.modelFallbacks?.[routeName];
  const evidence = list(input.modelRejections ?? [], 'modelRejections');
  const unchanged = { target, audit: { reason: 'configured-target', modelRejections: [], optionChanges: [] } };
  if (!evidence.length) return unchanged;
  if (target.inheritParent || inheritedAliases.has(target.model)) throw new Error('Inherited aliases cannot be rejected model slugs');
  const provider = executableProvider(target, catalog, runtimeMode);
  if (!routePolicy) throw new Error(`Model rejection fallback is not configured for ${routeName ?? 'role'}`);
  const family = t3ModelFamily(target.model, policy.modelFamilies);
  const defaults = routePolicy.providerDefaults?.[target.providerInstanceId] ?? routePolicy;
  if (family !== null && !Object.hasOwn(defaults.familyDefaults, family) && !defaults.hostFallback) throw new Error(`Model fallback configuration is missing family default for ${family} on ${routeName}`);
  const tableDefault = family === null ? defaults.unknownFamilyDefault : defaults.familyDefaults[family] ?? defaults.hostFallback;
  if (tableDefault.providerInstanceId !== target.providerInstanceId) throw new Error('Model fallback must preserve the configured provider instance');
  const permitted = new Set([hash(target), hash(tableDefault)]);
  for (const rejection of evidence) {
    const rejected = rejectionFrom(rejection);
    if (rejected.providerInstanceId !== target.providerInstanceId || !permitted.has(hash(rejected))) throw new Error('Foreign model rejection target or provider');
  }
  unique(evidence.map(rejection => hash(rejection.target)), 'model rejection target');
  const configuredRejection = evidence.find(rejection => hash(rejection.target) === hash(target));
  if (!configuredRejection) throw new Error('Model fallback requires rejection of the configured target first');
  if (input.rejectionCatalog !== undefined || provider.models.some(model => model.id === target.model)) targetFrom(target, rejectionCatalog);
  const defaultRejection = evidence.find(rejection => hash(rejection.target) === hash(tableDefault));
  let selected = tableDefault;
  let reason = family !== null && !defaults.familyDefaults[family] ? 'model-original-host-default' : 'model-family-default';
  if (defaultRejection) {
    const defaultModel = provider.models.find(model => model.id === tableDefault.model);
    if (input.rejectionCatalog !== undefined || defaultModel) targetFrom(tableDefault, rejectionCatalog);
    const defaultFamily = t3ModelFamily(tableDefault.model, policy.modelFamilies);
    if (routePolicy.strategy === 'arena' && !defaultFamily) throw new Error('Arena model fallback requires a known default family');
    const rejectedIds = new Set(evidence.map(rejection => rejection.target.model));
    const effort = Object.entries(tableDefault.options).find(([id, value]) => effortKeys.has(id) && typeof value === 'string');
    const slugEffort = /-(low|medium|high|xhigh|max|ultra)(?:-|$)/.exec(tableDefault.model)?.[1];
    const candidates = provider.models.filter(model => defaultRejection.validModelIds.includes(model.id) && !rejectedIds.has(model.id) && !inheritedAliases.has(model.id))
      .filter(model => routePolicy.strategy !== 'arena' || t3ModelFamily(model.id, policy.modelFamilies) === defaultFamily)
      .map(model => ({ model, options: replacementOptions(tableDefault, model) }))
      .map(candidate => ({ ...candidate, rank: [
        t3ModelFamily(candidate.model.id, policy.modelFamilies) === defaultFamily ? 0 : 1,
        effort ? Object.entries(candidate.options).some(([id, value]) => effortKeys.has(id) && value === effort[1]) ? 0 : 1
          : slugEffort && !candidate.model.id.includes(`-${slugEffort}`) ? 1 : 0,
        modelDistance(tableDefault.model, candidate.model.id)
      ] }))
      .sort((left, right) => left.rank[0] - right.rank[0] || left.rank[1] - right.rank[1] || left.rank[2] - right.rank[2] || (left.model.id < right.model.id ? -1 : left.model.id > right.model.id ? 1 : 0));
    if (!candidates.length) throw new Error('BLOCKED: no observed valid equivalent on the configured provider');
    selected = { providerInstanceId: target.providerInstanceId, model: candidates[0].model.id, options: candidates[0].options };
    reason = 'model-valid-equivalent';
  }
  executableTarget(selected, catalog, runtimeMode);
  const model = provider.models.find(model => model.id === selected.model);
  return { target: clone(selected), audit: { reason, modelRejections: clone(evidence), configuredTarget: clone(target), selectedTarget: clone(selected), familyDefault: clone(tableDefault), optionChanges: optionChanges(target, selected, model) } };
}

function selectTarget(target, { catalog, policy = {}, role, reviewedModel, runtimeMode }) {
  const families = policy.modelFamilies ?? {};
  const originalModel = target.inheritParent ? catalog.inheritedModel : target.model;
  const originalFamily = t3ModelFamily(originalModel, families);
  const reviewedFamily = role === 'trail-reviewer' ? t3ModelFamily(reviewedModel, families) : null;
  if (role === 'trail-reviewer' && !reviewedFamily) throw new Error('BLOCKED: independent review; reviewed model family is unknown');
  const skipped = [];
  const candidates = role === 'trail-reviewer' ? [target, ...(policy.roleCandidates?.[role] ?? [])] : [target];
  for (const candidate of candidates) {
    const model = candidate.inheritParent ? catalog.inheritedModel : candidate.model;
    const family = t3ModelFamily(model, families);
    if (role === 'trail-reviewer' && (!family || family === reviewedFamily)) {
      skipped.push({ target: clone(candidate), reason: family ? 'Same family as reviewed model' : 'Unknown model family' });
      continue;
    }
    const alternatives = [candidate, ...(policy.fallbackTargets ?? []).filter(value => family && t3ModelFamily(value.model, families) === family)];
    for (const alternative of alternatives) {
      try {
        const selection = executableTarget(alternative, catalog, runtimeMode);
        return { target: alternative, selection, audit: {
          configuredTarget: clone(target), selectedTarget: clone(alternative), configuredFamily: originalFamily,
          selectedFamily: family, reviewedFamily,
          reason: alternative !== candidate ? 'same-family-fallback' : candidate !== target ? 'ordered-cross-family-candidate' : 'configured-target',
          skipped
        } };
      } catch (error) {
        skipped.push({ target: clone(alternative), reason: error.message });
      }
    }
  }
  const detail = skipped.map(value => value.reason).join('; ');
  throw new Error(`${role === 'trail-reviewer' ? 'BLOCKED: independent review' : 'BLOCKED: configured target'}; ${detail}`);
}

function validatePanelFamilies(resolution, catalog, runtimeMode, preparedSelection) {
  const policy = resolution.selectionPolicy ?? {};
  for (const [name, count] of Object.entries(policy.minimumPanelFamilies ?? {})) {
    const entries = resolution.routes[name]?.entries;
    if (!entries) throw new Error(`Unknown panel route ${name}`);
    const families = new Set(entries.map((target, index) => {
      const selected = preparedSelection?.routeName === name && index + 1 === preparedSelection.entry
        ? preparedSelection.selected : selectTarget(target, { catalog, policy, runtimeMode });
      return target.inheritParent ? null : t3ModelFamily(selected.target.model, policy.modelFamilies);
    }).filter(Boolean));
    if (families.size < count) throw new Error(`BLOCKED: panel ${name} needs ${count} model families; got ${families.size}. inherit-parent does not count`);
  }
}

function preparationInput(input, catalog, resolution) {
  const captured = Object.fromEntries(['bundleRoot', 'cwd', 'task', 'runId', 'stepId', 'routeName', 'roleName',
    'priorRound', 'runtimeMode', 'interactionMode', 'timeoutMs', 'title', 'jobProfile'].filter(field => input[field] !== undefined).map(field => [field, clone(input[field])]));
  return { ...captured, catalog: clone(catalog), resolution: clone(resolution), entry: input.entry ?? 1, round: input.round ?? 1,
    originalBrief: input.originalBrief ?? input.task, mode: input.mode ?? 'async',
    ...(typeof (input.reviewedModel ?? catalog.inheritedModel) === 'string' ? { reviewedModel: input.reviewedModel ?? catalog.inheritedModel } : {}),
    ownedPaths: list(input.ownedPaths, 'ownedPaths').map(value => path.resolve(input.cwd, string(value, 'owned path'))) };
}

function receiptHash(prepared) {
  const { receiptHash: ignored, ...audit } = prepared.audit;
  return hash({ tool: prepared.tool, arguments: prepared.arguments, audit });
}

export async function prepareT3Delegation(input) {
  return prepareDelegation(input);
}

async function prepareDelegation(input, capturedScope) {
  keys(input, ['bundleRoot', 'catalog', 'resolution', 'userRoot', 'routeName', 'roleName', 'entry', 'task', 'originalBrief', 'cwd', 'ownedPaths', 'runId', 'stepId', 'round', 'priorRound', 'priorPreparedRequest', 'rejectedPreparedRequest', 'mode', 'runtimeMode', 'interactionMode', 'timeoutMs', 'title', 'reviewedModel', 'modelRejections', 'jobProfile'], 'delegation input');
  const { bundleRoot, cwd, routeName, roleName, task, ownedPaths, runId, stepId, priorRound, priorPreparedRequest } = input;
  if (!path.isAbsolute(string(bundleRoot, 'bundleRoot')) || !path.isAbsolute(string(cwd, 'cwd'))) throw new Error('bundleRoot and cwd must be absolute');
  const catalog = parseT3Catalog(input.catalog);
  const contracts = contractsFrom(await readJSON(path.join(bundleRoot, 'config/t3-role-contracts.json')));
  if (Boolean(routeName) === Boolean(roleName)) throw new Error('Select exactly one routeName or roleName');
  const scope = capturedScope ?? (input.resolution ? { scope: 'explicit', path: null, resolution: input.resolution } : await resolveT3Resolution({ cwd, userRoot: input.userRoot ?? homedir(), contracts }));
  const resolution = scope.resolution ? resolutionFrom(scope.resolution, contracts) : configureT3Resolution({ catalog, contracts });
  const policy = resolution.selectionPolicy ?? observedFallbackPolicy(resolution.routes, catalog);
  const entry = input.entry ?? 1;
  if (!Number.isInteger(entry) || entry < 1) throw new Error('entry must be a positive one-based integer');
  const selectedRole = routeName ? contracts.routes[routeName]?.role : roleName;
  if (!selectedRole || !Object.hasOwn(contracts.roles, selectedRole)) throw new Error('Unknown route or role');
  if (roleName && entry !== 1) throw new Error('Role selection has only entry one');
  const configured = routeName ? resolution.routes[routeName]?.entries[entry - 1] : resolution.roles[roleName];
  if (!configured) throw new Error('Route entry is unavailable');
  const reviewedModel = input.reviewedModel === undefined ? catalog.inheritedModel : string(input.reviewedModel, 'reviewedModel');
  const evidence = list(input.modelRejections ?? [], 'modelRejections');
  jobProfileFrom(input.jobProfile);
  const originalMissing = !configured.inheritParent && !catalog.providers.find(provider => provider.providerInstanceId === configured.providerInstanceId)?.models.some(model => model.id === configured.model);
  const rejectedOriginalMissing = originalMissing && evidence.some(rejection => hash(rejection.target) === hash(configured));
  let baseSelection = input.jobProfile !== undefined && input.rejectedPreparedRequest === undefined && !rejectedOriginalMissing
    ? selectTarget(configured, { catalog, policy, role: selectedRole, reviewedModel, runtimeMode: input.runtimeMode }) : null;
  let jobBase = baseSelection?.target ?? configured;
  let rejectionCatalog;
  let job = input.rejectedPreparedRequest !== undefined || rejectedOriginalMissing
    ? { target: jobBase, limitations: [] } : jobSelection(jobBase, input.jobProfile, catalog);
  if (input.rejectedPreparedRequest !== undefined) {
    const saved = object(input.rejectedPreparedRequest, 'rejectedPreparedRequest');
    const selection = saved.audit?.selection;
    const identity = saved.audit?.identity;
    const preparation = saved.audit?.preparation;
    if (saved.tool !== 'delegate_task' || !saved.arguments || !preparation?.input || !preparation.scope
      || saved.audit?.receiptHash !== receiptHash(saved) || saved.audit?.payloadHash !== hash(saved.arguments)
      || saved.audit?.contractsHash !== hash(contracts) || saved.audit?.roleHash !== hash(contracts.roles[selectedRole])
      || selection?.reason !== 'job-profile-adjustment' || hash(selection.configuredTarget) !== hash(configured)
      || hash(selection.jobProfile) !== hash(input.jobProfile) || hash(selection.selectedTarget) !== hash(saved.arguments.target)
      || identity?.parentThreadId !== catalog.parentThreadId || identity.runId !== runId
      || identity.roleName !== selectedRole || identity.routeName !== (routeName ?? null) || identity.entry !== entry
      || identity.round !== (input.round ?? 1) || identity.stepId === stepId
      || !evidence.some(rejection => hash(rejection.target) === hash(saved.arguments.target))) throw new Error('Invalid rejected prepared request or new step identity');
    const expectedInput = preparationInput({ ...input, reviewedModel, stepId: identity.stepId }, preparation.input.catalog, resolution);
    if (hash(expectedInput) !== hash(preparation.input) || hash(preparation.scope) !== hash({ scope: scope.scope, path: scope.path })) throw new Error('Invalid rejected prepared request provenance');
    if (preparation.input.catalog.inheritedProviderInstanceId !== catalog.inheritedProviderInstanceId) throw new Error('Invalid rejected prepared request parent provider');
    let rebuilt;
    try {
      if (preparation.input.rejectedPreparedRequest !== undefined || preparation.input.priorPreparedRequest !== undefined) throw new Error('Nested preparation');
      rebuilt = await prepareDelegation(preparation.input, { ...preparation.scope, resolution: preparation.input.resolution });
    } catch {
      throw new Error('Invalid rejected prepared request preparation');
    }
    if (hash(rebuilt) !== hash(saved)) throw new Error('Invalid rejected prepared request transition');
    rejectionCatalog = parseT3Catalog(preparation.input.catalog);
    jobBase = targetFrom(rebuilt.audit.selection.jobBaseTarget, rejectionCatalog);
    baseSelection = { target: jobBase, audit: { skipped: clone(selection.skipped ?? []) } };
    job = { target: targetFrom(saved.arguments.target), limitations: clone(selection.jobLimitations ?? []) };
  }
  const adjustedRejections = evidence.filter(rejection => hash(job.target) !== hash(jobBase) && hash(rejection.target) === hash(job.target));
  adjustedRejections.forEach(rejectionFrom);
  if (adjustedRejections.length > 1) throw new Error('Duplicate model rejection target');
  const remainingRejections = evidence.filter(rejection => !adjustedRejections.includes(rejection));
  const modelResolution = resolveT3ModelFallback({ target: jobBase, catalog, rejectionCatalog, policy, routeName, modelRejections: remainingRejections, runtimeMode: input.runtimeMode });
  const requested = remainingRejections.length ? modelResolution.target : adjustedRejections.length ? jobBase : job.target;
  const selected = selectTarget(requested, { catalog, policy, role: selectedRole, reviewedModel, runtimeMode: input.runtimeMode });
  if (baseSelection) {
    selected.audit = { ...selected.audit, configuredTarget: clone(configured),
      reason: selected.audit.reason === 'configured-target' ? baseSelection.audit.reason ?? selected.audit.reason : selected.audit.reason,
      skipped: [...new Map([...baseSelection.audit.skipped, ...selected.audit.skipped].map(value => [hash(value), value])).values()] };
  }
  if (modelResolution.audit.reason !== 'configured-target') {
    selected.audit = { ...selected.audit, ...modelResolution.audit, configuredTarget: clone(configured), configuredFamily: t3ModelFamily(configured.model, resolution.selectionPolicy?.modelFamilies) };
  }
  if (input.jobProfile !== undefined || adjustedRejections.length) {
    const selectedModel = selected.target.inheritParent ? null : catalog.providers.find(provider => provider.providerInstanceId === selected.target.providerInstanceId)?.models.find(model => model.id === selected.target.model);
    selected.audit = { ...selected.audit, configuredTarget: clone(configured), selectedTarget: clone(selected.target),
      configuredFamily: t3ModelFamily(configured.inheritParent ? catalog.inheritedModel : configured.model, policy.modelFamilies),
      jobProfile: clone(input.jobProfile), jobLimitations: job.limitations, jobBaseTarget: clone(jobBase),
      ...(hash(job.target) !== hash(jobBase) && !evidence.length ? { reason: 'job-profile-adjustment' } : {}),
      ...(adjustedRejections.length ? { ...(!remainingRejections.length ? { reason: 'job-profile-rejected-original-line' } : {}), modelRejections: clone(evidence), rejectedJobTarget: clone(job.target) } : {}),
      optionChanges: selectedModel && !configured.inheritParent ? optionChanges(configured, selected.target, selectedModel) : [] };
  }
  const { target, selection } = selected;
  const minimumFamilies = routeName && resolution.selectionPolicy?.minimumPanelFamilies?.[routeName];
  if (minimumFamilies) {
    const families = resolution.selectionPolicy.modelFamilies;
    const configuredFamily = t3ModelFamily(configured.inheritParent ? catalog.inheritedModel : configured.model, families);
    const selectedFamily = t3ModelFamily(target.inheritParent ? catalog.inheritedModel : target.model, families);
    if (configuredFamily !== selectedFamily) throw new Error(`BLOCKED: panel ${routeName} has minimumPanelFamilies=${minimumFamilies}; family-changing single-seat preparation requires a complete effective-panel configuration`);
    validatePanelFamilies({ ...resolution, selectionPolicy: { ...resolution.selectionPolicy, minimumPanelFamilies: { [routeName]: minimumFamilies } } }, catalog, input.runtimeMode, { routeName, entry, selected });
  }
  const round = input.round ?? 1;
  if (!Number.isInteger(round) || round < 1) throw new Error('round must be a positive integer');
  string(task, 'task');
  const originalBrief = round === 1 ? input.originalBrief ?? task : string(input.originalBrief, 'originalBrief');
  string(originalBrief, 'originalBrief');
  if (round > 1) {
    keys(priorRound, ['round', 'findings', 'responses', 'unresolvedObjections'], 'priorRound');
    if (priorRound.round !== round - 1) throw new Error('priorRound must identify the preceding round');
    for (const field of ['findings', 'responses', 'unresolvedObjections']) {
      if (!Object.hasOwn(priorRound, field) || !(typeof priorRound[field] === 'string' || Array.isArray(priorRound[field]))) throw new Error(`priorRound requires ${field}`);
    }
  } else if (priorRound !== undefined) throw new Error('Round one cannot have priorRound');
  const absolutePaths = list(ownedPaths, 'ownedPaths').map(value => path.resolve(cwd, string(value, 'owned path')));
  const role = contracts.roles[selectedRole];
  if (role.writes && !absolutePaths.length) throw new Error('Writing roles require explicit ownedPaths');
  const identity = { parentThreadId: catalog.parentThreadId, runId: string(runId, 'runId'), stepId: string(stepId, 'stepId'), round, roleName: selectedRole, routeName: routeName ?? null, entry };
  const brief = [
    `Oh My Stack role ${selectedRole}.`, role.description,
    `Package root ${bundleRoot}`, `Skill root ${path.join(bundleRoot, 'skills')}`,
    `Runtime binding ${path.join(bundleRoot, 'docs/runtime-binding.md')}`,
    `Model selection ${path.join(bundleRoot, 'docs/model-selection.md')}`,
    ...(selectedRole === 'poteto-agent' ? [
      `Read the full Poteto Mode entry at ${path.join(bundleRoot, 'skills/poteto-mode/SKILL.md')} before work.`,
      `Read the complete workflow and Principles index there. If the entry is a wrapper, read ${path.join(bundleRoot, 'skills/poteto-mode/WORKFLOW.md')} through the end.`,
      `Read each applicable principle leaf at ${path.join(bundleRoot, 'skills/principle-<name>/SKILL.md')}.`,
      'The parent owns playbook coordination and independent review. This assignment owns only the bounded unit and its acceptance checks.'
    ] : []),
    `Complete role instructions\n${role.instructions}`,
    `Role writes ${role.writes}. Constraints ${JSON.stringify(role.constraints)}.`,
    `Working directory ${cwd}`, `Owned paths ${JSON.stringify(absolutePaths)}`,
    'You are not alone in the codebase. Preserve others\' edits and work only within the assigned scope.',
    `Original brief\n${originalBrief}`, `Assigned task\n${task}`,
    ...(selectedRole === 'trail-reviewer' ? [`Reviewed model ${reviewedModel}. Reviewed family ${selected.audit.reviewedFamily}.`] : []),
    ...(round > 1 ? [`Prior review round ${priorRound.round}\nFindings\n${JSON.stringify(priorRound.findings)}\nResponses\n${JSON.stringify(priorRound.responses)}\nUnresolved objections\n${JSON.stringify(priorRound.unresolvedObjections)}`] : [])
  ].join('\n\n');
  const args = { clientRequestId: `oms-t3-${hash(identity)}`, mode: input.mode ?? 'async', task: brief };
  if (!['async', 'wait'].includes(args.mode)) throw new Error('mode must be async or wait');
  if (!target.inheritParent) args.target = clone(target);
  for (const field of ['runtimeMode', 'interactionMode', 'title']) if (input[field] !== undefined) args[field] = string(input[field], field);
  if (args.runtimeMode !== undefined && args.runtimeMode !== 'inherit' && !runtimeModes.has(args.runtimeMode)) throw new Error('Unsupported runtimeMode');
  if (args.interactionMode !== undefined && !['inherit', 'default', 'plan'].includes(args.interactionMode)) throw new Error('Unsupported interactionMode');
  if (input.timeoutMs !== undefined) {
    if (args.mode !== 'wait' || !Number.isFinite(input.timeoutMs) || input.timeoutMs <= 0) throw new Error('timeoutMs requires wait mode and a positive finite number');
    args.timeoutMs = input.timeoutMs;
  }
  const prepared = { tool: 'delegate_task', arguments: args, audit: { identity, ...selection, selection: { ...selected.audit, reviewedModel: selectedRole === 'trail-reviewer' ? reviewedModel : null, scope: scope.scope, path: scope.path }, payloadHash: hash(args), roleHash: hash(role), contractsHash: hash(contracts), catalogHash: hash(catalog), observed: false } };
  if (selected.audit.reason === 'job-profile-adjustment') prepared.audit.preparation = {
    input: preparationInput(input, catalog, resolution), scope: { scope: scope.scope, path: scope.path }, policy: clone(policy)
  };
  prepared.audit.receiptHash = receiptHash(prepared);
  if (priorPreparedRequest) {
    if (priorPreparedRequest.arguments?.clientRequestId !== args.clientRequestId || priorPreparedRequest.audit?.payloadHash !== hash(args) || hash(priorPreparedRequest.arguments) !== hash(args)) throw new Error('Retry identity or payload differs from saved request');
    return clone(priorPreparedRequest);
  }
  return prepared;
}

export function observeT3Task(input) {
  keys(input, ['observation', 'previous', 'prepared'], 'observation input');
  const { observation: raw, previous, prepared } = input;
  const observation = object(raw, 'task observation');
  for (const field of ['taskId', 'childNodeId', 'childThreadId', 'providerInstanceId']) string(observation[field], field);
  if (!statuses.has(observation.status) || !['working', 'waiting_for_children', 'result_available'].includes(observation.workState)) throw new Error('Invalid task state');
  boolean(observation.waitTimedOut, 'waitTimedOut');
  boolean(observation.hasPendingChildRuns, 'hasPendingChildRuns');
  for (const field of ['childRunId', 'resultContextTransferId', 'latestTerminalRunId', 'latestTerminalResultContextTransferId', 'model']) if (observation[field] !== null) string(observation[field], field);
  for (const field of ['summary', 'latestTerminalSummary']) if (observation[field] !== null && typeof observation[field] !== 'string') throw new Error(`${field} must be a string or null`);
  if (observation.latestTerminalStatus !== null && !terminalStatuses.has(observation.latestTerminalStatus)) throw new Error('Invalid latestTerminalStatus');
  if (terminalStatuses.has(observation.status) && observation.workState !== 'result_available') throw new Error('Terminal task must have result_available workState');
  if (previous) {
    for (const field of ['taskId', 'childNodeId', 'childThreadId', 'providerInstanceId']) if (previous[field] !== observation[field]) throw new Error(`Task observation identity changed at ${field}`);
    if (previous.original.childRunId !== observation.childRunId
      && (previous.original.childRunId !== null || terminalStatuses.has(previous.original.status))) throw new Error('Original childRunId changed');
  }
  const original = previous && terminalStatuses.has(previous.original.status) ? clone(previous.original) : {
    childRunId: observation.childRunId, status: observation.status, summary: observation.summary,
    resultContextTransferId: observation.resultContextTransferId
  };
  const selection = prepared?.audit?.selection ?? previous?.selection;
  const requested = selection?.selectedTarget;
  if (prepared && (prepared.tool !== 'delegate_task' || prepared.audit?.payloadHash !== hash(prepared.arguments))) throw new Error('Invalid prepared request observation');
  if (prepared && requested && !requested.inheritParent && hash(requested) !== hash(prepared.arguments.target)) throw new Error('Prepared selection does not match requested target');
  if (previous?.selection && prepared && hash(previous.selection) !== hash(selection)) throw new Error('Prepared selection changed for observed task');
  return {
    taskId: observation.taskId, childNodeId: observation.childNodeId, childThreadId: observation.childThreadId,
    providerInstanceId: observation.providerInstanceId, model: observation.model,
    original, originalComplete: terminalStatuses.has(original.status),
    workState: observation.workState, waitTimedOut: observation.waitTimedOut,
    hasPendingChildRuns: observation.hasPendingChildRuns,
    latestTerminal: { runId: observation.latestTerminalRunId, status: observation.latestTerminalStatus, summary: observation.latestTerminalSummary, resultContextTransferId: observation.latestTerminalResultContextTransferId },
    requestedOptionsVerified: false,
    ...(selection ? { selection: clone(selection), requestedTarget: clone(requested), reportedTarget: { providerInstanceId: observation.providerInstanceId, model: observation.model }, targetMatchesRequest: requested.inheritParent ? null : requested.providerInstanceId === observation.providerInstanceId && requested.model === observation.model } : {})
  };
}

export function prepareT3Cancellation(input) {
  keys(input, ['taskId', 'reason', 'clientRequestId'], 'cancellation');
  const args = { taskId: string(input.taskId, 'taskId') };
  for (const field of ['reason', 'clientRequestId']) if (input[field] !== undefined) args[field] = string(input[field], field);
  return { tool: 'task_cancel', arguments: args, audit: { cancellationObserved: false } };
}

export function prepareT3Schedule(input) {
  keys(input, ['prompt', 'schedule', 'title', 'enabled', 'projectId', 'currentProjectId', 'bindToCurrentThread', 'freshThreadIntent', 'clientRequestId'], 'schedule input');
  const schedule = object(input.schedule, 'schedule');
  const fields = { interval: ['type', 'everyMs'], fixed_time: ['type', 'timeOfDay', 'weekdays'], webhook: ['type', 'signature', 'maxDeliveryAgeMinutes'] };
  if (!Object.hasOwn(fields, schedule.type)) throw new Error('Unsupported schedule type');
  keys(schedule, fields[schedule.type], 'schedule');
  if (schedule.type === 'interval' && (!Number.isSafeInteger(schedule.everyMs) || schedule.everyMs <= 0)) throw new Error('everyMs must be a positive safe integer');
  if (schedule.type === 'fixed_time') {
    if (typeof schedule.timeOfDay !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.timeOfDay)) throw new Error('timeOfDay must be HH:MM');
    if (schedule.weekdays !== undefined && schedule.weekdays !== null) {
      const days = list(schedule.weekdays, 'weekdays');
      if (!days.length || days.some(day => !Number.isInteger(day) || day < 0 || day > 6)) throw new Error('weekdays must contain integers zero through six');
      unique(days, 'weekday');
    }
  }
  if (schedule.type === 'webhook') {
    if (schedule.maxDeliveryAgeMinutes !== undefined && schedule.maxDeliveryAgeMinutes !== null && (!Number.isFinite(schedule.maxDeliveryAgeMinutes) || schedule.maxDeliveryAgeMinutes <= 0)) throw new Error('maxDeliveryAgeMinutes must be positive');
    if (schedule.signature !== undefined && schedule.signature !== null) {
      keys(schedule.signature, ['encoding', 'header', 'prefix', 'secretRef'], 'webhook signature');
      if (!['hex', 'base64'].includes(schedule.signature.encoding)) throw new Error('Unsupported signature encoding');
      string(schedule.signature.header, 'signature header');
      if (typeof schedule.signature.prefix !== 'string') throw new Error('signature prefix must be a string');
      string(schedule.signature.secretRef, 'signature secretRef');
    }
  }
  if (input.projectId !== undefined) string(input.projectId, 'projectId');
  if (input.currentProjectId !== undefined) string(input.currentProjectId, 'currentProjectId');
  if (input.projectId !== undefined && input.currentProjectId === undefined) throw new Error('currentProjectId is required to compare an explicit projectId');
  const sameProject = input.projectId === undefined || input.projectId === input.currentProjectId;
  const bind = input.bindToCurrentThread === undefined ? sameProject : boolean(input.bindToCurrentThread, 'bindToCurrentThread');
  if (!sameProject && bind) throw new Error('Another project cannot bind to the current thread');
  if (input.freshThreadIntent !== undefined) boolean(input.freshThreadIntent, 'freshThreadIntent');
  if (!bind && input.freshThreadIntent !== true) throw new Error('Fresh-thread schedules require explicit user intent');
  const args = { prompt: string(input.prompt, 'prompt'), schedule: clone(schedule), bindToCurrentThread: bind };
  for (const field of ['title', 'projectId', 'clientRequestId']) if (input[field] !== undefined) args[field] = string(input[field], field);
  if (input.enabled !== undefined) args.enabled = boolean(input.enabled, 'enabled');
  return { tool: 'schedule_task', arguments: args, audit: { draft: true, created: false, destination: bind ? 'current-thread' : 'fresh-thread' } };
}

async function main(argv) {
  const [command, ...flags] = argv;
  const operations = { catalog: parseT3Catalog, configure: configureT3Resolution, resolve: resolveT3Resolution, prepare: prepareT3Delegation, observe: observeT3Task, cancel: prepareT3Cancellation, schedule: prepareT3Schedule };
  if (!Object.hasOwn(operations, command)) throw new Error('Use catalog, configure, resolve, prepare, observe, cancel, or schedule --input JSON_FILE [--output JSON_FILE]');
  const options = {};
  for (let index = 0; index < flags.length; index += 2) {
    if (!['--input', '--output'].includes(flags[index]) || !flags[index + 1] || flags[index + 1].startsWith('--') || options[flags[index]]) throw new Error('Invalid or repeated CLI option');
    options[flags[index]] = flags[index + 1];
  }
  if (!options['--input']) throw new Error('--input is required');
  const result = await operations[command](await readJSON(options['--input']));
  const output = `${JSON.stringify(result, null, 2)}\n`;
  if (options['--output']) await writeFile(options['--output'], output, { flag: 'wx' });
  else process.stdout.write(output);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
