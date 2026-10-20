const { stripHTML, unescapeHTML } = require('hexo-util');

hexo.extend.helper.register('editorial_excerpt', function (post) {
  const html = (post.excerpt || post.content || '')
    .replace(/<(script|style|figure|pre)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  const paragraphs = html.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi);
  const text = unescapeHTML(stripHTML(paragraphs ? paragraphs.join(' ') : html))
    .replace(/\s+/g, ' ').trim();
  return this.truncate(text, { length: this.theme.excerpt_length || 120, omission: '…' });
});
