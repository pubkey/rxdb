import React from 'react';
import {
  useState,
  useEffect
} from 'react';
import Navbar from '@theme-original/Navbar';

export default function NavbarWrapper(props) {
  const [isHomepage, setIsHomepage] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const handleScroll = () => {
    const position = currentScrollPercentage().toFixed(2);
    setScrollPosition(position);
  };

  useEffect(() => {
    setIsHomepage(!location.pathname.includes('.html'));

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const styles = {
    scrollIndicator: {
      position: 'fixed',
      display: 'block',
      zIndex: 10,
      height: 1.5,
      backgroundColor: 'var(--color-top)',
      top: 62.5,
      borderTopRightRadius: 2,
      borderBottomRightRadius: 2,
      maxWidth: isHomepage ? 'none' : '88rem',
      left: isHomepage ? 0 : 'calc((100% - 88rem) / 2)',
    }
  };
  return (
    <>
      <Navbar {...props} />
      {<div style={{ ...styles.scrollIndicator, ...{ width: scrollPosition + '%' } }}></div>}
    </>
  );
}

/**
 * @link https://stackoverflow.com/a/2387222
 */
function currentScrollPercentage() {
  return ((document.documentElement.scrollTop + document.body.scrollTop) / (document.documentElement.scrollHeight - document.documentElement.clientHeight) * 100);
}
