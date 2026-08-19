import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  ArrowUp,
  AtSign,
  Bell,
  Bot,
  Camera,
  CameraOff,
  Check,
  CheckCircle2,
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
  Pause,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Share2,
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
  VideoOff,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import MyApps from '@/components/my-apps';
import { orionResponse, type BrainAttachment } from '@/lib/orion-brain';
import { generateLocalResponseSync, ORION_SYSTEM_PROMPT } from '@/lib/transformer.js';

type ModelId = 'flash' | 'sting' | 'orion';
type Panel = 'none' | 'guest' | 'login' | 'account' | 'sheet';
type Role = 'user' | 'assistant';
type Message = {
  id: string;
  role: Role;
  text: string;
  time: string;
  policy?: boolean;
  attachment?: BrainAttachment;
  feedback?: 'up' | 'down';
};
type Chat = { id: string; title: string; preview: string; time: string };

const nowTime = () =>
  new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date());

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

const starterChatIds = new Set(['orion-brief', 'kyoto-notes', 'kitchen-table', 'reading-list', 'launch-plan']);
const readChats = () => readStore<Chat[]>('orion-chats', []).filter((chat) => !starterChatIds.has(chat.id));

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function App() {
  const [dark, setDark] = useState(() => readStore('orion-theme', false));
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>('none');
  const [loggedIn, setLoggedIn] = useState(() => readStore('orion-logged-in', false));
  const [chats, setChats] = useState<Chat[]>(readChats);
  const [activeChatId, setActiveChatId] = useState('');
  const [messages, setMessages] = useState<Message[]>(() => readChats().length ? readStore('orion-messages', []) : []);
  const [composer, setComposer] = useState('');
  const [model, setModel] = useState<ModelId>(() => readStore('orion-model', 'flash'));
  const [modelOpen, setModelOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<'add' | 'connectors'>('add');
  const [webSearch, setWebSearch] = useState(false);
  const [attachment, setAttachment] = useState<BrainAttachment | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [proUses, setProUses] = useState(() => readStore('orion-pro-uses', 0));
  const [essayOpen, setEssayOpen] = useState(false);
  const [essayTitle, setEssayTitle] = useState('');
  const [essayWords, setEssayWords] = useState('650');
  const [editingTitle, setEditingTitle] = useState(false);
  const [chatTitle, setChatTitle] = useState('New chat');
  const [avatarImage, setAvatarImage] = useState('');
  const [accountSection, setAccountSection] = useState('Manage Activity');
  const [loginMode, setLoginMode] = useState<'login' | 'signup'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('June');
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [liveListening, setLiveListening] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [appScreen, setAppScreen] = useState(false);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [chatAction, setChatAction] = useState<'search' | 'media' | 'notifications' | null>(null);
  const [chatSearch, setChatSearch] = useState('');
  const [chatHoldId, setChatHoldId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [essayResult, setEssayResult] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const documentRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<number | null>(null);
  const holdRef = useRef<number | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    window.localStorage.setItem('orion-theme', JSON.stringify(dark));
  }, [dark]);
  useEffect(() => { window.localStorage.setItem('orion-chats', JSON.stringify(chats)); }, [chats]);
  useEffect(() => { window.localStorage.setItem('orion-messages', JSON.stringify(messages)); }, [messages]);
  useEffect(() => {
    if (activeChatId) window.localStorage.setItem(`orion-messages-${activeChatId}`, JSON.stringify(messages));
  }, [activeChatId, messages]);
  useEffect(() => { window.localStorage.setItem('orion-model', JSON.stringify(model)); }, [model]);
  useEffect(() => { window.localStorage.setItem('orion-pro-uses', JSON.stringify(proUses)); }, [proUses]);
  useEffect(() => { window.localStorage.setItem('orion-logged-in', JSON.stringify(loggedIn)); }, [loggedIn]);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const selectedModel = modelDetails[model];
  const proLocked = false;

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2600);
  };

  const selectChat = (chat: Chat) => {
    setActiveChatId(chat.id);
    setChatTitle(chat.title);
    setMessages(readStore(`orion-messages-${chat.id}`, []));
    setComposer('');
    setAttachment(null);
  };

  const saveChatTitle = () => {
    const nextTitle = chatTitle.trim() || 'Untitled conversation';
    setChatTitle(nextTitle);
    setEditingTitle(false);
    setChats((current) => current.map((chat) => chat.id === activeChatId ? { ...chat, title: nextTitle } : chat));
  };

  const deleteChat = (chatId: string) => {
    setChats((current) => current.filter((chat) => chat.id !== chatId));
    window.localStorage.removeItem(`orion-messages-${chatId}`);
    if (chatId === activeChatId) {
      setActiveChatId('');
      setChatTitle('New chat');
      setMessages([]);
    }
    setChatHoldId(null);
    showNotice('Chat deleted');
  };

  const shareChat = async () => {
    const text = `${chatTitle}\n\n${messages.map((message) => `${message.role === 'user' ? 'You' : 'Orion'}: ${message.text}`).join('\n\n')}`;
    try {
      const canShare = typeof navigator.share === 'function';
      if (canShare) await navigator.share({ title: chatTitle, text });
      else await navigator.clipboard?.writeText(text);
      showNotice(canShare ? 'Share sheet opened' : 'Chat copied to clipboard');
    } catch {
      showNotice('Share cancelled');
    }
  };

  const beginChatHold = (chatId: string) => {
    if (holdRef.current) window.clearTimeout(holdRef.current);
    holdRef.current = window.setTimeout(() => setChatHoldId(chatId), 520);
  };

  const endChatHold = () => {
    if (holdRef.current) window.clearTimeout(holdRef.current);
  };

  const newChat = () => {
    const chat: Chat = { id: createId('chat'), title: 'Untitled conversation', preview: 'A fresh place to begin.', time: 'Now' };
    setChats((current) => [chat, ...current]);
    setActiveChatId(chat.id);
    setChatTitle(chat.title);
    setMessages([]);
    setComposer('');
    setAttachment(null);
    showNotice('New conversation ready');
  };

  const finishResponse = (prompt: string, attached?: BrainAttachment, localText?: string) => {
    const response = orionResponse(prompt, attached, webSearch);
    const specialized = response.blocked || response.policy || attached || /(creator of orion|who (created|made|built)|garexcell products|time in (uk|london|britain|england))/i.test(prompt);
    const finalText = specialized ? response.text : localText || response.text;
    setMessages((current) => {
      const next = [...current, { id: createId('assistant'), role: 'assistant' as const, text: finalText, time: nowTime(), policy: response.policy }];
      if (activeChatId) window.localStorage.setItem(`orion-messages-${activeChatId}`, JSON.stringify(next));
      return next;
    });
    setChats((current) => current.map((chat) => chat.id === activeChatId ? { ...chat, preview: finalText.slice(0, 52), time: 'Now' } : chat));
    setGenerating(false);
    setGenerationStep(0);
    if (attached) showNotice(`${attached.name} added to this chat`);
  };

  const sendMessage = (override?: string) => {
    const prompt = (override ?? composer).trim();
    if ((!prompt && !attachment) || generating || proLocked) return;
    if (/(essay|paragraph|article|write about)/i.test(prompt) && !override) {
      setEssayTitle(prompt.replace(/^(write|draft|create)\s+(an?\s+)?(essay|paragraph|article)\s*(about|on)?\s*/i, '').trim() || 'Untitled piece');
      setEssayOpen(true);
      return;
    }
    const attached = attachment;
    const question = prompt || `Please analyze this ${attached?.kind ?? 'file'}.`;
    const response = orionResponse(question, attached ?? undefined, webSearch);
    const isBlocked = response.blocked;
    const visiblePrompt = isBlocked ? 'This message may violate Orion policy guidelines.' : (prompt || `Analyze this ${attached?.kind ?? 'file'}.`);
    const userMessage = { id: createId('user'), role: 'user' as const, text: visiblePrompt, time: nowTime(), policy: isBlocked, attachment: attached ?? undefined };
    setMessages((current) => {
      const next = [...current, userMessage];
      if (activeChatId) window.localStorage.setItem(`orion-messages-${activeChatId}`, JSON.stringify(next));
      return next;
    });
    setComposer('');
    setEditingMessageId(null);
    setAttachment(null);
    setGenerating(true);
    if (model === 'orion') setProUses((count) => count + 1);
    const delay = model === 'sting' ? 20000 : model === 'orion' ? 3200 : 750;
    timerRef.current = window.setTimeout(() => {
      const fallback = generateLocalResponseSync(question, {
        model,
        systemPrompt: ORION_SYSTEM_PROMPT,
        recentMessages: messages.slice(-6),
        attachment: attached,
      });
      finishResponse(question, attached ?? undefined, fallback);
    }, delay);
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
    timerRef.current = window.setTimeout(() => setGenerationStep(2), 1300);
    window.setTimeout(() => setGenerationStep(3), 2600);
    window.setTimeout(() => {
      const essay = `# ${essayTitle.trim()}\n\nThis locally generated draft begins with a clear central idea, develops it through practical context, and closes by returning to the reader’s next step.\n\nThe strongest version of this piece will add your own examples, lived details, and point of view. Orion can now help you select, revise, or expand the draft.`;
      setEssayResult(essay);
      setMessages((current) => [...current, { id: createId('assistant'), role: 'assistant' as const, text: essay, time: nowTime() }]);
      setGenerating(false);
      setGenerationStep(0);
    }, 4200);
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>, kind: BrainAttachment['kind']) => {
    const file = event.target.files?.[0];
    if (!file) return;
    let detail = `${Math.round(file.size / 1024)} KB`;
    if (kind === 'image') {
      const imageUrl = URL.createObjectURL(file);
      const image = new window.Image();
      image.onload = () => {
        setAttachment({ name: file.name, kind, detail: `${image.naturalWidth} × ${image.naturalHeight}px · ${detail}` });
        URL.revokeObjectURL(imageUrl);
      };
      image.src = imageUrl;
    } else if (kind === 'video') {
      const videoUrl = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        setAttachment({ name: file.name, kind, detail: `${Math.round(video.duration)} sec · ${detail}` });
        URL.revokeObjectURL(videoUrl);
      };
      video.src = videoUrl;
    } else {
      if (file.type.startsWith('text/')) {
        const text = await file.text();
        detail = `${detail} · ${text.slice(0, 180).replace(/\s+/g, ' ')}${text.length > 180 ? '…' : ''}`;
      }
      setAttachment({ name: file.name, kind, detail });
    }
    event.target.value = '';
  };

  const copyMessage = (text: string) => {
    navigator.clipboard?.writeText(text);
    showNotice('Response copied');
  };

  const updateFeedback = (id: string, kind: 'up' | 'down') => {
    setMessages((current) => current.map((message) => message.id === id ? { ...message, feedback: message.feedback === kind ? undefined : kind } : message));
    showNotice(kind === 'up' ? 'Helpful response saved locally' : 'Feedback saved locally');
  };

  const editMessage = (message: Message) => {
    setComposer(message.text);
    setEditingMessageId(message.id);
    setMessages((current) => current.slice(0, current.findIndex((item) => item.id === message.id)));
    composerRef.current?.focus();
    showNotice('Edit the message, then send it again');
  };

  const deleteMessage = (messageId: string) => {
    setMessages((current) => current.filter((message) => message.id !== messageId));
    showNotice('Message deleted');
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
          {chats.length === 0 && expanded && <p data-testid="text-empty-recent-chats" className="px-3 py-4 text-xs leading-5 text-muted-foreground">Your recent conversations will appear here.</p>}
           {chats.map((chat) => (
             <div key={chat.id} className="relative">
               <button
                 onClick={() => { if (chatHoldId === chat.id) { setChatHoldId(null); return; } selectChat(chat); }}
                 onContextMenu={(event) => { event.preventDefault(); setChatHoldId(chat.id); }}
                 onPointerDown={() => beginChatHold(chat.id)}
                 onPointerUp={endChatHold}
                 onPointerLeave={endChatHold}
                 data-testid={`button-recent-chat-${chat.id}`}
                 className={`group mb-1 flex w-full items-center rounded-xl text-left transition-colors ${activeChatId === chat.id ? 'bg-background shadow-sm' : 'hover:bg-background/70'} ${expanded ? 'gap-3 px-3 py-3' : 'justify-center p-3'}`}
               >
                 <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${activeChatId === chat.id ? 'bg-primary/10 text-primary' : 'bg-background/70 text-muted-foreground'}`}><MessageCircle size={15} /></span>
                 {expanded && <span className="min-w-0 flex-1"><span data-testid={`text-chat-title-${chat.id}`} className="block truncate text-[13px] font-medium">{chat.title}</span><span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{chat.preview}</span></span>}
               </button>
               {chatHoldId === chat.id && <div data-testid={`menu-chat-actions-${chat.id}`} className="absolute left-8 top-12 z-50 w-48 rounded-2xl border border-border bg-popover p-1.5 shadow-[0_18px_50px_hsl(var(--foreground)/.16)]">
                 <button onClick={() => { void shareChat(); setChatHoldId(null); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs hover:bg-muted"><Share2 size={14} />Share chat</button>
                 <button onClick={() => deleteChat(chat.id)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs text-destructive hover:bg-destructive/10"><Trash2 size={14} />Delete chat</button>
               </div>}
             </div>
           ))}
        </nav>
        <div className={`border-t border-sidebar-border px-3 py-4 ${expanded ? '' : 'flex justify-center'}`}>
          {expanded && <div className="mb-2 flex items-center justify-between px-2"><span className="font-mono text-[10px] font-medium uppercase tracking-[.18em] text-muted-foreground">My apps</span><Sparkles size={13} className="text-primary" /></div>}
          <button onClick={() => setAppScreen(true)} data-testid="button-create-app" className={`flex w-full items-center rounded-xl text-left text-muted-foreground transition hover:bg-background hover:text-foreground ${expanded ? 'gap-3 px-3 py-2.5' : 'justify-center p-3'}`}>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Plus size={16} /></span>
            {expanded && <span><span className="block text-sm font-semibold">Create app</span><span className="block text-[11px] text-muted-foreground">Turn a prompt into a preview</span></span>}
          </button>
        </div>
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

        {appScreen && <MyApps onClose={() => setAppScreen(false)} onNotice={showNotice} />}

        <section className="scrollbar-subtle flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-[900px] flex-col px-4 pb-44 pt-8 sm:px-8 sm:pt-12">
            <div className="mb-7 flex items-start justify-between gap-5">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[.16em] text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-accent" />Conversation</div>
                 {editingTitle ? (
                   <div className="flex items-center gap-2"><input autoFocus value={chatTitle} onChange={(event) => setChatTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') saveChatTitle(); }} data-testid="input-chat-name" className="w-full max-w-[360px] border-b-2 border-primary bg-transparent pb-1 text-2xl font-semibold tracking-[-.04em] outline-none sm:text-3xl" /><button onClick={saveChatTitle} data-testid="button-save-chat-name" className="rounded-lg p-2 text-primary hover:bg-primary/10"><Check size={17} /></button></div>
                ) : (
                  <div className="group flex items-center gap-2"><h1 data-testid="text-active-chat-title" className="truncate text-2xl font-semibold tracking-[-.045em] sm:text-3xl">{chatTitle}</h1><button onClick={() => setEditingTitle(true)} data-testid="button-edit-chat-name" className="rounded-lg p-2 text-muted-foreground opacity-70 transition-opacity hover:bg-muted hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100"><Pencil size={15} /></button></div>
                )}
                <p className="mt-2 text-sm text-muted-foreground">A private thread, kept close to you.</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <input ref={fileRef} type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) { setAvatarImage(URL.createObjectURL(file)); showNotice('Profile image updated locally'); } }} className="hidden" data-testid="input-profile-image" />
                <button onClick={() => fileRef.current?.click()} data-testid="button-edit-avatar" className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-border bg-muted text-muted-foreground transition hover:border-primary hover:text-primary" aria-label="Edit chat avatar">{avatarImage ? <img src={avatarImage} alt="Local profile" className="h-full w-full object-cover" /> : <span className="text-xs font-semibold">A</span>}<span className="absolute inset-0 grid place-items-center bg-foreground/55 text-background opacity-0 transition-opacity hover:opacity-100"><Pencil size={13} /></span></button>
                 <div className="relative">
                   <button onClick={() => setChatMenuOpen((value) => !value)} data-testid="button-more-chat-actions" className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><MoreHorizontal size={19} /></button>
                   {chatMenuOpen && <ChatMenu onAction={(action) => { setChatMenuOpen(false); setChatAction(action); }} onClear={() => { setMessages([]); if (activeChatId) window.localStorage.removeItem(`orion-messages-${activeChatId}`); setChatMenuOpen(false); showNotice('Chat cleared'); }} />}
                 </div>
              </div>
            </div>
             {chatAction && <ChatInspector action={chatAction} query={chatSearch} setQuery={setChatSearch} messages={messages} onClose={() => setChatAction(null)} onNotice={showNotice} />}

            <div className="space-y-7">
               {messages.map((message, index) => <MessageBubble key={message.id} message={message} index={index} onCopy={copyMessage} onFeedback={(kind) => updateFeedback(message.id, kind)} onEdit={editMessage} onDelete={deleteMessage} />)}
              {generating && <GeneratingState step={generationStep} model={model} onStop={stopGenerating} />}
            </div>
            {messages.length <= 1 && !generating && <SuggestedPrompts onSelect={(value) => { setComposer(value); composerRef.current?.focus(); }} />}
          </div>
        </section>

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex justify-center bg-gradient-to-t from-background via-background/95 to-transparent px-4 pb-5 pt-14 sm:pb-7">
          <div className="pointer-events-auto w-full max-w-[790px]">
            {proLocked && <div className="mb-2 flex items-center justify-between rounded-xl border border-accent/25 bg-accent/5 px-3 py-2 text-xs text-accent"><span><strong>Orion Intelligence is resting.</strong> Three high-compute turns used locally.</span><span className="hidden font-mono sm:block">TRY AGAIN IN 2H 58M</span></div>}
            <input ref={imageRef} type="file" accept="image/*" onChange={(event) => void handleFile(event, 'image')} className="hidden" data-testid="input-image-upload" />
            <input ref={videoRef} type="file" accept="video/*" onChange={(event) => void handleFile(event, 'video')} className="hidden" data-testid="input-video-upload" />
            <input ref={documentRef} type="file" accept=".pdf,.doc,.docx,.txt,.md,text/plain,application/pdf" onChange={(event) => void handleFile(event, 'file')} className="hidden" data-testid="input-file-upload" />
            {attachment && <div className="mb-2 inline-flex max-w-full items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs text-primary"><Paperclip size={13} /><span className="min-w-0 truncate">{attachment.name}</span><span className="hidden text-primary/60 sm:inline">{attachment.detail}</span><button onClick={() => setAttachment(null)} data-testid="button-remove-attachment" className="ml-1 rounded p-0.5 hover:bg-primary/10"><X size={13} /></button></div>}
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
                    {generating ? <button onClick={stopGenerating} data-testid="button-stop-generating" className="grid h-10 w-10 place-items-center rounded-full bg-foreground text-background transition hover:scale-105"><Square size={14} fill="currentColor" /></button> : <button onClick={() => sendMessage()} disabled={(!composer.trim() && !attachment) || proLocked} data-testid="button-send-message" aria-label="Send message" className="grid h-10 w-10 place-items-center rounded-full bg-accent text-accent-foreground transition hover:scale-105 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground dark:bg-primary dark:text-primary-foreground"><ArrowUp size={19} strokeWidth={2.5} /></button>}
                  </div>
                </div>
              </div>
            </div>
             <p data-testid="text-local-disclaimer" className="mt-2 text-center font-mono text-[10px] uppercase tracking-[.1em] text-muted-foreground/70">Orion may make mistakes.</p>
          </div>
        </div>
      </main>

      {panel !== 'none' && <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[2px]" onClick={() => setPanel('none')} data-testid="overlay-panel" />}
      {panel === 'guest' && <GuestPanel onClose={() => setPanel('none')} onLogin={() => { setLoginMode('login'); setPanel('login'); }} />}
      {panel === 'login' && <LoginPanel mode={loginMode} setMode={setLoginMode} email={loginEmail} setEmail={setLoginEmail} onClose={() => setPanel('none')} onSubmit={toggleLogin} />}
      {panel === 'account' && <AccountPanel dark={dark} onTheme={() => setDark((value) => !value)} section={accountSection} setSection={setAccountSection} avatarImage={avatarImage} onAvatar={(src) => setAvatarImage(src)} onClose={() => setPanel('none')} onNotice={showNotice} />}
      {panel === 'sheet' && <AddSheet tab={sheetTab} setTab={setSheetTab} webSearch={webSearch} setWebSearch={setWebSearch} onChooseFile={(kind) => { setPanel('none'); window.setTimeout(() => { if (kind === 'image') imageRef.current?.click(); else if (kind === 'video') videoRef.current?.click(); else documentRef.current?.click(); }, 0); }} onClose={() => setPanel('none')} onNotice={showNotice} />}
       {voiceOpen && <VoiceScreen selected={selectedVoice} setSelected={setSelectedVoice} listening={liveListening} setListening={setLiveListening} cameraOn={cameraOn} setCameraOn={setCameraOn} onClose={() => { setVoiceOpen(false); setLiveListening(false); setCameraOn(false); }} />}
       {essayOpen && <EssayDialog title={essayTitle} setTitle={setEssayTitle} words={essayWords} setWords={setEssayWords} onClose={() => setEssayOpen(false)} onStart={startEssay} />}
       {essayResult && <EssayResult essay={essayResult} onClose={() => setEssayResult('')} onSelect={() => { setComposer(`Please help me revise this essay:\n\n${essayResult}`); setEssayResult(''); showNotice('Essay added to the composer'); }} />}
      {notice && <div data-testid="status-toast" className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-foreground px-4 py-2.5 text-xs font-medium text-background shadow-xl animate-rise-in">{notice}</div>}
    </div>
  );
}

function MessageBubble({ message, index, onCopy, onFeedback, onEdit, onDelete }: { message: Message; index: number; onCopy: (text: string) => void; onFeedback: (kind: 'up' | 'down') => void; onEdit: (message: Message) => void; onDelete: (id: string) => void }) {
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
               <button onClick={() => onFeedback('up')} data-testid={`button-thumbs-up-${index}`} className={`rounded-lg p-1.5 hover:bg-primary/10 hover:text-primary ${message.feedback === 'up' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`} aria-label="Helpful response"><ThumbsUp size={14} fill={message.feedback === 'up' ? 'currentColor' : 'none'} /></button>
               <button onClick={() => onFeedback('down')} data-testid={`button-thumbs-down-${index}`} className={`rounded-lg p-1.5 hover:bg-destructive/10 hover:text-destructive ${message.feedback === 'down' ? 'bg-destructive/10 text-destructive' : 'text-muted-foreground'}`} aria-label="Unhelpful response"><ThumbsDown size={14} fill={message.feedback === 'down' ? 'currentColor' : 'none'} /></button>
            </div>
            <p data-testid={`text-assistant-message-${index}`} className={`text-[15px] leading-7 ${message.policy ? 'rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-destructive' : 'text-foreground/85'}`}>{message.text}</p>
          </div>
        </div>
      ) : (
        <div className={`rounded-[19px] rounded-br-md px-4 py-3 ${message.policy ? 'border border-destructive/30 bg-destructive/5 text-destructive' : 'bg-foreground text-background'}`}>
          {message.attachment && <div className="mb-2 flex items-center gap-2 text-[11px] opacity-70"><Paperclip size={12} /><span>{message.attachment.name}</span><span className="opacity-60">{message.attachment.kind}</span></div>}
          <p data-testid={`text-user-message-${index}`} className="text-[14px] leading-6">{message.text}</p>
          <p className="mt-1 text-right font-mono text-[9px] opacity-55">{message.time}</p>
           <div className="mt-1 flex justify-end gap-1 opacity-70">
             <button onClick={() => onEdit(message)} data-testid={`button-edit-message-${index}`} className="rounded-md p-1 hover:bg-background/15" aria-label="Edit message"><Pencil size={12} /></button>
             <button onClick={() => onDelete(message.id)} data-testid={`button-delete-message-${index}`} className="rounded-md p-1 hover:bg-background/15" aria-label="Delete message"><Trash2 size={12} /></button>
           </div>
        </div>
      )}
    </article>
  );
}

function GeneratingState({ step, model, onStop }: { step: number; model: ModelId; onStop: () => void }) {
  const steps = ['Listening for the shape of it', 'Planning Essay', 'Designing Essay', 'Outputting essay'];
  return (
    <div data-testid="status-generating" className="flex gap-3 sm:gap-4 animate-rise-in">
      <div className="animate-breathe mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-foreground text-background"><span className="h-3.5 w-3.5 rounded-full border border-current" /></div>
      <div className="flex-1">
        <div className="mb-2 flex items-center gap-2"><span className="text-xs font-semibold">Orion</span><span className="font-mono text-[10px] text-primary">THINKING · {modelDetails[model].label.toUpperCase()}</span></div>
         <div className="flex items-center gap-2 text-sm text-muted-foreground"><span className="flex gap-1"><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-.2s]" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-.1s]" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" /></span><span data-testid="text-generation-step">{steps[Math.max(0, Math.min(step, steps.length - 1))]}</span></div>
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
        return <button key={id} onClick={() => onSelect(id)} data-testid={`button-select-model-${id}`} className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-muted ${current === id ? 'bg-muted' : ''}`}><span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${id === 'flash' ? 'bg-primary/12 text-primary' : id === 'sting' ? 'bg-violet-500/12 text-violet-500' : 'bg-accent/12 text-accent'}`}><Sparkles size={14} /></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2 text-xs font-semibold">{detail.name}{current === id && <Check size={14} className="text-primary" />}</span><span className="mt-0.5 block text-[11px] text-muted-foreground">{detail.description}</span>{id === 'orion' && <span data-testid="text-pro-usage" className="mt-1 block font-mono text-[9px] uppercase tracking-wider text-accent">{proUses}/3 deep turns used ·</span>}</span></button>;
      })}
    </div>
  );
}

function GuestPanel({ onClose, onLogin }: { onClose: () => void; onLogin: () => void }) {
  return <SidePanel onClose={onClose} title="Your local profile"><div className="flex flex-col items-center px-4 pb-7 pt-4 text-center"><div className="grid h-20 w-20 place-items-center rounded-full border-4 border-background bg-foreground text-background shadow-[0_0_0_1px_hsl(var(--border))]"><UserRound size={30} /></div><h2 className="mt-5 text-xl font-semibold tracking-[-.03em]">You’re visiting as a guest</h2><p className="mt-2 max-w-[280px] text-sm leading-6 text-muted-foreground">Your chats stay on this device. Sign in locally to keep a profile, preferences, and workspace settings together.</p><button onClick={onLogin} data-testid="button-login-from-guest" className="mt-6 flex h-11 w-full max-w-[280px] items-center justify-center gap-2 rounded-xl bg-foreground text-sm font-semibold text-background transition hover:opacity-90"><LogIn size={16} />Continue with Garexcell</button><div className="mt-6 flex items-center gap-2 text-[11px] text-muted-foreground"><ShieldCheck size={14} className="text-primary" />No cloud account is required for mode</div></div></SidePanel>;
}

function LoginPanel({ mode, setMode, email, setEmail, onClose, onSubmit }: { mode: 'login' | 'signup'; setMode: (mode: 'login' | 'signup') => void; email: string; setEmail: (value: string) => void; onClose: () => void; onSubmit: () => void }) {
  const [password, setPassword] = useState('');
  return <SidePanel onClose={onClose} title={mode === 'login' ? 'Welcome back' : 'Make it yours'}><div className="p-5"><div className="mb-6 rounded-2xl border border-dashed border-primary/35 bg-primary/5 p-5 text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-card text-primary shadow-sm"><Image size={24} /></div><p data-testid="text-local-image-placeholder" className="mt-3 text-xs font-medium">Your uploaded image lives here</p><p className="mt-1 text-[11px] leading-5 text-muted-foreground"> · add a profile image after you continue</p></div><div className="mb-6 flex rounded-xl bg-muted p-1"><button onClick={() => setMode('login')} data-testid="button-login-tab" className={`flex-1 rounded-lg py-2 text-xs font-semibold ${mode === 'login' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>Log in</button><button onClick={() => setMode('signup')} data-testid="button-signup-tab" className={`flex-1 rounded-lg py-2 text-xs font-semibold ${mode === 'signup' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>Sign up</button></div><label className="mb-1.5 block text-xs font-semibold">Email address</label><div className="relative"><AtSign size={15} className="absolute left-3 top-3.5 text-muted-foreground" /><input value={email} onChange={(event) => setEmail(event.target.value)} data-testid="input-login-email" type="email" placeholder="you@example.com" className="h-11 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10" /></div><label className="mb-1.5 mt-4 block text-xs font-semibold">Passphrase</label><input value={password} onChange={(event) => setPassword(event.target.value)} data-testid="input-login-password" type="password" placeholder="At least 8 characters" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10" /><button onClick={onSubmit} disabled={!email || !password} data-testid="button-submit-login" className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-sm font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35">{mode === 'login' ? <LogIn size={16} /> : <Plus size={16} />}{mode === 'login' ? 'Continue locally' : 'Create Account'}</button><p className="mt-5 text-center font-mono text-[10px] uppercase tracking-[.1em] text-muted-foreground">Account SSO ready · credentials are placeholders</p></div></SidePanel>;
}

function AccountPanel({ dark, onTheme, section, setSection, avatarImage, onAvatar, onClose, onNotice }: { dark: boolean; onTheme: () => void; section: string; setSection: (section: string) => void; avatarImage: string; onAvatar: (src: string) => void; onClose: () => void; onNotice: (message: string) => void }) {
  const items = [{ label: 'Manage Activity', icon: Activity }, { label: 'Settings', icon: Settings }, { label: 'Privacy & Personalization', icon: ShieldCheck }, { label: 'Subscriptions', icon: Zap }, { label: 'Connectors', icon: UsersRound }, { label: 'Workspace', icon: FileText }];
  const upload = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) { onAvatar(URL.createObjectURL(file)); onNotice('Profile image updated locally'); } };
  return <SidePanel onClose={onClose} title="Account & workspace"><div className="flex border-b border-border px-5 py-4"><div className="grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-foreground text-sm font-semibold text-background">{avatarImage ? <img src={avatarImage} alt="Amara M profile" className="h-full w-full object-cover" /> : 'AM'}</div><div className="ml-3 flex-1"><p data-testid="text-account-name" className="text-sm font-semibold">Amara M.</p><p data-testid="text-account-email" className="text-xs text-muted-foreground">amara@orion.local</p></div><label className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil size={14} /><input type="file" accept="image/*" onChange={upload} className="hidden" data-testid="input-account-avatar" /></label></div><div className="p-3">{items.map(({ label, icon: Icon }) => <button key={label} onClick={() => setSection(label)} data-testid={`button-account-${label.toLowerCase().replaceAll(' & ', '-').replaceAll(' ', '-')}`} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${section === label ? 'bg-muted font-semibold' : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'}`}><Icon size={16} />{label}</button>)}</div><div className="mx-5 mt-1 border-t border-border pt-5">{section === 'Settings' && <div className="mb-5"><p className="font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">Appearance</p><button onClick={onTheme} data-testid="button-account-theme" className="mt-3 flex w-full items-center justify-between rounded-xl border border-border p-3 text-left text-sm"><span className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary"><Bell size={14} /></span>Theme</span><span className="text-xs text-muted-foreground">{dark ? 'Dark' : 'Light'}</span></button></div>}<div><p className="font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">Local Firebase configuration</p><div data-testid="display-firebase-config" className="mt-3 space-y-2 rounded-xl bg-muted/70 p-3 font-mono text-[10px] leading-5 text-muted-foreground"><div>apiKey <span className="text-foreground">VITE_FIREBASE_API_KEY</span></div><div>databaseURL <span className="text-foreground">VITE_FIREBASE_DATABASE_URL</span></div><div>collection <span className="text-foreground">profiles</span></div><div>fields <span className="text-foreground">username · email · uid · dob</span></div></div></div></div><div className="mt-7 border-t border-border p-5"><button onClick={() => onNotice('Account export prepared in local mode')} data-testid="button-export-account" className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-xs font-semibold hover:bg-muted"><Clipboard size={14} />Export local data</button></div></SidePanel>;
}

function SidePanel({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return <section role="dialog" aria-label={title} data-testid={`panel-${title.toLowerCase().replaceAll(' ', '-')}`} className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[390px] flex-col border-l border-border bg-card shadow-[-18px_0_50px_hsl(var(--foreground)/.12)] animate-rise-in"><div className="flex h-[76px] shrink-0 items-center justify-between border-b border-border px-5"><h2 className="font-semibold tracking-[-.025em]">{title}</h2><button onClick={onClose} data-testid="button-close-panel" className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></button></div><div className="scrollbar-subtle flex-1 overflow-y-auto">{children}</div></section>;
}

function AddSheet({ tab, setTab, webSearch, setWebSearch, onChooseFile, onClose, onNotice }: { tab: 'add' | 'connectors'; setTab: (tab: 'add' | 'connectors') => void; webSearch: boolean; setWebSearch: (value: boolean) => void; onChooseFile: (kind: BrainAttachment['kind']) => void; onClose: () => void; onNotice: (message: string) => void }) {
  const options = [{ label: 'Image', detail: 'PNG, JPG up to 10 MB', icon: Image }, { label: 'Video', detail: 'MP4, MOV up to 50 MB', icon: Video }, { label: 'File', detail: 'PDF, DOCX, TXT up to 20 MB', icon: File }];
  return <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[680px] rounded-t-[28px] border border-b-0 border-border bg-card shadow-[0_-18px_60px_hsl(var(--foreground)/.16)] animate-rise-in">
    <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-border" />
    <div className="flex items-center justify-between px-5 pb-2 pt-4">
      <div><p className="font-mono text-[10px] uppercase tracking-[.15em] text-primary">Composer tools</p><h2 className="mt-1 text-lg font-semibold tracking-[-.03em]">Add to chat</h2></div>
      <button onClick={onClose} data-testid="button-close-add-sheet" className="rounded-xl p-2 text-muted-foreground hover:bg-muted"><X size={18} /></button>
    </div>
    <div className="flex gap-1 border-b border-border px-5">
      <button onClick={() => setTab('add')} data-testid="button-add-tab" className={`border-b-2 px-1 pb-3 pt-2 text-xs font-semibold ${tab === 'add' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>Add to chat</button>
      <button onClick={() => setTab('connectors')} data-testid="button-connectors-tab" className={`border-b-2 px-1 pb-3 pt-2 text-xs font-semibold ${tab === 'connectors' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>Connectors</button>
    </div>
    {tab === 'add' ? (
      <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
        {options.map(({ label, detail, icon: Icon }) => (
          <button key={label} onClick={() => onChooseFile(label.toLowerCase() as BrainAttachment['kind'])} data-testid={`button-attach-${label.toLowerCase()}`} className="group rounded-2xl border border-border bg-background p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/40">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground"><Icon size={18} /></span>
            <span className="mt-3 block text-xs font-semibold">{label}</span><span className="mt-1 block text-[10px] leading-4 text-muted-foreground">{detail}</span>
          </button>
        ))}
        <button onClick={() => setWebSearch(!webSearch)} data-testid="button-toggle-web-search" className={`rounded-2xl border p-4 text-left transition ${webSearch ? 'border-primary bg-primary/10' : 'border-border bg-background hover:border-primary/40'}`}>
          <span className={`grid h-9 w-9 place-items-center rounded-xl ${webSearch ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}><Globe2 size={18} /></span>
          <span className="mt-3 block text-xs font-semibold">Web search</span><span className="mt-1 block text-[10px] leading-4 text-muted-foreground">{webSearch ? 'On for this chat' : 'Search current sources'}</span>
        </button>
      </div>
    ) : (
      <div className="grid gap-3 p-5 sm:grid-cols-2">{['Garexcell', 'FSMEC', 'Calendar', 'Dropbox'].map((name) => <button key={name} onClick={() => onNotice(`${name} connector is ready for a local integration`)} data-testid={`button-connector-${name.toLowerCase()}`} className="flex items-center gap-3 rounded-2xl border border-border p-4 text-left hover:border-primary/40 hover:bg-muted"><span className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-muted-foreground"><UsersRound size={17} /></span><span><span className="block text-xs font-semibold">{name}</span><span className="mt-1 block text-[10px] text-muted-foreground">Local placeholder · connect later</span></span><ChevronRight size={15} className="ml-auto text-muted-foreground" /></button>)}</div>
    )}
    <div className="h-3" />
  </div>;
}

function ChatMenu({ onAction, onClear }: { onAction: (action: 'search' | 'media' | 'notifications') => void; onClear: () => void }) {
  return <div data-testid="menu-chat-actions" className="absolute right-0 top-11 z-40 w-56 rounded-2xl border border-border bg-popover p-1.5 shadow-[0_18px_50px_hsl(var(--foreground)/.16)]">
    <button onClick={() => onAction('search')} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs hover:bg-muted"><Search size={14} />Search</button>
    <button onClick={() => onAction('media')} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs hover:bg-muted"><Image size={14} />Media And Links</button>
    <button onClick={() => onAction('notifications')} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs hover:bg-muted"><Bell size={14} />Notifications</button>
    <button onClick={onClear} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs text-destructive hover:bg-destructive/10"><Trash2 size={14} />Clear Chat</button>
  </div>;
}

function ChatInspector({ action, query, setQuery, messages, onClose, onNotice }: { action: 'search' | 'media' | 'notifications'; query: string; setQuery: (value: string) => void; messages: Message[]; onClose: () => void; onNotice: (message: string) => void }) {
  const attachments = messages.filter((message) => message.attachment);
  const results = messages.filter((message) => message.role === 'assistant' && message.text.toLowerCase().includes(query.toLowerCase()));
  return <div className="mb-7 rounded-2xl border border-border bg-card p-4 shadow-sm animate-rise-in">
    <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-xs font-semibold">{action === 'search' ? <Search size={14} className="text-primary" /> : action === 'media' ? <Image size={14} className="text-primary" /> : <Bell size={14} className="text-primary" />}{action === 'search' ? 'Search this chat' : action === 'media' ? 'Media And Links' : 'Notifications'}</div><button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"><X size={15} /></button></div>
    {action === 'search' && <><div className="relative mt-3"><Search size={14} className="absolute left-3 top-3 text-muted-foreground" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search words from Orion’s replies…" data-testid="input-search-chat" className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-xs outline-none focus:border-primary" /></div><div className="mt-3 space-y-2">{query ? (results.length ? results.map((message) => <p key={message.id} className="rounded-xl bg-muted p-3 text-xs leading-5">{message.text}</p>) : <p className="text-xs text-muted-foreground">No Orion reply contains “{query}”.</p>) : <p className="text-xs text-muted-foreground">Type a keyword to search only assistant replies in this thread.</p>}</div></>}
    {action === 'media' && <div className="mt-3">{attachments.length ? <div className="flex flex-wrap gap-2">{attachments.map((message) => <span key={message.id} className="rounded-lg bg-muted px-3 py-2 text-xs"><Paperclip size={12} className="mr-1 inline" />{message.attachment?.name}</span>)}</div> : <p className="text-xs text-muted-foreground">No media or links have been added to this chat yet.</p>}</div>}
    {action === 'notifications' && <div className="mt-3 flex items-center justify-between rounded-xl bg-muted p-3 text-xs"><span>Local notifications for this chat</span><button onClick={() => onNotice('Notifications enabled for this chat')} className="rounded-lg bg-primary px-3 py-1.5 font-semibold text-primary-foreground">Enable</button></div>}
  </div>;
}

function VoiceScreen({ selected, setSelected, listening, setListening, cameraOn, setCameraOn, onClose }: { selected: string; setSelected: (voice: string) => void; listening: boolean; setListening: (value: boolean) => void; cameraOn: boolean; setCameraOn: (value: boolean) => void; onClose: () => void }) {
  const voices = [{ name: 'June', detail: 'Warm · measured' }, { name: 'Rowan', detail: 'Clear · grounded' }, { name: 'Mira', detail: 'Soft · curious' }];
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraPaused, setCameraPaused] = useState(false);
  const [transcript, setTranscript] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<{ start: () => void; stop: () => void; onresult?: (event: any) => void; onend?: () => void } | null>(null);

  useEffect(() => {
    if (!listening) {
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event: any) => {
        const latest = event.results[event.results.length - 1][0].transcript;
        setTranscript(latest);
        if (event.results[event.results.length - 1].isFinal && window.speechSynthesis) {
          const utterance = new SpeechSynthesisUtterance(`I heard you say: ${latest}`);
          utterance.rate = 0.96;
          window.speechSynthesis.speak(utterance);
        }
      };
      recognition.onend = () => { if (listening) { try { recognition.start(); } catch { /* browser already restarted */ } } };
      recognition.start();
      recognitionRef.current = recognition;
    } else {
      setTranscript('Speech recognition is not available in this browser. You can still use the voice and camera controls.');
    }
    return () => { recognitionRef.current?.stop(); window.speechSynthesis?.cancel(); };
  }, [listening]);

  useEffect(() => {
    if (!cameraOn) {
      cameraStream?.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
      if (videoRef.current) videoRef.current.srcObject = null;
      return;
    }
    void navigator.mediaDevices?.getUserMedia({ video: true, audio: false }).then((stream) => {
      setCameraStream(stream);
      if (videoRef.current) videoRef.current.srcObject = stream;
    }).catch(() => setCameraOn(false));
  }, [cameraOn]);

  useEffect(() => {
    cameraStream?.getVideoTracks().forEach((track) => { track.enabled = !cameraPaused; });
  }, [cameraPaused, cameraStream]);

  useEffect(() => () => cameraStream?.getTracks().forEach((track) => track.stop()), [cameraStream]);

  return <div className={`fixed inset-0 z-[60] flex flex-col bg-background animate-rise-in ${listening || cameraOn ? 'voice-live-glow' : ''}`}>
    <div className="flex h-[76px] items-center justify-between border-b border-border px-5 sm:px-10"><button onClick={onClose} data-testid="button-close-voice" className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm text-muted-foreground hover:bg-muted"><ChevronLeft size={18} />Back to chat</button><span className="font-mono text-[10px] uppercase tracking-[.16em] text-primary">Live voice · local</span><button onClick={onClose} data-testid="button-close-voice-x" className="rounded-xl p-2 text-muted-foreground hover:bg-muted"><X size={18} /></button></div>
    <div className="relative mx-auto flex w-full max-w-[780px] flex-1 flex-col items-center justify-center overflow-hidden px-5">
      {cameraOn && <video ref={videoRef} autoPlay muted playsInline data-testid="video-live-camera" className="mb-6 h-36 w-56 rounded-2xl border border-primary/40 object-cover shadow-xl" />}
      <div className={`relative grid h-48 w-48 place-items-center rounded-full border border-primary/40 bg-card shadow-[0_0_0_18px_hsl(var(--primary)/.04),0_0_80px_hsl(var(--primary)/.14)] ${listening ? 'animate-breathe' : ''}`}><div className="absolute inset-4 rounded-full border border-primary/20" /><div className="absolute inset-8 rounded-full border border-accent/20" /><span className="relative grid h-20 w-20 place-items-center rounded-full bg-foreground text-background"><span className="h-8 w-8 rounded-full border-2 border-current" /></span></div>
      <p className="mt-12 font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">{listening ? 'Orion is listening' : 'A quiet space to speak'}</p><h1 data-testid="text-voice-title" className="mt-2 text-center font-serif text-4xl italic tracking-[-.03em]">Where should we begin?</h1>
      {transcript && <p className="mt-5 max-w-md text-center text-sm leading-6 text-muted-foreground">“{transcript}”</p>}
      <div className="mt-8 flex flex-wrap justify-center gap-2">{voices.map((voice) => <button key={voice.name} onClick={() => setSelected(voice.name)} data-testid={`button-voice-${voice.name.toLowerCase()}`} className={`rounded-full border px-4 py-2 text-left transition ${selected === voice.name ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/40'}`}><span className="block text-xs font-semibold">{voice.name}</span><span className="text-[10px] text-muted-foreground">{voice.detail}</span></button>)}</div>
      <div className="mt-9 flex items-center gap-3"><button onClick={() => setListening(!listening)} data-testid="button-toggle-listening" className={`grid h-16 w-16 place-items-center rounded-full transition hover:scale-105 ${listening ? 'bg-accent text-accent-foreground' : 'bg-foreground text-background'}`}>{listening ? <Square size={19} fill="currentColor" /> : <Mic size={22} />}</button><button onClick={() => setCameraOn(!cameraOn)} data-testid="button-toggle-camera" className={`grid h-12 w-12 place-items-center rounded-full border transition hover:scale-105 ${cameraOn ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground'}`} aria-label={cameraOn ? 'Turn camera off' : 'Turn camera on'}>{cameraOn ? <CameraOff size={19} /> : <Camera size={19} />}</button>{cameraOn && <button onClick={() => setCameraPaused(!cameraPaused)} data-testid="button-pause-camera" className={`grid h-12 w-12 place-items-center rounded-full border transition hover:scale-105 ${cameraPaused ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-card text-muted-foreground'}`} aria-label={cameraPaused ? 'Resume camera' : 'Pause camera'}>{cameraPaused ? <Video size={18} /> : <Pause size={18} />}</button>}<button onClick={() => { if (transcript && window.speechSynthesis) window.speechSynthesis.speak(new SpeechSynthesisUtterance(`Here’s what I heard: ${transcript}`)); }} className="grid h-12 w-12 place-items-center rounded-full border border-border bg-card text-muted-foreground hover:bg-muted" aria-label="Speak response"><Volume2 size={18} /></button></div>
      <p className="mt-3 text-xs text-muted-foreground">{listening ? 'Tap the mic to pause' : `Speak with ${selected}`}{cameraOn ? ' · camera on' : ''}</p>
    </div>
  </div>;
}

function EssayResult({ essay, onClose, onSelect }: { essay: string; onClose: () => void; onSelect: () => void }) {
  return <div className="fixed inset-0 z-[65] grid place-items-center bg-foreground/30 p-4 backdrop-blur-sm"><section role="dialog" aria-label="Generated essay" className="flex max-h-[82vh] w-full max-w-[680px] flex-col rounded-3xl border border-border bg-card p-6 shadow-[0_20px_70px_hsl(var(--foreground)/.22)] animate-rise-in"><div className="flex items-start justify-between"><div><span className="font-mono text-[10px] uppercase tracking-[.16em] text-primary">Essay output</span><h2 className="mt-2 text-2xl font-semibold tracking-[-.04em]">Your draft is ready</h2><p className="mt-2 text-sm text-muted-foreground">Select this draft to continue editing it with Orion.</p></div><button onClick={onClose} className="rounded-xl p-2 text-muted-foreground hover:bg-muted"><X size={18} /></button></div><pre className="scrollbar-subtle mt-5 flex-1 overflow-y-auto whitespace-pre-wrap rounded-2xl bg-muted/60 p-4 text-sm leading-7">{essay}</pre><div className="mt-5 flex gap-2"><button onClick={onClose} className="flex-1 rounded-xl border border-border py-3 text-xs font-semibold hover:bg-muted">Keep viewing</button><button onClick={onSelect} className="flex-1 rounded-xl bg-foreground py-3 text-xs font-semibold text-background hover:opacity-90"><CheckCircle2 size={14} className="mr-1 inline" />Select essay</button></div></section></div>;
}

function EssayDialog({ title, setTitle, words, setWords, onClose, onStart }: { title: string; setTitle: (value: string) => void; words: string; setWords: (value: string) => void; onClose: () => void; onStart: () => void }) {
  return <div className="fixed inset-0 z-[60] grid place-items-center bg-foreground/30 p-4 backdrop-blur-sm"><section role="dialog" aria-label="Writing brief" data-testid="dialog-essay" className="w-full max-w-[480px] rounded-3xl border border-border bg-card p-6 shadow-[0_20px_70px_hsl(var(--foreground)/.22)] animate-rise-in"><div className="flex items-start justify-between"><div><span className="font-mono text-[10px] uppercase tracking-[.16em] text-primary">Writing brief</span><h2 className="mt-2 text-2xl font-semibold tracking-[-.04em]">Give the idea a shape</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">A title and a little constraint help the local writer find its center.</p></div><button onClick={onClose} data-testid="button-close-essay" className="rounded-xl p-2 text-muted-foreground hover:bg-muted"><X size={18} /></button></div><label className="mt-6 block text-xs font-semibold">Working title</label><input value={title} onChange={(event) => setTitle(event.target.value)} data-testid="input-essay-title" className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary" placeholder="The idea in one line" /><label className="mt-4 block text-xs font-semibold">Word count</label><div className="mt-2 flex gap-2">{['350', '650', '1000'].map((value) => <button key={value} onClick={() => setWords(value)} data-testid={`button-word-count-${value}`} className={`flex-1 rounded-xl border py-2.5 text-xs font-semibold ${words === value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}>{value} words</button>)}</div><button onClick={onStart} disabled={!title.trim()} data-testid="button-save-essay" className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-35"><Check size={16} />Save & begin</button></section></div>;
}

export default App;