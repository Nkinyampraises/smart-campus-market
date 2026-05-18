import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import OfferModal from '../components/modals/OfferModal';
import { mockConversations } from '../data/mockData';
import { formatFCFA } from '../data/listings';
import { useAuth } from '../context/AuthContext';
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
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-[11px]"
            style={{ backgroundColor: conv.partner.color }}
          >
            {conv.partner.initials}
          </div>
          {conv.partner.online && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between mb-0.5">
            <p className="font-bold text-[12px] text-[#1b1c1c] truncate">{conv.partner.name}</p>
            <span className="text-[10px] text-gray-400">{conv.timestamp}</span>
          </div>
          <p className="text-[11px] text-gray-400 truncate">{conv.lastMessage}</p>
        </div>
        {conv.unread > 0 && (
          <span className="flex-shrink-0 w-4 h-4 bg-[#ff6b1a] text-white text-[9px] font-black rounded-full flex items-center justify-center">
            {conv.unread}
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
  const { showToast } = useToast();
  const messagesEndRef = useRef(null);

  const conversation = mockConversations.find((c) => c.id === conversationId) || mockConversations[0];
  const [messages, setMessages] = useState(conversation?.messages || []);
  const [inputText, setInputText] = useState('');
  const [showOfferModal, setShowOfferModal] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!inputText.trim()) return;
    const newMsg = {
      id: `m_${Date.now()}`,
      sender: 'u001',
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'text',
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!conversation) {
    return (
      <div className="min-h-screen bg-[#fcf9f8]">
        <Topbar />
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-gray-400 font-bold">Conversation not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcf9f8] flex flex-col">
      <Topbar activePage="inbox" />

      <div className="flex flex-1 max-w-7xl mx-auto w-full" style={{ height: 'calc(100vh - 61px)' }}>
        {/* Conversation List */}
        <ConversationList
          conversations={mockConversations}
          selectedId={conversationId}
          onSelect={(conv) => navigate(`/chat/${conv.id}`)}
        />

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Chat Header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-4">
            <div className="relative">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-[12px]"
                style={{ backgroundColor: conversation.partner.color }}
              >
                {conversation.partner.initials}
              </div>
              {conversation.partner.online && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-bold text-[14px] text-[#1b1c1c]">{conversation.partner.name}</p>
              <p className="text-[11px] text-gray-400">
                {conversation.partner.online ? 'Online' : 'Offline'}
              </p>
            </div>

            {/* Listing mini-card */}
            <button
              onClick={() => navigate(`/listing/${conversation.listing.id}`)}
              className="flex items-center gap-2 bg-[#fcf9f8] border border-gray-100 rounded-xl px-3 py-2 hover:border-[#ff6b1a] transition-all"
            >
              <div className="w-10 h-8 rounded-lg overflow-hidden">
                <img src={conversation.listing.image} alt="" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#1b1c1c] truncate max-w-[120px]">{conversation.listing.title}</p>
                <p className="text-[11px] text-[#ff6b1a] font-black">{formatFCFA(conversation.listing.priceFCFA)}</p>
              </div>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
            {messages.map((msg) => {
              const isMe = msg.sender === 'u001';

              if (msg.type === 'offer') {
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className="bg-white border-2 border-[#ff6b1a] rounded-2xl p-4 max-w-xs shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-[#ff6b1a] text-[18px]">local_offer</span>
                        <span className="text-[11px] font-black text-[#ff6b1a] uppercase tracking-widest">Offer</span>
                      </div>
                      <p className="text-[22px] font-black text-[#1b1c1c] mb-2">{formatFCFA(msg.offerAmount)}</p>
                      {!isMe && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => showToast('Offer accepted!', 'success')}
                            className="flex-1 bg-emerald-600 text-white py-1.5 rounded-lg font-bold text-[11px] hover:bg-emerald-700 transition-all"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => showToast('Offer declined.', 'neutral')}
                            className="flex-1 border border-gray-200 text-gray-600 py-1.5 rounded-lg font-bold text-[11px] hover:bg-gray-50 transition-all"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                      <p className="text-[10px] text-gray-400 mt-2">{msg.time}</p>
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                      isMe
                        ? 'bg-[#ff6b1a] text-white rounded-br-sm'
                        : 'bg-gray-100 text-[#1b1c1c] rounded-bl-sm'
                    }`}
                  >
                    <p className="text-[14px]">{msg.text}</p>
                    <p className={`text-[10px] mt-1 ${isMe ? 'text-white/60' : 'text-gray-400'}`}>
                      {msg.time}
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
          listing={conversation.listing}
          onClose={() => setShowOfferModal(false)}
        />
      )}
    </div>
  );
};

export default Chat;
