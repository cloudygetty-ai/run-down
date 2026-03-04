module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@core': './src/core',
          '@services': './src/services',
          '@screens': './src/screens',
          '@components': './src/components',
          '@utils': './src/utils',
          '@types': './src/types',
        },
      },
    ],
  ],
};
