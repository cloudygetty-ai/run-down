module.exports = {
  expo: {
    name: 'Run Down',
    slug: 'run-down',
    version: '0.1.0',
    orientation: 'landscape',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#0a0a0f',
    },
    ios: {
      bundleIdentifier: 'com.claude.rundown',
      buildNumber: '1',
      supportsTablet: true,
      infoPlist: {
        UIBackgroundModes: ['fetch', 'processing'],
        BGTaskSchedulerPermittedIdentifiers: ['com.claude.rundown.refresh'],
      },
    },
    android: {
      package: 'com.claude.rundown',
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#0a0a0f',
      },
    },
    extra: {
      eas: {
        projectId: 'YOUR_EAS_PROJECT_ID',
      },
    },
    updates: {
      fallbackToCacheTimeout: 0,
    },
    assetBundlePatterns: ['**/*'],
  },
};
