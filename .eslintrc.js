module.exports = {
  root: true,
  extends: ['@react-native'],
  ignorePatterns: ['web/'],
  rules: {
    // Allow console in logger utility only — everywhere else is caught by no-console
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
