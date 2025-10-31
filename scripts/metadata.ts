import { Glob } from 'bun';
import { styleText } from 'bun:util';
import { basename } from 'node:path';


const properties = new Set([
  'groups'
]);

const groups = new Set([
  'accessibility',
  'aeroways',
  'aerialways',
  'animals',
  'arts',
  'bags',
  'barriers',
  'buildings',
  'camping',
  'clothes',
  'crossings',
  'cycling',
  'food',
  'healthcare',
  'highways',
  'home',
  'information',
  'infrastructure',
  'landforms',
  'mail',
  'military',
  'people',
  'plants',
  'power',
  'railways',
  'religion',
  'seating',
  'security',
  'shapes',
  'snow',
  'sports',
  'telecom',
  'tools',
  'utilities',
  'vehicles',
  'vending',
  'water'
]);


const START = '✅   ' + styleText('yellow', 'Checking metadata...');
const END = '👍  ' + styleText('green', 'done');

console.log('');
console.log(START);
console.time(END);

let meta;
try {
  meta = await Bun.file('./data/icons.json').json();
} catch {
  meta = {};
}

const existingKeys = Object.keys(meta);
const validKeys = new Set();

const glob = new Glob('./icons/**/*.svg');
for (const file of glob.scanSync()) {
  const contents = await Bun.file(file, 'utf8').text();
  const iconName = basename(file).slice(0, -4);

  validKeys.add(iconName);
  if (!meta[iconName]) {
    meta[iconName] = {};
  }
  if (!meta[iconName].groups) {
    meta[iconName].groups = [];
    console.log(styleText('yellow', `New Icon - Please add groups for "${iconName}" in data/icons.json`));
  } else {
    meta[iconName].groups = meta[iconName].groups.sort();
    if (!meta[iconName].groups.length) console.log(styleText('yellow', `Warning - "${iconName}" has no groups in data/icons.json`));
  }

  Object.keys(meta[iconName]).forEach(function(prop) {
    if (!properties.has(prop)) {
      console.error(styleText('red', `Error - Unexpcted property "${prop}" for "${iconName}" in data/icons.json`));
      console.error('');
      process.exit(1);
    }
  });
  meta[iconName].groups.forEach(function(group) {
    if (!groups.has(group)) {
      console.error(styleText('red', `Error - Unexpcted group "${group}" for "${iconName}" in data/icons.json`));
      console.error('');
      process.exit(1);
    }
  });
}

existingKeys.forEach(function(key) {
  if (!validKeys.has(key)) {
    delete meta[key];
  }
});

// sort the properties by key
Object.keys(meta).sort().forEach((key) => {
  let val = meta[key];
  delete meta[key];
  meta[key] = val;
});

await Bun.write('./data/icons.json', JSON.stringify(meta, null, '  '));

console.timeEnd(END);
