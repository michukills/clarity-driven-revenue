import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { STAGES, stageLabel, formatDate, categoryLabel } from "@/lib/portal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function CustomerDetail() {
  const { id } = useParams();
  const [c, setC] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [assigned, setAssigned] = useState<any[]>([]);
  const [allResources, setAllResources] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [selectedResource, setSelectedResource] = useState("");

  const load = async () => {
    const [cust, notesRes, assignRes, resRes] = await Promise.all([
      supabase.from("customers").select("*").eq("id", id).single(),
      supabase
        .from("customer_notes")
        .select("*")
        .eq("customer_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("resource_assignments")
        .select("id, assigned_at, resources(*)")
        .eq("customer_id", id),
      supabase.from("resources").select("*").order("title"),
    ]);
    if (cust.data) setC(cust.data);
    if (notesRes.data) setNotes(notesRes.data);
    if (assignRes.data) setAssigned(assignRes.data);
    if (resRes.data) setAllResources(resRes.data);
  };

  useEffect(() => {
    if (id) load();
  }, [id]);

  const updateField = async (field: string, value: any) => {
    setC({ ...c, [field]: value });
    const { error } = await supabase
      .from("customers")
      .update({ [field]: value } as any)
      .eq("id", id);
    if (error) toast.error("Update failed");
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("customer_notes")
      .insert([{ customer_id: id, content: newNote, author_id: u.user?.id }]);
    if (error) toast.error("Note failed");
    else {
      setNewNote("");
      load();
    }
  };

  const assignResource = async () => {
    if (!selectedResource) return;
    const { error } = await supabase
      .from("resource_assignments")
      .insert([{ customer_id: id, resource_id: selectedResource }]);
    if (error) toast.error(error.message);
    else {
      toast.success("Resource assigned");
      setSelectedResource("");
      load();
    }
  };

  const unassign = async (aid: string) => {
    await supabase.from("resource_assignments").delete().eq("id", aid);
    load();
  };

  if (!c)
    return (
      <PortalShell variant="admin">
        <div className="text-muted-foreground">Loading…</div>
      </PortalShell>
    );

  return (
    <PortalShell variant="admin">
      <Link
        to="/admin/customers"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All customers
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl text-foreground">{c.full_name}</h1>
          <div className="text-muted-foreground mt-1">{c.business_name || "—"}</div>
        </div>
        <select
          value={c.stage}
          onChange={(e) => updateField("stage", e.target.value)}
          className="bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground"
        >
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: info */}
        <div className="lg:col-span-2 space-y-6">
          <Section title="Contact & Business">
            <FieldRow label="Email" value={c.email} />
            <FieldRow label="Phone" value={c.phone || "—"} />
            <FieldRow label="Business" value={c.business_name || "—"} />
            <FieldRow
              label="Service"
              value={
                <input
                  defaultValue={c.service_type || ""}
                  onBlur={(e) => updateField("service_type", e.target.value)}
                  className="bg-transparent text-sm text-foreground focus:outline-none w-full"
                />
              }
            />
            <FieldRow label="Stage" value={stageLabel(c.stage)} />
            <FieldRow
              label="Status"
              value={
                <select
                  value={c.status}
                  onChange={(e) => updateField("status", e.target.value)}
                  className="bg-transparent text-sm text-foreground focus:outline-none"
                >
                  <option value="active">active</option>
                  <option value="paused">paused</option>
                  <option value="closed">closed</option>
                </select>
              }
            />
            <FieldRow
              label="Description"
              value={
                <textarea
                  defaultValue={c.business_description || ""}
                  onBlur={(e) => updateField("business_description", e.target.value)}
                  rows={3}
                  className="w-full bg-transparent text-sm text-foreground focus:outline-none resize-none"
                />
              }
            />
          </Section>

          <Section title="Internal Notes">
            <div className="space-y-3 mb-4">
              {notes.length === 0 && (
                <div className="text-xs text-muted-foreground">No notes yet.</div>
              )}
              {notes.map((n) => (
                <div key={n.id} className="bg-muted/30 border border-border rounded-md p-3">
                  <div className="text-sm text-foreground whitespace-pre-wrap">{n.content}</div>
                  <div className="text-[10px] text-muted-foreground mt-2">
                    {formatDate(n.created_at)}
                  </div>
                </div>
              ))}
            </div>
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add an internal note…"
              rows={3}
              className="bg-muted/40 border-border"
            />
            <Button
              onClick={addNote}
              size="sm"
              className="mt-2 bg-primary hover:bg-secondary"
            >
              Add note
            </Button>
          </Section>
        </div>

        {/* Right: resources */}
        <div className="space-y-6">
          <Section title="Assigned Resources">
            <div className="space-y-2 mb-4">
              {assigned.length === 0 && (
                <div className="text-xs text-muted-foreground">None assigned.</div>
              )}
              {assigned.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start gap-3 bg-muted/30 border border-border rounded-md p-3"
                >
                  <FileText className="h-4 w-4 text-primary mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground truncate">{a.resources?.title}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {categoryLabel(a.resources?.category)}
                    </div>
                  </div>
                  <button
                    onClick={() => unassign(a.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <select
              value={selectedResource}
              onChange={(e) => setSelectedResource(e.target.value)}
              className="w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground mb-2"
            >
              <option value="">Select a resource…</option>
              {allResources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
            <Button
              onClick={assignResource}
              size="sm"
              className="w-full bg-primary hover:bg-secondary"
            >
              Assign
            </Button>
          </Section>
        </div>
      </div>
    </PortalShell>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-card border border-border rounded-xl p-6">
    <h3 className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-4">{title}</h3>
    {children}
  </div>
);

const FieldRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start gap-4 py-2 border-b border-border last:border-0">
    <div className="w-28 text-xs text-muted-foreground uppercase tracking-wider pt-1">
      {label}
    </div>
    <div className="flex-1 text-sm text-foreground">{value}</div>
  </div>
);