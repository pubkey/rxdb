import { ComponentType, CSSProperties, SVGProps, useState } from 'react';

/**
 * Since the icons are only rendered once on the landingpage,
 * we directly put them into the html for faster initial load.
 */
import ReactIcon from '@site/static/files/icons/react.svg';
// import AngularIcon from '@site/static/files/icons/angular.svg';
import VueIcon from '@site/static/files/icons/vuejs.svg';
import SvelteIcon from '@site/static/files/icons/svelte.svg';
import NodeIcon from '@site/static/files/icons/nodejs.svg';
import DenoIcon from '@site/static/files/icons/deno.svg';
import ElectronIcon from '@site/static/files/icons/electron.svg';
import IonicIcon from '@site/static/files/icons/ionic.svg';
import NativeScriptIcon from '@site/static/files/icons/nativescript.svg';
import FlutterIcon from '@site/static/files/icons/flutter.svg';
import CapacitorIcon from '@site/static/files/icons/capacitor.svg';
// import NextJSIcon from '@site/static/files/icons/nextjs.svg';
import ExpoIcon from '@site/static/files/icons/expo.svg';

type BaseRow = {
  label: string;
  href?: string;
  invert?: boolean;
};

type RowWithComponent = BaseRow & {
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  iconUrl?: never;
};
type RowWithImage = BaseRow & {
  iconUrl: string;
  Icon?: never;
};
type Row = RowWithComponent | RowWithImage;

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
    // TIP: if you want fixed size for all, you can uncomment:
    // width: 40,
    // height: 40,
  },
};

/**
 * TODO not all icons can be inlined svgs because some break.
 * Fix that by fixing the svg itself.
 */
const rows: Row[] = [
  { Icon: ReactIcon, href: '/articles/react-database.html', label: 'React' },
  { iconUrl: '/files/icons/angular.svg', href: '/articles/angular-database.html', label: 'Angular' },
  { Icon: VueIcon, href: '/articles/vue-database.html', label: 'Vue.js' },
  { Icon: SvelteIcon, href: 'https://github.com/pubkey/rxdb/tree/master/examples/svelte', label: 'Svelte' },
  { Icon: NodeIcon, href: '/nodejs-database.html', label: 'Node.js' },
  { Icon: DenoIcon, href: '/rx-storage-denokv.html', label: 'Deno', invert: true },
  { Icon: ElectronIcon, href: 'https://github.com/pubkey/rxdb/tree/master/examples/electron', label: 'Electron' },
  { Icon: IonicIcon, href: '/articles/ionic-database.html', label: 'Ionic' },
  { Icon: NativeScriptIcon, href: 'https://github.com/herefishyfish/rxdb-nativescript', label: 'NativeScript' },
  { Icon: ReactIcon, href: 'https://github.com/pubkey/rxdb/tree/master/examples/react-native', label: 'React Native' },
  { Icon: ExpoIcon, href: '/rx-storage-sqlite.html', label: 'Expo', invert: true },
  { Icon: FlutterIcon, href: 'https://github.com/pubkey/rxdb/tree/master/examples/flutter', label: 'Flutter' },
  { Icon: CapacitorIcon, href: '/capacitor-database.html#rxdb', label: 'Capacitor' },
  // { Icon: NextJSIcon, label: 'Next.js', invert: true },
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
      <div className="font-20-14 text-center-mobile" style={styles.text}>
        Use RxDB with{' '}
        <br />
        <span>{text}</span>
      </div>

      <div
        style={{ flex: 'auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}
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
                const interactive = Boolean(item.href);

                const commonStyle: CSSProperties = {
                  ...styles.icon,
                  cursor: interactive ? 'pointer' : 'default',
                  filter: hovered === item.label ? hoverFilter : defaultFilter,
                  opacity: hovered === item.label ? 1 : (styles.icon.opacity as number),
                };

                const content =
                  'Icon' in item ? (
                    <item.Icon
                      className="framework-icon"
                      aria-label={item.label}
                      style={commonStyle}
                      onMouseEnter={() => setHovered(item.label)}
                      onMouseLeave={() => setHovered(null)}
                      // Helpful for inconsistent SVGs
                      preserveAspectRatio="xMidYMid meet"
                    />
                  ) : (
                    <img
                      className="framework-icon"
                      src={item.iconUrl}
                      alt={item.label}
                      loading="lazy"
                      style={commonStyle}
                      onMouseEnter={() => setHovered(item.label)}
                      onMouseLeave={() => setHovered(null)}
                    />
                  );

                const key = i + '_' + i2;

                return item.href ? (
                  <a key={key} href={item.href} target="_blank" rel="noopener noreferrer">
                    {content}
                  </a>
                ) : (
                  <div key={key}>{content}</div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
