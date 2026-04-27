// Load polyfills BEFORE expo-router scans the app directory so that
// Buffer, crypto.subtle, EventTarget, etc. are available when
// module-level code in screens (or transitive SDK imports) runs.
import './polyfills';
import 'react-native-gesture-handler';

import 'expo-router/entry';
