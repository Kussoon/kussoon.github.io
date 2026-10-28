(() => {
  // Enhance an existing information navigation; do not create a second footer.
  const wanted = [
    ['/', 'Kussoonトップ'], ['/sitemap/', 'サイトマップ'],
    ['/about/', 'このサイトについて'], ['/contact/', 'お問い合わせ'],
    ['/privacy/', 'プライバシーポリシー'], ['/sources/', 'データ出典'],
    ['/terms/', '利用上の注意']
  ];
  const candidates = [...document.querySelectorAll('footer nav, nav.site-links, nav.kussoon-footer-links, footer .footlinks, footer nav.links')];
  const pathOf = a => {
    try { const u = new URL(a.getAttribute('href'), location.href); return u.origin === location.origin ? u.pathname.replace(/\\/$/, '') || '/' : ''; }
    catch (_) { return ''; }
  };
  const nav = candidates.find(el => [...el.querySelectorAll('a[href]')].some(a => pathOf(a) === '/privacy'));
  if (!nav) return; // Keep original layout rather than risk inserting a duplicate.
  const present = new Set([...nav.querySelectorAll('a[href]')].map(pathOf));
  const missing = wanted.filter(([path]) => !present.has(path.replace(/\\/$/, '') || '/'));
  for (const [href, label] of missing.reverse()) {
    const a = document.createElement('a');
    a.href = href; a.textContent = label;
    nav.prepend(a);
  }
})();