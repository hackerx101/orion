import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  ArrowUp,
  AtSign,
  Bell,
  Bot,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clipboard,
  Copy,
  File,
  FileText,
  Globe2,
  Image,
  LogIn,
  Menu,
  MessageCircle,
  Mic,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Square,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  UserRound,
  UsersRound,
  Video,
  X,
  Zap,
} from 'lucide-react';

type ModelId = 'flash' | 'sting' | 'orion';
type Panel = 'none' | 'guest' | 'login' | 'account' | 'sheet';
type Role = 'user' | 'assistant';
type Message = {
  id: string;
  role: Role;
  text: string;
  time: string;
  policy?: boolean;
  attachment?: string;
};
type Chat = { id: string; title: string; preview: string; time: string };

const nowTime = () =>
  new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date());

const seedChats: Chat[] = [
  { id: 'orion-brief', title: 'The Orion brief', preview: 'A clear shape for the next chapter.', time: 'Now' },
  { id: 'kyoto-notes', title: 'Weekend in Kyoto', preview: 'A slower itinerary, with room to wander.', time: 'Yesterday' },
  { id: 'kitchen-table', title: 'Untangle the budget', preview: 'Let’s make the numbers feel less loud.', time: 'Mon' },
  { id: 'reading-list', title: 'A reading list for winter', preview: 'Books with a little weather in them.', time: 'Mar 12' },
  { id: 'launch-plan', title: 'Quiet launch plan', preview: 'A thoughtful way to tell the right people.', time: 'Mar 09' },
];

const seedMessages: Message[] = [
  {
    id: 'welcome',
    role: 'assistant',
    text: 'Good morning, Amara. I’m here when you are. We can think something through, shape a rough idea, or simply find the next right step.',
    time: '9:41 AM',
  },
  {
    id: 'prompt',
    role: 'user',
    text: 'Help me give the Orion brief a clearer point of view.',
    time: '9:42 AM',
  },
  {
    id: 'reply',
    role: 'assistant',
    text: 'Start with the human promise, not the feature list: Orion is a calm place to think out loud, with enough intelligence to go deep and enough restraint to stay useful. Everything in the brief can orbit that idea.',
    time: '9:42 AM',
  },
];

const modelDetails: Record<ModelId, { name: string; label: string; description: string; color: string }> = {
  flash: { name: 'Scorpio Flash 1.0', label: 'Fast replies', description: 'Quick, capable, and ideal for everyday questions.', color: 'cyan' },
  sting: { name: 'Scorpio Sting', label: 'Balanced thought', description: 'A little more careful with nuance, planning, and tone.', color: 'violet' },
  orion: { name: 'Orion Intelligence', label: 'Pro · Deep reasoning', description: 'Our most considered model for hard problems and long-form work.', color: 'rose' },
};

const readStore = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function localResponse(prompt: string): { text: string; policy?: boolean; blocked?: boolean } {
  const lower = prompt.toLowerCase();
  if (/(suicide|kill myself|harm myself|end my life|self[- ]harm)/i.test(lower)) {
    return {
      text: 'I’m really sorry this feels so heavy. Please call or text 988 now if you’re in the U.S. or Canada, or contact your local emergency number. If you can, move near another person and tell them plainly: “I need help staying safe.” I can stay with you here while you take that next step.',
    };
  }
  if (/(how to (hurt|kill|abuse)|sexual.{0,18}(child|minor)|child.{0,18}(porn|exploit)|exploit.{0,18}(child|minor))/i.test(lower)) {
    return { text: 'Orion can’t help create instructions for harming or exploiting a minor. I can help with child safety, prevention, reporting, or a fictional scene that avoids actionable harm.', policy: true, blocked: true };
  }
  if (/(how to (make a bomb|hack .*account|sell drugs|evade police)|steal (credit|money)|phishing kit|bypass.*security)/i.test(lower)) {
    return { text: 'Orion can’t help with instructions for illegal activity or bypassing someone’s security. I can help you understand risks, improve your own security, or find a lawful route forward.', policy: true, blocked: true };
  }
  if (/(who (created|made|built) orion|creator of orion|garexcell)/i.test(lower)) {
    return { text: 'Orion was created by Garexcell, a team focused on making thoughtful intelligence feel practical, personal, and worthy of trust.' };
  }
  if (/(essay|paragraph|article|write about)/i.test(lower)) {
    return { text: 'I can help shape that into a clear piece. I’ve opened a short writing brief so you can choose the title and length before I begin.' };
  }
  if (/(thank|thanks)/i.test(lower)) {
    return { text: 'Of course. I’m glad we found a useful thread.' };
  }
  const replies = [
    'Here’s a useful way into it: name what matters, separate it from what is merely loud, then choose one small move you can make today. I can help with any of those layers.',
    'I’d hold two ideas at once here. Keep the practical constraint visible, but leave a little room for the version that feels more like you. What would “good enough to begin” look like?',
    'Let’s make this less abstract. I see a clear first pass: define the outcome, list the friction, and make one decision before collecting more information. That gives us something real to build on.',
  ];
  return { text: replies[prompt.length % replies.length] };
}

