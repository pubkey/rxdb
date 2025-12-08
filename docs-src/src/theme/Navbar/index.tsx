import React, { useEffect, useState, type ReactNode } from 'react';
import NavbarLayout from '@theme/Navbar/Layout';
import NavbarContent from '@theme/Navbar/Content';


const styles = {
  scrollIndicator: {
    position: 'fixed',
    left: 0,
    zIndex: 10,
    height: 2,
    width: '100vw',
    backgroundColor: 'var(--color-top)',
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    transformOrigin: 'left center',
    willChange: 'transform',
    backfaceVisibility: 'hidden',
    contain: 'layout',
  },
};

export default function Navbar(): ReactNode {
  const [scrollPosition, setScrollPosition] = useState(0); // number 0..100

  useEffect(() => {
    const handleScroll = () => setScrollPosition(currentScrollPercentage());
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // initialize on mount
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <NavbarLayout>
      <NavbarContent />
      <div
        className="navbar-line"
        style={{
          ...styles.scrollIndicator,
          transform: `scaleX(${Math.max(0, Math.min(1, scrollPosition / 100))})`,
        } as any}
      />

    </NavbarLayout>
  );
}

/** @link https://stackoverflow.com/a/2387222 */
function currentScrollPercentage() {
  const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
  const bodyScrollTop = document.body.scrollTop;
  const top = scrollTop + bodyScrollTop;
  const max = scrollHeight - clientHeight;
  return max > 0 ? (top / max) * 100 : 0;
}
