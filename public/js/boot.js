'use strict';
/* starts the app; kept in a file (not inline in index.html) so the site can forbid inline scripts */
boot();
// the web font comes after the first screen: with no or slow internet the app still shows at once, in the phone's own font
(()=>{const l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@500;700;800&display=swap';document.head.appendChild(l);})();
