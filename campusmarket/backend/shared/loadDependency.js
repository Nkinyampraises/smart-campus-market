function loadDependency(packageName) {
  return require(require.resolve(packageName, { paths: [process.cwd(), __dirname] }));
}

module.exports = { loadDependency };
