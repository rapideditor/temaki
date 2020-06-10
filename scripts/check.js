const colors = require('colors');
const fs = require('fs');
const glob = require('glob');
const xmlbuilder2 = require('xmlbuilder2');


checkIcons();

function ellipseAttrsToPathD(rx, cx, ry, cy) {
  return `M${cx - rx},${cy}a${rx},${ry} 0 1,0 ${rx * 2},0a${rx},${ry} 0 1,0 -${rx * 2},0z`;
}

function checkIcons() {
  const START = '✅   ' + colors.yellow('Checking icons...');
  const END = '👍  ' + colors.green('done');

  console.log('');
  console.log(START);
  console.time(END);

  glob.sync(`./icons/**/*.svg`).forEach(file => {
    const contents = fs.readFileSync(file, 'utf8');
    let xml;
    try {
      xml = xmlbuilder2.create(contents);
    } catch (err) {
      console.error(colors.red(`Error - ${err.message} reading:`));
      console.error('  ' + colors.yellow(file));
      console.error('');
      process.exit(1);
    }

    // Make xml declaration consistent
    xml.dec({ version: '1.0', encoding: 'UTF-8' });

    // Check the contents of the file
    let rootCount = 0;
    let warnings = [];

    xml.each((child, index, level) => {
      const node = child.node;
      if (node.nodeType !== 1) {   // ignore and remove things like DOCTYPE, CDATA, comments, text
        child.remove();
        return;
      }

      // Checks for the root
      if (level === 1) {
        if (node.nodeName !== 'svg') {
          console.error(colors.red('Error - Invalid node at document root: ') + colors.yellow(node.nodeName));
          console.error(colors.gray('  Each file should contain only a single root "svg" element.'));
          console.error('  in ' + file);
          console.error('');
          process.exit(1);
        }

        if (rootCount++ > 0) {
          console.error(colors.red('Error - Multiple nodes at document root'));
          console.error(colors.gray('  Each file should contain only a single root "svg" element.'));
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
          child.up().ele('path', {
            d: ellipseAttrsToPathD(attr('rx'), attr('cx'), attr('ry'), attr('cy'))
          });
          child.remove();
          return;

        // convert polygons to paths
        } else if (node.nodeName === 'polygon') {
            child.up().ele('path', {
              d: 'M ' + node.getAttribute('points') + 'z'
            });
            child.remove();
            return;
        }

        // suspicious elements
        if (node.nodeName !== 'path') {
          warnings.push(colors.yellow('Warning - Suspicious node: ' + node.nodeName));
          warnings.push(colors.gray('  Each svg element should contain only one or more "path" elements.'));
          return;
        }

        // Remove unwanted path attributes
        child.removeAtt(['fill', 'id']);

        // suspicious attributes
        let suspicious = node.attributes
          .map(attr => attr.name)
          .filter(name => name !== 'd');

        if (suspicious.length) {
          warnings.push(colors.yellow('Warning - Suspicious attributes on ' + node.nodeName + ': ' + suspicious));
          warnings.push(colors.gray('  Avoid identifiers, style, and presentation attributes.'));
        }
      }

    }, false, true);  /* visit_self = false, recursive = true */


    if (warnings.length) {
      warnings.forEach(w => console.warn(w));
      console.warn('  in ' + file);
      console.warn('');
    }

    fs.writeFileSync(file, xml.end({ prettyPrint: true }));

  });

  console.timeEnd(END);
}