function App() {
  const [dark, setDark] = useState(() => readStore('orion-theme', false));
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>('none');
  const [loggedIn, setLoggedIn] = useState(() => readStore('orion-logged-in', false));
  const [chats, setChats] = useState<Chat[]>(() => readStore('orion-chats', seedChats));
  const [activeChatId, setActiveChatId] = useState('orion-brief');
  const [messages, setMessages] = useState<Message[]>(() => readStore('orion-messages', seedMessages));
  const [composer, setComposer] = useState('');
  const [model, setModel] = useState<ModelId>(() => readStore('orion-model', 'flash'));
  const [modelOpen, setModelOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<'add' | 'connectors'>('add');
  const [webSearch, setWebSearch] = useState(false);
  const [attachment, setAttachment] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [proUses, setProUses] = useState(() => readStore('orion-pro-uses', 0));
  const [essayOpen, setEssayOpen] = useState(false);
  const [essayTitle, setEssayTitle] = useState('');
  const [essayWords, setEssayWords] = useState('650');
  const [editingTitle, setEditingTitle] = useState(false);
  const [chatTitle, setChatTitle] = useState('The Orion brief');
  const [avatarImage, setAvatarImage] = useState('');
  const [accountSection, setAccountSection] = useState('Manage Activity');
  const [loginMode, setLoginMode] = useState<'login' | 'signup'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('June');
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [liveListening, setLiveListening] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    window.localStorage.setItem('orion-theme', JSON.stringify(dark));
  }, [dark]);
  useEffect(() => { window.localStorage.setItem('orion-chats', JSON.stringify(chats)); }, [chats]);
  useEffect(() => { window.localStorage.setItem('orion-messages', JSON.stringify(messages)); }, [messages]);
  useEffect(() => { window.localStorage.setItem('orion-model', JSON.stringify(model)); }, [model]);
  useEffect(() => { window.localStorage.setItem('orion-pro-uses', JSON.stringify(proUses)); }, [proUses]);
  useEffect(() => { window.localStorage.setItem('orion-logged-in', JSON.stringify(loggedIn)); }, [loggedIn]);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const selectedModel = modelDetails[model];
  const proLocked = model === 'orion' && proUses >= 3;

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2600);
  };

  const selectChat = (chat: Chat) => {
    setActiveChatId(chat.id);
    setChatTitle(chat.title);
    if (chat.id !== 'orion-brief') {
      setMessages([{ id: `${chat.id}-intro`, role: 'assistant', text: `This is a local draft space for “${chat.title}”. Tell me what you want to work through and I’ll help you find a clear next step.`, time: 'Today' }]);
    } else {
      setMessages(readStore('orion-messages', seedMessages));
    }
    setComposer('');
  };

  const newChat = () => {
    const chat: Chat = { id: createId('chat'), title: 'Untitled conversation', preview: 'A fresh place to begin.', time: 'Now' };
    setChats((current) => [chat, ...current]);
    setActiveChatId(chat.id);
    setChatTitle(chat.title);
    setMessages([{ id: createId('assistant'), role: 'assistant', text: 'A clean page. What would you like to think about?', time: nowTime() }]);
    setComposer('');
    showNotice('New conversation ready');
  };

  const finishResponse = (prompt: string, attachmentName?: string) => {
    const response = localResponse(prompt);
    setMessages((current) => [...current, { id: createId('assistant'), role: 'assistant', text: response.text, time: nowTime(), policy: response.policy }]);
    setChats((current) => current.map((chat) => chat.id === activeChatId ? { ...chat, preview: response.text.slice(0, 52), time: 'Now' } : chat));
    setGenerating(false);
    setGenerationStep(0);
    if (attachmentName) showNotice(`${attachmentName} added to this chat`);
  };

  const sendMessage = (override?: string) => {
    const prompt = (override ?? composer).trim();
    if (!prompt || generating || proLocked) return;
    if (/(essay|paragraph|article|write about)/i.test(prompt) && !override) {
      setEssayTitle(prompt.replace(/^(write|draft|create)\s+(an?\s+)?(essay|paragraph|article)\s*(about|on)?\s*/i, '').trim() || 'Untitled piece');
      setEssayOpen(true);
      return;
    }
    const response = localResponse(prompt);
    const isBlocked = response.blocked;
    const visiblePrompt = isBlocked ? 'This request is not something Orion can help with.' : prompt;
    setMessages((current) => [...current, { id: createId('user'), role: 'user', text: visiblePrompt, time: nowTime(), policy: isBlocked, attachment: attachment || undefined }]);
    setComposer('');
    const chosenAttachment = attachment;
    setAttachment('');
    setGenerating(true);
    if (model === 'orion') setProUses((count) => count + 1);
    timerRef.current = window.setTimeout(() => finishResponse(prompt, chosenAttachment), model === 'orion' ? 1500 : 850);
  };

  const stopGenerating = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setGenerating(false);
    setGenerationStep(0);
    setMessages((current) => [...current, { id: createId('assistant'), role: 'assistant', text: 'I stopped there. The thread is yours to continue whenever you’re ready.', time: nowTime() }]);
  };

  const startEssay = () => {
    if (!essayTitle.trim()) return;
    const brief = `${essayTitle.trim()} (${essayWords} words)`;
    setEssayOpen(false);
    setMessages((current) => [...current, { id: createId('user'), role: 'user', text: `Draft an essay: ${brief}`, time: nowTime() }]);
    setGenerating(true);
    setGenerationStep(1);
    timerRef.current = window.setTimeout(() => setGenerationStep(2), 800);
    window.setTimeout(() => setGenerationStep(3), 1600);
    window.setTimeout(() => {
      setMessages((current) => [...current, { id: createId('assistant'), role: 'assistant', text: `I’ve outlined “${essayTitle.trim()}” around one central idea, a grounded opening, and a closing that earns its point. The local draft is ready for your voice and edits.`, time: nowTime() }]);
      setGenerating(false);
      setGenerationStep(0);
    }, 2400);
  };

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setAttachment(file.name);
  };

  const copyMessage = (text: string) => {
    navigator.clipboard?.writeText(text);
    showNotice('Response copied');
  };

  const toggleLogin = () => {
    setLoggedIn(true);
    setPanel('none');
    showNotice('You’re signed in locally');
  };

  const sidebarWidth = expanded ? 'w-[286px]' : 'w-[76px]';

  return (
    <div className={`noise flex min-h-[100dvh] overflow-hidden bg-background text-foreground transition-colors duration-300 ${dark ? 'dark' : ''}`}>
      <aside className={`relative z-20 hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-300 md:flex ${sidebarWidth}`}>
        <div className={`flex h-[76px] items-center ${expanded ? 'justify-between px-5' : 'justify-center'}`}>
          <button onClick={() => setExpanded((value) => !value)} data-testid="button-toggle-sidebar" aria-label="Toggle recent chats sidebar" className="group flex items-center gap-3">
            <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-foreground text-background shadow-sm">
              <span className="absolute h-4 w-4 rounded-full border-[1.5px] border-current opacity-90" />
              <span className="absolute h-1.5 w-1.5 rounded-full bg-current" />
            </span>
            {expanded && <span className="font-semibold tracking-[-.02em]">Orion <span className="text-primary">Chat</span></span>}
          </button>
          {expanded && <button onClick={() => setExpanded(false)} data-testid="button-collapse-sidebar" className="rounded-lg p-2 text-muted-foreground hover:bg-background hover:text-foreground"><ChevronLeft size={17} /></button>}
        </div>
        <div className={`px-3 ${expanded ? '' : 'flex justify-center'}`}>
          <div className={`flex items-center ${expanded ? 'gap-3' : 'justify-center'}`}>
            <button onClick={newChat} data-testid="button-new-chat" aria-label="Start a new chat" className="group relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground shadow-[0_8px_20px_hsl(var(--accent)/.18)] transition-all hover:scale-[1.05]"><Plus size={19} strokeWidth={2.5} /></button>
            {expanded && <span className="text-sm font-semibold">New chat</span>}
          </div>
        </div>
        {expanded && (
          <div className="mt-8 flex items-center justify-between px-5">
            <span className="font-mono text-[10px] font-medium uppercase tracking-[.18em] text-muted-foreground">Recent chats</span>
            <button onClick={() => showNotice('All chats are stored on this device')} data-testid="button-chat-info" className="rounded-md p-1 text-muted-foreground hover:bg-background"><CircleHelp size={15} /></button>
          </div>
        )}
        <nav className={`scrollbar-subtle mt-3 flex-1 overflow-y-auto px-3 ${expanded ? '' : 'space-y-2'}`} aria-label="Recent conversations">
          {chats.map((chat) => (
            <button key={chat.id} onClick={() => selectChat(chat)} data-testid={`button-recent-chat-${chat.id}`} className={`group mb-1 flex w-full items-center rounded-xl text-left transition-colors ${activeChatId === chat.id ? 'bg-background shadow-sm' : 'hover:bg-background/70'} ${expanded ? 'gap-3 px-3 py-3' : 'justify-center p-3'}`}>
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${activeChatId === chat.id ? 'bg-primary/10 text-primary' : 'bg-background/70 text-muted-foreground'}`}><MessageCircle size={15} /></span>
              {expanded && <span className="min-w-0 flex-1"><span data-testid={`text-chat-title-${chat.id}`} className="block truncate text-[13px] font-medium">{chat.title}</span><span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{chat.preview}</span></span>}
            </button>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          {expanded && (
            <div className="mb-3 rounded-xl bg-background/65 p-3">
              <div className="flex items-center justify-between text-[11px]"><span className="font-medium">Local workspace</span><span className="font-mono text-muted-foreground">ON DEVICE</span></div>
              <div className="mt-2 h-1 rounded-full bg-border"><div className="h-1 w-[68%] rounded-full bg-primary" /></div>
            </div>
          )}
          <button onClick={() => loggedIn ? setPanel('account') : setPanel('guest')} data-testid="button-manage-account" className={`flex w-full items-center rounded-xl text-muted-foreground hover:bg-background hover:text-foreground ${expanded ? 'gap-3 px-3 py-2.5' : 'justify-center p-3'}`}><UserRound size={17} />{expanded && <span className="text-sm">Manage account</span>}</button>
          {loggedIn && <button onClick={() => { setAccountSection('Settings'); setPanel('account'); }} data-testid="button-settings" className={`flex w-full items-center rounded-xl text-muted-foreground hover:bg-background hover:text-foreground ${expanded ? 'gap-3 px-3 py-2.5' : 'justify-center p-3'}`}><Settings size={17} />{expanded && <span className="text-sm">Settings</span>}</button>}
          {!expanded && <button onClick={() => setExpanded(true)} data-testid="button-expand-sidebar" aria-label="Expand sidebar" className="mt-1 flex w-full justify-center rounded-xl p-3 text-muted-foreground hover:bg-background"><ChevronRight size={17} /></button>}
        </div>
      </aside>
      {mobileOpen && <div className="fixed inset-0 z-30 bg-foreground/20 backdrop-blur-[1px] md:hidden" onClick={() => setMobileOpen(false)} data-testid="overlay-mobile-sidebar" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[286px] flex-col border-r border-sidebar-border bg-sidebar shadow-[18px_0_50px_hsl(var(--foreground)/.12)] transition-transform duration-300 md:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-[76px] items-center justify-between px-5"><span className="font-semibold tracking-[-.02em]">Orion <span className="text-primary">Chat</span></span><button onClick={() => setMobileOpen(false)} data-testid="button-close-mobile-sidebar" className="rounded-lg p-2 text-muted-foreground hover:bg-background"><X size={18} /></button></div>
        <div className="px-3"><button onClick={() => { newChat(); setMobileOpen(false); }} data-testid="button-mobile-new-chat" className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent text-sm font-semibold text-accent-foreground"><Plus size={18} />New chat</button></div>
        <p className="px-5 pb-2 pt-8 font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Recent chats</p>
        <nav className="scrollbar-subtle flex-1 overflow-y-auto px-3">{chats.map((chat) => <button key={`mobile-${chat.id}`} onClick={() => { selectChat(chat); setMobileOpen(false); }} data-testid={`button-mobile-recent-${chat.id}`} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ${activeChatId === chat.id ? 'bg-background shadow-sm' : 'hover:bg-background/70'}`}><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-background/70 text-muted-foreground"><MessageCircle size={15} /></span><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{chat.title}</span><span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{chat.preview}</span></span></button>)}</nav>
        <div className="border-t border-sidebar-border p-3"><button onClick={() => { loggedIn ? setPanel('account') : setPanel('guest'); setMobileOpen(false); }} data-testid="button-mobile-manage-account" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-background hover:text-foreground"><UserRound size={17} />Manage account</button>{loggedIn && <button onClick={() => { setAccountSection('Settings'); setPanel('account'); setMobileOpen(false); }} data-testid="button-mobile-settings" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-background hover:text-foreground"><Settings size={17} />Settings</button>}</div>
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex h-[76px] shrink-0 items-center justify-between border-b border-border/70 px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} data-testid="button-mobile-menu" className="rounded-xl p-2 text-muted-foreground hover:bg-muted md:hidden"><Menu size={20} /></button>
            <div className="md:hidden"><span className="font-semibold">Orion <span className="text-primary">Chat</span></span></div>
            <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-primary" />Local-first workspace</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDark((value) => !value)} data-testid="button-theme-toggle" className="group flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm transition hover:border-primary/30 hover:text-foreground">
              <span className={`relative h-4 w-7 rounded-full transition-colors ${dark ? 'bg-primary' : 'bg-secondary'}`}><span className={`absolute top-0.5 h-3 w-3 rounded-full bg-foreground transition-transform ${dark ? 'translate-x-3.5' : 'translate-x-0.5'}`} /></span>
              <span className="hidden sm:block">{dark ? 'Dark' : 'Light'}</span>
            </button>
            <button onClick={() => loggedIn ? setPanel('account') : setPanel('guest')} data-testid="button-user-avatar" className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border-2 border-background bg-foreground text-sm font-semibold text-background shadow-[0_0_0_1px_hsl(var(--border))] hover:scale-[1.03]">
              {loggedIn ? (avatarImage ? <img src={avatarImage} alt="Your profile" className="h-full w-full object-cover" data-testid="img-user-avatar" /> : 'AM') : <UserRound size={17} />}
            </button>
          </div>
        </header>

        <section className="scrollbar-subtle flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-[900px] flex-col px-4 pb-44 pt-8 sm:px-8 sm:pt-12">
            <div className="mb-7 flex items-start justify-between gap-5">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[.16em] text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-accent" />Conversation</div>
                {editingTitle ? (
                  <div className="flex items-center gap-2"><input autoFocus value={chatTitle} onChange={(event) => setChatTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { setEditingTitle(false); setChats((current) => current.map((chat) => chat.id === activeChatId ? { ...chat, title: chatTitle } : chat)); } }} data-testid="input-chat-name" className="w-full max-w-[360px] border-b-2 border-primary bg-transparent pb-1 text-2xl font-semibold tracking-[-.04em] outline-none sm:text-3xl" /><button onClick={() => setEditingTitle(false)} data-testid="button-save-chat-name" className="rounded-lg p-2 text-primary hover:bg-primary/10"><Check size={17} /></button></div>
                ) : (
                  <div className="group flex items-center gap-2"><h1 data-testid="text-active-chat-title" className="truncate text-2xl font-semibold tracking-[-.045em] sm:text-3xl">{chatTitle}</h1><button onClick={() => setEditingTitle(true)} data-testid="button-edit-chat-name" className="rounded-lg p-2 text-muted-foreground opacity-70 transition-opacity hover:bg-muted hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100"><Pencil size={15} /></button></div>
                )}
                <p className="mt-2 text-sm text-muted-foreground">A private thread, kept close to home.</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <input ref={fileRef} type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) { setAvatarImage(URL.createObjectURL(file)); showNotice('Profile image updated locally'); } }} className="hidden" data-testid="input-profile-image" />
                <button onClick={() => fileRef.current?.click()} data-testid="button-edit-avatar" className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-border bg-muted text-muted-foreground transition hover:border-primary hover:text-primary" aria-label="Edit chat avatar">{avatarImage ? <img src={avatarImage} alt="Local profile" className="h-full w-full object-cover" /> : <span className="text-xs font-semibold">A</span>}<span className="absolute inset-0 grid place-items-center bg-foreground/55 text-background opacity-0 transition-opacity hover:opacity-100"><Pencil size={13} /></span></button>
                <button onClick={() => showNotice('More conversation actions coming to local mode')} data-testid="button-more-chat-actions" className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><MoreHorizontal size={19} /></button>
              </div>
            </div>

            <div className="space-y-7">
              {messages.map((message, index) => <MessageBubble key={message.id} message={message} index={index} onCopy={copyMessage} onFeedback={(kind) => showNotice(kind === 'up' ? 'Thanks — that helps Orion learn your preference locally' : 'Noted. We’ll keep this response out of future local suggestions')} />)}
              {generating && <GeneratingState step={generationStep} model={model} onStop={stopGenerating} />}
            </div>
            {messages.length <= 1 && !generating && <SuggestedPrompts onSelect={(value) => { setComposer(value); composerRef.current?.focus(); }} />}
          </div>
        </section>

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex justify-center bg-gradient-to-t from-background via-background/95 to-transparent px-4 pb-5 pt-14 sm:pb-7">
          <div className="pointer-events-auto w-full max-w-[790px]">
            {proLocked && <div className="mb-2 flex items-center justify-between rounded-xl border border-accent/25 bg-accent/5 px-3 py-2 text-xs text-accent"><span><strong>Orion Intelligence is resting.</strong> Three high-compute turns used locally.</span><span className="hidden font-mono sm:block">TRY AGAIN IN 2H 58M</span></div>}
            {attachment && <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs text-primary"><Paperclip size={13} />{attachment}<button onClick={() => setAttachment('')} data-testid="button-remove-attachment" className="ml-1 rounded p-0.5 hover:bg-primary/10"><X size={13} /></button></div>}
            <div className="composer-glow rounded-[24px] bg-card shadow-[0_12px_32px_hsl(var(--foreground)/.08)]">
              <div className="rounded-[23px] bg-card p-2">
                <textarea ref={composerRef} value={composer} onChange={(event) => setComposer(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} disabled={generating || proLocked} data-testid="input-message-composer" placeholder={proLocked ? 'Orion Intelligence is taking a short local pause…' : 'Ask Orion anything…'} rows={2} className="w-full resize-none bg-transparent px-3 pt-2 text-[15px] leading-6 outline-none placeholder:text-muted-foreground/70 disabled:cursor-not-allowed" />
                <div className="flex items-center justify-between gap-2 px-1 pb-1 pt-1">
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setSheetTab('add'); setPanel('sheet'); }} data-testid="button-add-to-chat" className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Add to chat"><Plus size={19} /></button>
                    <button onClick={() => setVoiceOpen(true)} data-testid="button-live-voice" className="flex h-9 items-center gap-2 rounded-xl px-2.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Mic size={16} /><span className="hidden text-xs font-medium sm:inline">Live voice</span></button>
                    <span className="hidden h-4 w-px bg-border sm:block" />
                    <div className="relative">
                      <button onClick={() => setModelOpen((value) => !value)} data-testid="button-model-selector" className="flex h-9 items-center gap-2 rounded-xl px-2.5 text-muted-foreground hover:bg-muted hover:text-foreground"><span className={`grid h-5 w-5 place-items-center rounded-full ${model === 'flash' ? 'bg-primary/15 text-primary' : model === 'sting' ? 'bg-violet-500/15 text-violet-500' : 'bg-accent/15 text-accent'}`}><Sparkles size={12} /></span><span className="hidden text-xs font-medium sm:inline">{selectedModel.name.replace('Scorpio ', '')}</span><ChevronDown size={13} /></button>
                      {modelOpen && <ModelMenu current={model} proUses={proUses} onSelect={(value) => { setModel(value); setModelOpen(false); }} />}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {webSearch && <span className="hidden items-center gap-1 text-[11px] font-medium text-primary sm:flex"><Globe2 size={13} />Web on</span>}
                    {generating ? <button onClick={stopGenerating} data-testid="button-stop-generating" className="grid h-10 w-10 place-items-center rounded-full bg-foreground text-background transition hover:scale-105"><Square size={14} fill="currentColor" /></button> : <button onClick={() => sendMessage()} disabled={!composer.trim() || proLocked} data-testid="button-send-message" aria-label="Send message" className="grid h-10 w-10 place-items-center rounded-full bg-accent text-accent-foreground transition hover:scale-105 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground dark:bg-primary dark:text-primary-foreground"><ArrowUp size={19} strokeWidth={2.5} /></button>}
                  </div>
                </div>
              </div>
            </div>
            <p data-testid="text-local-disclaimer" className="mt-2 text-center font-mono text-[10px] uppercase tracking-[.1em] text-muted-foreground/70">Local memory on · Orion can make mistakes</p>
          </div>
        </div>
      </main>

      {panel !== 'none' && <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[2px]" onClick={() => setPanel('none')} data-testid="overlay-panel" />}
      {panel === 'guest' && <GuestPanel onClose={() => setPanel('none')} onLogin={() => { setLoginMode('login'); setPanel('login'); }} />}
      {panel === 'login' && <LoginPanel mode={loginMode} setMode={setLoginMode} email={loginEmail} setEmail={setLoginEmail} onClose={() => setPanel('none')} onSubmit={toggleLogin} />}
      {panel === 'account' && <AccountPanel dark={dark} onTheme={() => setDark((value) => !value)} section={accountSection} setSection={setAccountSection} avatarImage={avatarImage} onAvatar={(src) => setAvatarImage(src)} onClose={() => setPanel('none')} onNotice={showNotice} />}
      {panel === 'sheet' && <AddSheet tab={sheetTab} setTab={setSheetTab} webSearch={webSearch} setWebSearch={setWebSearch} onFile={(name) => { setAttachment(name); setPanel('none'); }} onClose={() => setPanel('none')} onNotice={showNotice} />}
      {voiceOpen && <VoiceScreen selected={selectedVoice} setSelected={setSelectedVoice} listening={liveListening} setListening={setLiveListening} onClose={() => setVoiceOpen(false)} />}
      {essayOpen && <EssayDialog title={essayTitle} setTitle={setEssayTitle} words={essayWords} setWords={setEssayWords} onClose={() => setEssayOpen(false)} onStart={startEssay} />}
      {notice && <div data-testid="status-toast" className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-foreground px-4 py-2.5 text-xs font-medium text-background shadow-xl animate-rise-in">{notice}</div>}
    </div>
  );
}

