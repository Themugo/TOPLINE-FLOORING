// Start fetching the last hero image immediately on repeat visits, before the app bundle has booted.
// External file (not inline) so it satisfies the site's script-src 'self' content security policy.
try {
  var hero = localStorage.getItem('topline:hero-image');
  if (hero && /^https:\/\//.test(hero)) {
    var l = document.createElement('link');
    l.rel = 'preload';
    l.as = 'image';
    l.href = hero;
    l.setAttribute('fetchpriority', 'high');
    document.head.appendChild(l);
  }
} catch (e) { /* storage unavailable */ }
