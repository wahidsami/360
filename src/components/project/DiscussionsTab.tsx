import React, { useState, useRef, useEffect } from 'react';
import { Discussion, DiscussionReply } from '@/types';
import { Button } from '../ui/UIComponents';
import {
    MessageSquare, Plus, Send, Trash2, ChevronRight, ChevronDown, X,
    Smile, Bookmark, Forward, MoreHorizontal, Hash,
    Type, AtSign, Video, Mic, Slash
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

/* ──────────────────────────────────────────────────────────────
   Types
────────────────────────────────────────────────────────────────*/
interface DiscussionsTabProps {
    projectId: string;
    discussions: Discussion[];
    onCreateThread: (title: string, body: string) => Promise<void>;
    onDeleteThread: (discussionId: string) => Promise<void>;
    onGetReplies: (discussionId: string) => Promise<DiscussionReply[]>;
    onCreateReply: (discussionId: string, body: string) => Promise<void>;
    onDeleteReply: (discussionId: string, replyId: string) => Promise<void>;
}

/* ──────────────────────────────────────────────────────────────
   Helpers
────────────────────────────────────────────────────────────────*/
const AVATAR_COLORS = [
    'from-cyan-500 to-blue-600',
    'from-purple-500 to-pink-600',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-red-600',
    'from-yellow-500 to-amber-600',
    'from-indigo-500 to-violet-600',
];

function avatarColor(name: string) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h += name.charCodeAt(i);
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function initials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function friendlyDate(iso: string) {
    const d = new Date(iso);
    if (isToday(d)) return format(d, 'h:mm a');
    if (isYesterday(d)) return `Yesterday ${format(d, 'h:mm a')}`;
    return format(d, 'MMM d, h:mm a');
}

function dayLabel(iso: string) {
    const d = new Date(iso);
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'EEEE, MMMM d');
}

/* ──────────────────────────────────────────────────────────────
   Sub-components
────────────────────────────────────────────────────────────────*/
const Avatar: React.FC<{ name: string; avatar?: string; size?: 'xs' | 'sm' | 'md' | 'lg' }> = ({ name, avatar, size = 'md' }) => {
    const sz = { xs: 'w-6 h-6 text-[10px]', sm: 'w-8 h-8 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-10 h-10 text-sm' }[size];
    if (avatar) return <img src={avatar} alt={name} className={`${sz} rounded-lg object-cover flex-shrink-0`} />;
    return (
        <div className={`${sz} rounded-lg bg-gradient-to-br ${avatarColor(name)} flex items-center justify-center font-bold text-white flex-shrink-0`}>
            {initials(name)}
        </div>
    );
};

/** The floating action bar that appears on message hover */
const HoverActions: React.FC<{
    onReply?: () => void;
    onDelete?: () => void;
    showDelete: boolean;
}> = ({ onReply, onDelete, showDelete }) => (
    <div className="absolute -top-3 right-3 hidden group-hover:flex items-center gap-0.5 bg-slate-800 border border-slate-700 rounded-lg px-1 py-0.5 shadow-xl z-10">
        <ActionBtn title="Emoji"><Smile className="w-3.5 h-3.5" /></ActionBtn>
        {onReply && <ActionBtn title="Reply in thread" onClick={onReply}><MessageSquare className="w-3.5 h-3.5" /></ActionBtn>}
        <ActionBtn title="Forward"><Forward className="w-3.5 h-3.5" /></ActionBtn>
        <ActionBtn title="Bookmark"><Bookmark className="w-3.5 h-3.5" /></ActionBtn>
        {showDelete && <ActionBtn title="Delete" onClick={onDelete} danger><Trash2 className="w-3.5 h-3.5" /></ActionBtn>}
        <ActionBtn title="More"><MoreHorizontal className="w-3.5 h-3.5" /></ActionBtn>
    </div>
);

