import React from 'react';
import {
  useState,
  useEffect
} from 'react';
import Navbar from '@theme-original/Navbar';

export default function NavbarWrapper(props) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const handleScroll = () => {
    const position = currentScrollPercentage().toFixed(2);
    setScrollPosition(position);
  };

  useEffect(() => {
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
      borderTopRightRadius: 2,
      borderBottomRightRadius: 2,
    }
  };
  return (
    <>
      <Navbar {...props} />
      {<div
        className='navbar-line'
        style={{ ...styles.scrollIndicator, ...{ width: scrollPosition + '%' } }}
      ></div>}
    </>
  );
}

/**
 * @link https://stackoverflow.com/a/2387222
 */
function currentScrollPercentage() {
  return ((document.documentElement.scrollTop + document.body.scrollTop) / (document.documentElement.scrollHeight - document.documentElement.clientHeight) * 100);
}
