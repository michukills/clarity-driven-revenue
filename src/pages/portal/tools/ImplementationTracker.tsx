import { useState } from "react";
import { ClientToolShell } from "@/components/tools/ClientToolShell";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Item = { id: string; title: string; owner: string; status: "todo" | "doing" | "done"; notes: string };
const defaultData = { items: [] as Item[] };

const STATUSES: Item["status"][] = ["todo", "doing", "done"];

export default function ImplementationTracker() {
  const [data, setData] = useState<{ items: Item[] }>(defaultData);

  const addItem = () => {
    setData({ items: [...data.items, { id: crypto.randomUUID(), title: "", owner: "", status: "todo", notes: "" }] });
  };
  const updateItem = (id: string, patch: Partial<Item>) => {
    setData({ items: data.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  };
  const removeItem = (id: string) => {
    setData({ items: data.items.filter((i) => i.id !== id) });
  };

  const counts = STATUSES.map((s) => ({ s, n: data.items.filter((i) => i.status === s).length }));
  const done = counts.find((c) => c.s === "done")!.n;
  const total = data.items.length || 1;

  return (
    <ClientToolShell
      toolKey="client_implementation_tracker"
      toolTitle="Implementation Command Tracker™"
      description="Track your in-flight implementation items. Add tasks, assign owners, and update status as work moves forward."
      entryNoun="progress update"
      entryNounPlural="progress updates"
      data={data}
      setData={setData}
      defaultData={defaultData}
      computeSummary={(d) => ({ total: d.items.length, done: d.items.filter((i: Item) => i.status === "done").length })}
      rightPanel={
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Progress</div>
          <div className="text-3xl text-foreground">{done}<span className="text-base text-muted-foreground">/{data.items.length}</span></div>
          <div className="text-xs text-muted-foreground mt-1">complete</div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-3">
            <div className="h-full bg-primary" style={{ width: `${(done / total) * 100}%` }} />
          </div>
          <div className="mt-4 space-y-1 text-xs">
            {counts.map((c) => (
              <div key={c.s} className="flex justify-between text-muted-foreground capitalize">
                <span>{c.s}</span><span>{c.n}</span>
              </div>
            ))}
          </div>
        </div>
      }
    >
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-foreground">Tasks</div>
          <Button onClick={addItem} variant="outline" className="border-border" size="sm">
            <Plus className="h-3.5 w-3.5" /> Add task
          </Button>
        </div>
        {data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No tasks yet. Click "Add task" to begin.</p>
        ) : (
          <div className="space-y-2">
            {data.items.map((it) => (
              <div key={it.id} className="grid grid-cols-1 md:grid-cols-[1fr_180px_140px_auto] gap-2 p-3 rounded-md bg-muted/20 border border-border">
                <Input value={it.title} onChange={(e) => updateItem(it.id, { title: e.target.value })} placeholder="Task" className="bg-background border-border" />
                <Input value={it.owner} onChange={(e) => updateItem(it.id, { owner: e.target.value })} placeholder="Owner" className="bg-background border-border" />
                <select
                  value={it.status}
                  onChange={(e) => updateItem(it.id, { status: e.target.value as Item["status"] })}
                  className="bg-background border border-border rounded-md px-2 text-sm text-foreground h-10"
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={() => removeItem(it.id)} className="text-muted-foreground hover:text-destructive px-2">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </ClientToolShell>
  );
}
