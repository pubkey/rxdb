import React from 'react';
// import {
//   useState,
//   useEffect
// } from 'react';
import Navbar from '@theme-original/Navbar';

export default function NavbarWrapper(props) {


//   const styles = {
//     scrollIndicator: {
//       position: 'fixed',
//       display: 'block',
//       zIndex: 10,
//       height: 3,
//       backgroundColor: 'var(--color-top)',
//       top: 60,
//       borderTopRightRadius: 2,
//       borderBottomRightRadius: 2,
//     }
//   };



//   const [scrollPosition, setScrollPosition] = useState(0);
//   const handleScroll = () => {
//     const position = currentScrollPercentage().toFixed(2);
//     setScrollPosition(position);
//   };

//   useEffect(() => {
//     window.addEventListener('scroll', handleScroll, { passive: true });

//     return () => {
//       window.removeEventListener('scroll', handleScroll);
//     };
//   }, []);


  return (
    <>
      <Navbar {...props} />
      {/* <div style={{ ...styles.scrollIndicator, ...{ width: scrollPosition + '%' } }}></div> */}
    </>
  );
}

/**
 * @link https://stackoverflow.com/a/2387222
 */
// function currentScrollPercentage() {
//   return ((document.documentElement.scrollTop + document.body.scrollTop) / (document.documentElement.scrollHeight - document.documentElement.clientHeight) * 100);
// }
