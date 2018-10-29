/** @param {string} module */
function requireUncached(module) {
  delete require.cache[require.resolve(module)];
  return require(module);
}

/** @return {import('../lib/ical/index')} */
export const getICAL = () => requireUncached('../build/ical.js');
