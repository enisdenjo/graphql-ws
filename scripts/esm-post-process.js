'use strict';

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const replaceStream = require('replacestream');

glob('lib/**/*.js', (_, filePaths) => {
  for (const filePath of filePaths) {
    const parts = filePath.split('.');
    parts.pop();
    const mjsFileName = parts.join('.') + '.mjs';
    fs.createReadStream(path.join(__dirname, '..', filePath))
      .pipe(replaceStream(/from '(\.?\.\/[^']*)'/g, "from '$1.mjs'"))
      .pipe(fs.createWriteStream(path.join(__dirname, '..', mjsFileName)))
      .on('close', () => {
        fs.unlinkSync(filePath);
      });
  }
});
