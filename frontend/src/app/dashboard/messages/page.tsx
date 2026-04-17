'use client';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Send } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/auth.store';
import { formatDate, getImageUrl } from '@/lib/utils';

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender?: { id: string; name: string; avatar?: string };
}

interface Conversation {
  id: string;
  listing: { id: string; title: string; images: { url: string }[] };
  buyer: { id: string; name: string; avatar?: string };
  seller: { id: string; name: string; avatar?: string };
  lastMessage?: { content: string; createdAt: string };
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

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
  const bottomRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Kết nối Socket.io ──
  useEffect(() => {
    if (!accessToken) return;

    const socket = io(`${BACKEND_URL}/chat`, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('message_received', (msg: Message) => {
      setMessages((prev) => {
        // Tránh duplicate nếu message do chính mình gửi qua socket
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on('user_typing', ({ isTyping: typing }: { userId: string; isTyping: boolean }) => {
      setIsTyping(typing);
      if (typing) {
        // Tự reset typing indicator sau 3 giây
        setTimeout(() => setIsTyping(false), 3000);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken]);

  // ── Join/leave conversation room ──
  useEffect(() => {
    if (!socketRef.current || !activeId) return;
    socketRef.current.emit('join_conversation', { conversationId: activeId });

    return () => {
      socketRef.current?.emit('leave_conversation', { conversationId: activeId });
    };
  }, [activeId]);

  // ── Load danh sách cuộc trò chuyện ──
  useEffect(() => {
    api.get<Conversation[]>('/conversations')
      .then((r) => setConversations(r.data))
      .catch(() => {})
      .finally(() => setLoadingConvs(false));
  }, []);

  // ── Load tin nhắn khi chọn conversation ──
  useEffect(() => {
    if (!activeId) return;
    setLoadingMsgs(true);
    setMessages([]);
    api.get<Message[]>(`/conversations/${activeId}/messages`)
      .then((r) => setMessages(r.data))
      .catch(() => setMessages([]))
      .finally(() => setLoadingMsgs(false));
  }, [activeId]);

  // ── Scroll xuống cuối ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !activeId || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);

    // Gửi qua Socket.io (real-time); server sẽ broadcast message_received
    if (socketRef.current?.connected) {
      socketRef.current.emit('send_message', { conversationId: activeId, content });
      setSending(false);
    } else {
      // Fallback REST nếu socket chưa kết nối
      try {
        const res = await api.post<Message>(`/conversations/${activeId}/messages`, { content });
        setMessages((prev) => [...prev, res.data]);
      } catch { /* ignore */ }
      finally { setSending(false); }
    }
  };

  const handleTyping = () => {
    if (!socketRef.current || !activeId) return;
    socketRef.current.emit('user_typing', { conversationId: activeId, isTyping: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('user_typing', { conversationId: activeId, isTyping: false });
    }, 2000);
  };

  const activeConv = conversations.find((c) => c.id === activeId);
  const otherUser = activeConv
    ? activeConv.buyer.id === user?.id ? activeConv.seller : activeConv.buyer
    : null;

  return (
    <div className="flex h-[calc(100vh-72px)] pt-[72px]">
      {/* ── Sidebar ── */}
      <aside className="w-80 flex-shrink-0 border-r border-purple-100 bg-white flex flex-col">
        <div className="px-5 py-4 border-b border-purple-100">
          <h1 className="text-lg font-extrabold text-slate-900 font-headline">Tin nhắn</h1>
        </div>

        {loadingConvs ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-center px-6">
            <p className="text-sm text-slate-400">Chưa có cuộc trò chuyện nào</p>
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto">
            {conversations.map((conv) => {
              const other = conv.buyer.id === user?.id ? conv.seller : conv.buyer;
              const cover = conv.listing.images?.[0]?.url;
              const isActive = conv.id === activeId;
              return (
                <li key={conv.id}>
                  <button
                    onClick={() => setActiveId(conv.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-primary-light transition-colors text-left ${isActive ? 'bg-primary-light border-l-2 border-primary' : ''}`}
                  >
                    {other.avatar ? (
                      <img src={other.avatar} alt={other.name} className="h-10 w-10 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary-light flex items-center justify-center text-primary font-bold flex-shrink-0">
                        {other.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-slate-900 truncate">{other.name}</p>
                      <p className="text-xs text-slate-400 truncate">{conv.listing.title}</p>
                      {conv.lastMessage && (
                        <p className="text-xs text-slate-400 truncate">{conv.lastMessage.content}</p>
                      )}
                    </div>
                    {cover && (
                      <img src={getImageUrl(cover)} alt="" className="h-10 w-10 rounded-lg object-cover flex-shrink-0" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* ── Chat window ── */}
      <main className="flex-1 flex flex-col bg-[#F5F3FF]">
        {!activeId ? (
          <div className="flex flex-1 items-center justify-center flex-col gap-3">
            <span className="material-symbols-outlined text-6xl text-slate-200">chat_bubble</span>
            <p className="text-slate-400 text-sm">Chọn một cuộc trò chuyện để bắt đầu</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 py-4 bg-white border-b border-purple-100 flex items-center gap-3">
              {otherUser?.avatar ? (
                <img src={otherUser.avatar} alt={otherUser.name} className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <div className="h-9 w-9 rounded-full bg-primary-light flex items-center justify-center text-primary font-bold text-sm">
                  {otherUser?.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-bold text-sm text-slate-900">{otherUser?.name}</p>
                {activeConv && (
                  <p className="text-xs text-slate-400 truncate max-w-xs">{activeConv.listing.title}</p>
                )}
              </div>
              {isTyping && (
                <span className="ml-auto text-xs text-slate-400 italic">đang nhập...</span>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {loadingMsgs ? (
                <div className="flex justify-center pt-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : messages.length === 0 ? (
                <p className="text-center text-sm text-slate-400 pt-10">Chưa có tin nhắn. Hãy bắt đầu trò chuyện!</p>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${
                        isMine
                          ? 'bg-primary text-white rounded-br-sm'
                          : 'bg-white text-slate-800 border border-purple-100 rounded-bl-sm'
                      }`}>
                        <p>{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${isMine ? 'text-white/60' : 'text-slate-400'}`}>
                          {formatDate(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-6 py-4 bg-white border-t border-purple-100 flex items-center gap-3">
              <input
                value={input}
                onChange={(e) => { setInput(e.target.value); handleTyping(); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Nhập tin nhắn..."
                className="flex-1 rounded-full border border-purple-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
