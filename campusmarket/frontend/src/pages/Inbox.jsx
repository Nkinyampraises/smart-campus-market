import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Inbox just redirects to the full WhatsApp-style Chat page
const Inbox = () => {
  const navigate = useNavigate();
  useEffect(() => { navigate('/chat/new', { replace: true }); }, []);
  return null;
};

export default Inbox;
