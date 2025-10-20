import { CSSProperties, Children, ReactNode } from 'react';
import { IconCheck } from './icons/check';

type FeatureListProps = {
  children: ReactNode[];
  style?: CSSProperties;   // inline styles for parent <ul>
  className?: string;      // className for parent <ul>
};

const defaultStyles: Record<string, CSSProperties> = {
  list: {
    listStyle: 'none',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: 16,
    height: 52,
  },
  icon: {
    color: '#fff',
    width: 37,
    flexShrink: 0,
    alignSelf: 'center',
  },
  text: {
    flex: 1,
    fontStyle: 'normal',
    fontWeight: 700,
    lineHeight: 'normal',
  },
  highlight: {
    color: '#e6007a',
    fontWeight: 600,
  },
};

export function CheckedList({ children, style, className }: FeatureListProps) {
  const items = Children.toArray(children);

  return (
    <ul className={className} style={{ ...defaultStyles.list, ...style }}>
      {items.map((child, i) => (
        <li key={i} style={defaultStyles.item} className='font-20-16'>
          <IconCheck style={defaultStyles.icon} className='height-26-21' />
          <div style={defaultStyles.text} className='margin-left-10-0'>{child}</div>
        </li>
      ))}
    </ul>
  );
}
