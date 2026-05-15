import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { mockNotifications } from '../data/mockData';

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(mockNotifications);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = (id, link) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    if (link) navigate(link);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

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
            {unreadCount > 0 && (
              <p className="text-[14px] text-gray-400 mt-1">{unreadCount} unread</p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-[#ff6b1a] font-bold text-[13px] hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {notifications.map((notif) => (
            <button
              key={notif.id}
              onClick={() => markRead(notif.id, notif.link)}
              className={`w-full text-left bg-white rounded-2xl border-2 p-5 flex gap-4 hover:shadow-md transition-all ${
                !notif.read ? 'border-l-[#ff6b1a] border-l-4 border-y-gray-100 border-r-gray-100' : 'border-gray-100'
              }`}
            >
              {/* Icon */}
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${notif.iconBg}`}>
                <span className={`material-symbols-outlined text-[22px] ${notif.iconColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                  {notif.icon}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-[14px] ${!notif.read ? 'font-bold text-[#1b1c1c]' : 'font-semibold text-gray-700'}`}>
                    {notif.title}
                  </p>
                  <span className="text-[11px] text-gray-400 flex-shrink-0">{notif.time}</span>
                </div>
                <p className="text-[13px] text-gray-500 mt-0.5 leading-relaxed">{notif.description}</p>
              </div>

              {/* Unread dot */}
              {!notif.read && (
                <div className="w-2.5 h-2.5 bg-[#ff6b1a] rounded-full flex-shrink-0 mt-2" />
              )}
            </button>
          ))}
        </div>

        {notifications.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <span className="material-symbols-outlined text-[52px] mb-3 block">notifications_off</span>
            <p className="font-bold text-[16px]">No notifications yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
