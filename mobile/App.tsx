import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AccountProvider } from './src/context/AccountContext';
import { AuthProvider } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import RootNavigator from './src/navigation';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AccountProvider>
          <CartProvider>
            <StatusBar barStyle="dark-content" />
            <RootNavigator />
          </CartProvider>
        </AccountProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
