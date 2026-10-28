(() => {
  if (document.querySelector('[data-kussoon-common-footer]')) return;
  const links = [
    ['/', 'Kussoonトップ'], ['/sitemap/', 'サイトマップ'],
    ['/about/', 'このサイトについて'], ['/contact/', 'お問い合わせ'],
    ['/privacy/', 'プライバシーポリシー'], ['/sources/', 'データ出典'],
    ['/terms/', '利用上の注意']
  ];
  const nav = document.createElement('nav');
  nav.className = 'kussoon-footer-links-unified';
  nav.setAttribute('aria-label', 'サイト共通案内');
  for (const [href, label] of links) {
    const a = document.createElement('a'); a.href = href; a.textContent = label; nav.appendChild(a);
  }
  const style = document.createElement('style');
  style.textContent = `
    .kussoon-footer-links-unified{display:flex;flex-wrap:wrap;justify-content:center;gap:8px 18px;margin:0 auto 12px;padding:0 12px;font:500 13px/1.8 -apple-system,BlinkMacSystemFont,"Segoe UI","Yu Gothic",Meiryo,sans-serif}
    .kussoon-footer-links-unified a{color:inherit;text-decoration:underline;text-underline-offset:3px}
    .kussoon-footer-links-unified a:focus-visible{outline:2px solid #2386d1;outline-offset:3px}
    .kussoon-common-footer{margin-top:32px;padding:20px 16px;background:#16352d;color:#eff8f5;font:14px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI","Yu Gothic",Meiryo,sans-serif;text-align:center}
    .kussoon-common-footer a{color:#fff}
  `;
  document.head.appendChild(style);
  const oldNavs = Array.from(document.querySelectorAll('nav.site-links, nav.kussoon-site-links, nav.kussoon-footer-links, footer nav[aria-label="サイト情報"], footer nav[aria-label="サイト共通案内"]'));
  const footer = document.querySelector('footer');
  if (footer) {
    for (const old of oldNavs) {
      if (old.querySelector('a[href*="privacy/"]') && !old.closest('header')) old.remove();
    }
    footer.prepend(nav);
  } else {
    const f = document.createElement('footer'); f.className='kussoon-common-footer';
    f.dataset.kussoonCommonFooter = 'true'; f.appendChild(nav);
    const copy = document.createElement('small'); copy.textContent='© 2026 Kussoon'; f.appendChild(copy);
    document.body.appendChild(f);
  }
})();