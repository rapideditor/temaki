const contents = await Bun.file('./data/icons.json').json()
const iconMeta = JSON.stringify(contents);

// Put the metadata in a format that svg-sprite can insert into the preview page template
await Bun.write('./mustache-vars.json', JSON.stringify({ icon_meta: iconMeta }));
