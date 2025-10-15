import fs from 'bun:fs';
import { styleText } from 'bun:util';


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


checkIcons();

function checkIcons() {
  const START = '✅   ' + styleText('yellow', 'Checking metadata...');
  const END = '👍  ' + styleText('green', 'done');

  console.log('');
  console.log(START);
  console.time(END);

  let meta;
  if (fs.existsSync('./data/icons.json')) {
    meta = JSON.parse(fs.readFileSync('./data/icons.json'));
  } else {
    meta = {};
  }

  const existingKeys = Object.keys(meta);
  const validKeys = new Set();

  for (const file of fs.globSync('./icons/**/*.svg')) {
    const contents = fs.readFileSync(file, 'utf8');

    const iconName = file.slice(file.lastIndexOf('/') + 1, -4);
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

  fs.writeFileSync('./data/icons.json', JSON.stringify(meta, null, '  '));

  console.timeEnd(END);
}
