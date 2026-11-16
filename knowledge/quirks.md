# Quirks

## TypeScript setup

- `scripts/svg-path-parse.d.ts` is an ambient module declaration for `svg-path-parse`, which ships no types.
- `child.node` from xmlbuilder2 is typed as `Node`; cast to `Element as DOMElement` (from `@oozcitak/dom`) to access `getAttribute`, `setAttribute`, and `attributes`.
- `node.attributes` is a `NamedNodeMap` — not an array. Use `Array.from(node.attributes)` to iterate.
