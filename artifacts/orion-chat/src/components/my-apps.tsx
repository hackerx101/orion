import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Brain,
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
import { createAppPlan, orionResponse, type AppBuildPlan } from '@/lib/orion-brain';
import { generateLocalResponse, ORION_SYSTEM_PROMPT } from '@/lib/transformer.js';

type BuildStage = 'brief' | 'building' | 'complete';
type AppType = 'web' | 'website' | 'mobile' | 'game' | 'dashboard' | 'api';

type MyAppsProps = {
  onClose: () => void;
  onNotice: (message: string) => void;
  model: string;
  systemPrompt: string;
  remainingTokens: number;
  onConsumeTokens: (input: string, output: string) => number;
};

const appTypes: { id: AppType; label: string }[] = [
  { id: 'web', label: 'Web app' },
  { id: 'website', label: 'Website' },
  { id: 'mobile', label: 'Mobile prototype' },
  { id: 'game', label: 'Game' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'api', label: 'API starter' },
];

export default function MyApps({ onClose, onNotice, model, systemPrompt, remainingTokens, onConsumeTokens }: MyAppsProps) {
  const [prompt, setPrompt] = useState('');
  const [appType, setAppType] = useState<AppType>('web');
  const [stage, setStage] = useState<BuildStage>('brief');
  const [step, setStep] = useState(0);
  const [plan, setPlan] = useState<AppBuildPlan | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [studioTab, setStudioTab] = useState<'chat' | 'preview'>('chat');
  const [agentActivity, setAgentActivity] = useState('');
  const [buildError, setBuildError] = useState('');

  const visibleSteps = useMemo(
    () => plan?.steps.map((label, index) => ({ label, done: stage === 'complete' || index < step, active: stage === 'building' && index === step })) ?? [],
    [plan, stage, step],
  );

  const startBuild = async () => {
    if (!prompt.trim()) return;
    const safety = orionResponse(prompt);
    if (safety.blocked || safety.policy || /(suicide|kill myself|harm myself|end my life|self[- ]harm|want(?:ing)? to die)/i.test(prompt)) {
      setBuildError(safety.text);
      return;
    }
    if (remainingTokens <= 0) {
      setBuildError('You’ve reached today’s free usage limit. Try again at 12:00 AM or upgrade for more access.');
      return;
    }
    const nextPlan = createAppPlan(prompt);
    nextPlan.steps = ['Planning your app brief', 'Generating the app scaffold', `Writing ${nextPlan.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'app'}/index.html`, 'Checking the preview', 'Build complete'];
    setPlan(nextPlan);
    setStep(0);
    setPreviewOpen(false);
    setBuildError('');
    setAgentActivity('Reading your app brief');
    setStage('building');
    onNotice('Orion is starting your app build');
    const appPrompt = `Create a polished ${appTypes.find((item) => item.id === appType)?.label} as one complete, self-contained HTML file with embedded CSS and JavaScript. The result will open in the Preview tab. Use no remote libraries, external requests, external fonts, or backend services. Include useful interaction, accessible labels, responsive styling, and realistic sample data. Return ONLY the complete HTML document with no markdown fences or explanation. User brief: ${prompt.trim()}`;
    setAgentActivity('Planning the first version');
    setStep(1);
    try {
      const output = await generateLocalResponse(appPrompt, {
        model,
        systemPrompt: `${ORION_SYSTEM_PROMPT}\n${systemPrompt}\nYou are a careful app-building agent. Follow the requested app brief. Return valid, complete HTML and nothing else. Do not claim to edit source files; the app is generated as a single local preview.`,
        maxNewTokens: 1800,
        temperature: 0.45,
        onProgress: (message: string) => setAgentActivity(message),
      });
      const html = output.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/i, '').trim();
      if (!/^<!doctype html|^<html[\s>]/i.test(html)) {
        if (/could not load a pretrained model/i.test(html)) throw new Error(html);
        throw new Error('The cloud model did not return a complete HTML app. Try a simpler brief or another model.');
      }
      setStep(2);
      setAgentActivity(`Writing ${nextPlan.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'app'}/index.html`);
      const safeHtml = html.replace(/<head([^>]*)>/i, `<head$1><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'">`);
      nextPlan.code = safeHtml;
      nextPlan.summary = `A ${appTypes.find((item) => item.id === appType)?.label.toLowerCase()} generated from your brief using ${model}.`;
      nextPlan.files = [
        { name: `${nextPlan.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'orion-app'}/index.html`, purpose: 'Editable app markup, styling, and local interactions' },
      ];
      nextPlan.steps = [...nextPlan.steps.slice(0, 3), 'Checking the sandboxed preview', 'Build complete'];
      onConsumeTokens(appPrompt, output);
      setStep(3);
      setAgentActivity('Checking the preview');
      setPlan({ ...nextPlan });
      setStep(4);
      setAgentActivity('Build complete');
      setStage('complete');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The cloud app build could not finish.';
      setBuildError(message);
      setAgentActivity('Build stopped');
      setStage('brief');
      onNotice('The cloud app build could not finish');
    }
  };

  const reset = () => {
    setStage('brief');
    setStep(0);
    setPlan(null);
    setPreviewOpen(false);
    setBuildError('');
    setAgentActivity('');
  };

  return (
    <section className="fixed inset-0 z-[60] overflow-y-auto bg-background animate-rise-in" data-testid="screen-my-apps">
      <div className="mx-auto min-h-full w-full max-w-[1120px] px-5 pb-16 pt-6 sm:px-10 sm:pt-10">
        <div className="flex items-center justify-between gap-4">
          <button onClick={onClose} data-testid="button-back-to-chat" className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground">
            <ArrowLeft size={17} />
            Back to chat
          </button>
          <nav aria-label="App Studio" className="flex rounded-xl border border-border bg-muted/50 p-1">
            <button onClick={() => setStudioTab('chat')} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${studioTab === 'chat' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Chat</button>
            <button onClick={() => { setStudioTab('preview'); if (plan) setPreviewOpen(true); }} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${studioTab === 'preview' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Preview</button>
          </nav>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-start">
          <div>
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.16em] text-primary">
              <Sparkles size={13} />
              My apps
            </div>
            <h1 data-testid="text-create-app-title" className="mt-4 max-w-[520px] text-4xl font-semibold tracking-[-.055em] sm:text-6xl">
              Describe it. Orion builds the first release.
            </h1>
            <p className="mt-5 max-w-[500px] text-[15px] leading-7 text-muted-foreground">
              Tell Orion what you want to make. It will break the idea into a practical first pass, generate the interface, and leave you with a preview to keep shaping.
            </p>

            {stage === 'brief' ? (
              <div className="mt-8 rounded-[26px] border border-border bg-card p-3 shadow-[0_18px_50px_hsl(var(--foreground)/.06)]">
                <label htmlFor="app-type" className="mb-1 block px-3 pt-2 text-xs font-semibold">App type</label>
                <select id="app-type" value={appType} onChange={(event) => setAppType(event.target.value as AppType)} data-testid="select-app-type" className="mx-2 mb-2 h-10 w-[calc(100%-16px)] rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary">
                  {appTypes.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
                </select>
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  data-testid="input-create-app-prompt"
                  placeholder="Build a simple habit tracker for people who want a gentler morning…"
                  rows={6}
                  className="w-full resize-none bg-transparent px-3 pt-2 text-[15px] leading-7 outline-none placeholder:text-muted-foreground/70"
                />
                <div className="flex items-center justify-between gap-3 border-t border-border/70 px-2 pt-3">
                  <span className="font-mono text-[10px] uppercase tracking-[.12em] text-muted-foreground">{Math.round(remainingTokens / 1000)}K estimated tokens left</span>
                  <button onClick={() => void startBuild()} disabled={!prompt.trim()} data-testid="button-start-app-build" className="flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-xs font-semibold text-background transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-35">
                    <Plus size={15} />
                    Create app
                  </button>
                </div>
                {buildError && <p role="alert" className="px-3 pb-2 pt-3 text-xs leading-5 text-destructive">{buildError}</p>}
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
                  <p className="mx-auto mt-2 max-w-[260px] text-xs leading-5 text-muted-foreground">You will see each step while Orion turns your words into a working app.</p>
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

                {stage === 'building' && <div role="status" className="mt-5 flex items-center gap-2 rounded-xl bg-primary/5 px-3 py-2 text-xs text-primary"><Brain size={15} className="shrink-0" /><span>{agentActivity || 'Working through the build…'}</span></div>}
                {stage === 'complete' && plan && (
                  <div className="mt-6 border-t border-border/70 pt-5">
                    <div className="flex items-start gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><FileCode2 size={17} /></span>
                      <div>
                        <p className="text-sm font-semibold">{plan.summary}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">Your first version is ready. Open Preview to try it, then keep improving it in Chat.</p>
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
