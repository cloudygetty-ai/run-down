import { AppRegistry } from 'react-native';
import { DetectorApp } from './src/detector/DetectorApp';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => DetectorApp);