function MessageBubble({ message, index, onCopy, onFeedback }: { message: Message; index: number; onCopy: (text: string) => void; onFeedback: (kind: 'up' | 'down') => void }) {
  const assistant = message.role === 'assistant';
  return (
    <article data-testid={`message-${message.role}-${index}`} className={`animate-rise-in ${assistant ? 'max-w-[740px]' : 'ml-auto max-w-[590px]'}`} style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}>
      {assistant ? (
        <div className="flex gap-3 sm:gap-4">
          <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-foreground text-background"><span className="h-3.5 w-3.5 rounded-full border border-current" /></div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2"><span className="text-xs font-semibold">Orion</span><span className="font-mono text-[10px] text-muted-foreground">{message.time}</span>{message.policy && <span data-testid={`status-policy-${index}`} className="rounded-full bg-destructive/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[.08em] text-destructive">Policy boundary</span>}</div>
            <div className="mt-3 flex items-center gap-1">
              <button onClick={() => onCopy(message.text)} data-testid={`button-copy-message-${index}`} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Copy response"><Copy size={14} /></button>
              <button onClick={() => onFeedback('up')} data-testid={`button-thumbs-up-${index}`} className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary" aria-label="Helpful response"><ThumbsUp size={14} /></button>
              <button onClick={() => onFeedback('down')} data-testid={`button-thumbs-down-${index}`} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Unhelpful response"><ThumbsDown size={14} /></button>
            </div>
            <p data-testid={`text-assistant-message-${index}`} className={`text-[15px] leading-7 ${message.policy ? 'rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-destructive' : 'text-foreground/85'}`}>{message.text}</p>
          </div>
        </div>
      ) : (
        <div className={`rounded-[19px] rounded-br-md px-4 py-3 ${message.policy ? 'border border-destructive/30 bg-destructive/5 text-destructive' : 'bg-foreground text-background'}`}>
          {message.attachment && <div className="mb-2 flex items-center gap-2 text-[11px] opacity-70"><Paperclip size={12} />{message.attachment}</div>}
          <p data-testid={`text-user-message-${index}`} className="text-[14px] leading-6">{message.text}</p>
          <p className="mt-1 text-right font-mono text-[9px] opacity-55">{message.time}</p>
        </div>
      )}
    </article>
  );
}

