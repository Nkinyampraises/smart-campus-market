// Brand Colors Configuration
export const colors = {
  primary: {
    container: '#ff6b1a',
    fixed: '#ffdbcd',
    fixedDim: '#ffb596',
    main: '#a43e00',
    onContainer: '#591e00',
    onFixed: '#360f00',
    onFixedVariant: '#7d2d00',
    onPrimary: '#ffffff',
  },
  secondary: {
    main: '#5c5f60',
    fixed: '#e1e3e4',
    fixedDim: '#c5c7c8',
    container: '#e1e3e4',
    onSecondary: '#ffffff',
    onFixed: '#191c1d',
    onFixedVariant: '#454748',
    onSecondaryContainer: '#626566',
  },
  tertiary: {
    container: '#00af74',
    fixed: '#54feb3',
    fixedDim: '#27e199',
    main: '#006c46',
    onTertiary: '#ffffff',
    onFixed: '#002112',
    onFixedVariant: '#005234',
    onTertiaryContainer: '#003a23',
  },
  error: {
    main: '#ba1a1a',
    container: '#ffdad6',
    onError: '#ffffff',
    onErrorContainer: '#93000a',
  },
  surface: {
    main: '#fcf9f8',
    bright: '#fcf9f8',
    container: '#f0eded',
    containerHigh: '#eae7e7',
    containerHighest: '#e4e2e1',
    containerLow: '#f6f3f2',
    containerLowest: '#ffffff',
    dim: '#dcd9d9',
    variant: '#e4e2e1',
    tint: '#a43e00',
  },
  background: '#fcf9f8',
  outline: {
    main: '#8e7165',
    variant: '#e2bfb2',
  },
  onBackground: '#1b1c1c',
  onSurface: '#1b1c1c',
  onSurfaceVariant: '#5a4137',
  inverse: {
    surface: '#303030',
    primary: '#ffb596',
    onSurface: '#f3f0f0',
  },
};

// Typography Configuration
export const typography = {
  fontFamily: {
    heading: 'Epilogue',
    body: 'Manrope',
  },
  fontSize: {
    h1: '48px',
    h2: '32px',
    h3: '24px',
    bodyLg: '18px',
    bodyMd: '16px',
    bodySm: '14px',
    labelCaps: '12px',
  },
  fontWeight: {
    light: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },
};

// Spacing Configuration
export const spacing = {
  xs: '8px',
  base: '4px',
  sm: '16px',
  md: '24px',
  lg: '48px',
  xl: '80px',
  gutter: '24px',
};

// Border Radius Configuration
export const borderRadius = {
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  full: '9999px',
};

export default {
  colors,
  typography,
  spacing,
  borderRadius,
};
