import React from 'react';
import { Navigate } from 'react-router-dom';

// Profile redirects to /my-profile
const Profile = () => <Navigate to="/my-profile" replace />;

export default Profile;
