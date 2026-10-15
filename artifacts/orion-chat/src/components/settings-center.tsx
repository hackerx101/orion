import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  AudioLines,
  Bell,
  Check,
  ChevronRight,
  CircleHelp,
  Code2,
  ExternalLink,
  Eye,
  Fingerprint,
  Gauge,
  HardDrive,
  KeyRound,
  LockKeyhole,
  Monitor,
  Moon,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';

type SettingsCenterProps = {
  onClose: () => void;
  currentModel: string;
  onModelChange: (model: string) => void;
  onNotice: (message: string) => void;
  apiDomainAvailable: boolean;
  tokensRemaining: number;
  tokenLimit: number;
  webSearchEnabled: boolean;
  onWebSearchChange: (enabled: boolean) => void;
};

type SectionId = 'account' | 'ai' | 'privacy' | 'integrations' | 'general';

const models = [
  { id: 'lite', name: 'Scorpio Lite', note: 'Focused fixes and lightweight builds · 120K context', mark: '01', locked: false },
  { id: 'flash', name: 'Scorpio Flash', note: 'Fast, efficient task execution · 900K context', mark: '02', locked: false },
  { id: 'flash-max', name: 'Scorpio Flash Max', note: 'Heavier builds with extended context · 900K context', mark: '03', locked: true },
  { id: 'orion', name: 'Orion Intelligence', note: 'High-complexity problem solving · 1M context', mark: '04', locked: true },
];

const sections: { id: SectionId; label: string; detail: string; icon: LucideIcon }[] = [
  { id: 'account', label: 'Account center', detail: 'Profile & plan', icon: UserRound },
  { id: 'ai', label: 'AI configuration', detail: 'Models & behavior', icon: SlidersHorizontal },
  { id: 'privacy', label: 'Memory & privacy', detail: 'Your data, your call', icon: Fingerprint },
  { id: 'integrations', label: 'Connections', detail: 'Apps & developer tools', icon: Code2 },
  { id: 'general', label: 'Preferences', detail: 'Interface & access', icon: Monitor },
];

function readLocal<T,>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : (JSON.parse(value) as T);
  } catch {
    return fallback;
  }
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="group flex w-full items-center justify-between gap-5 py-4 text-left"
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        {description && <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>}
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-border'}`}>
        <span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  );
}

