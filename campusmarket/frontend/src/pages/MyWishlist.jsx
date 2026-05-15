import React from 'react';
import { Navigate } from 'react-router-dom';

// MyWishlist redirects to /wishlist (the new full implementation)
const MyWishlist = () => <Navigate to="/wishlist" replace />;

export default MyWishlist;
