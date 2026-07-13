import React from 'react';
import AdminNavbar from './AdminNavbar';
import AdminSidebar from './AdminSidebar';

const AdminLayout = ({ children }) => (
  <div className="min-h-screen bg-[#f8f9fa]">
    <AdminNavbar />
    <div className="flex">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-auto min-w-0">
        {children}
      </main>
    </div>
  </div>
);

export default AdminLayout;
