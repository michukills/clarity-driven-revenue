import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScoreBenchmarkScale } from "@/components/scoring/ScoreBenchmarkScale";
import { useAuth } from "@/contexts/AuthContext";
import {
  loadCustomerStabilityScore,
  upsertCustomerStabilityScore,
  type StabilityScoreRow,
} from "@/lib/scoring/stabilityScore";
import { Save } from "lucide-react";
import { toast } from "sonner";

interface Props {
  customerId: string;
}

export function AdminStabilityScorePanel({ customerId }: Props) {
  const { user } = useAuth();
  const [row, setRow] = useState<StabilityScoreRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState<string>("");
  const [source, setSource] = useState("manual");
  const [adminNote, setAdminNote] = useState("");
  const [clientNote, setClientNote] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    try {
      const data = await loadCustomerStabilityScore(customerId);
      setRow(data);
      setScore(data ? String(data.score) : "");
      setSource(data?.source ?? "manual");
      setAdminNote(data?.admin_note ?? "");
      setClientNote(data?.client_note ?? "");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!customerId) return;
    setLoading(true);
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const save = async () => {
    const n = Number(score);
    if (!Number.isFinite(n) || n < 0 || n > 1000) {
      toast.error("Score must be between 0 and 1000.");
      return;
    }
    setSaving(true);
    try {
      await upsertCustomerStabilityScore(
        customerId,
        {
          score: n,
          source,
          admin_note: adminNote || null,
          client_note: clientNote || null,
        },
        user?.id ?? null,
      );
      toast.success("Stability score saved");
      await refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const previewScore = score === "" ? null : Number(score);

  return (
    <section className="bg-card border border-border rounded-xl p-5 space-y-5">
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          RGS Stability Score
        </div>
        <h3 className="text-base font-medium text-foreground mt-0.5">
          0–1,000 Benchmark
        </h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
          Record the customer's current RGS Stability Score. The benchmark band
          is calculated automatically and shown to the client at{" "}
          <code className="text-foreground">/portal/scorecard</code>.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <>
          <ScoreBenchmarkScale
            score={previewScore}
            scoreLabel="Live preview"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Score (0–1000)
              </label>
              <Input
                type="number"
                min={0}
                max={1000}
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className="mt-1 bg-muted/40 border-border"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Source
              </label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="mt-1 bg-muted/40 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual entry</SelectItem>
                  <SelectItem value="scorecard">Public Scorecard</SelectItem>
                  <SelectItem value="diagnostic">Diagnostic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {row?.recorded_at && (
              <div className="text-[11px] text-muted-foreground self-end">
                Last recorded {new Date(row.recorded_at).toLocaleString()}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Admin note (internal)
              </label>
              <Textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
                className="mt-1 bg-muted/40 border-border"
                placeholder="Context for the RGS team. Never shown to the client."
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Client note (optional)
              </label>
              <Textarea
                value={clientNote}
                onChange={(e) => setClientNote(e.target.value)}
                rows={3}
                className="mt-1 bg-muted/40 border-border"
                placeholder="Optional plain-language note shown to the client below the score."
              />
            </div>
          </div>

          <div className="flex items-center justify-end">
            <Button
              onClick={save}
              disabled={saving}
              className="bg-primary hover:bg-secondary"
            >
              <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save score"}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}