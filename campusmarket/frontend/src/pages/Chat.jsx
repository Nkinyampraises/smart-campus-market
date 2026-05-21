import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import OfferModal from '../components/modals/OfferModal';
import { api } from '../services/api';
import { formatFCFA } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';

const ConversationList = ({ conversations, selectedId, onSelect }) => (
  <div className="w-[280px] flex-shrink-0 border-r border-gray-100 bg-white overflow-y-auto">
    <div className="p-4 border-b border-gray-100">
      <p className="font-black text-[14px] text-[#1b1c1c]">Messages</p>
    </div>
    {conversations.map((conv) => (
      <button
        key={conv.id}
        onClick={() => onSelect(conv)}
        className={`w-full text-left px-4 py-3.5 border-b border-gray-50 flex gap-3 hover:bg-orange-50/40 transition-colors ${
          selectedId === conv.id ? 'bg-orange-50 border-l-4 border-l-[#ff6b1a]' : ''
        }`}
      >
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-[11px] bg-gray-400">
            {conv.partner_first?.[0]}{conv.partner_last?.[0]}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between mb-0.5">
            <p className="font-bold text-[12px] text-[#1b1c1c] truncate">{conv.partner_first} {conv.partner_last}</p>
            <span className="text-[10px] text-gray-400">{conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''}</span>
          </div>
          <p className="text-[11px] text-gray-400 truncate">{conv.last_message || 'Start chatting'}</p>
        </div>
        {(conv.unread_count || 0) > 0 && (
          <span className="flex-shrink-0 w-4 h-4 bg-[#ff6b1a] text-white text-[9px] font-black rounded-full flex items-center justify-center">
            {conv.unread_count}
          </span>
        )}
      </button>
    ))}
  </div>
);

const Chat = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();
  const { showToast } = useToast();
  const messagesEndRef = useRef(null);

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [loadingConv, setLoadingConv] = useState(true);

  const activeConv = conversations.find((c) => c.id === conversationId) || conversations[0];

  useEffect(() => {
    api.getConversations().then((data) => {
      setConversations(data);
      setLoadingConv(false);
    }).catch(() => setLoadingConv(false));
  }, []);

  useEffect(() => {
    if (!conversationId && activeConv?.id) {
      navigate(`/chat/${activeConv.id}`, { replace: true });
      return;
    }
    if (conversationId) {
      api.getMessages(conversationId).then(setMessages).catch(() => {});
      api.markRead(conversationId).catch(() => {});
      socket?.joinConversation?.(conversationId);
    }
  }, [conversationId, activeConv?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!socket) return;
    const cleanup = socket.onNewMessage?.((msg) => {
      if (msg.conversation_id === conversationId) {
        setMessages((prev) => [...prev, msg]);
      }
      // Refresh conversation list for last message
      api.getConversations().then(setConversations).catch(() => {});
    });
    return cleanup;
  }, [socket, conversationId]);

  const sendMessage = () => {
    if (!inputText.trim() || !conversationId) return;
    socket?.sendMessage?.(conversationId, inputText.trim());
    setInputText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSelectConv = (conv) => {
    navigate(`/chat/${conv.id}`);
  };

  if (loadingConv) {
    return (
      <div className="min-h-screen bg-[#fcf9f8] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#ff6b1a] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!activeConv) {
    return (
      <div className="min-h-screen bg-[#fcf9f8]">
        <Topbar activePage="inbox" />
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-gray-400 font-bold">No conversations yet</p>
        </div>
      </div>
    );
  }

  const isMe = (msg) => msg.sender_id === user?.id;

  return (
    <div className="min-h-screen bg-[#fcf9f8] flex flex-col">
      <Topbar activePage="inbox" />

      <div className="flex flex-1 max-w-7xl mx-auto w-full" style={{ height: 'calc(100vh - 61px)' }}>
        <ConversationList
          conversations={conversations}
          selectedId={conversationId}
          onSelect={handleSelectConv}
        />

        <div className="flex-1 flex flex-col bg-white">
          {/* Chat Header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-4">
            <div className="relative">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-[12px] bg-gray-400">
                {activeConv.partner_first?.[0]}{activeConv.partner_last?.[0]}
              </div>
            </div>
            <div className="flex-1">
              <p className="font-bold text-[14px] text-[#1b1c1c]">{activeConv.partner_first} {activeConv.partner_last}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
            {messages.map((msg) => {
              const me = isMe(msg);
              if (msg.type === 'offer') {
                return (
                  <div key={msg.id} className={`flex ${me ? 'justify-end' : 'justify-start'}`}>
                    <div className="bg-white border-2 border-[#ff6b1a] rounded-2xl p-4 max-w-xs shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-[#ff6b1a] text-[18px]">local_offer</span>
                        <span className="text-[11px] font-black text-[#ff6b1a] uppercase tracking-widest">Offer</span>
                      </div>
                      <p className="text-[22px] font-black text-[#1b1c1c] mb-2">{formatFCFA(Number(msg.text?.replace(/[^0-9]/g, '')) || 0)}</p>
                      <p className="text-[10px] text-gray-400 mt-2">{new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id} className={`flex ${me ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${me ? 'bg-[#ff6b1a] text-white rounded-br-sm' : 'bg-gray-100 text-[#1b1c1c] rounded-bl-sm'}`}>
                    <p className="text-[14px]">{msg.text}</p>
                    <p className={`text-[10px] mt-1 ${me ? 'text-white/60' : 'text-gray-400'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-3">
            <button
              onClick={() => setShowOfferModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 border-2 border-[#ff6b1a] text-[#ff6b1a] rounded-full font-bold text-[12px] hover:bg-orange-50 transition-all flex-shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">local_offer</span>
              Offer
            </button>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2.5 bg-[#f6f3f2] rounded-full text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a]"
            />
            <button
              onClick={sendMessage}
              disabled={!inputText.trim()}
              className="w-10 h-10 bg-[#ff6b1a] text-white rounded-full flex items-center justify-center hover:shadow-md transition-all disabled:opacity-40 flex-shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
            </button>
          </div>
        </div>
      </div>

      {showOfferModal && (
        <OfferModal
          listing={{ id: activeConv.listing_id, title: 'Listing', priceFCFA: 0 }}
          onClose={() => setShowOfferModal(false)}
        />
      )}
    </div>
  );
};

export default Chat;
