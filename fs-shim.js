// Empty shim for Node's `fs` module.
// Some libraries (e.g. @arcium-hq/client) import `fs` at module level
// but only use it for circuit file ops we don't need on RN.
module.exports = {};