function SettingRow({
  icon: Icon,
  title,
  detail,
  trailing,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground"><Icon size={16} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{detail}</span>
      </span>
      {trailing}
    </div>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mb-7">
      <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[.18em] text-primary">{eyebrow}</p>
      <h2 className="font-serif text-[32px] leading-tight tracking-[-.03em] sm:text-[38px]">{title}</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border/80 bg-card px-5 sm:px-6 ${className}`}>{children}</div>;
}

export default function SettingsCenter({
  onClose,
  currentModel,
  onModelChange,
  onNotice,
  apiDomainAvailable,
  tokensRemaining,
  tokenLimit,
  webSearchEnabled,
  onWebSearchChange,
}: SettingsCenterProps) {
  const [activeSection, setActiveSection] = useState<SectionId>('account');
  const [displayName, setDisplayName] = useState(() => readLocal('orion-settings-profile-name', ''));
  const [savedName, setSavedName] = useState(() => readLocal('orion-settings-profile-name', ''));
  const [rememberContext, setRememberContext] = useState(() => readLocal('orion-settings-memory', true));
  const [localHistory, setLocalHistory] = useState(() => readLocal('orion-settings-history', true));
  const [usageDiagnostics, setUsageDiagnostics] = useState(() => readLocal('orion-settings-diagnostics', false));
  const [reducedMotion, setReducedMotion] = useState(() => readLocal('orion-settings-reduced-motion', false));
  const [soundEffects, setSoundEffects] = useState(() => readLocal('orion-settings-sound', false));
  const [largerText, setLargerText] = useState(() => readLocal('orion-settings-large-text', false));
  const [compactLayout, setCompactLayout] = useState(() => readLocal('orion-settings-compact', false));
  const [temperature, setTemperature] = useState(() => readLocal('orion-settings-creativity', 0.6));
  const [basePrompt, setBasePrompt] = useState(() => readLocal('orion-settings-prompt', ''));
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => { window.localStorage.setItem('orion-settings-memory', JSON.stringify(rememberContext)); }, [rememberContext]);
  useEffect(() => { window.localStorage.setItem('orion-settings-history', JSON.stringify(localHistory)); }, [localHistory]);
  useEffect(() => { window.localStorage.setItem('orion-settings-diagnostics', JSON.stringify(usageDiagnostics)); }, [usageDiagnostics]);
  useEffect(() => { window.localStorage.setItem('orion-settings-reduced-motion', JSON.stringify(reducedMotion)); }, [reducedMotion]);
  useEffect(() => { window.localStorage.setItem('orion-settings-sound', JSON.stringify(soundEffects)); }, [soundEffects]);
  useEffect(() => { window.localStorage.setItem('orion-settings-large-text', JSON.stringify(largerText)); }, [largerText]);
  useEffect(() => { window.localStorage.setItem('orion-settings-compact', JSON.stringify(compactLayout)); }, [compactLayout]);
  useEffect(() => { window.localStorage.setItem('orion-settings-creativity', JSON.stringify(temperature)); }, [temperature]);
  useEffect(() => { window.localStorage.setItem('orion-settings-prompt', JSON.stringify(basePrompt)); }, [basePrompt]);

  const saveName = () => {
    const value = displayName.trim();
    setDisplayName(value);
    setSavedName(value);
    window.localStorage.setItem('orion-settings-profile-name', JSON.stringify(value));
    setSavedMessage('Saved on this device');
    onNotice('Profile preference saved locally');
    window.setTimeout(() => setSavedMessage(''), 2200);
  };

  const active = sections.find((section) => section.id === activeSection) ?? sections[0];

  return (
    <div className={`fixed inset-0 z-[70] flex min-h-[100dvh] flex-col overflow-y-auto bg-background text-foreground ${largerText ? '[&_button]:text-[15px] [&_p]:text-[15px]' : ''} ${compactLayout ? '[&_article]:!py-3' : ''} ${reducedMotion ? '[&_*]:!transition-none [&_*]:!animate-none' : ''}`}>
      <header className="sticky top-0 z-20 flex h-[68px] shrink-0 items-center justify-between border-b border-border/80 bg-background/95 px-4 backdrop-blur-md sm:px-8">
        <div className="flex items-center gap-3">
          <button onClick={onClose} aria-label="Close settings" className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground">
            <ArrowLeft size={18} />
          </button>
          <span className="grid h-8 w-8 place-items-center rounded-[11px] bg-foreground text-background">
            <span className="relative h-3.5 w-3.5 rounded-full border border-current"><span className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current" /></span>
          </span>
          <div className="leading-tight"><p className="text-sm font-semibold tracking-[-.02em]">Orion <span className="text-primary">Chat</span></p><p className="mt-1 font-mono text-[9px] uppercase tracking-[.15em] text-muted-foreground">Settings workspace</p></div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Private by default
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1240px] flex-1 grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="border-b border-border/70 px-4 py-4 md:border-b-0 md:border-r md:px-5 md:py-9">
          <p className="mb-3 hidden px-3 font-mono text-[9px] uppercase tracking-[.18em] text-muted-foreground md:block">Workspace</p>
          <nav aria-label="Settings sections" className="flex gap-1 overflow-x-auto md:flex-col">
            {sections.map(({ id, label, detail, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                aria-current={activeSection === id ? 'page' : undefined}
                className={`group flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition md:w-full ${activeSection === id ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
              >
                <Icon size={17} className={activeSection === id ? 'text-primary' : ''} />
                <span className="min-w-0"><span className="block whitespace-nowrap text-xs font-semibold">{label}</span><span className="mt-1 hidden text-[10px] text-muted-foreground md:block">{detail}</span></span>
              </button>
            ))}
          </nav>
          <div className="mt-10 hidden rounded-2xl border border-border/70 bg-muted/55 p-4 md:block">
            <div className="mb-3 flex items-center gap-2"><LockKeyhole size={14} className="text-primary" /><span className="text-xs font-semibold">Your space stays yours</span></div>
            <p className="text-[11px] leading-5 text-muted-foreground">Preferences are stored in this browser. External accounts remain disconnected until real provider consent is available.</p>
          </div>
        </aside>

        <main className="min-w-0 px-4 pb-12 pt-7 sm:px-8 sm:pt-10 lg:px-14">
          <div className="mb-7 flex items-center justify-between gap-4 border-b border-border/70 pb-4">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><span>Settings</span><ChevronRight size={12} /><span className="text-foreground">{active.label}</span></div>
            <span className="hidden font-mono text-[9px] uppercase tracking-[.14em] text-muted-foreground sm:block">Saved locally · On this device</span>
          </div>

          {activeSection === 'account' && (
            <section className="animate-rise-in">
              <SectionHeading eyebrow="Identity · 01" title="Account center" description="A local profile for a local-first workspace. No account service is connected here." />
              <Card className="mb-5">
                <div className="flex flex-col gap-5 py-5 sm:flex-row sm:items-center">
                  <div className="grid h-[58px] w-[58px] shrink-0 place-items-center rounded-[20px] bg-primary/10 text-primary"><UserRound size={24} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Your local profile</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">This name is only a label on this device. Orion does not verify an identity.</p>
                    <label htmlFor="settings-profile-name" className="sr-only">Local profile name</label>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <input id="settings-profile-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={48} placeholder="Choose a display name" className="h-10 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" />
                      <button onClick={saveName} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-foreground px-4 text-xs font-semibold text-background transition hover:opacity-85"><Check size={14} />Save locally</button>
                    </div>
                    <p aria-live="polite" className="mt-2 min-h-4 text-[10px] text-primary">{savedMessage || (savedName ? `Saved name: ${savedName}` : '')}</p>
                  </div>
                </div>
              </Card>
              <Card className="divide-y divide-border/70">
                <SettingRow icon={WalletCards} title="Daily local allowance" detail={`${tokensRemaining.toLocaleString()} of ${tokenLimit.toLocaleString()} estimated tokens remain. Resets at midnight in this browser; this is not a paid plan or provider billing meter.`} trailing={<span className="rounded-full bg-primary/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-primary">Local</span>} />
                <SettingRow icon={WalletCards} title="Plan & billing" detail="Billing details are unavailable until a real account service is connected." trailing={<span className="rounded-full bg-muted px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Not connected</span>} />
                <SettingRow icon={KeyRound} title="Sign-in & security" detail="No sign-in provider or account credentials are configured in this workspace." trailing={<span className="rounded-full bg-muted px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Local only</span>} />
              </Card>
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-border/70 bg-muted/45 p-4 text-xs leading-5 text-muted-foreground"><CircleHelp size={15} className="mt-0.5 shrink-0 text-primary" /><p>Profile and plan controls are placeholders. No login, billing, or identity state is being implied.</p></div>
            </section>
          )}

          {activeSection === 'ai' && (
            <section className="animate-rise-in">
              <SectionHeading eyebrow="Intelligence · 02" title="AI configuration" description="Choose a cloud model and tailor how Orion responds. Larger models are available with an upgraded plan." />
              <div className="mb-6 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/[.06] p-4">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary"><Sparkles size={17} /></span>
                <div className="min-w-0 flex-1"><p className="text-xs font-semibold">Current model</p><p className="mt-1 truncate text-sm">{currentModel || 'Select a model'}</p></div>
                <span className="rounded-full bg-background px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-primary">Active</span>
              </div>
              <div className="mb-6 grid gap-2 sm:grid-cols-2">
                {models.map((model) => {
                  const selected = currentModel === model.id || currentModel === model.name;
                  return (
                    <button key={model.id} onClick={() => { if (model.locked) { onNotice('Upgrade to unlock this model'); return; } onModelChange(model.id); onNotice(`${model.name} selected`); }} aria-pressed={selected} className={`flex min-h-[82px] items-center gap-3 rounded-2xl border p-4 text-left transition ${selected ? 'border-primary/50 bg-primary/[.07] shadow-[0_4px_18px_hsl(var(--primary)/.08)]' : 'border-border/80 bg-card hover:border-primary/30 hover:bg-muted/50'} ${model.locked ? 'opacity-75' : ''}`}>
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl font-mono text-[10px] ${selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{model.mark}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{model.name}</span><span className="mt-1 block text-[10px] text-muted-foreground">{model.note}</span></span>
                      {model.locked ? <LockKeyhole size={15} className="shrink-0 text-muted-foreground" /> : selected && <Check size={15} className="shrink-0 text-primary" />}
                    </button>
                  );
                })}
              </div>
              <div className="mb-5 rounded-xl border border-border bg-muted/40 p-4 text-xs leading-5 text-muted-foreground">
                Cloudflare Workers AI handles generation for these presets. Scorpio Lite is included with the free plan; larger models show a lock until the account is upgraded.
              </div>
              <Card className="mb-5">
                <div className="flex items-start gap-3 pt-5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-muted-foreground"><Gauge size={16} /></span><div className="flex-1"><div className="flex items-center justify-between gap-3"><label htmlFor="settings-creativity" className="text-sm font-semibold">Response variety</label><span className="font-mono text-xs text-primary">{Number(temperature).toFixed(1)}</span></div><p className="mt-1 text-xs leading-5 text-muted-foreground">A local preference for response style. Provider support may vary.</p><input id="settings-creativity" type="range" min="0" max="1" step="0.1" value={temperature} onChange={(event) => setTemperature(Number(event.target.value))} className="mt-4 w-full accent-[hsl(var(--primary))]" /><div className="mt-1 flex justify-between font-mono text-[9px] uppercase tracking-wider text-muted-foreground"><span>Focused</span><span>Exploratory</span></div></div></div>
              </Card>
              <Card className="mb-5 py-5">
                <label htmlFor="settings-system-prompt" className="block text-sm font-semibold">Additional assistant instructions</label>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">This is added to Orion’s built-in system prompt and saved in this browser.</p>
                <textarea id="settings-system-prompt" value={basePrompt} onChange={(event) => setBasePrompt(event.target.value)} maxLength={4000} rows={5} placeholder="Add preferences such as: use metric units, keep answers concise…" className="mt-3 w-full resize-y rounded-xl border border-input bg-background p-3 text-sm leading-6 outline-none focus:border-primary" />
              </Card>
              <Card><SettingRow icon={Activity} title="Provider availability" detail={apiDomainAvailable ? 'The API domain is available. Provider features still require a configured integration.' : 'api.garexcell.com did not resolve in the environment check. No remote AI endpoint is configured.'} trailing={<span className={`rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider ${apiDomainAvailable ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{apiDomainAvailable ? 'Domain reachable' : 'Unavailable'}</span>} /></Card>
            </section>
          )}

          {activeSection === 'privacy' && (
            <section className="animate-rise-in">
              <SectionHeading eyebrow="Boundaries · 03" title="Memory & privacy" description="Choose what Orion may keep in this browser. These switches control account preferences; no message retention settings are changed here." />
              <Card className="divide-y divide-border/70">
                <Toggle checked={rememberContext} onChange={setRememberContext} label="Remember context between chats" description="Allow locally stored conversation context to be used in future sessions on this device." />
                <Toggle checked={localHistory} onChange={setLocalHistory} label="Keep chat history on this device" description="Save conversation history in this browser's local storage." />
                <Toggle checked={usageDiagnostics} onChange={setUsageDiagnostics} label="Usage diagnostics" description="Opt in to a local-only preference flag. No telemetry is transmitted by this control." />
              </Card>
              <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/[.045] p-5">
                <div className="flex items-start gap-3"><HardDrive size={17} className="mt-0.5 shrink-0 text-primary" /><div><h3 className="text-sm font-semibold">Stored with your preferences</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Settings use browser local storage. Clearing site data in your browser removes them. Privacy controls here do not delete chat records automatically.</p></div></div>
              </div>
              <Card className="mt-5"><SettingRow icon={Eye} title="App permissions" detail="Camera, microphone, contacts, and other device permissions are requested only by browser features when used. No external consent has been granted here." trailing={<span className="rounded-full bg-muted px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Not granted here</span>} /></Card>
            </section>
          )}

          {activeSection === 'integrations' && (
            <section className="animate-rise-in">
              <SectionHeading eyebrow="Connections · 04" title="Integrations & tools" description="External services stay disconnected until Orion has a real provider flow and explicit consent." />
              <div className="mb-5 rounded-2xl border border-amber-500/20 bg-amber-500/[.055] p-4">
                <div className="flex items-start gap-3"><LockKeyhole size={16} className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-300" /><div><p className="text-xs font-semibold">Live provider setup is unavailable</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Connect a provider to enable account features and external tools. Nothing connects without your consent.</p></div></div>
              </div>
              <Card className="mb-5 divide-y divide-border/70">
                <Toggle checked={webSearchEnabled} onChange={onWebSearchChange} label="Allow web search in chat" description="When enabled, Orion can fetch public Wikipedia and current-news results after you turn web search on in the composer. Search requests leave this browser." />
                <SettingRow icon={KeyRound} title="Developer API key" detail="No secret key is issued. The requested API domain is not reachable, and a key cannot be securely generated without a deployed authenticated API." trailing={<span className="rounded-full bg-muted px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Not issued</span>} />
              </Card>
              <div className="space-y-3">
                {[
                  { icon: Bell, name: 'Notifications', description: 'Push delivery and notification access require browser permission.' },
                  { icon: ExternalLink, name: 'External apps', description: 'Gmail, contacts, and messaging need a real user consent flow. SMS access is unavailable to this browser app.' },
                  { icon: Code2, name: 'Developer tools', description: 'API keys and webhooks are not configured. Do not paste secrets into this local workspace.' },
                ].map(({ icon: Icon, name, description }) => (
                  <Card key={name} className="flex items-center gap-3 py-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground"><Icon size={17} /></span>
                    <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{name}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div>
                    <span className="shrink-0 rounded-full border border-border px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Unavailable</span>
                  </Card>
                ))}
              </div>
              <Card className="mt-5">
                <SettingRow icon={Activity} title="API domain status" detail={apiDomainAvailable ? 'API domain is reachable; this does not confirm provider credentials or a successful integration.' : 'API domain is not available in this environment.'} trailing={<span className={`rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider ${apiDomainAvailable ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{apiDomainAvailable ? 'Available' : 'Offline'}</span>} />
              </Card>
            </section>
          )}

          {activeSection === 'general' && (
            <section className="animate-rise-in">
              <SectionHeading eyebrow="Comfort · 05" title="Preferences" description="Make Orion feel comfortable to use. These presentation choices are saved only in this browser." />
              <Card className="divide-y divide-border/70">
                <Toggle checked={reducedMotion} onChange={setReducedMotion} label="Reduce motion" description="Limit motion and transitions in this settings workspace." />
                <Toggle checked={largerText} onChange={setLargerText} label="Larger interface text" description="Increase the text size of controls and supporting copy here." />
                <Toggle checked={compactLayout} onChange={setCompactLayout} label="Compact layout" description="Tighten vertical spacing in settings panels." />
                <Toggle checked={soundEffects} onChange={setSoundEffects} label="Sound effects preference" description="Remember your preference. Sound playback is not configured in this workspace." />
              </Card>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/80 bg-card p-5">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><AudioLines size={17} /></div>
                  <p className="text-sm font-semibold">Voice & audio</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Microphone access and speech services remain controlled by your browser. Orion has not requested access from this panel.</p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-card p-5">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground"><Moon size={17} /></div>
                  <p className="text-sm font-semibold">Appearance</p><p className="mt-1 text-xs leading-5 text-muted-foreground">This workspace follows the appearance currently set by Orion Chat.</p>
                </div>
              </div>
            </section>
          )}

          <footer className="mt-12 flex flex-col gap-2 border-t border-border/70 pt-5 text-[10px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>Orion Chat · Local-first by design</span>
            <span className="inline-flex items-center gap-1.5 font-mono uppercase tracking-wider"><LockKeyhole size={11} /> No secrets collected here</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
