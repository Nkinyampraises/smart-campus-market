import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { api } from '../services/api';

const iconMap = {
  offer:         { icon: 'local_offer',  bg: 'bg-orange-100',  color: 'text-[#ff6b1a]' },
  buy_request:   { icon: 'shopping_bag', bg: 'bg-emerald-100', color: 'text-emerald-600' },
  message:       { icon: 'chat',         bg: 'bg-blue-100',    color: 'text-blue-600' },
  offer_accepted:{ icon: 'check_circle', bg: 'bg-emerald-100', color: 'text-emerald-600' },
  expire:        { icon: 'timer',        bg: 'bg-red-100',     color: 'text-red-600' },
  suspended:     { icon: 'block',        bg: 'bg-red-100',     color: 'text-red-600' },
  sale:          { icon: 'sell',         bg: 'bg-green-100',   color: 'text-green-700' },
  review:        { icon: 'star',         bg: 'bg-yellow-100',  color: 'text-yellow-600' },
};

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getNotifications().then(setNotifications).catch(console.error).finally(() => setLoading(false));
  }, []);

  const markAllRead = async () => {
    await api.markAllRead().catch(console.error);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleClick = (n) => {
    setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x));
    if (n.link) navigate(n.link);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      <Topbar activePage="notifications" />
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[32px] font-black text-[#1b1c1c] flex items-center gap-3">
              <span className="material-symbols-outlined text-[#ff6b1a] text-[32px]">notifications</span>
              Notifications
            </h1>
            {unreadCount > 0 && <p className="text-[14px] text-gray-400 mt-1">{unreadCount} unread</p>}
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-[#ff6b1a] font-bold text-[13px] hover:underline">Mark all read</button>
          )}
        </div>
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#ff6b1a] border-t-transparent rounded-full animate-spin" /></div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <span className="material-symbols-outlined text-[48px] mb-3 block">notifications_none</span>
            <p className="font-semibold">No notifications yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {notifications.map((n) => {
              const style = iconMap[n.type] || { icon: 'info', bg: 'bg-gray-100', color: 'text-gray-600' };
              return (
                <button key={n.id} onClick={() => handleClick(n)}
                  className={`w-full flex items-start gap-4 p-4 rounded-2xl border transition-all text-left ${!n.is_read ? 'bg-white border-[#ff6b1a]/20 shadow-sm' : 'bg-white border-gray-100'}`}>
                  <div className={`${style.bg} p-2.5 rounded-xl flex-shrink-0`}>
                    <span className={`material-symbols-outlined text-[22px] ${style.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{style.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[14px] text-[#1b1c1c]">{n.title}</p>
                    <p className="text-[13px] text-gray-500 mt-0.5 line-clamp-2">{n.description}</p>
                    <p className="text-[11px] text-gray-400 mt-1">{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</p>
                  </div>
                  {!n.is_read && <div className="w-2 h-2 bg-[#ff6b1a] rounded-full flex-shrink-0 mt-2" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
