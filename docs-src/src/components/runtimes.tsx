import { CSSProperties, useState } from "react";

type Row = {
  icon: string;
  url?: string;
  label: string;
  invert?: boolean;
};

const styles: Record<string, CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "2rem",
    paddingTop: 64,
    paddingLeft: 31,
    paddingRight: 31
  },
  text: {
    fontSize: "1.125rem",
    fontWeight: 600,
    whiteSpace: "pre-line",
    minWidth: "200px",
  },
  iconsRow: {
    display: "flex",
    alignItems: "center",
    gap: "1.5rem",
    flexWrap: "wrap",
  },
  icon: {
    width: "40px",
    height: "40px",
    objectFit: "contain",
    opacity: 0.7,
    filter: "grayscale(100%) brightness(1.8)",
    transition: "filter 0.2s ease-in-out, opacity 0.2s ease-in-out",
    cursor: "pointer"
  },
};

const rows: Row[] = [
  { icon: "/files/icons/electron.svg", url: "/electron-database.html#rxdb", label: "Electron" },
  { icon: "/files/icons/vuejs.svg", url: "/articles/vue-database.html", label: "Vue.js" },
  { icon: "/files/icons/ionic.svg", url: "/articles/ionic-storage.html", label: "Ionic" },
  { icon: "/files/icons/nativescript.svg", url: "https://github.com/herefishyfish/rxdb-nativescript", label: "NativeScript" },
  { icon: "/files/icons/react.svg", url: "/react-native-database.html#rxdb", label: "React Native" },
  { icon: "/files/icons/nextjs.svg", label: "Next.js", invert: true },
  { icon: "/files/icons/flutter.svg", url: "https://github.com/pubkey/rxdb/tree/master/examples/flutter", label: "Flutter" },
  { icon: "/files/icons/angular.svg", url: "https://github.com/pubkey/rxdb/tree/master/examples/angular", label: "Angular" },
  { icon: "/files/icons/capacitor.svg", url: "https://rxdb.info/capacitor-database.html#rxdb", label: "Capacitor" },
  { icon: "/files/icons/deno.svg", url: "https://rxdb.info/rx-storage-denokv.html", label: "Deno", invert: true },
  { icon: "/files/icons/nodejs.svg", url: "https://github.com/pubkey/rxdb/tree/master/examples/node", label: "Node.js" },
  { icon: "/files/icons/react.svg", url: "https://github.com/pubkey/rxdb/tree/master/examples/react", label: "React" },
  { icon: "/files/icons/svelte.svg", url: "https://github.com/pubkey/rxdb/tree/master/examples/svelte", label: "Svelte" },
];

// Fade-in keyframes
const fadeIn = `
  @keyframes fadeIn {
    from { opacity: 0 }
    to { opacity: 1 }
  }
`;
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(fadeIn, styleSheet.cssRules.length);

export function HeroRuntimes() {
  const [hovered, setHovered] = useState<number | null>(null);
  const [animationKey, setAnimationKey] = useState(0);

  const text = hovered !== null ? rows[hovered].label : "these Frameworks";

  return (
    <div style={styles.container} className='column-mobile'>
      <div
        style={{
          ...styles.text,
        }}
      >
        Use RxDB with{' '}
        <span
          key={animationKey + text} // force re-render for animation
          style={{
            animation: "fadeIn 0.2s ease-in"
          }}

        >{text}</span>
      </div>
      <div style={styles.iconsRow}>
        {rows.map((item, i) => {
          const defaultFilter = item.invert
            ? "grayscale(100%) brightness(1.8) invert(1)"
            : "grayscale(100%) brightness(1.8)";

          const hoverFilter = item.invert ? defaultFilter : "none";

          return (
            <a
              key={i}
              href={item.url}
              onMouseEnter={() => {
                setHovered(i);
                setAnimationKey(prev => prev + 1); // trigger fade-in
              }}
              onMouseLeave={() => {
                setHovered(null);
                setAnimationKey(prev => prev + 1);
              }}
              target="_blank"
            >
              <img
                src={item.icon}
                loading="lazy"
                alt={item.label}
                style={{
                  ...styles.icon,
                  filter: hovered === i ? hoverFilter : defaultFilter,
                  opacity: hovered === i && !item.invert ? 1 : styles.icon.opacity,
                }}
              />
            </a>
          );
        })}
      </div>
    </div>
  );
}
