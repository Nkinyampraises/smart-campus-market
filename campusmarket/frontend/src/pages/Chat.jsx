import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatFCFA } from '../utils/format';

const Chat = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const mediaRef  = useRef(null);

  const [conversations, setConversations] = useState([]);
  const [selected, setSelected]           = useState(null);
  const [messages, setMessages]           = useState([]);
  const [text, setText]                   = useState('');
  const [sending, setSending]             = useState(false);
  const [recording, setRecording]         = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [loadingConvs, setLoadingConvs]   = useState(true);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);

  // Load all conversations
  useEffect(() => {
    api.getConversations()
      .then(setConversations)
      .catch(console.error)
      .finally(() => setLoadingConvs(false));
  }, []);

  // Auto-select conversation from URL param
  useEffect(() => {
    if (!conversationId || conversations.length === 0) return;
    const conv = conversations.find((c) => c.id === conversationId);
    if (conv) setSelected(conv);
  }, [conversationId, conversations]);

  // Load messages when conversation selected
  useEffect(() => {
    if (!selected) return;
    setLoadingMsgs(true);
    api.getMessages(selected.id)
      .then(setMessages)
      .catch(console.error)
      .finally(() => setLoadingMsgs(false));
  }, [selected]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!text.trim() || !selected) return;
    const content = text.trim();
    setText('');
    setSending(true);

    // Optimistic update
    const optimistic = { id: `opt-${Date.now()}`, sender_id: user?.id, text: content, type: 'text', created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);

    try {
      await api.sendMessage(selected.id, { text: content, type: 'text' });
      // Refresh messages to get server-side message
      api.getMessages(selected.id).then(setMessages).catch(console.error);
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setText(content);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks = [];
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const optimistic = { id: `opt-${Date.now()}`, sender_id: user?.id, text: reader.result, type: 'audio', created_at: new Date().toISOString() };
          setMessages((prev) => [...prev, optimistic]);
          try {
            await api.sendMessage(selected.id, { text: reader.result, type: 'audio' });
            api.getMessages(selected.id).then(setMessages).catch(console.error);
          } catch { setMessages((prev) => prev.filter((m) => m.id !== optimistic.id)); }
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setMediaRecorder(mr);
      setRecording(true);
    } catch {
      alert('Microphone access denied.');
    }
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setRecording(false);
    setMediaRecorder(null);
  };

  const partnerName = (conv) => {
    if (!conv) return 'Seller';
    if (conv.partner_name) return conv.partner_name;
    const first = conv.partner_first || '';
    const last  = conv.partner_last  || '';
    return (first + ' ' + last).trim() || 'Seller';
  };

  const partnerInitials = (conv) => {
    const name = partnerName(conv);
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || 'S';
  };

  const isMe = (msg) => msg.sender_id === user?.id;

  return (
    <div className="h-screen flex flex-col bg-[#f5f5f5]">
      <Topbar activePage="inbox" />

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Conversation List ──────────────────────────────────── */}
        <aside className="w-[300px] flex-shrink-0 bg-white border-r border-gray-100 flex flex-col">
          <div className="px-4 py-4 border-b border-gray-100">
            <h2 className="font-black text-[16px] text-[#1b1c1c]">Messages</h2>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingConvs ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-2 border-[#ff6b1a] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-16 text-gray-400 px-4">
                <span className="material-symbols-outlined text-[40px] mb-2 block">chat_bubble_outline</span>
                <p className="text-[13px] font-semibold">No conversations yet</p>
                <p className="text-[12px] mt-1">Find a listing and click Chat with Seller</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => { setSelected(conv); navigate(`/chat/${conv.id}`); }}
                  className={`w-full text-left px-4 py-3.5 border-b border-gray-50 flex items-center gap-3 hover:bg-orange-50/50 transition-colors ${
                    selected?.id === conv.id ? 'bg-orange-50 border-l-4 border-l-[#ff6b1a]' : ''
                  }`}
                >
                  <div className="w-11 h-11 rounded-full bg-[#ff6b1a] flex items-center justify-center text-white font-black text-[13px] flex-shrink-0">
                    {partnerInitials(conv)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <p className="font-bold text-[14px] text-[#1b1c1c] truncate">{partnerName(conv)}</p>
                      <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                        {conv.last_message_at ? new Date(conv.last_message_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <p className="text-[12px] text-gray-500 truncate">{conv.last_message || conv.listing_title || 'New conversation'}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* ── Right: Chat Window ───────────────────────────────────────── */}
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <span className="material-symbols-outlined text-[64px] mb-4 text-gray-200">chat</span>
            <p className="font-bold text-[16px]">Select a conversation</p>
            <p className="text-[13px] mt-1">or click Chat with Seller on any listing</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col bg-[#f0ece8]" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/subtle-white-feathers.png")' }}>

            {/* Chat Header */}
            <div className="bg-white px-5 py-3.5 flex items-center gap-3 border-b border-gray-100 shadow-sm">
              <button onClick={() => { setSelected(null); navigate('/inbox'); }} className="md:hidden mr-1">
                <span className="material-symbols-outlined text-gray-500">arrow_back</span>
              </button>
              <div className="w-10 h-10 rounded-full bg-[#ff6b1a] flex items-center justify-center text-white font-black text-[13px]">
                {partnerInitials(selected)}
              </div>
              <div className="flex-1">
                <p className="font-bold text-[15px] text-[#1b1c1c]">{partnerName(selected)}</p>
                {selected.listing_title && (
                  <p className="text-[12px] text-gray-400 truncate">Re: {selected.listing_title}</p>
                )}
              </div>
              <button
                onClick={() => navigate(`/listing/${selected.listing_id}`)}
                className="text-[#ff6b1a] text-[12px] font-bold hover:underline hidden sm:block"
              >
                View Listing
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {loadingMsgs ? (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 border-2 border-[#ff6b1a] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-[13px]">Say hello! Start the conversation.</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex ${isMe(msg) ? 'justify-end' : 'justify-start'}`}>
                    {!isMe(msg) && (
                      <div className="w-7 h-7 rounded-full bg-[#ff6b1a] flex items-center justify-center text-white text-[10px] font-black mr-2 flex-shrink-0 self-end">
                        {partnerInitials(selected)}
                      </div>
                    )}
                    <div className={`max-w-[70%] ${isMe(msg) ? 'items-end' : 'items-start'} flex flex-col`}>
                      {msg.type === 'audio' ? (
                        <div className={`px-4 py-2.5 rounded-2xl shadow-sm ${isMe(msg) ? 'bg-[#ff6b1a] rounded-br-sm' : 'bg-white rounded-bl-sm'}`}>
                          <audio controls src={msg.text} className="h-8 max-w-[200px]" />
                        </div>
                      ) : msg.type === 'offer' ? (
                        <div className={`px-4 py-3 rounded-2xl shadow-sm border ${isMe(msg) ? 'bg-[#ff6b1a] text-white border-orange-400 rounded-br-sm' : 'bg-white border-gray-200 rounded-bl-sm'}`}>
                          <p className="text-[11px] font-black uppercase tracking-wider mb-1 opacity-70">Offer</p>
                          <p className="text-[20px] font-black">{formatFCFA(msg.offer_amount || 0)}</p>
                          {msg.text && <p className="text-[13px] mt-1 opacity-80">{msg.text}</p>}
                        </div>
                      ) : (
                        <div className={`px-4 py-2.5 rounded-2xl shadow-sm text-[14px] leading-relaxed ${
                          isMe(msg)
                            ? 'bg-[#ff6b1a] text-white rounded-br-sm'
                            : 'bg-white text-[#1b1c1c] rounded-bl-sm'
                        }`}>
                          {msg.text}
                        </div>
                      )}
                      <span className="text-[10px] text-gray-400 mt-0.5 px-1">
                        {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input Bar */}
            <div className="bg-white px-4 py-3 flex items-end gap-2 border-t border-gray-100">
              <form onSubmit={sendMessage} className="flex-1 flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message…"
                  rows={1}
                  className="flex-1 px-4 py-2.5 bg-[#f5f5f5] rounded-2xl text-[14px] resize-none focus:outline-none focus:ring-2 focus:ring-[#ff6b1a] max-h-32"
                  style={{ lineHeight: '1.5' }}
                />
                {text.trim() ? (
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-10 h-10 bg-[#ff6b1a] rounded-full flex items-center justify-center text-white flex-shrink-0 hover:bg-[#e05f15] transition-all active:scale-95 disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[20px]">send</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecording}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 transition-all active:scale-95 ${recording ? 'bg-red-500 animate-pulse' : 'bg-[#ff6b1a] hover:bg-[#e05f15]'}`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{recording ? 'stop' : 'mic'}</span>
                  </button>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
