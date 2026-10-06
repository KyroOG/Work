// Copies the web app (one folder up) into desktop/app so electron-builder can package it.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const out = path.join(__dirname, '..', 'app');
const items = ['index.html', 'manifest.json', 'css', 'js', 'fonts', 'icons'];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
items.forEach((name) => fs.cpSync(path.join(root, name), path.join(out, name), { recursive: true }));
console.log('Copied web app into', out);
