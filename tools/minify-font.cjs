const pathlib = require('path')
const fs = require('fs')
const Fontmin = require('fontmin')

let content = ''

function gatherHtml(path, ext) {
  if (!fs.existsSync(path)) {
    return
  }
  const files = fs.readdirSync(path)
  files.forEach((file) => {
    const filepath = pathlib.join(path, file)
    if (fs.lstatSync(filepath).isDirectory()) {
      gatherHtml(filepath, ext)
    } else if (filepath.endsWith('.html')) {
      content += fs.readFileSync(filepath, { encoding: 'utf-8' })
    }
  })
}

gatherHtml('public')

content = [...new Set(content)].join('')

const fontmin = new Fontmin()
  .src('source/*.ttf')
  .dest('public')
  .use(
    Fontmin.glyph({
      text: content,
      hinting: false,
    })
  )
  .use(
    Fontmin.ttf2woff2({
      deflate: true,
    })
  )

fontmin.run(function (err, files) {
  if (err) {
    throw err
  }

  console.log(`Generated ${files.length} font files`)
})
