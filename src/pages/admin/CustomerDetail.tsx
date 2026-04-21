import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import {
  STAGES,
  stageLabel,
  formatDate,
  categoryLabel,
  DIAGNOSTIC_STATUS,
  IMPLEMENTATION_STATUS,
  PAYMENT_STATUS,
  labelOf,
  isImplementationStage,
} from "@/lib/portal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft,
  FileText,
  Trash2,
  ExternalLink,
  Download,
  Image as ImageIcon,
  Plus,
  CheckCircle2,
  Circle,
  Copy,
  Upload as UploadIcon,
} from "lucide-react";
import { toast } from "sonner";

export default function CustomerDetail() {
  const { id } = useParams();
  const [c, setC] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [assigned, setAssigned] = useState<any[]>([]);
  const [allResources, setAllResources] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [uploads, setUploads] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [selectedResource, setSelectedResource] = useState("");
  const [newTask, setNewTask] = useState({ title: "", due_date: "" });
  const [newChecklist, setNewChecklist] = useState("");

  const load = async () => {
    if (!id) return;
    const [cust, notesRes, assignRes, resRes, taskRes, chkRes, tlRes, upRes] = await Promise.all([
      supabase.from("customers").select("*").eq("id", id).single(),
      supabase.from("customer_notes").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
      supabase.from("resource_assignments").select("id, assigned_at, resources(*)").eq("customer_id", id),
      supabase.from("resources").select("*").order("title"),
      supabase.from("customer_tasks").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
      supabase.from("checklist_items").select("*").eq("customer_id", id).order("position"),
      supabase.from("customer_timeline").select("*").eq("customer_id", id).order("created_at", { ascending: false }).limit(50),
      supabase.from("customer_uploads").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
    ]);
    if (cust.data) setC(cust.data);
    if (notesRes.data) setNotes(notesRes.data);
    if (assignRes.data) setAssigned(assignRes.data);
    if (resRes.data) setAllResources(resRes.data);
    if (taskRes.data) setTasks(taskRes.data);
    if (chkRes.data) setChecklist(chkRes.data);
    if (tlRes.data) setTimeline(tlRes.data);
    if (upRes.data) setUploads(upRes.data);
  };

  useEffect(() => { load(); }, [id]);

  const updateField = async (field: string, value: any) => {
    setC({ ...c, [field]: value });
    const { error } = await supabase.from("customers").update({ [field]: value } as any).eq("id", id);
    if (error) toast.error("Update failed");
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("customer_notes")
      .insert([{ customer_id: id, content: newNote, author_id: u.user?.id }]);
    if (error) toast.error("Note failed");
    else { setNewNote(""); load(); }
  };

  const assignResource = async () => {
    if (!selectedResource) return;
    const { error } = await supabase
      .from("resource_assignments")
      .insert([{ customer_id: id, resource_id: selectedResource }]);
    if (error) toast.error(error.message);
    else { toast.success("Resource assigned"); setSelectedResource(""); load(); }
  };

  const unassign = async (aid: string) => {
    await supabase.from("resource_assignments").delete().eq("id", aid);
    load();
  };

  const duplicateTemplate = async (resourceId: string) => {
    const original = allResources.find((r) => r.id === resourceId);
    if (!original) return;
    const { data: u } = await supabase.auth.getUser();
    const copy = {
      title: `${original.title} — ${c.business_name || c.full_name}`,
      description: original.description,
      category: "client_specific",
      resource_type: original.resource_type,
      visibility: "customer",
      url: original.url,
      screenshot_url: original.screenshot_url,
      downloadable: original.downloadable,
      created_by: u.user?.id,
    };
    const { data, error } = await supabase.from("resources").insert([copy as any]).select("id").single();
    if (error || !data) return toast.error(error?.message || "Failed");
    await supabase.from("resource_assignments").insert([{ customer_id: id, resource_id: data.id }]);
    toast.success("Template duplicated and assigned");
    load();
  };

  const addTask = async () => {
    if (!newTask.title.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("customer_tasks").insert([{
      customer_id: id, title: newTask.title, due_date: newTask.due_date || null, created_by: u.user?.id,
    }]);
    if (error) return toast.error(error.message);
    setNewTask({ title: "", due_date: "" });
    load();
  };
  const toggleTask = async (t: any) => {
    const status = t.status === "done" ? "open" : "done";
    await supabase.from("customer_tasks").update({ status, completed_at: status === "done" ? new Date().toISOString() : null }).eq("id", t.id);
    load();
  };
  const removeTask = async (tid: string) => {
    await supabase.from("customer_tasks").delete().eq("id", tid);
    load();
  };

  const addChecklistItem = async () => {
    if (!newChecklist.trim()) return;
    const pos = checklist.length;
    await supabase.from("checklist_items").insert([{ customer_id: id, title: newChecklist, position: pos }]);
    setNewChecklist("");
    load();
  };
  const toggleChecklist = async (item: any) => {
    await supabase.from("checklist_items").update({
      completed: !item.completed,
      completed_at: !item.completed ? new Date().toISOString() : null,
    }).eq("id", item.id);
    load();
  };
  const removeChecklist = async (cid: string) => {
    await supabase.from("checklist_items").delete().eq("id", cid);
    load();
  };

  const adminUpload = async (file: File) => {
    const path = `${id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage.from("client-uploads").upload(path, file);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("client-uploads").getPublicUrl(path);
    await supabase.from("customer_uploads").insert([{
      customer_id: id, file_name: file.name, file_path: path, file_url: data.publicUrl, size_bytes: file.size,
    }]);
    toast.success("Uploaded");
    load();
  };

  if (!c)
    return (
      <PortalShell variant="admin">
        <div className="text-muted-foreground">Loading…</div>
      </PortalShell>
    );

  const customerVisibleResources = allResources.filter((r) => isClientVisible(r.visibility));
  const internalResources = allResources.filter((r) => !isClientVisible(r.visibility));

  return (
    <PortalShell variant="admin">
      <Link to="/admin/customers" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-3.5 w-3.5" /> All customers
      </Link>

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{c.business_name || "Client"}</div>
          <h1 className="mt-1 text-3xl text-foreground">{c.full_name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge tone="primary">{stageLabel(c.stage)}</Badge>
            <Badge tone="muted">DX: {labelOf(DIAGNOSTIC_STATUS, c.diagnostic_status)}</Badge>
            <Badge tone="muted">IM: {labelOf(IMPLEMENTATION_STATUS, c.implementation_status)}</Badge>
            <Badge tone={c.payment_status === "unpaid" ? "warn" : "ok"}>
              {labelOf(PAYMENT_STATUS, c.payment_status)}
            </Badge>
            {c.portal_unlocked && <Badge tone="ok">Portal Unlocked</Badge>}
          </div>
        </div>
        <select
          value={c.stage}
          onChange={(e) => updateField("stage", e.target.value)}
          className="bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground"
        >
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-card border border-border rounded-lg p-1 mb-6">
          {["overview","timeline","notes","tasks","tools","files","access","billing"].map((k) => (
            <TabsTrigger key={k} value={k} className="capitalize text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-foreground">
              {k}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Section title="Contact & Business" className="lg:col-span-2">
              <FieldRow label="Email" value={c.email} />
              <FieldRow label="Phone" value={c.phone || "—"} />
              <FieldRow label="Business" value={c.business_name || "—"} />
              <FieldRow label="Service" value={
                <input defaultValue={c.service_type || ""} onBlur={(e) => updateField("service_type", e.target.value)}
                  className="bg-transparent text-sm text-foreground focus:outline-none w-full" />
              } />
              <FieldRow label="Description" value={
                <textarea defaultValue={c.business_description || ""} onBlur={(e) => updateField("business_description", e.target.value)}
                  rows={3} className="w-full bg-transparent text-sm text-foreground focus:outline-none resize-none" />
              } />
              <FieldRow label="Next Action" value={
                <input defaultValue={c.next_action || ""} onBlur={(e) => updateField("next_action", e.target.value)}
                  placeholder="e.g. Send onboarding email" className="bg-transparent text-sm text-foreground focus:outline-none w-full" />
              } />
            </Section>

            <Section title="Status">
              <StatusSelect label="Diagnostic" value={c.diagnostic_status} options={DIAGNOSTIC_STATUS} onChange={(v) => updateField("diagnostic_status", v)} />
              <StatusSelect label="Implementation" value={c.implementation_status} options={IMPLEMENTATION_STATUS} onChange={(v) => updateField("implementation_status", v)} />
              <StatusSelect label="Payment" value={c.payment_status} options={PAYMENT_STATUS} onChange={(v) => updateField("payment_status", v)} />
              <FieldRow label="Track" value={c.track || "shared"} />
              <FieldRow label="Last activity" value={formatDate(c.last_activity_at || c.updated_at)} />
            </Section>
          </div>
        </TabsContent>

        {/* NOTES */}
        <TabsContent value="notes">
          <Section title="Internal Notes">
            <div className="space-y-3 mb-4">
              {notes.length === 0 && <div className="text-xs text-muted-foreground">No notes yet.</div>}
              {notes.map((n) => (
                <div key={n.id} className="bg-muted/30 border border-border rounded-md p-3">
                  <div className="text-sm text-foreground whitespace-pre-wrap">{n.content}</div>
                  <div className="text-[10px] text-muted-foreground mt-2">{formatDate(n.created_at)}</div>
                </div>
              ))}
            </div>
            <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add an internal note…" rows={3} className="bg-muted/40 border-border" />
            <Button onClick={addNote} size="sm" className="mt-2 bg-primary hover:bg-secondary">Add note</Button>
          </Section>
        </TabsContent>

        {/* FILES */}
        <TabsContent value="files">
          <Section title="Client Uploads">
            <p className="text-xs text-muted-foreground mb-4">
              Files uploaded by the client appear here. You can also upload files on their behalf.
            </p>
            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer mb-4">
              <UploadIcon className="h-3.5 w-3.5" /> Upload file for client
              <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && adminUpload(e.target.files[0])} />
            </label>
            <div className="space-y-2">
              {uploads.length === 0 && <div className="text-xs text-muted-foreground">No uploads yet.</div>}
              {uploads.map((u) => (
                <a key={u.id} href={u.file_url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-3 p-3 rounded-md bg-muted/30 border border-border hover:border-primary/40">
                  <FileText className="h-4 w-4 text-primary" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground truncate">{u.file_name}</div>
                    <div className="text-[10px] text-muted-foreground">{formatDate(u.created_at)}</div>
                  </div>
                  <Download className="h-3.5 w-3.5 text-muted-foreground" />
                </a>
              ))}
            </div>
          </Section>
        </TabsContent>

        {/* TOOLS */}
        <TabsContent value="tools" className="space-y-6">
          <Section title="Assigned Tools">
            <div className="space-y-2 mb-4">
              {assigned.length === 0 && (
                <div className="text-xs text-muted-foreground">No tools assigned yet.</div>
              )}
              {assigned.map((a) => (
                <div key={a.id} className="bg-muted/30 border border-border rounded-md p-3">
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 text-primary mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-sm text-foreground truncate">{a.resources?.title}</div>
                        <VisibilityBadge
                          visibility={a.resources?.visibility}
                          override={a.visibility_override}
                          size="sm"
                        />
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        {categoryLabel(a.resources?.category)} · {a.resources?.resource_type}
                      </div>
                    </div>
                    <button onClick={() => unassign(a.id)} className="text-muted-foreground hover:text-destructive" aria-label="Unassign">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-2 pl-7">
                    {a.resources?.url && (
                      <a href={a.resources.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] text-primary hover:text-secondary">
                        <ExternalLink className="h-3 w-3" /> Open
                      </a>
                    )}
                    {a.resources?.url && a.resources?.downloadable && (
                      <a href={a.resources.url} download className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                        <Download className="h-3 w-3" /> Download
                      </a>
                    )}
                    {a.resources?.screenshot_url && (
                      <a href={a.resources.screenshot_url} download className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                        <ImageIcon className="h-3 w-3" /> Screenshot
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <select value={selectedResource} onChange={(e) => setSelectedResource(e.target.value)}
                className="flex-1 bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground">
                <option value="">Select a customer-visible tool…</option>
                {customerVisibleResources.map((r) => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
              <Button onClick={assignResource} size="sm" className="bg-primary hover:bg-secondary">Assign</Button>
            </div>
          </Section>

          <Section title="Duplicate Template into Client Version">
            <p className="text-xs text-muted-foreground mb-3">
              Pick any internal or customer template — a client-specific copy will be created and auto-assigned.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {internalResources.concat(customerVisibleResources).slice(0, 12).map((r) => (
                <button key={r.id} onClick={() => duplicateTemplate(r.id)}
                  className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/30 border border-border hover:border-primary/40 text-left">
                  <div className="min-w-0">
                    <div className="text-sm text-foreground truncate">{r.title}</div>
                    <div className="text-[10px] text-muted-foreground">{categoryLabel(r.category)}</div>
                  </div>
                  <Copy className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </div>
          </Section>
        </TabsContent>

        {/* TASKS */}
        <TabsContent value="tasks" className="space-y-6">
          <Section title="Tasks">
            <div className="space-y-2 mb-4">
              {tasks.length === 0 && <div className="text-xs text-muted-foreground">No tasks yet.</div>}
              {tasks.map((t) => (
                <div key={t.id} className="flex items-start gap-3 p-3 rounded-md bg-muted/30 border border-border">
                  <button onClick={() => toggleTask(t)} className="mt-0.5 text-primary">
                    {t.status === "done" ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm ${t.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>{t.title}</div>
                    {t.due_date && <div className="text-[10px] text-muted-foreground">Due {formatDate(t.due_date)}</div>}
                  </div>
                  <button onClick={() => removeTask(t.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input placeholder="Task title" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} className="bg-muted/40 border-border" />
              <Input type="date" value={newTask.due_date} onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })} className="bg-muted/40 border-border w-44" />
              <Button onClick={addTask} size="sm" className="bg-primary hover:bg-secondary">
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
          </Section>

          {isImplementationStage(c.stage) && (
            <Section title="Implementation Checklist">
              <div className="space-y-2 mb-4">
                {checklist.length === 0 && <div className="text-xs text-muted-foreground">No checklist items.</div>}
                {checklist.map((it) => (
                  <div key={it.id} className="flex items-start gap-3 p-3 rounded-md bg-muted/30 border border-border">
                    <button onClick={() => toggleChecklist(it)} className="mt-0.5 text-primary">
                      {it.completed ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                    </button>
                    <div className={`flex-1 text-sm ${it.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{it.title}</div>
                    <button onClick={() => removeChecklist(it.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="New checklist item" value={newChecklist} onChange={(e) => setNewChecklist(e.target.value)} className="bg-muted/40 border-border" />
                <Button onClick={addChecklistItem} size="sm" className="bg-primary hover:bg-secondary">
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </div>
            </Section>
          )}
        </TabsContent>

        {/* TIMELINE */}
        <TabsContent value="timeline">
          <Section title="Activity Timeline">
            <div className="space-y-3">
              {timeline.length === 0 && <div className="text-xs text-muted-foreground">No activity yet.</div>}
              {timeline.map((t) => (
                <div key={t.id} className="flex gap-3 pb-3 border-b border-border last:border-0">
                  <div className="w-1 bg-primary/40 rounded-full flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground">{t.title}</div>
                    {t.detail && <div className="text-xs text-muted-foreground mt-0.5">{t.detail}</div>}
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                      {t.event_type.replace(/_/g, " ")} · {formatDate(t.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </TabsContent>

        {/* ACCESS */}
        <TabsContent value="access" className="space-y-6">
          <Section title="Portal Access">
            <FieldRow label="Portal" value={
              <div className="flex items-center gap-3">
                <span className={c.portal_unlocked ? "text-secondary" : "text-muted-foreground"}>
                  {c.portal_unlocked ? "Unlocked" : "Locked"}
                </span>
                <button
                  onClick={() => updateField("portal_unlocked", !c.portal_unlocked)}
                  className="text-xs px-2.5 py-1 rounded-md bg-muted/40 border border-border hover:border-primary/40"
                >
                  {c.portal_unlocked ? "Lock portal" : "Unlock portal"}
                </button>
              </div>
            } />
            <FieldRow label="Login email" value={c.email} />
            <FieldRow label="Linked user" value={c.user_id ? <code className="text-[11px]">{c.user_id}</code> : <span className="text-muted-foreground">Not yet linked</span>} />
            <FieldRow label="Track" value={c.track || "shared"} />
            <FieldRow label="Status" value={c.status || "active"} />
          </Section>
          <div className="text-[11px] text-muted-foreground">
            Tip: clients are linked automatically the first time they sign up with their email.
            Portal access is unlocked when the client moves to <strong>Implementation Added</strong>.
          </div>
        </TabsContent>

        {/* BILLING */}
        <TabsContent value="billing" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <BillingCard label="Service" value={c.service_type || "—"} />
            <BillingCard label="Payment status" value={labelOf(PAYMENT_STATUS, c.payment_status)} tone={c.payment_status === "unpaid" ? "warn" : "ok"} />
            <BillingCard label="Track" value={c.track === "implementation" ? "Implementation" : c.track === "diagnostic_only" ? "Diagnostic Only" : "Shared"} />
            <BillingCard label="Monthly revenue" value={c.monthly_revenue || "—"} />
            <BillingCard label="Started" value={c.implementation_started_at ? formatDate(c.implementation_started_at) : "—"} />
            <BillingCard label="Created" value={formatDate(c.created_at)} />
          </div>
          <Section title="Invoices">
            <p className="text-xs text-muted-foreground">
              Invoice history will appear here once a payment provider is connected. For now, update the
              payment status from the Overview tab to reflect what was collected.
            </p>
          </Section>
        </TabsContent>
      </Tabs>
    </PortalShell>
  );
}

const Section = ({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) => (
  <div className={`bg-card border border-border rounded-xl p-6 ${className || ""}`}>
    <h3 className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-4">{title}</h3>
    {children}
  </div>
);

const FieldRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start gap-4 py-2 border-b border-border last:border-0">
    <div className="w-28 text-xs text-muted-foreground uppercase tracking-wider pt-1">{label}</div>
    <div className="flex-1 text-sm text-foreground">{value}</div>
  </div>
);

const StatusSelect = ({ label, value, options, onChange }: { label: string; value: any; options: readonly { key: string; label: string }[]; onChange: (v: string) => void }) => (
  <FieldRow label={label} value={
    <select value={value || options[0].key} onChange={(e) => onChange(e.target.value)}
      className="bg-muted/40 border border-border rounded-md px-2 py-1 text-sm text-foreground w-full">
      {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
    </select>
  } />
);

const Badge = ({ tone, children }: { tone: "primary" | "muted" | "ok" | "warn"; children: React.ReactNode }) => {
  const cls =
    tone === "primary" ? "bg-primary/15 text-primary border-primary/40"
    : tone === "ok" ? "bg-secondary/15 text-secondary border-secondary/40"
    : tone === "warn" ? "bg-amber-500/15 text-amber-400 border-amber-500/40"
    : "bg-muted/40 text-muted-foreground border-border";
  return <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${cls}`}>{children}</span>;
};

const BillingCard = ({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "ok" | "warn" }) => (
  <div className="bg-card border border-border rounded-xl p-5">
    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className={`mt-2 text-base ${tone === "warn" ? "text-amber-400" : tone === "ok" ? "text-secondary" : "text-foreground"}`}>{value}</div>
  </div>
);
