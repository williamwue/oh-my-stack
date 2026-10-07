const { Resvg } = require('@resvg/resvg-js');
const fs = require('node:fs');
const [input, output, font] = process.argv.slice(2);
if (!input || !output || !font) {
  throw new Error('Usage: node render-pstack-svg.cjs input.svg output.png font.otf');
}
const svg = fs.readFileSync(input, 'utf8').replaceAll('Arial', 'Noto Sans CJK SC');
const rendered = new Resvg(svg, {
  background: 'white',
  fitTo: { mode: 'zoom', value: 2 },
  font: { fontFiles: [font], loadSystemFonts: false, defaultFontFamily: 'Noto Sans CJK SC' },
}).render();
fs.writeFileSync(output, rendered.asPng());
