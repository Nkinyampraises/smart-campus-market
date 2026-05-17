import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { api } from '../services/api';

const Inbox = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getConversations().then(setConversations).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      <Topbar activePage="inbox" />
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-[28px] font-black text-[#1b1c1c] mb-8 flex items-center gap-3">
          <span className="material-symbols-outlined text-[#ff6b1a]">chat</span>
          Inbox
        </h1>
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#ff6b1a] border-t-transparent rounded-full animate-spin" /></div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <span className="material-symbols-outlined text-[48px] mb-3 block">chat_bubble_outline</span>
            <p className="font-semibold">No conversations yet</p>
            <p className="text-[14px]">Start chatting with a seller from any listing</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {conversations.map((conv) => (
              <button key={conv.id} onClick={() => navigate(`/chat/${conv.id}`)}
                className="w-full flex items-center gap-4 bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-md transition-all text-left">
                <div className="w-12 h-12 rounded-full bg-[#ff6b1a] flex items-center justify-center text-white font-black text-[14px] flex-shrink-0">
                  {(conv.partner_name || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="font-bold text-[#1b1c1c] text-[14px]">{conv.partner_name || 'User'}</p>
                    <span className="text-[11px] text-gray-400">{conv.last_message_at ? new Date(conv.last_message_at).toLocaleDateString() : ''}</span>
                  </div>
                  <p className="text-[13px] text-gray-500 truncate">{conv.last_message || 'Start the conversation'}</p>
                  {conv.listing_title && <p className="text-[11px] text-[#ff6b1a] font-semibold mt-0.5 truncate">Re: {conv.listing_title}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Inbox;
