import { Glob } from 'bun';
import { styleText } from 'node:util';
import svgPathParse from 'svg-path-parse';
import xmlbuilder2 from 'xmlbuilder2';

import type { XMLBuilder } from 'xmlbuilder2/lib/interfaces';
import type { Element as DOMElement } from '@oozcitak/dom/lib/dom/interfaces';


const START = '✅   ' + styleText('yellow', 'Checking icons…');
const END = '👍  ' + styleText('green', 'done');

console.log('');
console.log(START);
console.time(END);

const glob = new Glob('./icons/**/*.svg');
for (const file of glob.scanSync()) {
  const contents = await Bun.file(file).text();

  let xml;
  try {
    xml = xmlbuilder2.create(contents);
  } catch (err) {
    console.error(styleText('red', `Error - ${(err as Error).message} reading:`));
    console.error('  ' + styleText('yellow', file));
    console.error('');
    process.exit(1);
  }

  // Make xml declaration consistent
  xml.dec({ version: '1.0', encoding: 'UTF-8' });

  // Check the contents of the file
  let rootCount = 0;
  let warnings: string[] = [];

  const childrenToRemove = new Set<XMLBuilder>();
  const pathDataToAdd = new Set<string>();

  xml.each((child, index, level) => {
    const node = child.node as DOMElement;
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
        const attr = (name: string) => parseFloat(node.getAttribute(name) ?? '0');
        pathDataToAdd.add(ellipseAttrsToPathD(attr('rx'), attr('cx'), attr('ry'), attr('cy')));
        childrenToRemove.add(child);
        return;
      // convert rects to paths
      } else if (node.nodeName === 'rect') {
        const attr = (name: string) => node.getAttribute(name);
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
      let suspicious = Array.from(node.attributes)
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



function ellipseAttrsToPathD(rx: number, cx: number, ry: number, cy: number) {
  return `M${cx - rx},${cy}a${rx},${ry} 0 1,0 ${rx * 2},0a${rx},${ry} 0 1,0 -${rx * 2},0z`;
}

// https://github.com/elrumordelaluz/element-to-path/blob/master/src/index.js
function rectAttrsToPathD(attrs: (name: string) => string | null) {
  const w = parseFloat(attrs('width') ?? '0');
  const h = parseFloat(attrs('height') ?? '0');
  const x = attrs('x') ? parseFloat(attrs('x')!) : 0;
  const y = attrs('y') ? parseFloat(attrs('y')!) : 0;
  const rxStr: string = attrs('rx') ?? 'auto';
  const ryStr: string = attrs('ry') ?? 'auto';
  let rx: number;
  let ry: number;
  if (rxStr === 'auto' && ryStr === 'auto') {
    rx = ry = 0;
  } else if (rxStr !== 'auto' && ryStr === 'auto') {
    rx = ry = calcValue(rxStr, w);
  } else if (ryStr !== 'auto' && rxStr === 'auto') {
    ry = rx = calcValue(ryStr, h);
  } else {
    rx = calcValue(rxStr, w);
    ry = calcValue(ryStr, h);
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

  function calcValue(val: string, base: number): number {
    return /%$/.test(val) ? (parseFloat(val.replace('%', '')) * 100) / base : parseFloat(val);
  }
}
