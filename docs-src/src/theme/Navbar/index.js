import React, { useState, useEffect } from 'react';
import Navbar from '@theme-original/Navbar';

export default function NavbarWrapper(props) {
  const [scrollPosition, setScrollPosition] = useState(0); // number 0..100

  useEffect(() => {
    const handleScroll = () => setScrollPosition(currentScrollPercentage());
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // initialize on mount
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const styles = {
    scrollIndicator: {
      position: 'fixed',
      left: 0,
      zIndex: 10,
      height: 1.5,
      width: '100vw',                 // fixed visual width
      backgroundColor: 'var(--color-top)',
      borderTopRightRadius: 2,
      borderBottomRightRadius: 2,
      transformOrigin: 'left center', // scale from left
      willChange: 'transform',
      backfaceVisibility: 'hidden',
      contain: 'layout',              // isolate layout work
    },
  };

  return (
    <>
      <Navbar {...props} />
      <div
        className="navbar-line"
        style={{
          ...styles.scrollIndicator,
          transform: `scaleX(${Math.max(0, Math.min(1, scrollPosition / 100))})`,
        }}
      />
    </>
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