const ActionBtn: React.FC<{ title: string; onClick?: () => void; danger?: boolean; children: React.ReactNode }> = ({ title, onClick, danger, children }) => (
    <button
        title={title}
        onClick={onClick}
        className={`p-1 rounded transition-colors ${danger ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-900/30' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
    >
        {children}
    </button>
);

/** Reply count badge like Slack */
const ReplyBadge: React.FC<{ discussion: Discussion; onClick: () => void }> = ({ discussion, onClick }) => {
    if (discussion.replyCount === 0) return null;
    // Generate a mini stack of "reply avatars"  — fake 2-3 colored dots for visual effect
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-2 mt-1 ml-0.5 group/rep hover:bg-slate-800/60 px-2 py-1 rounded-lg transition-colors"
        >
            {/* Mini avatar stack */}
            <div className="flex -space-x-1">
                {[...Array(Math.min(discussion.replyCount, 3))].map((_, i) => (
                    <div key={i} className={`w-5 h-5 rounded-full bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} border border-slate-900`} />
                ))}
            </div>
            <span className="text-cyan-400 text-xs font-semibold group-hover/rep:underline">
                {discussion.replyCount} {discussion.replyCount === 1 ? 'reply' : 'replies'}
            </span>
            {discussion.lastReplyAt && (
                <span className="text-slate-500 text-xs">
                    Last reply {formatDistanceToNow(new Date(discussion.lastReplyAt), { addSuffix: true })}
                </span>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover/rep:opacity-100 transition-opacity" />
        </button>
    );
};

/* ── Emoji Picker ───────────────────────────────────────────── */
const EMOJIS = [
    '😀', '😂', '😍', '🥰', '😎', '🤔', '😅', '🙌', '👍', '👎',
    '❤️', '🔥', '✅', '🎉', '💡', '⚠️', '🚀', '👀', '🙏', '💪',
    '😊', '😭', '🤣', '😤', '😱', '🤝', '👋', '💯', '🎯', '📌',
    '📎', '🗂️', '💬', '📢', '🔔', '🔕', '✏️', '📝', '🗒️', '📅',
    '⏰', '🕐', '🌟', '💥', '🛠️', '🔍', '📊', '📈', '📉', '🏆',
    '🎖️', '🔒', '🔓', '🌐', '📡', '💻', '🖥️', '📱', '⌨️', '🖱️',
];

const EmojiPicker: React.FC<{ onPick: (e: string) => void; onClose: () => void }> = ({ onPick, onClose }) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);
    return (
        <div ref={ref} className="absolute bottom-full mb-2 left-0 z-50 bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-2xl w-64">
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide mb-2">Emoji</p>
            <div className="grid grid-cols-10 gap-0.5">
                {EMOJIS.map(em => (
                    <button key={em} onClick={() => { onPick(em); onClose(); }}
                        className="w-6 h-6 flex items-center justify-center text-base hover:bg-slate-700 rounded transition-colors"
                    >{em}</button>
                ))}
            </div>
        </div>
    );
};

/* ── Slash Commands Dropdown ────────────────────────────────── */
const SLASH_COMMANDS = [
    { id: 'bold', label: '/bold', desc: 'Bold text', insert: '**bold text**' },
    { id: 'italic', label: '/italic', desc: 'Italic text', insert: '_italic text_' },
    { id: 'code', label: '/code', desc: 'Inline code', insert: '`code`' },
    { id: 'block', label: '/block', desc: 'Code block', insert: '```\ncode\n```' },
    { id: 'link', label: '/link', desc: 'Insert a link', insert: '[label](url)' },
    { id: 'remind', label: '/remind', desc: 'Set a reminder', insert: '/remind me in 1 hour' },
    { id: 'status', label: '/status', desc: 'Update status', insert: '/status ' },
];

const SlashMenu: React.FC<{ onPick: (insert: string) => void; onClose: () => void }> = ({ onPick, onClose }) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);
    return (
        <div ref={ref} className="absolute bottom-full mb-2 left-0 z-50 bg-slate-800 border border-slate-700 rounded-xl w-64 shadow-2xl overflow-hidden">
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide px-3 pt-3 pb-1">Slash Commands</p>
            {SLASH_COMMANDS.map(cmd => (
                <button key={cmd.id} onClick={() => { onPick(cmd.insert); onClose(); }}
                    className="flex items-center gap-3 w-full px-3 py-2 hover:bg-slate-700 transition-colors text-left"
                >
                    <span className="text-xs font-mono text-cyan-400 w-16 flex-shrink-0">{cmd.label}</span>
                    <span className="text-slate-400 text-xs">{cmd.desc}</span>
                </button>
            ))}
        </div>
    );
};

/* ── Formatting Popup ───────────────────────────────────────── */
const FormatMenu: React.FC<{ onPick: (wrap: [string, string]) => void; onClose: () => void }> = ({ onPick, onClose }) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);
    const formats: { label: string; preview: string; wrap: [string, string] }[] = [
        { label: 'Bold', preview: 'B', wrap: ['**', '**'] },
        { label: 'Italic', preview: 'I', wrap: ['_', '_'] },
        { label: 'Strikethrough', preview: 'S̶', wrap: ['~~', '~~'] },
        { label: 'Inline code', preview: '<>', wrap: ['`', '`'] },
        { label: 'Quote', preview: '❝', wrap: ['> ', ''] },
        { label: 'Code block', preview: '{}', wrap: ['```\n', '\n```'] },
    ];
    return (
        <div ref={ref} className="absolute bottom-full mb-2 left-0 z-50 bg-slate-800 border border-slate-700 rounded-xl p-2 shadow-2xl flex gap-1">
            {formats.map(f => (
                <button key={f.label} title={f.label} onClick={() => { onPick(f.wrap); onClose(); }}
                    className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-slate-700 text-slate-300 hover:text-white text-sm font-bold transition-colors"
                >{f.preview}</button>
            ))}
        </div>
    );
};

/* ── Main MessageInput ──────────────────────────────────────── */
const MessageInput: React.FC<{
    placeholder: string;
    value: string;
    onChange: (v: string) => void;
    onSend: () => void;
    loading?: boolean;
}> = ({ placeholder, value, onChange, onSend, loading }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLInputElement>(null);

    const [openPanel, setOpenPanel] = useState<'emoji' | 'format' | 'slash' | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

    const canSend = !loading && (value.trim().length > 0 || attachedFiles.length > 0);

    // Insert text at cursor position
    const insertAtCursor = (text: string) => {
        const el = textareaRef.current;
        if (!el) { onChange(value + text); return; }
        const start = el.selectionStart ?? value.length;
        const end = el.selectionEnd ?? value.length;
        const next = value.slice(0, start) + text + value.slice(end);
        onChange(next);
        setTimeout(() => { el.focus(); el.setSelectionRange(start + text.length, start + text.length); }, 0);
    };

    // Wrap selected text or insert placeholder
    const wrapSelection = ([before, after]: [string, string]) => {
        const el = textareaRef.current;
        if (!el) { onChange(value + before + 'text' + after); return; }
        const start = el.selectionStart ?? 0;
        const end = el.selectionEnd ?? 0;
        const sel = value.slice(start, end) || 'text';
        const next = value.slice(0, start) + before + sel + after + value.slice(end);
        onChange(next);
        setTimeout(() => { el.focus(); el.setSelectionRange(start + before.length, start + before.length + sel.length); }, 0);
    };

    // Voice to text (Web Speech API)
    const handleVoice = () => {
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) { alert('Voice input is not supported in this browser.'); return; }
        if (isListening) return;
        const recognition = new SR();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = () => setIsListening(false);
        recognition.onresult = (e: any) => {
            const transcript = e.results[0][0].transcript;
            insertAtCursor(transcript);
        };
        recognition.start();
    };

    const handleFile = (files: FileList | null, type: 'file' | 'video') => {
        if (!files) return;
        const list = Array.from(files);
        setAttachedFiles(prev => [...prev, ...list]);
        const names = list.map(f => f.name).join(', ');
        insertAtCursor(`\n📎 ${names}`);
    };

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
        if (e.key === '/') setOpenPanel('slash');
        if (e.key === 'Escape') setOpenPanel(null);
    };

    const toggle = (panel: 'emoji' | 'format' | 'slash') =>
        setOpenPanel(prev => prev === panel ? null : panel);

    return (
        <div className="relative border border-slate-700 rounded-xl overflow-visible bg-slate-800/40 focus-within:border-slate-500 transition-colors">
            {/* Hidden inputs */}
            <input ref={fileRef} type="file" multiple className="hidden" onChange={e => handleFile(e.target.files, 'file')} />
            <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={e => handleFile(e.target.files, 'video')} />

            {/* Popups */}
            {openPanel === 'emoji' && <EmojiPicker onPick={insertAtCursor} onClose={() => setOpenPanel(null)} />}
            {openPanel === 'format' && <FormatMenu onPick={wrapSelection} onClose={() => setOpenPanel(null)} />}
            {openPanel === 'slash' && <SlashMenu onPick={insertAtCursor} onClose={() => setOpenPanel(null)} />}

            {/* Textarea */}
            <textarea
                ref={textareaRef}
                className="w-full bg-transparent px-4 pt-3 pb-1 text-sm text-white placeholder-slate-500 focus:outline-none resize-none"
                placeholder={placeholder}
                rows={2}
                value={value}
                onChange={e => onChange(e.target.value)}
                onKeyDown={handleKey}
            />

            {/* Toolbar */}
            <div className="flex items-center justify-between px-2 pb-2 pt-0.5">
                <div className="flex items-center gap-0.5">
                    {/* Attach file */}
                    <ToolbarBtn title="Add attachment" onClick={() => fileRef.current?.click()}>
                        <Plus className="w-4 h-4" />
                    </ToolbarBtn>

                    {/* Formatting */}
                    <ToolbarBtn title="Formatting (Bold, Italic, Code…)" onClick={() => toggle('format')} active={openPanel === 'format'}>
                        <Type className="w-4 h-4" />
                    </ToolbarBtn>

                    {/* Emoji */}
                    <ToolbarBtn title="Emoji" onClick={() => toggle('emoji')} active={openPanel === 'emoji'}>
                        <Smile className="w-4 h-4" />
                    </ToolbarBtn>

                    {/* Mention */}
                    <ToolbarBtn title="Mention someone" onClick={() => insertAtCursor('@')}>
                        <AtSign className="w-4 h-4" />
                    </ToolbarBtn>

                    <span className="w-px h-4 bg-slate-700 mx-1" />

                    {/* Video attach */}
                    <ToolbarBtn title="Attach video" onClick={() => videoRef.current?.click()}>
                        <Video className="w-4 h-4" />
                    </ToolbarBtn>

                    {/* Voice to text */}
                    <ToolbarBtn title={isListening ? 'Listening… click to stop' : 'Voice message (Speech-to-text)'} onClick={handleVoice} active={isListening}>
                        <Mic className={`w-4 h-4 ${isListening ? 'text-red-400 animate-pulse' : ''}`} />
                    </ToolbarBtn>

                    <span className="w-px h-4 bg-slate-700 mx-1" />

                    {/* Slash commands */}
                    <ToolbarBtn title="Slash commands" onClick={() => toggle('slash')} active={openPanel === 'slash'}>
                        <Slash className="w-4 h-4" />
                    </ToolbarBtn>
                </div>

                {/* Send button (split) */}
                <div className="flex items-center">
                    <button onClick={onSend} disabled={!canSend} title="Send message (Enter)"
                        className={`flex items-center justify-center w-8 h-8 rounded-l-lg transition-all ${canSend ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-slate-700/60 text-slate-500 cursor-not-allowed'
                            }`}
                    ><Send className="w-3.5 h-3.5" /></button>
                    <button disabled={!canSend} title="More send options"
                        className={`flex items-center justify-center w-5 h-8 rounded-r-lg border-l border-slate-500/30 transition-all ${canSend ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-slate-700/60 text-slate-500 cursor-not-allowed'
                            }`}
                    ><ChevronDown className="w-3 h-3" /></button>
                </div>
            </div>
        </div>
    );
};

/** Small toolbar icon button */
const ToolbarBtn: React.FC<{ title: string; onClick?: () => void; active?: boolean; children: React.ReactNode }> = ({ title, onClick, active, children }) => (
    <button title={title} onClick={onClick}
        className={`p-1.5 rounded-md transition-colors ${active
                ? 'text-cyan-400 bg-cyan-950/60 hover:bg-cyan-900/60'
                : 'text-slate-500 hover:text-slate-200 hover:bg-slate-700/60'
            }`}
    >{children}</button>
);

/* ──────────────────────────────────────────────────────────────
   New Thread Modal
────────────────────────────────────────────────────────────────*/
const NewThreadModal: React.FC<{ onClose: () => void; onSubmit: (t: string, b: string) => Promise<void> }> = ({ onClose, onSubmit }) => {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !body.trim()) return;
        setLoading(true);
        try { await onSubmit(title.trim(), body.trim()); onClose(); }
        finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                        <Hash className="w-5 h-5 text-slate-400" />
                        <h3 className="text-base font-semibold text-white">New Thread</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wide block mb-1.5">Thread title</label>
                        <input
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:border-cyan-500 focus:outline-none"
                            placeholder="e.g. API integration questions"
                            value={title} onChange={e => setTitle(e.target.value)}
                            autoFocus required
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wide block mb-1.5">Your message</label>
                        <MessageInput
                            placeholder="What's on your mind? (Enter to send)"
                            value={body}
                            onChange={setBody}
                            onSend={() => handleSubmit({ preventDefault: () => { } } as any)}
                            loading={loading}
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
                        <button type="submit" disabled={loading || !title.trim() || !body.trim()}
                            className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 rounded-lg text-white text-sm font-medium transition-colors">
                            {loading ? 'Posting...' : 'Post Thread'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/* ──────────────────────────────────────────────────────────────
   Thread Side Panel (like Slack's right sidebar)
────────────────────────────────────────────────────────────────*/
const ThreadPanel: React.FC<{
    discussion: Discussion;
    replies: DiscussionReply[];
    loading: boolean;
    userId?: string;
    onClose: () => void;
    onSendReply: (body: string) => Promise<void>;
    onDeleteReply: (reply: DiscussionReply) => Promise<void>;
    onDeleteThread: (discussion: Discussion) => Promise<void>;
}> = ({ discussion, replies, loading, userId, onClose, onSendReply, onDeleteReply, onDeleteThread }) => {
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [replies]);

    const send = async () => {
        if (!replyText.trim()) return;
        setSending(true);
        try { await onSendReply(replyText.trim()); setReplyText(''); }
        finally { setSending(false); }
    };

    return (
        <div className="flex flex-col h-full border-l border-slate-800 bg-slate-900/95">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-white text-sm">Thread</span>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded transition-colors"><X className="w-4 h-4" /></button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                {/* Original message */}
                <div className="group relative flex gap-3 hover:bg-slate-800/40 px-2 py-2 rounded-lg transition-colors">
                    <Avatar name={discussion.authorName} avatar={discussion.authorAvatar} />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                            <span className="font-bold text-sm text-white">{discussion.authorName}</span>
                            <span className="text-xs text-slate-500">{friendlyDate(discussion.createdAt)}</span>
                        </div>
                        <p className="text-sm font-semibold text-cyan-300 mt-0.5">{discussion.title}</p>
                        <p className="text-sm text-slate-300 mt-1 whitespace-pre-wrap leading-relaxed">{discussion.body}</p>
                    </div>
                    <HoverActions showDelete={userId === discussion.authorId} onDelete={() => onDeleteThread(discussion)} />
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 my-3 px-2">
                    <div className="flex-1 h-px bg-slate-800" />
                    <span className="text-xs text-slate-500 font-medium">{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</span>
                    <div className="flex-1 h-px bg-slate-800" />
                </div>

                {/* Replies */}
                {loading ? (
                    <div className="flex items-center gap-2 px-2 py-4 text-slate-500 text-sm"><span className="animate-spin">⟳</span> Loading...</div>
                ) : replies.length === 0 ? (
                    <p className="text-center text-slate-600 text-sm py-6">No replies yet</p>
                ) : (
                    replies.map((reply, i) => {
                        const showDayLabel = i === 0 || dayLabel(reply.createdAt) !== dayLabel(replies[i - 1].createdAt);
                        const prevSame = i > 0 && replies[i - 1].authorId === reply.authorId;
                        return (
                            <React.Fragment key={reply.id}>
                                {showDayLabel && (
                                    <div className="flex items-center gap-3 my-3 px-2">
                                        <div className="flex-1 h-px bg-slate-800" />
                                        <span className="text-xs text-slate-500 font-medium">{dayLabel(reply.createdAt)}</span>
                                        <div className="flex-1 h-px bg-slate-800" />
                                    </div>
                                )}
                                <div className={`group relative flex gap-3 hover:bg-slate-800/40 px-2 rounded-lg transition-colors ${prevSame ? 'py-0.5' : 'py-2 mt-1'}`}>
                                    {prevSame
                                        ? <div className="w-8 flex-shrink-0 flex items-center justify-center">
                                            <span className="text-[10px] text-slate-600 opacity-0 group-hover:opacity-100">{format(new Date(reply.createdAt), 'h:mm')}</span>
                                        </div>
                                        : <Avatar name={reply.authorName} avatar={reply.authorAvatar} size="sm" />
                                    }
                                    <div className="min-w-0 flex-1">
                                        {!prevSame && (
                                            <div className="flex items-baseline gap-2">
                                                <span className="font-bold text-sm text-white">{reply.authorName}</span>
                                                <span className="text-xs text-slate-500">{friendlyDate(reply.createdAt)}</span>
                                            </div>
                                        )}
                                        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{reply.body}</p>
                                    </div>
                                    <HoverActions showDelete={userId === reply.authorId} onDelete={() => onDeleteReply(reply)} />
                                </div>
                            </React.Fragment>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>

            {/* Reply input */}
            <div className="px-4 py-3 border-t border-slate-800 flex-shrink-0">
                <p className="text-xs text-slate-500 mb-2">
                    Reply to <span className="text-slate-300 font-medium">{discussion.authorName}</span>
                </p>
                <MessageInput
                    placeholder={`Reply to thread...`}
                    value={replyText}
                    onChange={setReplyText}
                    onSend={send}
                    loading={sending}
                />
            </div>
        </div>
    );
};

/* ──────────────────────────────────────────────────────────────
   Main Component
────────────────────────────────────────────────────────────────*/
export const DiscussionsTab: React.FC<DiscussionsTabProps> = ({
    projectId,
    discussions,
    onCreateThread,
    onDeleteThread,
    onGetReplies,
    onCreateReply,
    onDeleteReply,
}) => {
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeThread, setActiveThread] = useState<Discussion | null>(null);
    const [replies, setReplies] = useState<DiscussionReply[]>([]);
    const [loadingReplies, setLoadingReplies] = useState(false);

    const openThread = async (thread: Discussion) => {
        setActiveThread(thread);
        setLoadingReplies(true);
        const r = await onGetReplies(thread.id);
        setReplies(r);
        setLoadingReplies(false);
    };

    const closeThread = () => { setActiveThread(null); setReplies([]); };

    const handleSendReply = async (body: string) => {
        if (!activeThread) return;
        await onCreateReply(activeThread.id, body);
        const r = await onGetReplies(activeThread.id);
        setReplies(r);
    };

    const handleDeleteReply = async (reply: DiscussionReply) => {
        if (!activeThread || !window.confirm('Delete this reply?')) return;
        await onDeleteReply(activeThread.id, reply.id);
        setReplies(prev => prev.filter(r => r.id !== reply.id));
    };

    const handleDeleteThread = async (thread: Discussion) => {
        if (!window.confirm(`Delete "${thread.title}"? All replies will be removed.`)) return;
        await onDeleteThread(thread.id);
        if (activeThread?.id === thread.id) closeThread();
    };

    // Group messages by day for dividers
    const grouped: { label: string; items: Discussion[] }[] = [];
    discussions.forEach(d => {
        const lbl = dayLabel(d.createdAt);
        const last = grouped[grouped.length - 1];
        if (last?.label === lbl) last.items.push(d);
        else grouped.push({ label: lbl, items: [d] });
    });

    return (
        <div className="flex h-[calc(100vh-220px)] min-h-[500px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950">

            {/* ── Left: Thread Feed ── */}
            <div className={`flex flex-col flex-shrink-0 transition-all duration-300 ${activeThread ? 'w-[55%]' : 'w-full'}`}>

                {/* Channel header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <Hash className="w-5 h-5 text-slate-400" />
                        <span className="font-bold text-white">project-discussions</span>
                        <span className="text-slate-600 text-sm">·</span>
                        <span className="text-slate-500 text-sm">{discussions.length} threads</span>
                    </div>
                    <Button onClick={() => setIsModalOpen(true)} className="text-sm py-1.5 px-4">
                        <Plus className="w-4 h-4 mr-1.5" /> New Thread
                    </Button>
                </div>

                {/* Message feed */}
                <div className="flex-1 overflow-y-auto px-2 py-3">
                    {discussions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
                                <MessageSquare className="w-8 h-8 text-slate-600" />
                            </div>
                            <p className="text-slate-300 font-semibold">No threads yet</p>
                            <p className="text-slate-600 text-sm mt-1 max-w-xs">Start a discussion to collaborate with your team.</p>
                            <Button className="mt-5" onClick={() => setIsModalOpen(true)}>
                                <Plus className="w-4 h-4 mr-2" /> Start a Thread
                            </Button>
                        </div>
                    ) : (
                        grouped.map(group => (
                            <React.Fragment key={group.label}>
                                {/* Day divider */}
                                <div className="flex items-center gap-3 my-3 px-2">
                                    <div className="flex-1 h-px bg-slate-800" />
                                    <span className="text-xs text-slate-500 font-medium bg-slate-950 px-2">{group.label}</span>
                                    <div className="flex-1 h-px bg-slate-800" />
                                </div>

                                {group.items.map((thread, i) => {
                                    const prevSame = i > 0 && group.items[i - 1].authorId === thread.authorId;
                                    const isActive = activeThread?.id === thread.id;

                                    return (
                                        <div
                                            key={thread.id}
                                            className={`group relative hover:bg-slate-800/50 px-3 rounded-lg transition-colors ${isActive ? 'bg-slate-800/60 ring-1 ring-cyan-800/40' : ''} ${prevSame ? 'py-0.5' : 'py-2 mt-1'}`}
                                        >
                                            <div className="flex gap-3">
                                                {/* Avatar or timestamp */}
                                                {prevSame
                                                    ? <div className="w-9 flex-shrink-0 flex items-start justify-center pt-0.5">
                                                        <span className="text-[10px] text-slate-600 opacity-0 group-hover:opacity-100">{format(new Date(thread.createdAt), 'h:mm')}</span>
                                                    </div>
                                                    : <Avatar name={thread.authorName} avatar={thread.authorAvatar} />
                                                }

                                                {/* Content */}
                                                <div className="min-w-0 flex-1">
                                                    {!prevSame && (
                                                        <div className="flex items-baseline gap-2 flex-wrap">
                                                            <span className="font-bold text-sm text-white hover:underline cursor-pointer">{thread.authorName}</span>
                                                            <span className="text-xs text-slate-500">{friendlyDate(thread.createdAt)}</span>
                                                        </div>
                                                    )}
                                                    {/* Thread title badge */}
                                                    <div className="flex items-center gap-1.5 mt-0.5 mb-1">
                                                        <span className="text-xs font-semibold text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded-md border border-cyan-900/50">
                                                            {thread.title}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-300 leading-relaxed line-clamp-2">{thread.body}</p>

                                                    {/* Reply count row */}
                                                    <ReplyBadge discussion={thread} onClick={() => openThread(thread)} />

                                                    {/* Zero reply nudge */}
                                                    {thread.replyCount === 0 && (
                                                        <button
                                                            onClick={() => openThread(thread)}
                                                            className="mt-1 text-xs text-slate-600 hover:text-cyan-400 transition-colors flex items-center gap-1"
                                                        >
                                                            <MessageSquare className="w-3 h-3" /> Reply
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Hover action bar */}
                                            <HoverActions
                                                onReply={() => openThread(thread)}
                                                onDelete={() => handleDeleteThread(thread)}
                                                showDelete={user?.id === thread.authorId}
                                            />
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        ))
                    )}
                </div>

                {/* Bottom compose area */}
                <div className="px-4 py-3 border-t border-slate-800 flex-shrink-0">
                    <div
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-3 border border-slate-700 rounded-xl px-4 py-2.5 bg-slate-800/30 hover:border-slate-600 cursor-pointer transition-colors"
                    >
                        <Avatar name={user?.name || 'You'} size="xs" />
                        <span className="text-slate-500 text-sm">Start a new thread...</span>
                        <div className="ml-auto flex items-center gap-1 text-slate-600">
                            <Smile className="w-4 h-4" />
                            <span className="font-bold text-sm">@</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Right: Thread Panel ── */}
            {activeThread && (
                <div className={`flex-1 min-w-0 transition-all duration-300`}>
                    <ThreadPanel
                        discussion={activeThread}
                        replies={replies}
                        loading={loadingReplies}
                        userId={user?.id}
                        onClose={closeThread}
                        onSendReply={handleSendReply}
                        onDeleteReply={handleDeleteReply}
                        onDeleteThread={handleDeleteThread}
                    />
                </div>
            )}

            {/* New Thread Modal */}
            {isModalOpen && (
                <NewThreadModal
                    onClose={() => setIsModalOpen(false)}
                    onSubmit={onCreateThread}
                />
            )}
        </div>
    );
};
