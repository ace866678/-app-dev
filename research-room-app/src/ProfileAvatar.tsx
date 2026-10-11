import type { ReactNode } from 'react';

export const AVATAR_OPTIONS = [
  { id: 'orbit', name: 'Orbit', color: '#6558D9' },
  { id: 'bloom', name: 'Bloom', color: '#E86C8C' },
  { id: 'prism', name: 'Prism', color: '#147F89' },
  { id: 'wave', name: 'Wave', color: '#3978D4' },
  { id: 'spark', name: 'Spark', color: '#E6B944' },
  { id: 'leaf', name: 'Leaf', color: '#28966C' },
  { id: 'pixel', name: 'Pixel', color: '#9A61D7' },
  { id: 'comet', name: 'Comet', color: '#313A77' },
  { id: 'mosaic', name: 'Mosaic', color: '#E47B43' },
  { id: 'halo', name: 'Halo', color: '#188F9B' },
] as const;

type AvatarProps = { value?: string | null; name?: string; className?: string };

const artwork = (id: string): ReactNode => {
  switch (id) {
    case 'orbit':
      return <><circle cx="32" cy="32" r="16" fill="none" stroke="#FFFFFF" strokeWidth="4" /><circle cx="32" cy="32" r="6" fill="#F7D77A" /><circle cx="48" cy="17" r="5" fill="#FF9E8C" /></>;
    case 'bloom':
      return <><g fill="#FFE8EE"><circle cx="32" cy="19" r="8" /><circle cx="45" cy="27" r="8" /><circle cx="40" cy="42" r="8" /><circle cx="24" cy="42" r="8" /><circle cx="19" cy="27" r="8" /></g><circle cx="32" cy="31" r="8" fill="#FFD46C" /><circle cx="29" cy="29" r="2" fill="#A94368" /></>;
    case 'prism':
      return <><path d="M32 11 51 25 44 49 20 49 13 25Z" fill="#E9FFFA" /><path d="M32 11 32 49 20 49 13 25Z" fill="#95E8DA" /><path d="M32 11 51 25 32 31Z" fill="#FFFFFF" /><path d="M32 31 51 25 44 49 32 49Z" fill="#6ECFC9" /><path d="M13 25 32 31 20 49Z" fill="#BBF3E8" /></>;
    case 'wave':
      return <><path d="M10 25C18 16 25 16 33 25S48 34 56 25" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" /><path d="M8 37C16 28 24 28 32 37S48 46 56 37" fill="none" stroke="#AEEAFF" strokeWidth="5" strokeLinecap="round" /><circle cx="47" cy="16" r="4" fill="#FFD86D" /></>;
    case 'spark':
      return <><path d="M32 9 37 24 53 18 43 32 55 42 39 41 32 56 26 41 10 44 21 32 11 20 27 24Z" fill="#FFF7D7" /><circle cx="32" cy="32" r="6" fill="#8A59D1" /><circle cx="49" cy="13" r="3" fill="#FFFFFF" /></>;
    case 'leaf':
      return <><path d="M16 45C15 24 31 13 50 14 50 33 40 51 16 45Z" fill="#D3FFE7" /><path d="M17 47C26 37 34 30 46 20" fill="none" stroke="#16875F" strokeWidth="3.5" strokeLinecap="round" /><path d="M28 37 27 28M35 31 43 32" fill="none" stroke="#16875F" strokeWidth="2.5" strokeLinecap="round" /><circle cx="15" cy="17" r="4" fill="#F7D878" /></>;
    case 'pixel':
      return <><rect x="14" y="14" width="16" height="16" rx="4" fill="#FFFFFF" /><rect x="34" y="14" width="16" height="16" rx="4" fill="#FFC4DD" /><rect x="14" y="34" width="16" height="16" rx="4" fill="#DCC7FF" /><rect x="34" y="34" width="16" height="16" rx="4" fill="#FFFFFF" /><circle cx="22" cy="22" r="3" fill="#8C57C7" /><circle cx="42" cy="42" r="3" fill="#8C57C7" /></>;
    case 'comet':
      return <><circle cx="27" cy="28" r="14" fill="#FFFFFF" /><circle cx="34" cy="23" r="13" fill="#313A77" /><path d="M16 43 30 35" stroke="#A8B7FF" strokeWidth="4" strokeLinecap="round" /><path d="M12 48 23 42" stroke="#F4B9FF" strokeWidth="3" strokeLinecap="round" /><circle cx="45" cy="43" r="6" fill="#FFAA79" /><circle cx="50" cy="16" r="2.5" fill="#FFFFFF" /></>;
    case 'mosaic':
      return <><rect x="14" y="14" width="17" height="17" rx="4" fill="#FFFFFF" /><circle cx="42" cy="22" r="9" fill="#FFE4A1" /><path d="M14 38 28 34 31 50 14 50Z" fill="#FFD2B4" /><rect x="35" y="34" width="16" height="16" rx="5" fill="#FFFFFF" /><circle cx="23" cy="22" r="3" fill="#D76C43" /></>;
    case 'halo':
      return <><ellipse cx="32" cy="24" rx="18" ry="9" fill="none" stroke="#C7FFF1" strokeWidth="4" transform="rotate(-18 32 24)" /><circle cx="32" cy="34" r="13" fill="#FFFFFF" /><circle cx="32" cy="34" r="7" fill="#78DACE" /><path d="M27 34 31 38 38 29" fill="none" stroke="#147B86" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></>;
    default:
      return <><circle cx="32" cy="32" r="16" fill="none" stroke="#FFFFFF" strokeWidth="4" /><circle cx="32" cy="32" r="6" fill="#F7D77A" /></>;
  }
};

export function AvatarArt({ value, name = 'Researcher', className = '' }: AvatarProps) {
  const shapeId = value?.startsWith('shape-avatar:') ? value.slice('shape-avatar:'.length) : '';
  const option = AVATAR_OPTIONS.find(item => item.id === shapeId);
  const classes = ['avatar-art', className].filter(Boolean).join(' ');
  if (option) {
    return <svg className={classes} viewBox="0 0 64 64" role="img" aria-label={name + ' icon avatar'} xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="32" fill={option.color} />
      {artwork(option.id)}
    </svg>;
  }
  if (value) return <img className={classes} src={value} alt={name + ' profile'} referrerPolicy="no-referrer" />;
  return <span className={classes + ' avatar-art-fallback'} aria-label={name + ' initials'}>{(name || '?').slice(0, 1).toUpperCase()}</span>;
}
