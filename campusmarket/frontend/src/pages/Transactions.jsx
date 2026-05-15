import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { mockTransactions } from '../data/mockData';
import { formatFCFA } from '../data/listings';

const Transactions = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All');

  const filtered = mockTransactions.filter((t) => {
    if (activeTab === 'Sold') return t.type === 'sold';
    if (activeTab === 'Bought') return t.type === 'bought';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      <Topbar activePage="transactions" />

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-[32px] font-black text-[#1b1c1c]">Transactions</h1>
          <p className="text-[14px] text-gray-400 mt-1">Your complete buying and selling history</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {['All', 'Sold', 'Bought'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-full font-bold text-[13px] transition-all ${
                activeTab === tab
                  ? 'bg-[#ff6b1a] text-white shadow-md shadow-orange-200'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-[#ff6b1a] hover:text-[#ff6b1a]'
              }`}
            >
              {tab}
              {tab === 'Sold' && (
                <span className="ml-2 text-[11px] opacity-70">
                  ({mockTransactions.filter((t) => t.type === 'sold').length})
                </span>
              )}
              {tab === 'Bought' && (
                <span className="ml-2 text-[11px] opacity-70">
                  ({mockTransactions.filter((t) => t.type === 'bought').length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[2fr_1fr_1.5fr_1fr_1fr_auto] gap-4 px-6 py-4 border-b border-gray-100 bg-gray-50">
            {['Item', 'Type', 'Party', 'Amount', 'Date', 'Action'].map((h) => (
              <span key={h} className="text-[10px] font-black tracking-widest text-gray-400 uppercase">{h}</span>
            ))}
          </div>

          {/* Rows */}
          {filtered.map((txn) => (
            <div
              key={txn.id}
              className="grid grid-cols-[2fr_1fr_1.5fr_1fr_1fr_auto] gap-4 px-6 py-5 border-b border-gray-50 items-center hover:bg-orange-50/30 transition-colors"
            >
              {/* Item */}
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                  <img src={txn.item.image} alt={txn.item.title} className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="font-bold text-[14px] text-[#1b1c1c] leading-snug line-clamp-2">{txn.item.title}</p>
                  <p className="text-[11px] text-gray-400">{txn.item.category}</p>
                </div>
              </div>

              {/* Type */}
              <div>
                <span
                  className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest ${
                    txn.type === 'sold' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {txn.type === 'sold' ? 'Sold' : 'Bought'}
                </span>
              </div>

              {/* Party */}
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-black flex-shrink-0"
                  style={{ backgroundColor: txn.party.color }}
                >
                  {txn.party.initials}
                </div>
                <span className="text-[13px] font-medium text-[#1b1c1c] truncate">{txn.party.name}</span>
              </div>

              {/* Amount */}
              <div>
                <p
                  className={`font-black text-[15px] ${txn.type === 'sold' ? 'text-emerald-600' : 'text-red-500'}`}
                >
                  {txn.type === 'sold' ? '+' : '-'}{formatFCFA(txn.amount)}
                </p>
              </div>

              {/* Date */}
              <div>
                <p className="text-[13px] text-gray-500">{txn.date}</p>
                <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-semibold">
                  {txn.status}
                </span>
              </div>

              {/* Action */}
              <div>
                <button
                  onClick={() => navigate(`/receipt/${txn.id}`)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-[12px] font-bold text-[#1b1c1c] hover:bg-gray-50 transition-all flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">receipt</span>
                  Receipt
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <span className="material-symbols-outlined text-[48px] mb-3 block">receipt_long</span>
              <p className="font-semibold text-[16px]">No {activeTab.toLowerCase()} transactions yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Transactions;
