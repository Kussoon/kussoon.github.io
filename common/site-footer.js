(() => {
  if (document.querySelector('[data-kussoon-common-footer]')) return;

  const style = document.createElement('style');
  style.textContent = `
    .kussoon-common-footer{margin-top:32px;padding:20px 16px;background:#16352d;color:#eff8f5;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Yu Gothic",Meiryo,sans-serif;font-size:14px;line-height:1.7;text-align:center}
    .kussoon-common-footer nav{display:flex;flex-wrap:wrap;justify-content:center;gap:8px 18px;margin-bottom:8px}
    .kussoon-common-footer a{color:#fff;text-decoration:underline;text-underline-offset:3px}
    .kussoon-common-footer small{color:#c9ddd6}
  `;
  document.head.appendChild(style);

  const footer = document.createElement('footer');
  footer.className = 'kussoon-common-footer';
  footer.dataset.kussoonCommonFooter = 'true';
  footer.innerHTML = `
    <nav aria-label="サイト情報">
      <a href="/about/">このサイトについて</a>
      <a href="/privacy/">プライバシーポリシー</a>
      <a href="/sources/">データ出典</a>
      <a href="/terms/">利用上の注意</a>
    </nav>
    <small>© KUSSOON 2026</small>
  `;
  document.body.appendChild(footer);
})();
