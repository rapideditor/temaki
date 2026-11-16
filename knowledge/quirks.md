# Quirks

## TypeScript setup

- `scripts/svg-path-parse.d.ts` is an ambient module declaration for `svg-path-parse`, which ships no types. It's the shorthand form (`declare module 'svg-path-parse';`), so everything imported from it is `any`.
- `child.node` from xmlbuilder2 is typed as `Node`; cast to `Element as DOMElement` (from `@oozcitak/dom/lib/dom/interfaces`) to access `getAttribute`, `setAttribute`, and `attributes`. `@oozcitak/dom` isn't in `package.json`: it comes in through xmlbuilder2, so this type import can break if xmlbuilder2 changes its dependencies.
- `node.attributes` is a `NamedNodeMap` — not an array. Use `Array.from(node.attributes)` to iterate.
