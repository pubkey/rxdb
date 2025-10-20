import { CSSProperties, useState } from 'react';

type Row = {
  icon: string;
  url?: string;
  label: string;
  invert?: boolean;
};

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '2rem',
    paddingLeft: 31,
    paddingRight: 31,
  },
  text: {
    fontWeight: 600,
    whiteSpace: 'pre-line',
    minWidth: '210px',
  },
  displayRow: {
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
    flex: '1 1 auto',
  },
  iconsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'nowrap',
    flexShrink: 0,
  },
  icon: {
    objectFit: 'contain',
    opacity: 0.7,
    filter: 'grayscale(100%) brightness(1.8)',
  },
};

const rows: Row[] = [
  { icon: '/files/icons/react.svg', url: '/articles/react-database.html', label: 'React' },
  { icon: '/files/icons/angular.svg', url: '/articles/angular-database.html', label: 'Angular' },
  { icon: '/files/icons/vuejs.svg', url: '/articles/vue-database.html', label: 'Vue.js' },
  { icon: '/files/icons/svelte.svg', url: 'https://github.com/pubkey/rxdb/tree/master/examples/svelte', label: 'Svelte' },
  { icon: '/files/icons/nodejs.svg', url: '/nodejs-database.html', label: 'Node.js' },
  { icon: '/files/icons/deno.svg', url: '/rx-storage-denokv.html', label: 'Deno', invert: true },
  { icon: '/files/icons/electron.svg', url: 'https://github.com/pubkey/rxdb/tree/master/examples/electron', label: 'Electron' },
  { icon: '/files/icons/ionic.svg', url: '/articles/ionic-database.html', label: 'Ionic' },
  { icon: '/files/icons/nativescript.svg', url: 'https://github.com/herefishyfish/rxdb-nativescript', label: 'NativeScript' },
  { icon: '/files/icons/react.svg', url: 'https://github.com/pubkey/rxdb/tree/master/examples/react-native', label: 'React Native' },
  { icon: '/files/icons/flutter.svg', url: 'https://github.com/pubkey/rxdb/tree/master/examples/flutter', label: 'Flutter' },
  { icon: '/files/icons/capacitor.svg', url: '/capacitor-database.html#rxdb', label: 'Capacitor' },
  { icon: '/files/icons/nextjs.svg', label: 'Next.js', invert: true },
];

export function HeroRuntimes() {
  const [hovered, setHovered] = useState<string | null>(null);

  const text = hovered !== null ? hovered : 'these Frameworks';

  const displayRows = (() => {
    const middle = Math.ceil(rows.length / 2);
    const firstHalf = rows.slice(0, middle);
    const secondHalf = rows.slice(middle);
    return [firstHalf, secondHalf];
  })();

  return (
    <div style={styles.container} className="column-mobile padding-top-64-46">
      <div className="font-20-14" style={styles.text}>
        Use RxDB with{' '}
        <br className="hide-mobile" />
        <span>{text}</span>
      </div>
      <div
        style={{
          flex: 'auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
        className="gap-24-20"
      >
        {displayRows.map((displayRow, i) => (
          <div style={styles.displayRow} key={'drow_' + i}>
            <div style={styles.iconsRow} className="gap-24-20">
              {displayRow.map((item, i2) => {
                const defaultFilter = item.invert
                  ? 'grayscale(100%) brightness(1.8) invert(1)'
                  : 'grayscale(100%) brightness(1.8)';

                const hoverFilter = item.invert ? defaultFilter : 'none';

                const img = (
                  <img
                    className="framework-icon"
                    src={item.icon}
                    loading="lazy"
                    alt={item.label}
                    style={{
                      ...styles.icon,
                      cursor: item.url ? 'pointer' : 'default', // 👈 only pointer when URL exists
                      filter: hovered === item.label ? hoverFilter : defaultFilter,
                      opacity: hovered === item.label ? 1 : styles.icon.opacity,
                    }}
                    onMouseEnter={() => setHovered(item.label)}
                    onMouseLeave={() => setHovered(null)}
                  />
                );

                return item.url ? (
                  <a
                    key={i + '_' + i2}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {img}
                  </a>
                ) : (
                  <div key={i + '_' + i2}>{img}</div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
