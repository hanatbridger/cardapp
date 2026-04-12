/**
 * Babel plugin to replace import.meta.env with process.env
 * Fixes Zustand and other libraries that use import.meta.env on web
 */
module.exports = function () {
  return {
    visitor: {
      MetaProperty(path) {
        // Replace import.meta.env.X with process.env.X
        const { parent } = path;
        if (
          path.node.meta.name === 'import' &&
          path.node.property.name === 'meta' &&
          parent.type === 'MemberExpression' &&
          parent.property.name === 'env'
        ) {
          path.parentPath.replaceWithSourceString('process.env');
        }
        // Replace bare import.meta with { env: process.env }
        else if (
          path.node.meta.name === 'import' &&
          path.node.property.name === 'meta'
        ) {
          path.replaceWithSourceString('({ env: process.env })');
        }
      },
    },
  };
};
