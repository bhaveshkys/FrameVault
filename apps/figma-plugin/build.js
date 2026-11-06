const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const isWatch = process.argv.includes('--watch');

const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy UI HTML
function copyUi() {
  const uiSrc = path.join(__dirname, 'src', 'ui.html');
  const uiDist = path.join(__dirname, 'dist', 'ui.html');
  fs.copyFileSync(uiSrc, uiDist);
  console.log('✓ Copied ui.html to dist/');
}

copyUi();

async function run() {
  const ctx = await esbuild.context({
    entryPoints: [path.join(__dirname, 'src', 'main.ts')],
    bundle: true,
    platform: 'browser',
    target: 'es2020',
    outfile: path.join(__dirname, 'dist', 'main.js'),
    logLevel: 'info',
  });

  if (isWatch) {
    await ctx.watch();
    console.log('Watching for changes in Figma plugin...');
    // Watch ui.html
    fs.watchFile(path.join(__dirname, 'src', 'ui.html'), () => {
      copyUi();
    });
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    console.log('✓ Figma plugin main.ts built successfully');
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