function GeneratingState({ step, model, onStop }: { step: number; model: ModelId; onStop: () => void }) {
  const steps = ['Listening for the shape of it', 'Sorting the useful threads', 'Writing a considered response'];
  return (
    <div data-testid="status-generating" className="flex gap-3 sm:gap-4 animate-rise-in">
      <div className="animate-breathe mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-foreground text-background"><span className="h-3.5 w-3.5 rounded-full border border-current" /></div>
      <div className="flex-1">
        <div className="mb-2 flex items-center gap-2"><span className="text-xs font-semibold">Orion</span><span className="font-mono text-[10px] text-primary">THINKING · {modelDetails[model].label.toUpperCase()}</span></div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><span className="flex gap-1"><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-.2s]" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-.1s]" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" /></span><span data-testid="text-generation-step">{steps[Math.max(0, Math.min(step, 2))]}</span></div>
        <button onClick={onStop} data-testid="button-stop-inline" className="mt-4 flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"><Square size={11} fill="currentColor" />Stop generating</button>
      </div>
    </div>
  );
}

function SuggestedPrompts({ onSelect }: { onSelect: (value: string) => void }) {
  const prompts = ['Help me make a decision', 'Draft a thoughtful note', 'What can we untangle?'];
  return <div className="mt-14 border-t border-border/70 pt-5"><p className="mb-3 font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">A few ways in</p><div className="flex flex-wrap gap-2">{prompts.map((prompt) => <button key={prompt} onClick={() => onSelect(prompt)} data-testid={`button-suggestion-${prompt.toLowerCase().replaceAll(' ', '-')}`} className="rounded-full border border-border bg-card px-3.5 py-2 text-xs text-muted-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:text-foreground">{prompt}</button>)}</div></div>;
}

