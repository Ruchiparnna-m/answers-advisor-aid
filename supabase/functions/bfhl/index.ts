// SRM BFHL Challenge — POST /bfhl
// Public endpoint, CORS enabled, no auth required.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ====== EDIT THESE WITH YOUR DETAILS ======
const USER = {
  user_id: "ruchiparnna_mohanty_15112003",
  email_id: "rm4756@srmist.edu.in",
  college_roll_number: "RA2311003050438",
};
// ==========================================

const NODE_RE = /^([A-Z])->([A-Z])$/;

interface Hierarchy {
  root: string;
  tree: Record<string, unknown>;
  depth?: number;
  has_cycle?: true;
}

function processData(data: unknown) {
  const invalid_entries: string[] = [];
  const duplicate_edges: string[] = [];
  const seen = new Set<string>();
  const edges: [string, string][] = [];
  const childParent: Record<string, string> = {};

  if (!Array.isArray(data)) {
    return {
      hierarchies: [],
      invalid_entries: [],
      duplicate_edges: [],
      summary: { total_trees: 0, total_cycles: 0, largest_tree_root: "" },
    };
  }

  for (const raw of data) {
    if (typeof raw !== "string") {
      invalid_entries.push(String(raw));
      continue;
    }
    const s = raw.trim();
    const m = s.match(NODE_RE);
    if (!m || m[1] === m[2]) {
      invalid_entries.push(raw);
      continue;
    }
    const key = `${m[1]}->${m[2]}`;
    if (seen.has(key)) {
      if (!duplicate_edges.includes(key)) duplicate_edges.push(key);
      continue;
    }
    seen.add(key);
    edges.push([m[1], m[2]]);
  }

  const adj: Record<string, string[]> = {};
  const nodes = new Set<string>();
  for (const [p, c] of edges) {
    nodes.add(p);
    nodes.add(c);
    if (childParent[c] !== undefined) continue; // diamond: discard later parents
    childParent[c] = p;
    (adj[p] = adj[p] || []).push(c);
  }

  // union-find groups
  const parent: Record<string, string> = {};
  const find = (x: string): string =>
    parent[x] === x ? x : (parent[x] = find(parent[x]));
  const union = (a: string, b: string) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };
  for (const n of nodes) parent[n] = n;
  for (const c in childParent) union(childParent[c], c);

  const groups: Record<string, string[]> = {};
  for (const n of nodes) {
    const r = find(n);
    (groups[r] = groups[r] || []).push(n);
  }

  const hierarchies: Hierarchy[] = [];
  for (const gid in groups) {
    const groupNodes = groups[gid].slice().sort();
    const roots = groupNodes.filter((n) => childParent[n] === undefined);

    if (roots.length === 0) {
      hierarchies.push({ root: groupNodes[0], tree: {}, has_cycle: true });
      continue;
    }

    let hasCycle = false;
    const visited = new Set<string>();
    const dfs = (node: string, stack: Set<string>) => {
      if (stack.has(node)) {
        hasCycle = true;
        return;
      }
      if (visited.has(node)) return;
      visited.add(node);
      stack.add(node);
      for (const ch of adj[node] || []) dfs(ch, stack);
      stack.delete(node);
    };
    for (const r of roots) dfs(r, new Set<string>());
    if (!hasCycle && groupNodes.some((n) => !visited.has(n))) hasCycle = true;

    const root = roots.slice().sort()[0];

    if (hasCycle) {
      hierarchies.push({ root, tree: {}, has_cycle: true });
      continue;
    }

    const build = (n: string): Record<string, unknown> => {
      const obj: Record<string, unknown> = {};
      for (const ch of (adj[n] || []).slice().sort()) obj[ch] = build(ch);
      return obj;
    };
    const tree = { [root]: build(root) };

    const depth = (n: string): number => {
      const ch = adj[n] || [];
      if (!ch.length) return 1;
      return 1 + Math.max(...ch.map(depth));
    };
    hierarchies.push({ root, tree, depth: depth(root) });
  }

  hierarchies.sort((a, b) => a.root.localeCompare(b.root));

  const valid = hierarchies.filter((h) => !h.has_cycle);
  const cycles = hierarchies.filter((h) => h.has_cycle);
  let largest = "";
  if (valid.length) {
    const sorted = [...valid].sort(
      (a, b) => (b.depth! - a.depth!) || a.root.localeCompare(b.root),
    );
    largest = sorted[0].root;
  }

  return {
    hierarchies,
    invalid_entries,
    duplicate_edges,
    summary: {
      total_trees: valid.length,
      total_cycles: cycles.length,
      largest_tree_root: largest,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Use POST with JSON body" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const body = await req.json().catch(() => ({}));
    const result = processData(body?.data);
    return new Response(JSON.stringify({ ...USER, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Internal server error", message: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
