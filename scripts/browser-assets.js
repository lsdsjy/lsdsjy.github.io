const { build } = require('esbuild');
const fs = require('node:fs');
const path = require('node:path');

// Generate assets for both `hexo generate` and `hexo server`.
hexo.extend.generator.register('browser-assets', async function () {
  const result = await build({
    entryPoints: [path.join(hexo.theme_dir, 'assets/navigation.js')],
    bundle: true,
    minify: true,
    format: 'iife',
    target: ['es2020'],
    write: false
  });
  const assets = [{ path: 'js/navigation.js', data: result.outputFiles[0].text }];
  if (hexo.config.theme === 'landscape') {
    assets.push({ path: 'js/vendor/jquery.js', data: fs.readFileSync(require.resolve('jquery/dist/jquery.min.js')) });
  }
  return assets;
});
