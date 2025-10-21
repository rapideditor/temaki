import { Glob } from 'bun';
import { styleText } from 'bun:util';
import svgPathParse from 'svg-path-parse';
import xmlbuilder2 from 'xmlbuilder2';


const START = '✅   ' + styleText('yellow', 'Checking icons...');
const END = '👍  ' + styleText('green', 'done');

console.log('');
console.log(START);
console.time(END);

const glob = new Glob('./icons/**/*.svg');
for (const file of glob.scanSync()) {
  const contents = await Bun.file(file, 'utf8').text();

  let xml;
  try {
    xml = xmlbuilder2.create(contents);
  } catch (err) {
    console.error(styleText('red', `Error - ${err.message} reading:`));
    console.error('  ' + styleText('yellow', file));
    console.error('');
    process.exit(1);
  }

  // Make xml declaration consistent
  xml.dec({ version: '1.0', encoding: 'UTF-8' });

  // Check the contents of the file
  let rootCount = 0;
  let warnings = [];

  const childrenToRemove = new Set();
  const pathDataToAdd = new Set();

  xml.each((child, index, level) => {
    const node = child.node;
    if (node.nodeType !== 1) {   // ignore and remove things like DOCTYPE, CDATA, comments, text
      childrenToRemove.add(child);
      return;
    }

    // Checks for the root
    if (level === 1) {
      if (node.nodeName !== 'svg') {
        console.error(styleText('red', 'Error - Invalid node at document root: ') + styleText('yellow', node.nodeName));
        console.error(styleText('gray', '  Each file should contain only a single root "svg" element.'));
        console.error('  in ' + file);
        console.error('');
        process.exit(1);
      }

      if (rootCount++ > 0) {
        console.error(styleText('red', 'Error - Multiple nodes at document root'));
        console.error(styleText('gray', '  Each file should contain only a single root "svg" element.'));
        console.error('  in ' + file);
        console.error('');
        process.exit(1);
      }

      // Remove unwanted svg attributes
      child.removeAtt(['width', 'height']);


    // Checks for deeper levels
    } else {
      // convert ellipses to paths
      if (node.nodeName === 'ellipse') {
        const attr = (name) => parseFloat(node.getAttribute(name));
        pathDataToAdd.add(ellipseAttrsToPathD(attr('rx'), attr('cx'), attr('ry'), attr('cy')));
        childrenToRemove.add(child);
        return;
      // convert rects to paths
      } else if (node.nodeName === 'rect') {
        const attr = (name) => node.getAttribute(name);
        pathDataToAdd.add(rectAttrsToPathD(attr));
        childrenToRemove.add(child);
        return;
      // convert polygons to paths
      } else if (node.nodeName === 'polygon') {
        pathDataToAdd.add('M ' + node.getAttribute('points') + 'z');
        childrenToRemove.add(child);
        return;
      // remove metadata nodes
      } else if (node.nodeName === 'title' || node.nodeName === 'desc') {
        childrenToRemove.add(child);
        return;
      } else if (node.nodeName === 'g') {
        // groups will be emptied so remove them
        childrenToRemove.add(child);
        return;
      }

      // Remove unwanted attributes
      child.removeAtt(['fill', 'fill-rule', 'id', 'xmlns']);

      if (level > 2) {
        let parent = child.up();
        if (parent.node.nodeName === 'g') {
          // move the node out of the group
          pathDataToAdd.add(child.toString());
          childrenToRemove.add(child);
        }
      }

      // suspicious elements
      if (node.nodeName !== 'path') {
        warnings.push(styleText('yellow', 'Warning - Suspicious node: ' + node.nodeName));
        warnings.push(styleText('gray', '  Each svg element should contain only one or more "path" elements.'));
        return;
      }

      // suspicious attributes
      let suspicious = node.attributes
        .map(attr => attr.name)
        .filter(name => name !== 'd' && name !== 'fill-opacity');

      if (suspicious.length) {
        warnings.push(styleText('yellow', 'Warning - Suspicious attributes on ' + node.nodeName + ': ' + suspicious));
        warnings.push(styleText('gray', '  Avoid identifiers, style, and presentation attributes.'));
      }

      // normalize path data
      const d = node.getAttribute('d');
      let pathdata = d && svgPathParse.pathParse(d);
      if (pathdata) {
        pathdata = pathdata.normalize({round: 2});
        node.setAttribute('d', svgPathParse.serializePath(pathdata));
      }
    }

  }, false, true);  /* visit_self = false, recursive = true */

  // remove nodes only after crawling everything to avoid early exit
  for (const child of childrenToRemove) {
    child.remove();
  }

  for (const pathdata of pathDataToAdd) {
    if (pathdata[0] === '<') {
      xml.root().ele(pathdata);
    } else {
      xml.root().ele('path', {
        d: pathdata
      });
    }
  }


  if (warnings.length) {
    warnings.forEach(w => console.warn(w));
    console.warn('  in ' + file);
    console.warn('');
  }

  await Bun.write(file, xml.end({ prettyPrint: true }));
}

console.timeEnd(END);



function ellipseAttrsToPathD(rx, cx, ry, cy) {
  return `M${cx - rx},${cy}a${rx},${ry} 0 1,0 ${rx * 2},0a${rx},${ry} 0 1,0 -${rx * 2},0z`;
}

// https://github.com/elrumordelaluz/element-to-path/blob/master/src/index.js
function rectAttrsToPathD(attrs) {
  const w = parseFloat(attrs('width'));
  const h = parseFloat(attrs('height'));
  const x = attrs('x') ? parseFloat(attrs('x')) : 0;
  const y = attrs('y') ? parseFloat(attrs('y')) : 0;
  let rx = attrs('rx') || 'auto';
  let ry = attrs('ry') || 'auto';
  if (rx === 'auto' && ry === 'auto') {
    rx = ry = 0;
  } else if (rx !== 'auto' && ry === 'auto') {
    rx = ry = calcValue(rx, w);
  } else if (ry !== 'auto' && rx === 'auto') {
    ry = rx = calcValue(ry, h);
  } else {
    rx = calcValue(rx, w);
    ry = calcValue(ry, h);
  }
  if (rx > w / 2) {
    rx = w / 2;
  }
  if (ry > h / 2) {
    ry = h / 2;
  }
  const hasCurves = rx > 0 && ry > 0;
  return [
    `M${x + rx} ${y}`,
    `H${x + w - rx}`,
    (hasCurves ? `A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}` : ''),
    `V${y + h - ry}`,
    (hasCurves ? `A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}` : ''),
    `H${x + rx}`,
    (hasCurves ? `A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}` : ''),
    `V${y + ry}`,
    (hasCurves ? `A${rx} ${ry} 0 0 1 ${x + rx} ${y}` : ''),
    'z',
  ].filter(Boolean).join('');

  function calcValue(val, base) {
    return /%$/.test(val) ? (val.replace('%', '') * 100) / base : parseFloat(val);
  }
}
