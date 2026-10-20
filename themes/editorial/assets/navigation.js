import Swup from 'swup';
import SwupHeadPlugin from '@swup/head-plugin';
import SwupPreloadPlugin from '@swup/preload-plugin';
import SwupScrollPlugin from '@swup/scroll-plugin';
import SwupA11yPlugin from '@swup/a11y-plugin';

let commentsLoading;

function loadComments() {
  if (window.CUSDIS) return Promise.resolve();
  if (!commentsLoading) {
    // Mount explicitly after loading, since the reader may navigate meanwhile.
    window.CUSDIS_PREVENT_INITIAL_RENDER = true;
    commentsLoading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cusdis.com/js/cusdis.es.js';
      script.async = true;
      script.onload = resolve;
      script.onerror = () => {
        script.remove();
        commentsLoading = undefined;
        reject(new Error('Unable to load comments'));
      };
      document.body.append(script);
    });
  }
  return commentsLoading;
}

async function initComments() {
  const target = document.getElementById('cusdis_thread');
  if (!target) return;
  try {
    await loadComments();
    if (target.isConnected) window.CUSDIS.renderTo(target);
  } catch {
    if (!target.isConnected) return;
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = '评论加载失败，点击重试';
    retry.onclick = () => {
      target.replaceChildren();
      initComments();
    };
    target.replaceChildren(retry);
  }
}

function ignoreVisit(url, { el } = {}) {
  if (el?.closest('[data-no-swup], .article-image, [download]')) return true;
  const target = new URL(url, window.location.href);
  // Only intercept HTML pages, leaving feeds, assets and the admin app native.
  return target.origin !== window.location.origin ||
    /^\/admin(?:\/|$)/.test(target.pathname) ||
    /\.[^/]+$/.test(target.pathname) && !/\.html?$/.test(target.pathname);
}

const connection = navigator.connection;
const saveData = connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || '');
const swup = new Swup({
  containers: ['#main'],
  animationSelector: false,
  // Let the scroll plugin restore positions after the DOM swap, rather than
  // letting the browser restore against the previous page's layout.
  animateHistoryBrowsing: true,
  timeout: 10000,
  ignoreVisit,
  plugins: [
    new SwupHeadPlugin(),
    new SwupPreloadPlugin({
      preloadHoveredLinks: !saveData,
      preloadInitialPage: false
    }),
    new SwupScrollPlugin({ animateScroll: false }),
    new SwupA11yPlugin({
      // All visual/scroll animations are already disabled. Keep the history
      // lifecycle enabled so ScrollPlugin can restore positions in every mode.
      respectReducedMotion: false,
      headingSelector: '#main .article-title',
      announcements: { visit: '已进入：{title}', url: '新页面：{url}' }
    })
  ]
});

function initArticle() {
  document.querySelectorAll('.article-entry img').forEach(image => {
    if (image.parentElement.matches('a')) return;
    const link = document.createElement('a');
    link.href = image.src;
    link.className = 'article-image';
    link.setAttribute('data-no-swup', '');
    image.before(link);
    link.append(image);
    if (image.alt) {
      const caption = document.createElement('span');
      caption.className = 'caption';
      caption.textContent = image.alt;
      link.after(caption);
    }
  });
}

function updateNavigation() {
  document.querySelectorAll('#main-nav a').forEach(link => {
    const path = new URL(link.href).pathname;
    const current = path === '/' ? /^\/(?:page\/\d+\/)?$/.test(location.pathname)
      : path === '/archives' && location.pathname.startsWith('/archives');
    if (current) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

swup.hooks.on('content:replace', () => {
  initArticle();
  initComments();
  updateNavigation();
});

swup.hooks.on('page:view', () => {
  if (window.ga) {
    window.ga('set', 'page', window.location.pathname + window.location.search);
    window.ga('send', 'pageview');
  }
});

initComments();

initArticle();
