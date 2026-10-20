# lsdsjy's blog

Hexo 8 with the Landscape theme, deployed as static HTML to GitHub Pages.

## Development

```sh
nvm use
npm ci
npm start
```

Use Node.js 22. `npm run build` generates `public/` and subsets the Chinese font.
The browser assets are bundled by a Hexo generator, so both development and
production builds include them. Dependencies are served locally except for Cusdis
and the existing Google font stylesheet.

## Navigation

Swup replaces `#main`, updates page metadata and preloads hovered links. Public
HTML remains available for direct visits and browsers without JavaScript. Failed
page fetches fall back to a full navigation; assets and `/admin/` are excluded.

Global theme handlers run once. Article image enhancements run after content
replacement and before scroll restoration; Cusdis is loaded once and mounted with
the current article's identity. Comment failures offer a retry button.

## Verification

```sh
npm run build
npx playwright install chromium
npm test
```

Browser tests cover client navigation, metadata, preloading, history/anchors,
article initialization, comment loading races/retries, navigation failures and
HTML without JavaScript. The external Cusdis SDK is mocked in tests; its live
service availability is not covered.
