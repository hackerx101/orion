import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Code2,
  Eye,
  FileCode2,
  FolderOpen,
  LoaderCircle,
  MonitorPlay,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import { createAppPlan, type AppBuildPlan } from '@/lib/orion-brain';

type BuildStage = 'brief' | 'building' | 'complete';

type MyAppsProps = {
  onClose: () => void;
  onNotice: (message: string) => void;
};

export default function MyApps({ onClose, onNotice }: MyAppsProps) {
  const [prompt, setPrompt] = useState('');
  const [stage, setStage] = useState<BuildStage>('brief');
  const [step, setStep] = useState(0);
  const [plan, setPlan] = useState<AppBuildPlan | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (stage !== 'building' || !plan) return;
    const interval = window.setInterval(() => {
      setStep((current) => {
        if (current >= plan.steps.length - 1) {
          window.clearInterval(interval);
          window.setTimeout(() => setStage('complete'), 500);
          return current;
        }
        return current + 1;
      });
    }, 720);
    return () => window.clearInterval(interval);
  }, [stage, plan]);

  const visibleSteps = useMemo(
    () => plan?.steps.map((label, index) => ({ label, done: stage === 'complete' || index < step, active: stage === 'building' && index === step })) ?? [],
    [plan, stage, step],
  );

  const startBuild = () => {
    if (!prompt.trim()) return;
    const nextPlan = createAppPlan(prompt);
    setPlan(nextPlan);
    setStep(0);
    setPreviewOpen(false);
    setStage('building');
    onNotice('Orion is shaping your app brief');
  };

  const reset = () => {
    setStage('brief');
    setStep(0);
    setPlan(null);
    setPreviewOpen(false);
  };

  return (
    <section className="absolute inset-0 z-30 overflow-y-auto bg-background animate-rise-in" data-testid="screen-my-apps">
      <div className="mx-auto min-h-full w-full max-w-[1120px] px-5 pb-16 pt-6 sm:px-10 sm:pt-10">
        <div className="flex items-center justify-between gap-4">
          <button onClick={onClose} data-testid="button-back-to-chat" className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground">
            <ArrowLeft size={17} />
            Back to chat
          </button>
          <span className="font-mono text-[10px] uppercase tracking-[.16em] text-primary">Orion studio</span>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-start">
          <div>
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.16em] text-primary">
              <Sparkles size={13} />
              My apps
            </div>
            <h1 data-testid="text-create-app-title" className="mt-4 max-w-[520px] text-4xl font-semibold tracking-[-.055em] sm:text-6xl">
              Turn a thought into a first release.
            </h1>
            <p className="mt-5 max-w-[500px] text-[15px] leading-7 text-muted-foreground">
              Tell Orion what you want to make. It will break the idea into a practical first pass, generate the interface, and leave you with a preview to keep shaping.
            </p>

            {stage === 'brief' ? (
              <div className="mt-8 rounded-[26px] border border-border bg-card p-3 shadow-[0_18px_50px_hsl(var(--foreground)/.06)]">
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  data-testid="input-create-app-prompt"
                  placeholder="Build a simple habit tracker for people who want a gentler morning…"
                  rows={6}
                  className="w-full resize-none bg-transparent px-3 pt-2 text-[15px] leading-7 outline-none placeholder:text-muted-foreground/70"
                />
                <div className="flex items-center justify-between gap-3 border-t border-border/70 px-2 pt-3">
                  <span className="font-mono text-[10px] uppercase tracking-[.12em] text-muted-foreground">Start with the why</span>
                  <button onClick={startBuild} disabled={!prompt.trim()} data-testid="button-start-app-build" className="flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-xs font-semibold text-background transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-35">
                    <Plus size={15} />
                    Create app
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-8 rounded-[26px] border border-border bg-card p-5 shadow-[0_18px_50px_hsl(var(--foreground)/.06)]">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Sparkles size={17} /></span>
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-[.12em] text-muted-foreground">Your brief</p>
                    <p data-testid="text-app-brief" className="mt-2 text-sm leading-6 text-foreground/80">{prompt}</p>
                  </div>
                </div>
                {stage === 'complete' && (
                  <button onClick={reset} data-testid="button-create-another-app" className="mt-5 flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground">
                    <Plus size={14} />
                    Create another app
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="rounded-[30px] border border-border bg-card p-5 shadow-[0_22px_70px_hsl(var(--foreground)/.08)] sm:p-7">
            <div className="flex items-center justify-between gap-4 border-b border-border/70 pb-5">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[.15em] text-muted-foreground">Build room</p>
                <h2 data-testid="text-build-room" className="mt-1 text-xl font-semibold tracking-[-.035em]">{plan?.name ?? 'A new app, waiting for a brief'}</h2>
              </div>
              <span className={`rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-[.12em] ${stage === 'complete' ? 'bg-primary/10 text-primary' : stage === 'building' ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'}`}>
                {stage === 'complete' ? 'Ready' : stage === 'building' ? 'Building' : 'Waiting'}
              </span>
            </div>

            {stage === 'brief' ? (
              <div className="grid min-h-[360px] place-items-center py-12 text-center">
                <div>
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-dashed border-primary/35 bg-primary/5 text-primary">
                    <FolderOpen size={25} />
                  </div>
                  <p className="mt-5 text-sm font-semibold">Your build plan will appear here</p>
                  <p className="mx-auto mt-2 max-w-[260px] text-xs leading-5 text-muted-foreground">The progress stays visible while Orion turns your prompt into something you can explore.</p>
                </div>
              </div>
            ) : (
              <div className="pt-6">
                <div className="space-y-4">
                  {visibleSteps.map(({ label, done, active }, index) => (
                    <div key={label} data-testid={`row-build-step-${index}`} className={`flex items-center gap-3 rounded-2xl px-3 py-3 transition ${active ? 'bg-primary/5' : ''}`}>
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${done ? 'bg-primary/10 text-primary' : active ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'}`}>
                        {done ? <Check size={15} /> : active ? <LoaderCircle size={15} className="animate-spin" /> : <span className="text-[11px] font-semibold">{index + 1}</span>}
                      </span>
                      <span className={`text-sm ${active ? 'font-semibold text-foreground' : done ? 'text-foreground/70' : 'text-muted-foreground'}`}>{label}</span>
                      {done && <CheckCircle2 size={15} className="ml-auto text-primary" />}
                    </div>
                  ))}
                </div>

                {stage === 'complete' && plan && (
                  <div className="mt-6 border-t border-border/70 pt-5">
                    <div className="flex items-start gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><FileCode2 size={17} /></span>
                      <div>
                        <p className="text-sm font-semibold">{plan.summary}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">A small, editable first pass is ready. Use the preview to see it rendered, or inspect the files before you continue.</p>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-2">
                      {plan.files.map((file) => <div key={file.name} className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5"><Code2 size={14} className="text-muted-foreground" /><span className="min-w-0 flex-1 truncate font-mono text-[10px]">{file.name}</span><span className="hidden text-[10px] text-muted-foreground sm:block">{file.purpose}</span></div>)}
                    </div>
                    <button onClick={() => setPreviewOpen(true)} data-testid="button-preview-app" className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-3 text-xs font-semibold text-background transition hover:-translate-y-0.5">
                      <MonitorPlay size={15} />
                      Preview app
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {previewOpen && plan && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm" data-testid="dialog-app-preview">
          <section className="flex h-[min(760px,calc(100dvh-32px))] w-full max-w-[1120px] flex-col overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_24px_90px_hsl(var(--foreground)/.25)]">
            <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
              <div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary"><Eye size={17} /></span><div className="min-w-0"><p className="font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">Live preview</p><h2 className="truncate text-sm font-semibold">{plan.name}</h2></div></div>
              <button onClick={() => setPreviewOpen(false)} data-testid="button-close-app-preview" className="rounded-xl p-2 text-muted-foreground hover:bg-muted"><X size={18} /></button>
            </div>
            <div className="grid min-h-0 flex-1 gap-3 bg-muted/30 p-3 lg:grid-cols-2">
              <div className="min-h-0 overflow-auto rounded-2xl border border-border bg-[#101827] p-4"><pre data-testid="text-generated-app-code" className="whitespace-pre-wrap font-mono text-[11px] leading-5 text-slate-200">{plan.code}</pre></div>
              <iframe title={`${plan.name} preview`} srcDoc={plan.code} data-testid="iframe-app-preview" className="min-h-[360px] w-full rounded-2xl border border-border bg-white" sandbox="allow-scripts" />
            </div>
          </section>
        </div>
      )}
    </section>
  );
}