export default function rehypeImageAttrs() {
  return (tree) => {
    walk(tree);
  };
}

function walk(node) {
  if (!node || typeof node !== 'object') return;
  if (node.tagName === 'img' && node.properties) {
    if (node.properties.loading === undefined) node.properties.loading = 'lazy';
    if (node.properties.decoding === undefined) node.properties.decoding = 'async';
    const cls = node.properties.class;
    node.properties.class = cls ? `${cls} img-fade` : 'img-fade';
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) walk(child);
  }
}
