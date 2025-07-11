// anime.js v3.2.1 CDN loader for local dev
// If you want to use a local copy, download from https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js
// For now, this will inject the CDN script if not present
(function(){
  if (!window.anime) {
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js';
    s.async = true;
    document.head.appendChild(s);
  }
})();
