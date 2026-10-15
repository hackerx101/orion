import { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUp,
  Brain,
  Check,
  AppWindow,
  ChevronRight,
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
type SavedApp = { id: string; name: string; prompt: string; updated: string };

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
  const [sourceMenuOpen, setSourceMenuOpen] = useState(false);
  const [agentActivity, setAgentActivity] = useState('');
  const [buildError, setBuildError] = useState('');
  const buildRunRef = useRef(0);
  const [activeAppId, setActiveAppId] = useState<string | null>(() => {
    const match = window.location.pathname.match(/^\/apps\/([^/]+)/);
    return match?.[1] ?? null;
  });
  const [savedApps, setSavedApps] = useState<SavedApp[]>(() => {
    try { return JSON.parse(window.localStorage.getItem('orion-apps') || '[]') as SavedApp[]; } catch { return []; }
  });

  const openApp = (app: SavedApp) => {
    setActiveAppId(app.id);
    setPrompt(app.prompt);
    window.history.pushState({}, '', `/apps/${app.id}`);
  };
  const createNewApp = () => {
    const id = `app-${Date.now()}`;
    setActiveAppId(id);
    setPrompt('');
    setPlan(null);
    setStage('brief');
    window.history.pushState({}, '', `/apps/${id}`);
  };

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
    const buildRun = ++buildRunRef.current;
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
        systemPrompt: `${ORION_SYSTEM_PROMPT}\n${systemPrompt}\nYou are a careful app-building agent. Follow the requested app brief. Return valid, complete HTML and nothing else. Do not claim to edit source files; the app is generated as a single app preview.`,
        maxNewTokens: 1800,
        temperature: 0.45,
        onProgress: (message: string) => setAgentActivity(message),
      });
      if (buildRun !== buildRunRef.current) return;
      const html = output.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/i, '').trim();
      if (!/^<!doctype html|^<html[\s>]/i.test(html)) {
        if (/could not load a pretrained model/i.test(html)) throw new Error(html);
        throw new Error('I could not make that app yet. Try adding a little more detail.');
      }
      setStep(2);
      setAgentActivity(`Writing ${nextPlan.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'app'}/index.html`);
      const safeHtml = html.replace(/<head([^>]*)>/i, `<head$1><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'">`);
      nextPlan.code = safeHtml;
      nextPlan.summary = `A ${appTypes.find((item) => item.id === appType)?.label.toLowerCase()} generated from your brief using ${model}.`;
      nextPlan.files = [
        { name: `${nextPlan.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'orion-app'}/index.html`, purpose: 'Editable app markup, styling, and interactions' },
      ];
      nextPlan.steps = [...nextPlan.steps.slice(0, 3), 'Checking the preview', 'Build complete'];
      onConsumeTokens(appPrompt, output);
      setStep(3);
      setAgentActivity('Checking the preview');
      setPlan({ ...nextPlan });
      setStep(4);
      setAgentActivity('Build complete');
      setStage('complete');
      setSavedApps((current) => {
        const saved = { id: activeAppId || `app-${Date.now()}`, name: nextPlan.name, prompt: prompt.trim(), updated: 'Just now' };
        const next = [saved, ...current.filter((item) => item.id !== saved.id)];
        window.localStorage.setItem('orion-apps', JSON.stringify(next));
        return next;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'I could not finish that app. Please try again.';
      setBuildError(message);
      setAgentActivity('Build stopped');
      setStage('brief');
      onNotice('I could not finish that app. Please try again.');
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

  if (!activeAppId) {
    return (
      <section className="fixed inset-0 z-[60] overflow-y-auto bg-background animate-rise-in" data-testid="screen-my-apps">
        <div className="mx-auto min-h-full w-full max-w-[860px] px-5 pb-16 pt-6 sm:px-10 sm:pt-10">
          <button onClick={onClose} data-testid="button-back-to-chat" className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"><ArrowLeft size={17} /> Back to chat</button>
          <div className="mt-14 flex items-end justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-primary">My apps</p><h1 className="mt-3 text-4xl font-semibold tracking-[-.055em]">Your apps</h1><p className="mt-3 text-sm text-muted-foreground">Open an app or start a new one.</p></div><div className="relative"><button onClick={() => setSourceMenuOpen((open) => !open)} data-testid="button-new-app" aria-expanded={sourceMenuOpen} className="flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-xs font-semibold text-background"><Plus size={15} /> New app</button>{sourceMenuOpen && <div role="menu" className="absolute right-0 top-12 z-10 w-56 rounded-2xl border border-border bg-card p-2 shadow-xl"><button role="menuitem" onClick={() => { setSourceMenuOpen(false); createNewApp(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium hover:bg-muted"><Plus size={15} className="text-primary" /><span><span className="block">Blank app</span><span className="mt-0.5 block text-[10px] text-muted-foreground">Start with a chat</span></span></button><button role="menuitem" onClick={() => { setSourceMenuOpen(false); onNotice('Folder upload is ready when you choose a folder.'); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium hover:bg-muted"><FolderOpen size={15} className="text-primary" /><span><span className="block">Upload folder</span><span className="mt-0.5 block text-[10px] text-muted-foreground">Bring in an existing app</span></span></button><button role="menuitem" onClick={() => { setSourceMenuOpen(false); onNotice('Enter a GitHub repository after opening the app chat.'); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium hover:bg-muted"><Code2 size={15} className="text-primary" /><span><span className="block">Import from GitHub</span><span className="mt-0.5 block text-[10px] text-muted-foreground">Use a repository as a starting point</span></span></button><button role="menuitem" onClick={() => { setSourceMenuOpen(false); onNotice('Skills and instruction sets can be added in the app chat.'); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium hover:bg-muted"><Sparkles size={15} className="text-primary" /><span><span className="block">Skills and instructions</span><span className="mt-0.5 block text-[10px] text-muted-foreground">Guide how your app is built</span></span></button></div>}</div></div>
          <div className="mt-8 grid gap-3">{savedApps.length ? savedApps.map((app) => <button key={app.id} onClick={() => openApp(app)} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/50"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><AppWindow size={18} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{app.name}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{app.prompt}</span></span><span className="text-xs text-muted-foreground">{app.updated}</span><ChevronRight size={16} className="text-muted-foreground" /></button>) : <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground">No apps yet. Create your first app.</div>}</div>
        </div>
      </section>
    );
  }

  return (
    <section className="fixed inset-0 z-[60] overflow-y-auto bg-background animate-rise-in" data-testid="screen-my-apps">
      <div className="mx-auto flex min-h-full w-full max-w-[900px] flex-col px-4 pb-44 pt-6 sm:px-8 sm:pt-10">
        <div className="flex items-center justify-between gap-4">
          <button onClick={onClose} data-testid="button-back-to-chat" className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"><ArrowLeft size={17} /> Back to chat</button>
          <nav aria-label="App Studio" className="flex rounded-xl border border-border bg-muted/50 p-1"><button onClick={() => setStudioTab('chat')} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${studioTab === 'chat' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>Chat</button><button onClick={() => { setStudioTab('preview'); if (plan) setPreviewOpen(true); }} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${studioTab === 'preview' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>Preview</button></nav>
        </div>
        <div className="mb-7 mt-10 flex items-start justify-between gap-5"><div><div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[.16em] text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-accent" />App Studio</div><h1 data-testid="text-build-room" className="text-2xl font-semibold tracking-[-.045em] sm:text-3xl">{plan?.name ?? 'New app'}</h1><p className="mt-2 text-sm text-muted-foreground">Describe the app you want to make.</p></div><button onClick={reset} className="rounded-xl p-2 text-muted-foreground hover:bg-muted" aria-label="New app"><Plus size={19} /></button></div>
        <div className="flex-1 space-y-7">
          {stage === 'brief' && <div className="flex items-center gap-3 animate-rise-in"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-foreground text-background"><Brain size={15} /></div><div><p className="text-xs font-semibold">Orion</p><p className="mt-1 text-[15px] leading-7 text-foreground/85">Tell me what you want to build and I&apos;ll make the first version.</p></div></div>}
          {stage !== 'brief' && <div className="flex gap-3 animate-rise-in"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-foreground text-background"><Brain size={15} /></div><div className="min-w-0 flex-1"><div className="mb-2 flex items-center gap-2"><span className="text-xs font-semibold">Orion</span><span className="font-mono text-[10px] text-primary">BUILDING</span></div><p className="text-[15px] leading-7 text-foreground/85">{prompt}</p>{stage === 'building' && <div role="status" className="mt-5 flex items-center gap-2 rounded-xl bg-primary/5 px-3 py-2 text-xs text-primary"><Brain size={15} /><span>{agentActivity || 'Working through your app…'}</span></div>}{stage === 'complete' && plan && <div className="mt-5 border-t border-border/70 pt-5"><p className="text-sm font-semibold">{plan.summary}</p><div className="mt-4 grid gap-2">{plan.files.map((file) => <div key={file.name} className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5"><FileCode2 size={14} className="text-muted-foreground" /><span className="truncate font-mono text-[10px]">{file.name}</span></div>)}</div><button onClick={() => setPreviewOpen(true)} data-testid="button-preview-app" className="mt-5 flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"><MonitorPlay size={15} /> Open preview</button></div>}</div></div>}
          {buildError && <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs leading-5 text-destructive">{buildError}</p>}
          {stage === 'building' && <button type="button" onClick={() => { buildRunRef.current += 1; setStage('brief'); setAgentActivity(''); onNotice('Build stopped.'); }} aria-label="Stop generation" data-testid="button-stop-generation" className="mx-auto grid h-10 w-10 place-items-center rounded-xl border border-border bg-card text-foreground shadow-sm transition hover:bg-muted"><span className="h-3.5 w-3.5 rounded-[3px] bg-foreground" /></button>}
        </div>
        <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-[61] flex justify-center bg-gradient-to-t from-background via-background/95 to-transparent px-4 pb-5 pt-14 sm:pb-7"><div className="pointer-events-auto w-full max-w-[790px]"><div className="composer-glow rounded-[24px] bg-card shadow-[0_12px_32px_hsl(var(--foreground)/.08)]"><div className="rounded-[23px] bg-card p-2"><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); void startBuild(); } }} data-testid="input-create-app-chat" placeholder="Describe the app you want…" rows={2} className="w-full resize-none bg-transparent px-3 pt-2 text-[15px] leading-6 outline-none placeholder:text-muted-foreground/70" /><div className="flex items-center justify-between gap-2 px-1 pb-1 pt-1"><div className="flex items-center gap-1"><button onClick={() => setSourceMenuOpen((open) => !open)} data-testid="button-add-to-app" aria-label="Add to app" className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"><Plus size={19} /></button>{sourceMenuOpen && <div role="menu" className="absolute bottom-16 left-4 z-20 w-56 rounded-2xl border border-border bg-popover p-2 shadow-xl"><button role="menuitem" onClick={() => { setSourceMenuOpen(false); onNotice('Choose a folder to upload.'); }} className="block w-full rounded-xl px-3 py-2 text-left text-xs hover:bg-muted">Upload folder</button><button role="menuitem" onClick={() => { setSourceMenuOpen(false); onNotice('Enter a GitHub repository to import.'); }} className="block w-full rounded-xl px-3 py-2 text-left text-xs hover:bg-muted">Import from GitHub</button><button role="menuitem" onClick={() => { setSourceMenuOpen(false); onNotice('Skills and instructions can be added to this app.'); }} className="block w-full rounded-xl px-3 py-2 text-left text-xs hover:bg-muted">Skills and instruction set</button></div>}<select value={appType} onChange={(event) => setAppType(event.target.value as AppType)} aria-label="App type" className="h-9 rounded-xl bg-muted px-2 text-xs text-muted-foreground outline-none">{appTypes.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}</select></div><button onClick={() => void startBuild()} disabled={!prompt.trim() || stage === 'building'} data-testid="button-start-app-build" aria-label="Send" className="grid h-10 w-10 place-items-center rounded-full bg-accent text-accent-foreground transition hover:scale-105 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"><ArrowUp size={19} /></button></div></div></div><p className="mt-2 text-center text-[11px] text-muted-foreground/70">Orion may produce incorrect information. Verify accuracy.</p></div></div>
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
