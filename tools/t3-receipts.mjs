import { createHash } from 'node:crypto';

const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const digest = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const invalid = detail => { throw new Error(`Invalid rejected prepared request ${detail}`); };

function nodeFrom(prepared) {
  if (!prepared || typeof prepared !== 'object' || Array.isArray(prepared) || !prepared.audit?.preparation?.input) invalid('receipt node');
  const { ledger, ...preparation } = prepared.audit.preparation;
  return { ...prepared, audit: { ...prepared.audit, preparation } };
}

export function receiptHash(prepared) {
  const node = nodeFrom(prepared);
  const { receiptHash, ...audit } = node.audit;
  return digest({ tool: node.tool, arguments: node.arguments, audit });
}

export function receiptReferenceHash(reference) {
  if (!reference || typeof reference !== 'object' || Array.isArray(reference)
    || Object.keys(reference).length !== 1 || !/^[a-f0-9]{64}$/.test(reference.receiptRef)) invalid('receipt reference');
  return reference.receiptRef;
}

function references(node) {
  const input = node.audit.preparation.input;
  return [input.rejectedPreparedRequest,
    ...(input.modelRejections ?? []).map(value => value.preparedRequest),
    ...(node.audit.selection?.modelRejections ?? []).map(value => value.preparedRequest)]
    .filter(value => value !== undefined).map(receiptReferenceHash);
}

export function createReceiptLedger() {
  const nodes = new Map();
  const rebuilt = new Map();
  const rebuilding = new Set();
  const add = (id, node) => {
    if (nodes.has(id) && digest(nodes.get(id)) !== digest(node)) invalid('conflicting duplicate receipt');
    nodes.set(id, node);
  };
  const walk = (root, graph) => {
    const visited = new Set();
    const visiting = new Set();
    const visit = id => {
      if (visiting.has(id)) invalid('receipt cycle');
      if (visited.has(id)) return;
      const node = graph.get(id);
      if (!node) invalid('missing receipt reference');
      visiting.add(id);
      references(node).forEach(visit);
      visiting.delete(id);
      visited.add(id);
    };
    visit(root);
    return visited;
  };
  const capture = prepared => {
    const root = nodeFrom(prepared);
    const id = root.audit.receiptHash;
    const ledger = prepared.audit.preparation.ledger;
    if (!ledger || typeof ledger !== 'object' || Array.isArray(ledger)) invalid('receipt ledger');
    const graph = new Map(Object.entries(ledger));
    if (graph.has(id)) invalid('duplicate root receipt');
    graph.set(id, root);
    const reachable = walk(id, graph);
    if (reachable.size !== graph.size) invalid('unreferenced receipt node');
    for (const [key, node] of graph) {
      if (node.audit?.preparation?.ledger !== undefined || key !== node.audit?.receiptHash || key !== receiptHash(node)) invalid('receipt checksum');
      add(key, structuredClone(node));
    }
    return { receiptRef: id };
  };
  return {
    input(input) {
      const normalized = { ...input };
      if (input.rejectedPreparedRequest !== undefined) normalized.rejectedPreparedRequest = capture(input.rejectedPreparedRequest);
      if (input.modelRejections !== undefined) normalized.modelRejections = input.modelRejections.map(rejection => ({ ...rejection,
        ...(rejection.preparedRequest === undefined ? {} : { preparedRequest: capture(rejection.preparedRequest) }) }));
      return normalized;
    },
    node(reference) {
      const node = nodes.get(receiptReferenceHash(reference));
      if (!node) invalid('missing receipt reference');
      return node;
    },
    async reconstruct(node, prepare) {
      const id = node.audit.receiptHash;
      if (rebuilt.has(id)) return rebuilt.get(id);
      if (rebuilding.has(id)) invalid('receipt cycle');
      rebuilding.add(id);
      try {
        const result = await prepare();
        rebuilt.set(id, result);
        return result;
      } finally { rebuilding.delete(id); }
    },
    complete(prepared) {
      const root = nodeFrom(prepared);
      const id = root.audit.receiptHash;
      const graph = new Map(nodes);
      graph.set(id, root);
      const reachable = walk(id, graph);
      const ledger = Object.fromEntries([...reachable].filter(key => key !== id).sort().map(key => [key, graph.get(key)]));
      return structuredClone({ ...root, audit: { ...root.audit, preparation: { ...root.audit.preparation, ledger } } });
    }
  };
}
