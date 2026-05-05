# CampusTrade Frontend

A modern React frontend for the CampusTrade campus marketplace application, built with Tailwind CSS and featuring authentication pages.

## 📋 Prerequisites

- Node.js 16+ 
- npm or yarn package manager

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
# or
yarn install
```

### 2. Required Packages

Make sure you have the following packages installed:

```bash
npm install react react-dom react-router-dom
npm install -D tailwindcss postcss autoprefixer
npm install -D @tailwindcss/forms
```

### 3. Set Up Tailwind CSS

If not already configured, initialize Tailwind:

```bash
npx tailwindcss init -p
```

The `tailwind.config.js` file in this project is already configured with the CampusTrade design system.

### 4. Google Fonts & Material Symbols

Add this to your `public/index.html` head section:

```html
<link href="https://fonts.googleapis.com/css2?family=Epilogue:wght@400;600;700;800;900&family=Manrope:wght@400;500;700&display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>

<style>
  .material-symbols-outlined {
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  }
</style>
```

## 📁 Project Structure

```
src/
├── pages/
│   ├── Login.jsx          # Login page component
│   └── SignUp.jsx         # Sign up page component
├── config/
│   └── theme.js           # Color, typography, and spacing constants
├── App.jsx                # Main app with routing setup
├── App.css                # Tailwind CSS directives
└── index.jsx              # Entry point
```

## 🎨 Design System

### Colors

All colors are defined in `src/config/theme.js`:

- **Primary**: `#ff6b1a` (Orange)
- **Secondary**: `#5c5f60` (Gray)
- **Tertiary**: `#006c46` (Green)
- **Error**: `#ba1a1a` (Red)
- **Surface**: `#fcf9f8` (Off-white)

### Typography

- **Headings**: Epilogue font family
- **Body**: Manrope font family

Font sizes:
- H1: 48px (Bold)
- H2: 32px (Bold)
- H3: 24px (Semibold)
- Body-lg: 18px
- Body-md: 16px
- Body-sm: 14px
- Label-caps: 12px

## 🔧 Development

### Start Development Server

```bash
npm run dev
# or
yarn dev
```

### Build for Production

```bash
npm run build
# or
yarn build
```

## 📄 Components

### Login Page

- Email and password input fields
- "Remember me" checkbox
- Forgot password link
- Google OAuth button
- Sign Up button (located in the right panel)
- Features showcase on desktop view

**Location**: `src/pages/Login.jsx`

### Sign Up Page

- First name, last name fields
- Email input
- University selection
- Password confirmation
- Terms and conditions agreement
- Google OAuth button
- Login link

**Location**: `src/pages/SignUp.jsx`

## 🔐 Authentication Integration

Both Login and SignUp components are prepared for backend integration:

### Login Component

Update the `handleSubmit` function to connect to your auth service:

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  // Replace with actual API call
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  // Handle response
};
```

### Sign Up Component

Update the `handleSubmit` function:

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  // Replace with actual API call
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });
  // Handle response
};
```

### Google OAuth Integration

For Google OAuth, update the `handleGoogleLogin` and `handleGoogleSignUp` functions:

```javascript
const handleGoogleLogin = async () => {
  // Implement Google OAuth flow using google-auth-library or react-google-auth
};
```

## 📱 Responsive Design

Both pages are fully responsive:

- **Mobile**: Single column layout
- **Tablet & Desktop**: Two-column layout with features panel

## 🎯 Features

✅ **Modern Design**: Clean, professional UI following Material Design 3 principles
✅ **Responsive**: Works seamlessly on all devices
✅ **Accessibility**: Proper labels, ARIA attributes, and keyboard navigation
✅ **Form Validation**: Client-side validation on inputs
✅ **State Management**: React hooks for form state
✅ **Error Handling**: User-friendly error messages
✅ **Loading States**: Visual feedback during submission
✅ **Routing**: React Router for page navigation

## 🚀 Next Steps

1. Connect login/signup to your backend authentication service
2. Implement Google OAuth configuration
3. Add password reset functionality
4. Set up protected routes middleware
5. Add loading and error states with toast notifications
6. Implement form validation improvements

## 📚 Resources

- [React Documentation](https://react.dev)
- [React Router](https://reactrouter.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Material Symbols](https://fonts.google.com/icons)

## 📝 License

© 2024 CampusTrade. Built for students, by students.
