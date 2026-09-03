// react-native-gesture-handler phải nạp trước mọi thứ khác (yêu cầu của thư viện,
// trước đây Expo tự lo). React Navigation dựng cử chỉ vuốt trên nền này.
import 'react-native-gesture-handler';

import { AppRegistry } from 'react-native';

import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
