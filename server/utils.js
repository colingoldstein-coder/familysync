function toBool(val) {
  return val === true || val === 1 || val === '1' || val === 't' || val === 'true';
}

module.exports = { toBool };