function ModelMenu({ current, proUses, onSelect }: { current: ModelId; proUses: number; onSelect: (model: ModelId) => void }) {
  return (
    <div data-testid="menu-models" className="absolute bottom-12 left-0 z-30 w-[290px] rounded-2xl border border-border bg-popover p-2 shadow-[0_18px_50px_hsl(var(--foreground)/.15)]">
      <div className="px-3 pb-2 pt-1"><p className="font-mono text-[10px] uppercase tracking-[.15em] text-muted-foreground">Choose your thinking pace</p></div>
      {(Object.keys(modelDetails) as ModelId[]).map((id) => {
        const detail = modelDetails[id];
        return <button key={id} onClick={() => onSelect(id)} data-testid={`button-select-model-${id}`} className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-muted ${current === id ? 'bg-muted' : ''}`}><span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${id === 'flash' ? 'bg-primary/12 text-primary' : id === 'sting' ? 'bg-violet-500/12 text-violet-500' : 'bg-accent/12 text-accent'}`}><Sparkles size={14} /></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2 text-xs font-semibold">{detail.name}{current === id && <Check size={14} className="text-primary" />}</span><span className="mt-0.5 block text-[11px] text-muted-foreground">{detail.description}</span>{id === 'orion' && <span data-testid="text-pro-usage" className="mt-1 block font-mono text-[9px] uppercase tracking-wider text-accent">{proUses}/3 deep turns used · 3 hour local cooldown</span>}</span></button>;
      })}
    </div>
  );
}

