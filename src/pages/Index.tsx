import { useState } from "react";

const BFHL_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bfhl`;

const SAMPLE = `A->B, A->C, B->D, C->E, E->F, X->Y, Y->Z, Z->X, P->Q, Q->R, G->H, G->H, G->I, hello, 1->2, A->`;

interface Hierarchy {
  root: string;
  tree: Record<string, unknown>;
  depth?: number;
  has_cycle?: boolean;
}
interface ApiResponse {
  user_id: string;
  email_id: string;
  college_roll_number: string;
  hierarchies: Hierarchy[];
  invalid_entries: string[];
  duplicate_edges: string[];
  summary: { total_trees: number; total_cycles: number; largest_tree_root: string };
}

const TreeNode = ({ name, children }: { name: string; children: Record<string, unknown> }) => (
  <div className="ml-4 border-l border-border pl-3 py-0.5">
    <span className="font-mono text-primary font-semibold">{name}</span>
    {Object.entries(children).map(([k, v]) => (
      <TreeNode key={k} name={k} children={v as Record<string, unknown>} />
    ))}
  </div>
);

const Index = () => {
  const [input, setInput] = useState(SAMPLE);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr(""); setResult(null); setLoading(true);
    try {
      const data = input.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
      const r = await fetch(BFHL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      if (!r.ok) throw new Error(`API returned ${r.status}`);
      setResult(await r.json());
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <header className="mb-10">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            BFHL Hierarchy Explorer
          </h1>
          <p className="text-muted-foreground mt-3">
            SRM Full Stack Challenge — submit a list of edges like <code className="px-1.5 py-0.5 rounded bg-muted text-sm">A-&gt;B</code> and see the parsed trees, cycles & summary.
          </p>
          <p className="text-xs text-muted-foreground mt-2 font-mono break-all">
            Endpoint: POST {BFHL_URL}
          </p>
        </header>

        <section className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <label className="block text-sm font-medium mb-2">Edges (comma or newline separated)</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={5}
            className="w-full font-mono text-sm p-3 rounded-lg bg-background border border-input focus:outline-none focus:ring-2 focus:ring-ring resize-y"
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={submit}
              disabled={loading}
              className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50 transition"
            >
              {loading ? "Processing…" : "Submit"}
            </button>
            <button
              onClick={() => setInput(SAMPLE)}
              className="px-4 py-2.5 rounded-lg border border-border hover:bg-accent transition"
            >
              Load sample
            </button>
          </div>
        </section>

        {err && (
          <div className="mt-6 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-4">
            <strong>Error:</strong> {err}
          </div>
        )}

        {result && (
          <section className="mt-8 grid gap-5">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">User ID</div>
                <div className="font-mono mt-1 break-all">{result.user_id}</div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Email</div>
                <div className="font-mono mt-1 break-all text-sm">{result.email_id}</div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Roll No</div>
                <div className="font-mono mt-1 break-all">{result.college_roll_number}</div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-lg font-semibold mb-3">Summary</h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold text-primary">{result.summary.total_trees}</div>
                  <div className="text-xs text-muted-foreground mt-1">Trees</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-destructive">{result.summary.total_cycles}</div>
                  <div className="text-xs text-muted-foreground mt-1">Cycles</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">{result.summary.largest_tree_root || "—"}</div>
                  <div className="text-xs text-muted-foreground mt-1">Largest root</div>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-lg font-semibold mb-3">Hierarchies</h2>
              <div className="space-y-4">
                {result.hierarchies.map((h, i) => (
                  <div key={i} className="rounded-lg bg-muted/40 p-4 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono font-bold text-lg">{h.root}</span>
                      {h.has_cycle ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/15 text-destructive border border-destructive/30">CYCLE</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">depth {h.depth}</span>
                      )}
                    </div>
                    {h.has_cycle ? (
                      <p className="text-sm text-muted-foreground italic">Cyclic group — tree omitted.</p>
                    ) : (
                      <div className="text-sm">
                        {Object.entries(h.tree).map(([k, v]) => (
                          <TreeNode key={k} name={k} children={v as Record<string, unknown>} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-semibold mb-2">Invalid entries</h3>
                {result.invalid_entries.length ? (
                  <ul className="font-mono text-sm space-y-1">
                    {result.invalid_entries.map((e, i) => (
                      <li key={i} className="px-2 py-1 rounded bg-muted/50">{JSON.stringify(e)}</li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-muted-foreground">None</p>}
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-semibold mb-2">Duplicate edges</h3>
                {result.duplicate_edges.length ? (
                  <ul className="font-mono text-sm space-y-1">
                    {result.duplicate_edges.map((e, i) => (
                      <li key={i} className="px-2 py-1 rounded bg-muted/50">{e}</li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-muted-foreground">None</p>}
              </div>
            </div>

            <details className="bg-card border border-border rounded-xl p-5">
              <summary className="cursor-pointer font-semibold">Raw JSON response</summary>
              <pre className="mt-3 text-xs font-mono overflow-auto p-3 rounded bg-muted/40">{JSON.stringify(result, null, 2)}</pre>
            </details>
          </section>
        )}
      </div>
    </main>
  );
};

export default Index;
