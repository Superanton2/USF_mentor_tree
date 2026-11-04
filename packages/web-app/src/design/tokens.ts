/** Design tokens (SPEC 8). The only place where interface colors are written down. */
export const designTokens = {
  colorBackground: '#000000',
  colorSurface: '#141414',
  colorBorder: '#2A2A2A',
  colorTextPrimary: '#FFFFFF',
  colorTextSecondary: '#A3A3A3',
  colorNode: '#8C8C8C',
  colorNodeHover: '#C4C4C4',
  colorLink: '#3A3A3A',
  colorLinkHover: '#7A7A7A',
  colorHighlight: '#FFD600',
  dimmedOpacity: 0.12,
} as const;

const CSS_VARIABLE_BY_TOKEN: Record<string, string> = {
  colorBackground: '--color-background',
  colorSurface: '--color-surface',
  colorBorder: '--color-border',
  colorTextPrimary: '--color-text-primary',
  colorTextSecondary: '--color-text-secondary',
  colorHighlight: '--color-highlight',
};

/**
 * Exposes tokens to stylesheets as CSS variables. Done through the CSSOM instead of inline
 * `style` attributes because the CSP forbids inline styles (SPEC 12.5).
 */
export function applyDesignTokensToDocument(rootElement: HTMLElement): void {
  for (const [token, cssVariable] of Object.entries(CSS_VARIABLE_BY_TOKEN)) {
    rootElement.style.setProperty(
      cssVariable,
      designTokens[token as keyof typeof designTokens].toString(),
    );
  }
}
