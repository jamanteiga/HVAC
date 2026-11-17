import { create } from 'zustand';
import { webLightTheme, webDarkTheme, Theme } from '@fluentui/react-components';
import { themeQuartz, colorSchemeDark } from 'ag-grid-community';

export type ThemeId = 'claro' | 'azulado' | 'gris' | 'oscuro';
export interface Palette { name: string; dark: boolean; bg: string; surface: string; nav: string; border: string; border2: string; hdr: string; text: string; subtle: string; hover: string; selected: string; best: string; accent: string }

export const PALETTES: Record<ThemeId, Palette> = {
  claro:   { name: 'Claro (Windows 11)', dark: false, bg: '#f3f3f3', surface: '#ffffff', nav: '#eef0f3', border: '#e0e0e0', border2: '#f0f0f0', hdr: '#f3f3f3', text: '#1a1a1a', subtle: '#616161', hover: '#f5f9fd', selected: '#e5f1fb', best: '#e6f4ea', accent: '#0067c0' },
  azulado: { name: 'Azulado', dark: false, bg: '#e4edf8', surface: '#f6f9fd', nav: '#d5e3f3', border: '#c3d5ea', border2: '#dbe6f3', hdr: '#dbe7f5', text: '#14213d', subtle: '#4a5f7a', hover: '#e9f1fb', selected: '#cfe2f7', best: '#dcefe3', accent: '#0f5fb5' },
  gris:    { name: 'Gris claro', dark: false, bg: '#e3e3e3', surface: '#f2f2f2', nav: '#d6d6d6', border: '#c8c8c8', border2: '#dcdcdc', hdr: '#dedede', text: '#1f1f1f', subtle: '#5a5a5a', hover: '#ebebeb', selected: '#d4dde8', best: '#dcebdf', accent: '#0067c0' },
  oscuro:  { name: 'Oscuro', dark: true, bg: '#1f1f1f', surface: '#2b2b2b', nav: '#181818', border: '#444444', border2: '#363636', hdr: '#333333', text: '#f0f0f0', subtle: '#a8a8a8', hover: '#353535', selected: '#1d3a56', best: '#1f3d2a', accent: '#60a5fa' },
};

const KEY = 'hvac.theme';
const initial = (): ThemeId => { try { const t = localStorage.getItem(KEY) as ThemeId; if (t && PALETTES[t]) return t; } catch { /* */ } return 'claro'; };
export const useUi = create<{ theme: ThemeId; setTheme: (t: ThemeId) => void }>(set => ({
  theme: initial(),
  setTheme: t => { try { localStorage.setItem(KEY, t); } catch { /* */ } set({ theme: t }); },
}));

export function applyPalette(id: ThemeId) {
  const p = PALETTES[id], r = document.documentElement.style;
  r.setProperty('--bg', p.bg); r.setProperty('--surface', p.surface); r.setProperty('--nav', p.nav); r.setProperty('--border', p.border); r.setProperty('--border2', p.border2);
  r.setProperty('--hdr', p.hdr); r.setProperty('--text', p.text); r.setProperty('--subtle', p.subtle); r.setProperty('--best', p.best); r.setProperty('--accent', p.accent); r.setProperty('--over', p.dark ? '#ff8a80' : '#c42b1c');
  document.body.style.background = p.bg; document.body.style.color = p.text; r.colorScheme = p.dark ? 'dark' : 'light';
}

export function fluentTheme(id: ThemeId): Theme {
  const p = PALETTES[id]; const base = p.dark ? webDarkTheme : webLightTheme;
  return { ...base,
    colorNeutralBackground1: p.surface, colorNeutralBackground1Hover: p.hover, colorNeutralBackground1Pressed: p.selected, colorNeutralBackground1Selected: p.selected,
    colorNeutralBackground2: p.bg, colorNeutralBackground3: p.nav, colorSubtleBackgroundHover: p.hover, colorSubtleBackgroundPressed: p.selected,
    colorNeutralForeground1: p.text, colorNeutralForeground2: p.text, colorNeutralForeground3: p.subtle,
    colorNeutralStroke1: p.border, colorNeutralStroke2: p.border, colorNeutralStrokeAccessible: p.subtle,
  };
}

export function gridThemeFor(id: ThemeId) {
  const p = PALETTES[id];
  const base = p.dark ? themeQuartz.withPart(colorSchemeDark) : themeQuartz;
  return base.withParams({
    accentColor: p.accent, fontFamily: '"Segoe UI Variable","Segoe UI",system-ui,sans-serif', fontSize: 12.5,
    backgroundColor: p.surface, foregroundColor: p.text, headerBackgroundColor: p.hdr, headerTextColor: p.text, headerFontWeight: 600,
    borderColor: p.border, borderRadius: 6, rowHoverColor: p.hover, selectedRowBackgroundColor: p.selected, spacing: 5,
  });
}
