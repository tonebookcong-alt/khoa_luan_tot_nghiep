'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Send, Image as ImageIcon, X, Search, Menu, Flag, Ban, EyeOff, ChevronRight } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/auth.store';
import { formatDate, formatPrice, getImageUrl } from '@/lib/utils';
import Link from 'next/link';

interface Message {
  id: string;
  content: string;
  mediaUrl?: string;
  senderId: string;
  isRead: boolean;
  createdAt: string;
  sender?: { id: string; name: string; avatar?: string };
}

interface Conversation {
  id: string;
  listing: { id: string; title: string; askingPrice: number; images: { url: string }[] };
  buyer: { id: string; name: string; avatar?: string };
  seller: { id: string; name: string; avatar?: string };
  lastMessage?: { content: string; mediaUrl?: string; createdAt: string; senderId: string } | null;
  unreadCount: number;
  blockStatus: 'none' | 'i_blocked' | 'i_am_blocked';
}

type TabType = 'all' | 'unread' | 'spam';
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const isImageUrl = (url: string) => /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(url);
const isVideoUrl = (url: string) => /\.(mp4|mov|webm|avi|mkv)$/i.test(url);

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const { user, accessToken } = useAuthStore();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(searchParams.get('conversationId'));
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);

  // Search + filter
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');

  // Info panel
  const [showInfoPanel, setShowInfoPanel] = useState(false);

  // Media upload
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Socket.io ──
  useEffect(() => {
    if (!accessToken) return;
    const socket = io(`${BACKEND_URL}/chat`, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('message_received', (msg: Message) => {
      setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
    });

    socket.on('user_typing', ({ isTyping: typing }: { userId: string; isTyping: boolean }) => {
      setIsTyping(typing);
      if (typing) setTimeout(() => setIsTyping(false), 3000);
    });

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [accessToken]);

  // ── Join room ──
  useEffect(() => {
    if (!socketRef.current || !activeId) return;
    socketRef.current.emit('join_conversation', { conversationId: activeId });
    return () => { socketRef.current?.emit('leave_conversation', { conversationId: activeId }); };
  }, [activeId]);

  // ── Load conversations ──
  const loadConversations = useCallback(async () => {
    try {
      const r = await api.get<Conversation[]>('/conversations');
      setConversations(r.data);
    } catch { /* ignore */ }
    finally { setLoadingConvs(false); }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ── Load messages ──
  useEffect(() => {
    if (!activeId) return;
    setLoadingMsgs(true);
    setMessages([]);
    api.get<Message[]>(`/conversations/${activeId}/messages`)
      .then((r) => {
        setMessages(r.data);
        setConversations((prev) => prev.map((c) => c.id === activeId ? { ...c, unreadCount: 0 } : c));
      })
      .catch(() => setMessages([]))
      .finally(() => setLoadingMsgs(false));
  }, [activeId]);

  // ── Auto scroll ──
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── Send text ──
  const handleSend = async () => {
    if ((!input.trim() && !mediaFile) || !activeId || sending) return;

    if (mediaFile) {
      await handleMediaSend();
      return;
    }

    const content = input.trim();
    setInput('');
    setSending(true);

    if (socketRef.current?.connected) {
      socketRef.current.emit('send_message', { conversationId: activeId, content });
      setSending(false);
    } else {
      try {
        const res = await api.post<Message>(`/conversations/${activeId}/messages`, { content });
        setMessages((prev) => [...prev, res.data]);
      } catch { /* ignore */ } finally { setSending(false); }
    }
  };

  // ── Send media ──
  const handleMediaSend = async () => {
    if (!mediaFile || !activeId) return;
    setSending(true);
    const formData = new FormData();
    formData.append('file', mediaFile);
    formData.append('content', input.trim());
    try {
      const res = await api.post<Message>(`/conversations/${activeId}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessages((prev) => [...prev, res.data]);
      setMediaFile(null);
      setMediaPreview(null);
      setInput('');
    } catch { /* ignore */ } finally { setSending(false); }
  };

  const handleTyping = () => {
    if (!socketRef.current || !activeId) return;
    socketRef.current.emit('user_typing', { conversationId: activeId, isTyping: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('user_typing', { conversationId: activeId, isTyping: false });
    }, 2000);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const clearMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
  };

  // ── Block / Unblock ──
  const handleBlock = async () => {
    if (!activeConv || !otherUser) return;
    setBlockLoading(true);
    try {
      await api.post(`/users/block/${otherUser.id}`);
      setConversations((prev) =>
        prev.map((c) => c.id === activeId ? { ...c, blockStatus: 'i_blocked' as const } : c)
      );
    } catch { /* ignore */ } finally { setBlockLoading(false); }
  };

  const handleUnblock = async () => {
    if (!activeConv || !otherUser) return;
    setBlockLoading(true);
    try {
      await api.delete(`/users/block/${otherUser.id}`);
      setConversations((prev) =>
        prev.map((c) => c.id === activeId ? { ...c, blockStatus: 'none' as const } : c)
      );
    } catch { /* ignore */ } finally { setBlockLoading(false); }
  };

  // ── Derived ──
  const activeConv = conversations.find((c) => c.id === activeId);
  const otherUser = activeConv
    ? activeConv.buyer.id === user?.id ? activeConv.seller : activeConv.buyer
    : null;
  const blockStatus = activeConv?.blockStatus ?? 'none';
  const isBlocked = blockStatus !== 'none';

  const filteredConvs = conversations.filter((conv) => {
    if (activeTab === 'unread' && conv.unreadCount === 0) return false;
    if (activeTab === 'spam') return false;
    if (search.length >= 3) {
      const other = conv.buyer.id === user?.id ? conv.seller : conv.buyer;
      const q = search.toLowerCase();
      return other.name.toLowerCase().includes(q) || conv.listing.title.toLowerCase().includes(q);
    }
    return true;
  });

  const tabs: { key: TabType; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'unread', label: 'Chưa đọc' },
    { key: 'spam', label: 'Tin rác / Bỏ qua' },
  ];

  return (
    <div className="flex h-[calc(100vh-72px)] pt-[72px]">

      {/* ── Sidebar ── */}
      <aside className="w-80 flex-shrink-0 border-r border-purple-100 bg-white flex flex-col">

        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <h1 className="text-xl font-extrabold text-slate-900 font-headline mb-3">Chat</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nhập 3 ký tự để bắt đầu tìm kiếm"
              className="w-full rounded-full border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                activeTab === tab.key
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 text-slate-600 hover:border-slate-400'
              }`}
            >
              {tab.label}
              {tab.key === 'unread' && conversations.reduce((s, c) => s + c.unreadCount, 0) > 0 && (
                <span className="ml-1 text-[10px]">
                  ({conversations.reduce((s, c) => s + c.unreadCount, 0)})
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="h-px bg-purple-100 mx-4 mb-1" />

        {/* Conversation list */}
        {loadingConvs ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredConvs.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center gap-3">
            {activeTab === 'spam' ? (
              <p className="text-sm text-slate-400">Không có tin rác</p>
            ) : (
              <>
                <span className="material-symbols-outlined text-4xl text-slate-200">chat_bubble</span>
                <p className="text-sm font-semibold text-slate-500">Chưa có cuộc trò chuyện nào</p>
                <p className="text-xs text-slate-400 leading-relaxed">Tìm điện thoại bạn thích và nhắn tin với người bán!</p>
                <a
                  href="/listings"
                  className="mt-1 px-5 py-2.5 rounded-full bg-primary text-white text-xs font-bold hover:bg-purple-700 transition-colors"
                >
                  Dạo xem điện thoại
                </a>
              </>
            )}
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto">
            {filteredConvs.map((conv) => {
              const other = conv.buyer.id === user?.id ? conv.seller : conv.buyer;
              const cover = conv.listing.images?.[0]?.url;
              const isActive = conv.id === activeId;
              const hasUnread = conv.unreadCount > 0;
              const lastMsg = conv.lastMessage;

              return (
                <li key={conv.id}>
                  <button
                    onClick={() => setActiveId(conv.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-primary-light transition-colors text-left ${
                      isActive ? 'bg-primary-light border-l-2 border-primary' : ''
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      {other.avatar ? (
                        <img src={getImageUrl(other.avatar)} alt={other.name} className="h-11 w-11 rounded-full object-cover" />
                      ) : (
                        <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {other.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {hasUnread && (
                        <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-primary border-2 border-white" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-sm truncate ${hasUnread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                          {other.name}
                        </p>
                        {lastMsg && (
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {formatDate(lastMsg.createdAt)}
                          </span>
                        )}
                      </div>
                      {lastMsg && (
                        <p className={`text-xs truncate ${hasUnread ? 'font-semibold text-slate-700' : 'text-slate-400'}`}>
                          {lastMsg.senderId === user?.id ? 'Bạn: ' : ''}
                          {lastMsg.mediaUrl ? '📷 Hình ảnh' : lastMsg.content}
                        </p>
                      )}
                    </div>

                    {cover && (
                      <div className="relative flex-shrink-0">
                        <img src={getImageUrl(cover)} alt="" className="h-11 w-11 rounded-lg object-cover" />
                        {hasUnread && conv.unreadCount > 1 && (
                          <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                            {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* ── Chat window ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!activeId ? (
          <div className="flex flex-1 items-center justify-center flex-col gap-3">
            <span className="material-symbols-outlined text-6xl text-slate-200">chat_bubble</span>
            <p className="text-slate-400 text-sm">Chọn một cuộc trò chuyện để bắt đầu</p>
          </div>
        ) : (
          <div className="flex flex-1 min-h-0">
          {/* ── Chat area ── */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#F5F3FF]">
            {/* Chat header */}
            <div className="px-6 py-3.5 bg-white border-b border-purple-100 flex items-center gap-3">
              {otherUser?.avatar ? (
                <img src={getImageUrl(otherUser.avatar)} alt={otherUser.name} className="h-9 w-9 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                  {otherUser?.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-slate-900">{otherUser?.name}</p>
                <p className="text-xs text-green-500 font-medium">Đang hoạt động</p>
              </div>
              {isTyping && (
                <span className="text-xs text-slate-400 italic mr-2">đang nhập...</span>
              )}
              <button
                onClick={() => setShowInfoPanel((v) => !v)}
                className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
                  showInfoPanel ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                }`}
                title="Thông tin hội thoại"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>

            {/* Listing context card */}
            {activeConv && (
              <div className="mx-4 mt-3 mb-1">
                <Link
                  href={`/listings/${activeConv.listing.id}`}
                  className="flex items-center gap-3 bg-white rounded-2xl border border-purple-100 px-4 py-2.5 shadow-sm hover:border-primary/30 transition-colors"
                >
                  {activeConv.listing.images?.[0]?.url ? (
                    <img
                      src={getImageUrl(activeConv.listing.images[0].url)}
                      alt={activeConv.listing.title}
                      className="h-12 w-12 rounded-xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-slate-100 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate">{activeConv.listing.title}</p>
                    <p className="text-sm font-bold text-primary mt-0.5">{formatPrice(activeConv.listing.askingPrice)}</p>
                  </div>
                  <span className="material-symbols-outlined text-slate-300 text-lg flex-shrink-0">chevron_right</span>
                </Link>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {loadingMsgs ? (
                <div className="flex justify-center pt-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : messages.length === 0 ? (
                <p className="text-center text-sm text-slate-400 pt-10">
                  Chưa có tin nhắn. Hãy bắt đầu trò chuyện!
                </p>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl overflow-hidden text-sm ${
                        isMine
                          ? 'bg-primary text-white rounded-br-sm'
                          : 'bg-white text-slate-800 border border-purple-100 rounded-bl-sm'
                      }`}>
                        {msg.mediaUrl && isImageUrl(msg.mediaUrl) && (
                          <a href={getImageUrl(msg.mediaUrl)} target="_blank" rel="noopener noreferrer">
                            <img src={getImageUrl(msg.mediaUrl)} alt="ảnh" className="max-w-full max-h-64 object-cover" />
                          </a>
                        )}
                        {msg.mediaUrl && isVideoUrl(msg.mediaUrl) && (
                          <video src={getImageUrl(msg.mediaUrl)} controls className="max-w-full max-h-64" />
                        )}
                        {msg.content && (
                          <div className="px-4 py-2.5">
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          </div>
                        )}
                        <div className={`px-4 pb-2 text-[10px] ${isMine ? 'text-white/60' : 'text-slate-400'} ${msg.content ? '-mt-1' : 'mt-1'}`}>
                          {formatDate(msg.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Media preview */}
            {mediaPreview && (
              <div className="px-4 pb-2">
                <div className="relative inline-block">
                  {mediaFile?.type.startsWith('video') ? (
                    <video src={mediaPreview} className="h-24 rounded-xl object-cover" />
                  ) : (
                    <img src={mediaPreview} alt="preview" className="h-24 rounded-xl object-cover" />
                  )}
                  <button
                    onClick={clearMedia}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-slate-700 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Input area — blocked states */}
            {blockStatus === 'i_blocked' ? (
              <div className="px-4 py-4 bg-white border-t border-purple-100 flex items-center justify-center gap-3">
                <Ban className="h-4 w-4 text-red-400 flex-shrink-0" />
                <span className="text-sm text-red-500 font-medium">Bạn đã chặn người này</span>
                <button
                  onClick={handleUnblock}
                  disabled={blockLoading}
                  className="ml-2 text-xs text-slate-500 hover:text-primary underline disabled:opacity-50"
                >
                  {blockLoading ? 'Đang xử lý...' : 'Bỏ chặn'}
                </button>
              </div>
            ) : blockStatus === 'i_am_blocked' ? (
              <div className="px-4 py-4 bg-white border-t border-purple-100 flex items-center justify-center gap-2">
                <Ban className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-500 font-medium">Bạn đã bị chặn</span>
              </div>
            ) : (
              <div className="px-4 py-3 bg-white border-t border-purple-100 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-10 w-10 rounded-full flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
                  title="Gửi ảnh / video"
                >
                  <ImageIcon className="h-5 w-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <input
                  value={input}
                  onChange={(e) => { setInput(e.target.value); handleTyping(); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 rounded-full border border-purple-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <button
                  onClick={handleSend}
                  disabled={(!input.trim() && !mediaFile) || sending}
                  className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-purple-700 disabled:opacity-50 transition-colors flex-shrink-0"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            )}
          </div>

          {/* ── Info Panel ── */}
          {showInfoPanel && activeConv && (
            <aside className="w-72 flex-shrink-0 border-l border-purple-100 bg-white flex flex-col overflow-y-auto">

              {/* User profile */}
              <div className="flex flex-col items-center px-5 pt-6 pb-4 border-b border-slate-100">
                {otherUser?.avatar ? (
                  <img src={getImageUrl(otherUser.avatar)} alt={otherUser?.name} className="h-16 w-16 rounded-full object-cover mb-2" />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl mb-2">
                    {otherUser?.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <p className="font-bold text-slate-900 text-base">{otherUser?.name}</p>
                <Link
                  href={`/users/${otherUser?.id}`}
                  className="mt-2 px-5 py-1.5 rounded-full border border-slate-200 text-xs font-semibold text-slate-600 hover:border-primary hover:text-primary transition-colors"
                >
                  Xem Trang
                </Link>
              </div>

              {/* Ảnh và video */}
              <div className="px-4 py-4 border-b border-slate-100">
                <p className="text-sm font-bold text-slate-900 mb-3">Ảnh và video</p>
                {(() => {
                  const mediaMessages = messages.filter((m) => m.mediaUrl);
                  if (mediaMessages.length === 0) {
                    return (
                      <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <ImageIcon className="h-5 w-5 text-slate-300 flex-shrink-0" />
                        <p className="text-xs text-slate-400">Hình, video mới nhất của trò chuyện sẽ xuất hiện tại đây</p>
                      </div>
                    );
                  }
                  return (
                    <div className="grid grid-cols-3 gap-1">
                      {mediaMessages.slice(-6).map((m) => (
                        <a key={m.id} href={getImageUrl(m.mediaUrl!)} target="_blank" rel="noopener noreferrer">
                          {isVideoUrl(m.mediaUrl!) ? (
                            <video src={getImageUrl(m.mediaUrl!)} className="h-20 w-full object-cover rounded-lg" />
                          ) : (
                            <img src={getImageUrl(m.mediaUrl!)} alt="" className="h-20 w-full object-cover rounded-lg hover:opacity-90 transition-opacity" />
                          )}
                        </a>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Tin đang trao đổi */}
              <div className="px-4 py-4 border-b border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-slate-900">Tin đang trao đổi</p>
                  <Link href={`/listings/${activeConv.listing.id}`} className="text-slate-400 hover:text-primary transition-colors">
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className="rounded-2xl border border-slate-100 overflow-hidden">
                  {activeConv.listing.images?.[0]?.url ? (
                    <img
                      src={getImageUrl(activeConv.listing.images[0].url)}
                      alt={activeConv.listing.title}
                      className="w-full h-36 object-cover"
                    />
                  ) : (
                    <div className="w-full h-36 bg-slate-100" />
                  )}
                  <div className="px-3 py-2.5">
                    <p className="text-xs font-semibold text-slate-800 truncate">{activeConv.listing.title}</p>
                    <p className="text-sm font-bold text-primary mt-0.5">{formatPrice(activeConv.listing.askingPrice)}</p>
                    <Link
                      href={`/listings/${activeConv.listing.id}`}
                      className="mt-2 block w-full text-center rounded-xl border border-slate-200 py-1.5 text-xs font-semibold text-slate-700 hover:border-primary hover:text-primary transition-colors"
                    >
                      Xem tin đăng
                    </Link>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="px-4 py-3 flex flex-col gap-1">
                <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left w-full">
                  <Flag className="h-4 w-4 text-slate-500 flex-shrink-0" />
                  <span className="text-sm text-slate-700 font-medium">Báo xấu</span>
                </button>

                {blockStatus === 'i_blocked' ? (
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <Ban className="h-4 w-4 text-red-400 flex-shrink-0" />
                    <span className="text-sm text-red-500 font-semibold">Đã chặn</span>
                    <button
                      onClick={handleUnblock}
                      disabled={blockLoading}
                      className="ml-auto text-[11px] text-slate-400 hover:text-slate-600 underline disabled:opacity-50"
                    >
                      {blockLoading ? '...' : 'Bỏ chặn'}
                    </button>
                  </div>
                ) : blockStatus === 'i_am_blocked' ? (
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <Ban className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span className="text-sm text-slate-500 font-medium">Đã bị chặn</span>
                  </div>
                ) : (
                  <button
                    onClick={handleBlock}
                    disabled={blockLoading}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 transition-colors text-left w-full disabled:opacity-50"
                  >
                    <Ban className="h-4 w-4 text-slate-500 flex-shrink-0" />
                    <span className="text-sm text-slate-700 font-medium">
                      {blockLoading ? 'Đang xử lý...' : 'Chặn người dùng'}
                    </span>
                  </button>
                )}

                <button
                  onClick={() => { setActiveId(null); setShowInfoPanel(false); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left w-full"
                >
                  <EyeOff className="h-4 w-4 text-slate-500 flex-shrink-0" />
                  <span className="text-sm text-slate-700 font-medium">Ẩn hội thoại</span>
                </button>
              </div>

            </aside>
          )}

          </div>
        )}
      </main>
    </div>
  );
}
