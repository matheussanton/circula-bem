import React from 'react';
import * as Linking from 'expo-linking';
import { Text } from 'react-native';
import 'react-native-url-polyfill/auto';
import { NavigationContainer } from '@react-navigation/native';
import { NativeBaseProvider, extendTheme } from 'native-base';
import AppNavigator from './src/navigation/AppNavigator';
import { useFonts, Roboto_400Regular, Roboto_700Bold } from '@expo-google-fonts/roboto';
import { LogBox } from 'react-native';
import Toast from 'react-native-toast-message';

LogBox.ignoreAllLogs();

const prefix = Linking.createURL('/');

const linking = {
  prefixes: [prefix, 'circulabem://'],
  config: {
    screens: {
      ResetPassword: 'reset-password',
    },
  },
};

// Corrigido: extendTheme precisa vir de NativeBase v3+.
const theme = extendTheme({
  colors: {
    primary: {
      500: '#233ED9',
    },
    secondary: {
      500: '#16E024',
    },
    background: {
      50: '#F2F2F2',
      100: '#FFFFFF',
    },
  },
  fontConfig: {
    Roboto: {
      400: {
        normal: 'RobotoRegular',
      },
      700: {
        normal: 'RobotoBold',
      },
    },
  },
  fonts: {
    heading: 'Roboto',
    body: 'Roboto',
    mono: 'Roboto',
  },
});

export default function App() {
  const [fontsLoaded] = useFonts({
    RobotoRegular: Roboto_400Regular,
    RobotoBold: Roboto_700Bold,
  });

  if (!fontsLoaded) {
    return <Text style={{ padding: 20 }}>Carregando fontes...</Text>;
  }

  return (
    <NativeBaseProvider theme={theme}>
      <NavigationContainer linking={linking}>
        <AppNavigator />
      </NavigationContainer>
      <Toast />
    </NativeBaseProvider>
  );
}