function GuestPanel({ onClose, onLogin }: { onClose: () => void; onLogin: () => void }) {
  return <SidePanel onClose={onClose} title="Your local profile"><div className="flex flex-col items-center px-4 pb-7 pt-4 text-center"><div className="grid h-20 w-20 place-items-center rounded-full border-4 border-background bg-foreground text-background shadow-[0_0_0_1px_hsl(var(--border))]"><UserRound size={30} /></div><h2 className="mt-5 text-xl font-semibold tracking-[-.03em]">You’re visiting as a guest</h2><p className="mt-2 max-w-[280px] text-sm leading-6 text-muted-foreground">Your chats stay on this device. Sign in locally to keep a profile, preferences, and workspace settings together.</p><button onClick={onLogin} data-testid="button-login-from-guest" className="mt-6 flex h-11 w-full max-w-[280px] items-center justify-center gap-2 rounded-xl bg-foreground text-sm font-semibold text-background transition hover:opacity-90"><LogIn size={16} />Log in or sign up</button><div className="mt-6 flex items-center gap-2 text-[11px] text-muted-foreground"><ShieldCheck size={14} className="text-primary" />No cloud account is required for local mode</div></div></SidePanel>;
}

function LoginPanel({ mode, setMode, email, setEmail, onClose, onSubmit }: { mode: 'login' | 'signup'; setMode: (mode: 'login' | 'signup') => void; email: string; setEmail: (value: string) => void; onClose: () => void; onSubmit: () => void }) {
  const [password, setPassword] = useState('');
  return <SidePanel onClose={onClose} title={mode === 'login' ? 'Welcome back' : 'Make it yours'}><div className="p-5"><div className="mb-6 rounded-2xl border border-dashed border-primary/35 bg-primary/5 p-5 text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-card text-primary shadow-sm"><Image size={24} /></div><p data-testid="text-local-image-placeholder" className="mt-3 text-xs font-medium">Your uploaded image lives here</p><p className="mt-1 text-[11px] leading-5 text-muted-foreground">Local placeholder · add a profile image after you continue</p></div><div className="mb-6 flex rounded-xl bg-muted p-1"><button onClick={() => setMode('login')} data-testid="button-login-tab" className={`flex-1 rounded-lg py-2 text-xs font-semibold ${mode === 'login' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>Log in</button><button onClick={() => setMode('signup')} data-testid="button-signup-tab" className={`flex-1 rounded-lg py-2 text-xs font-semibold ${mode === 'signup' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>Sign up</button></div><label className="mb-1.5 block text-xs font-semibold">Email address</label><div className="relative"><AtSign size={15} className="absolute left-3 top-3.5 text-muted-foreground" /><input value={email} onChange={(event) => setEmail(event.target.value)} data-testid="input-login-email" type="email" placeholder="you@example.com" className="h-11 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10" /></div><label className="mb-1.5 mt-4 block text-xs font-semibold">Passphrase</label><input value={password} onChange={(event) => setPassword(event.target.value)} data-testid="input-login-password" type="password" placeholder="At least 8 characters" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10" /><button onClick={onSubmit} disabled={!email || !password} data-testid="button-submit-login" className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-sm font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35">{mode === 'login' ? <LogIn size={16} /> : <Plus size={16} />}{mode === 'login' ? 'Continue locally' : 'Create local profile'}</button><p className="mt-5 text-center font-mono text-[10px] uppercase tracking-[.1em] text-muted-foreground">Firebase ready · credentials are placeholders</p></div></SidePanel>;
}

function AccountPanel({ dark, onTheme, section, setSection, avatarImage, onAvatar, onClose, onNotice }: { dark: boolean; onTheme: () => void; section: string; setSection: (section: string) => void; avatarImage: string; onAvatar: (src: string) => void; onClose: () => void; onNotice: (message: string) => void }) {
  const items = [{ label: 'Manage Activity', icon: Activity }, { label: 'Settings', icon: Settings }, { label: 'Privacy & Personalization', icon: ShieldCheck }, { label: 'Subscriptions', icon: Zap }, { label: 'Connectors', icon: UsersRound }, { label: 'Workspace', icon: FileText }];
  const upload = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) { onAvatar(URL.createObjectURL(file)); onNotice('Profile image updated locally'); } };
  return <SidePanel onClose={onClose} title="Account & workspace"><div className="flex border-b border-border px-5 py-4"><div className="grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-foreground text-sm font-semibold text-background">{avatarImage ? <img src={avatarImage} alt="Amara M profile" className="h-full w-full object-cover" /> : 'AM'}</div><div className="ml-3 flex-1"><p data-testid="text-account-name" className="text-sm font-semibold">Amara M.</p><p data-testid="text-account-email" className="text-xs text-muted-foreground">amara@orion.local</p></div><label className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil size={14} /><input type="file" accept="image/*" onChange={upload} className="hidden" data-testid="input-account-avatar" /></label></div><div className="p-3">{items.map(({ label, icon: Icon }) => <button key={label} onClick={() => setSection(label)} data-testid={`button-account-${label.toLowerCase().replaceAll(' & ', '-').replaceAll(' ', '-')}`} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${section === label ? 'bg-muted font-semibold' : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'}`}><Icon size={16} />{label}</button>)}</div><div className="mx-5 mt-1 border-t border-border pt-5">{section === 'Settings' && <div className="mb-5"><p className="font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">Appearance</p><button onClick={onTheme} data-testid="button-account-theme" className="mt-3 flex w-full items-center justify-between rounded-xl border border-border p-3 text-left text-sm"><span className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary"><Bell size={14} /></span>Theme</span><span className="text-xs text-muted-foreground">{dark ? 'Dark' : 'Light'}</span></button></div>}<div><p className="font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">Local Firebase configuration</p><div data-testid="display-firebase-config" className="mt-3 space-y-2 rounded-xl bg-muted/70 p-3 font-mono text-[10px] leading-5 text-muted-foreground"><div>apiKey <span className="text-foreground">VITE_FIREBASE_API_KEY</span></div><div>databaseURL <span className="text-foreground">VITE_FIREBASE_DATABASE_URL</span></div><div>collection <span className="text-foreground">profiles</span></div><div>fields <span className="text-foreground">username · email · uid · dob</span></div></div></div></div><div className="mt-7 border-t border-border p-5"><button onClick={() => onNotice('Account export prepared in local mode')} data-testid="button-export-account" className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-xs font-semibold hover:bg-muted"><Clipboard size={14} />Export local data</button></div></SidePanel>;
}

function SidePanel({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return <section role="dialog" aria-label={title} data-testid={`panel-${title.toLowerCase().replaceAll(' ', '-')}`} className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[390px] flex-col border-l border-border bg-card shadow-[-18px_0_50px_hsl(var(--foreground)/.12)] animate-rise-in"><div className="flex h-[76px] shrink-0 items-center justify-between border-b border-border px-5"><h2 className="font-semibold tracking-[-.025em]">{title}</h2><button onClick={onClose} data-testid="button-close-panel" className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></button></div><div className="scrollbar-subtle flex-1 overflow-y-auto">{children}</div></section>;
}

function AddSheet({ tab, setTab, webSearch, setWebSearch, onFile, onClose, onNotice }: { tab: 'add' | 'connectors'; setTab: (tab: 'add' | 'connectors') => void; webSearch: boolean; setWebSearch: (value: boolean) => void; onFile: (name: string) => void; onClose: () => void; onNotice: (message: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const options = [{ label: 'Image', detail: 'PNG, JPG up to 10 MB', icon: Image }, { label: 'Video', detail: 'MP4, MOV up to 50 MB', icon: Video }, { label: 'File', detail: 'PDF, DOCX, TXT up to 20 MB', icon: File }];
  return <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[680px] rounded-t-[28px] border border-b-0 border-border bg-card shadow-[0_-18px_60px_hsl(var(--foreground)/.16)] animate-rise-in"><div className="mx-auto mt-3 h-1 w-10 rounded-full bg-border" /><div className="flex items-center justify-between px-5 pb-2 pt-4"><div><p className="font-mono text-[10px] uppercase tracking-[.15em] text-primary">Composer tools</p><h2 className="mt-1 text-lg font-semibold tracking-[-.03em]">Add to chat</h2></div><button onClick={onClose} data-testid="button-close-add-sheet" className="rounded-xl p-2 text-muted-foreground hover:bg-muted"><X size={18} /></button></div><div className="flex gap-1 border-b border-border px-5"><button onClick={() => setTab('add')} data-testid="button-add-tab" className={`border-b-2 px-1 pb-3 pt-2 text-xs font-semibold ${tab === 'add' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>Add to chat</button><button onClick={() => setTab('connectors')} data-testid="button-connectors-tab" className={`border-b-2 px-1 pb-3 pt-2 text-xs font-semibold ${tab === 'connectors' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>Connectors</button></div>{tab === 'add' ? <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">{options.map(({ label, detail, icon: Icon }) => <button key={label} onClick={() => inputRef.current?.click()} data-testid={`button-attach-${label.toLowerCase()}`} className="group rounded-2xl border border-border bg-background p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/40"><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground"><Icon size={18} /></span><span className="mt-3 block text-xs font-semibold">{label}</span><span className="mt-1 block text-[10px] leading-4 text-muted-foreground">{detail}</span></button>)}<input ref={inputRef} type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) onFile(file.name); }} className="hidden" data-testid="input-chat-attachment" /><button onClick={() => setWebSearch(!webSearch)} data-testid="button-toggle-web-search" className={`rounded-2xl border p-4 text-left transition ${webSearch ? 'border-primary bg-primary/10' : 'border-border bg-background hover:border-primary/40'}`}><span className={`grid h-9 w-9 place-items-center rounded-xl ${webSearch ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}><Globe2 size={18} /></span><span className="mt-3 block text-xs font-semibold">Web search</span><span className="mt-1 block text-[10px] leading-4 text-muted-foreground">{webSearch ? 'On for this chat' : 'Search current sources'}</span></button></div> : <div className="grid gap-3 p-5 sm:grid-cols-2">{['Google Drive', 'Notion', 'Calendar', 'Dropbox'].map((name) => <button key={name} onClick={() => onNotice(`${name} connector is ready for a local integration`)} data-testid={`button-connector-${name.toLowerCase()}`} className="flex items-center gap-3 rounded-2xl border border-border p-4 text-left hover:border-primary/40 hover:bg-muted"><span className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-muted-foreground"><UsersRound size={17} /></span><span><span className="block text-xs font-semibold">{name}</span><span className="mt-1 block text-[10px] text-muted-foreground">Local placeholder · connect later</span></span><ChevronRight size={15} className="ml-auto text-muted-foreground" /></button>)}</div>}<div className="h-3" /></div>;
}

function VoiceScreen({ selected, setSelected, listening, setListening, onClose }: { selected: string; setSelected: (voice: string) => void; listening: boolean; setListening: (value: boolean) => void; onClose: () => void }) {
  const voices = [{ name: 'June', detail: 'Warm · measured' }, { name: 'Rowan', detail: 'Clear · grounded' }, { name: 'Mira', detail: 'Soft · curious' }];
  return <div className="fixed inset-0 z-[60] flex flex-col bg-background animate-rise-in"><div className="flex h-[76px] items-center justify-between border-b border-border px-5 sm:px-10"><button onClick={onClose} data-testid="button-close-voice" className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm text-muted-foreground hover:bg-muted"><ChevronLeft size={18} />Back to chat</button><span className="font-mono text-[10px] uppercase tracking-[.16em] text-primary">Live voice · local</span><button onClick={onClose} data-testid="button-close-voice-x" className="rounded-xl p-2 text-muted-foreground hover:bg-muted"><X size={18} /></button></div><div className="relative mx-auto flex w-full max-w-[700px] flex-1 flex-col items-center justify-center overflow-hidden px-5"><div className={`relative grid h-48 w-48 place-items-center rounded-full border border-primary/40 bg-card shadow-[0_0_0_18px_hsl(var(--primary)/.04),0_0_80px_hsl(var(--primary)/.14)] ${listening ? 'animate-breathe' : ''}`}><div className="absolute inset-4 rounded-full border border-primary/20" /><div className="absolute inset-8 rounded-full border border-accent/20" /><span className="relative grid h-20 w-20 place-items-center rounded-full bg-foreground text-background"><span className="h-8 w-8 rounded-full border-2 border-current" /></span></div><p className="mt-12 font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">{listening ? 'Orion is listening' : 'A quiet space to speak'}</p><h1 data-testid="text-voice-title" className="mt-2 text-center font-serif text-4xl italic tracking-[-.03em]">Where should we begin?</h1><div className="mt-10 flex flex-wrap justify-center gap-2">{voices.map((voice) => <button key={voice.name} onClick={() => setSelected(voice.name)} data-testid={`button-voice-${voice.name.toLowerCase()}`} className={`rounded-full border px-4 py-2 text-left transition ${selected === voice.name ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/40'}`}><span className="block text-xs font-semibold">{voice.name}</span><span className="text-[10px] text-muted-foreground">{voice.detail}</span></button>)}</div><button onClick={() => setListening(!listening)} data-testid="button-toggle-listening" className={`mt-10 grid h-16 w-16 place-items-center rounded-full transition hover:scale-105 ${listening ? 'bg-accent text-accent-foreground' : 'bg-foreground text-background'}`}>{listening ? <Square size={19} fill="currentColor" /> : <Mic size={22} />}</button><p className="mt-3 text-xs text-muted-foreground">{listening ? 'Tap to pause' : `Speak with ${selected}`}</p></div></div>;
}

function EssayDialog({ title, setTitle, words, setWords, onClose, onStart }: { title: string; setTitle: (value: string) => void; words: string; setWords: (value: string) => void; onClose: () => void; onStart: () => void }) {
  return <div className="fixed inset-0 z-[60] grid place-items-center bg-foreground/30 p-4 backdrop-blur-sm"><section role="dialog" aria-label="Writing brief" data-testid="dialog-essay" className="w-full max-w-[480px] rounded-3xl border border-border bg-card p-6 shadow-[0_20px_70px_hsl(var(--foreground)/.22)] animate-rise-in"><div className="flex items-start justify-between"><div><span className="font-mono text-[10px] uppercase tracking-[.16em] text-primary">Writing brief</span><h2 className="mt-2 text-2xl font-semibold tracking-[-.04em]">Give the idea a shape</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">A title and a little constraint help the local writer find its center.</p></div><button onClick={onClose} data-testid="button-close-essay" className="rounded-xl p-2 text-muted-foreground hover:bg-muted"><X size={18} /></button></div><label className="mt-6 block text-xs font-semibold">Working title</label><input value={title} onChange={(event) => setTitle(event.target.value)} data-testid="input-essay-title" className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary" placeholder="The idea in one line" /><label className="mt-4 block text-xs font-semibold">Word count</label><div className="mt-2 flex gap-2">{['350', '650', '1000'].map((value) => <button key={value} onClick={() => setWords(value)} data-testid={`button-word-count-${value}`} className={`flex-1 rounded-xl border py-2.5 text-xs font-semibold ${words === value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}>{value} words</button>)}</div><button onClick={onStart} disabled={!title.trim()} data-testid="button-save-essay" className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-35"><Check size={16} />Save & begin</button></section></div>;
}

export default App;