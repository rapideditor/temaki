import fs from 'bun:fs';

const iconMeta = JSON.stringify(JSON.parse(fs.readFileSync('./data/icons.json')));

// Put the metadata in a format that svg-sprite can insert into the preview page template
fs.writeFileSync('./mustache-vars.json', JSON.stringify({ icon_meta: iconMeta }));
