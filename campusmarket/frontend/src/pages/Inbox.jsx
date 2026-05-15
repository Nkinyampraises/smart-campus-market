import React from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { mockConversations } from '../data/mockData';

const ConversationList = ({ conversations, selectedId, onSelect }) => (
  <div className="w-[310px] flex-shrink-0 border-r border-gray-100 bg-white overflow-y-auto">
    <div className="p-4 border-b border-gray-100">
      <h2 className="font-black text-[16px] text-[#1b1c1c]">Inbox</h2>
    </div>
    {conversations.map((conv) => (
      <button
        key={conv.id}
        onClick={() => onSelect(conv)}
        className={`w-full text-left px-4 py-4 border-b border-gray-50 flex gap-3 hover:bg-orange-50/40 transition-colors ${
          selectedId === conv.id ? 'bg-orange-50 border-l-4 border-l-[#ff6b1a]' : ''
        }`}
      >
        <div className="relative flex-shrink-0">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-[13px]"
            style={{ backgroundColor: conv.partner.color }}
          >
            {conv.partner.initials}
          </div>
          {conv.partner.online && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <p className="font-bold text-[13px] text-[#1b1c1c] truncate">{conv.partner.name}</p>
            <span className="text-[11px] text-gray-400 flex-shrink-0 ml-2">{conv.timestamp}</span>
          </div>
          <p className="text-[12px] text-[#ff6b1a] font-semibold truncate mb-0.5">{conv.listing.title}</p>
          <p className="text-[12px] text-gray-400 truncate">{conv.lastMessage}</p>
        </div>
        {conv.unread > 0 && (
          <span className="flex-shrink-0 w-5 h-5 bg-[#ff6b1a] text-white text-[10px] font-black rounded-full flex items-center justify-center">
            {conv.unread}
          </span>
        )}
      </button>
    ))}
  </div>
);

const Inbox = () => {
  const navigate = useNavigate();

  const handleSelect = (conv) => {
    navigate(`/chat/${conv.id}`);
  };

  return (
    <div className="min-h-screen bg-[#fcf9f8] flex flex-col">
      <Topbar activePage="inbox" />

      <div className="flex flex-1 max-w-7xl mx-auto w-full" style={{ height: 'calc(100vh - 61px)' }}>
        <ConversationList
          conversations={mockConversations}
          selectedId={null}
          onSelect={handleSelect}
        />

        {/* Empty state */}
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-[#ff6b1a] text-[44px]">chat</span>
          </div>
          <h3 className="font-black text-[22px] text-[#1b1c1c] mb-2">Select a conversation</h3>
          <p className="text-[14px] text-gray-400 mb-8 max-w-xs">
            Choose a conversation from the list to start chatting or negotiate a deal.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/browse')}
              className="px-6 py-3 bg-[#ff6b1a] text-white rounded-full font-bold text-[13px] hover:shadow-lg transition-all"
            >
              View Marketplace
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inbox;
