/* Package only the static application. Never read deployment credentials. */
const fs = require('node:fs');
const path = require('node:path');

const runtimeExtension = /\.(?:js|css|html|svg|png|jpe?g|gif|webp|ico|woff2?|ttf|webmanifest)$/i;

function build(root = path.resolve(__dirname, '..')) {
  const files = [];
  function collect(relative) {
    const absolute = path.join(root, relative);
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink()) throw new Error('Static assets must not contain symbolic links.');
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(absolute).sort()) {
        if (!name.startsWith('.')) collect(path.join(relative, name));
      }
    } else if (stat.isFile() && (runtimeExtension.test(relative) || relative === path.join('vendor', 'SUPABASE-LICENSE'))) {
      files.push(relative);
    }
  }
  for (const required of ['index.html', 'manifest.webmanifest', 'sw.js', 'modules/auth-config.js']) {
    if (!fs.lstatSync(path.join(root, required)).isFile()) throw new Error('Missing required static asset.');
  }
  for (const name of fs.readdirSync(root).sort()) {
    if (!name.startsWith('.') && (/\.(js|css)$/.test(name) || ['index.html', 'manifest.webmanifest'].includes(name))) collect(name);
  }
  for (const directory of ['modules', 'pages', 'icons', 'vendor']) collect(directory);
  // The content CMS is an optional static tool; package it when present.
  if (fs.existsSync(path.join(root, 'cms'))) collect('cms');
  // Workers metadata is copied explicitly, outside the runtime extension filter.
  if (!fs.lstatSync(path.join(root, '_redirects')).isFile()) throw new Error('Missing redirect rules.');
  files.push('_redirects');
  // Validate all inputs before replacing the generated directory.
  const output = path.join(root, 'dist');
  fs.rmSync(output, {recursive: true, force: true});
  fs.mkdirSync(output);
  for (const relative of files) {
    const destination = path.join(output, relative);
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.copyFileSync(path.join(root, relative), destination);
  }
  return files.length;
}

if (require.main === module) console.log(`Cloudflare static build: ${build()} files.`);
module.exports = {build};
