import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import HomeScreen from '../screens/HomeScreen';
import SearchResultsScreen from '../screens/SearchResultsScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import SelectDateScreen from '../screens/SelectDateScreen';
import FinalizeRentalScreen from '../screens/FinalizeRentalScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CreateProduct from '../screens/CreateProduct';
import EditProduct from '../screens/EditProduct';
import CreateGroup from '../screens/CreateGroup';
import GroupDetailScreen from '../screens/GroupDetailScreen';
import GroupProductsScreen from '../screens/GroupProductsScreen';
import SelectProductForGroupScreen from '../screens/SelectProductForGroupScreen';
import JoinGroupByLinkScreen from '../screens/JoinGroupByLinkScreen';
import MyRentsScreen from '../screens/MyRentsScreen';
import MyProductsScreen from '../screens/MyProductsScreen';
import RentManagementScreen from '../screens/RentManagementScreen';
import RentDetailScreen from '../screens/RentDetailScreen';
import GroupsScreen from '../screens/GroupsScreen';
import AccountScreen from '../screens/AccountScreen';
import MainLayout from '../components/MainLayout';
import ProductMapScreen from '../screens/ProductMapScreen';
import MapPickerFullScreen from '../screens/MapPickerFullScreen';
import RentMediaCaptureScreen from '../screens/RentMediaCaptureScreen';

const Stack = createStackNavigator();

const ScreenWrapper = ({ children }) => (
  <MainLayout>
    {children}
  </MainLayout>
);

const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Esqueceu sua senha' }} />
      <Stack.Screen name="Home" options={{ title: 'Home' }}>
        {() => (
          <ScreenWrapper>
            <HomeScreen />
          </ScreenWrapper>
        )}
      </Stack.Screen>
      <Stack.Screen name="SearchResults" component={SearchResultsScreen} options={{ title: 'Procurar Resultados' }} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Detalhes do produto' }} />
      <Stack.Screen name="ProductMap" component={ProductMapScreen} options={{ title: 'Localização do Produto' }} />
      <Stack.Screen name="MapPickerFull" component={MapPickerFullScreen} options={{ title: 'Escolher localização' }} />
      <Stack.Screen name="SelectDate" component={SelectDateScreen} options={{ title: 'Selecione a data' }} />
      <Stack.Screen name="FinalizeRental" component={FinalizeRentalScreen} options={{ title: 'Finalizar aluguel' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifcações' }} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ title: 'Nova Senha' }} />
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} options={{ title: 'Perfil' }} />
      <Stack.Screen name="CreateProduct" component={CreateProduct} />
      <Stack.Screen name="EditProduct" component={EditProduct} options={{ title: 'Editar Produto' }} />
      <Stack.Screen name="CreateGroup" component={CreateGroup} options={{ title: 'Criar Grupo' }} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} options={{ title: 'Detalhes do Grupo' }} />
      <Stack.Screen name="GroupProducts" component={GroupProductsScreen} options={{ title: 'Produtos do Grupo' }} />
      <Stack.Screen name="SelectProductForGroup" component={SelectProductForGroupScreen} options={{ title: 'Selecionar Produto para o Grupo' }} />
      <Stack.Screen name="JoinGroupByLink" component={JoinGroupByLinkScreen} options={{ title: 'Entrar por Convite' }} />
      <Stack.Screen name="MyRents" options={{ title: 'Meus Aluguéis' }}>
        {() => (
          <ScreenWrapper>
            <MyRentsScreen />
          </ScreenWrapper>
        )}
      </Stack.Screen>
      <Stack.Screen name="RentDetail" component={RentDetailScreen} options={{ title: 'Detalhes do Aluguel' }} />
      <Stack.Screen name="RentMediaCapture" component={RentMediaCaptureScreen} options={{ title: 'Registro do Aluguel' }} />
      <Stack.Screen name="MyProducts" options={{ title: 'Meus Produtos' }}>
        {() => (
          <ScreenWrapper>
            <MyProductsScreen />
          </ScreenWrapper>
        )}
      </Stack.Screen>
      <Stack.Screen name="RentManagement" options={{ title: 'Gerenciamento de Aluguel' }}>
        {() => (
          <ScreenWrapper>
            <RentManagementScreen />
          </ScreenWrapper>
        )}
      </Stack.Screen>
      <Stack.Screen name="Groups" options={{ title: 'Meus Grupos' }}>
        {() => (
          <ScreenWrapper>
            <GroupsScreen />
          </ScreenWrapper>
        )}
      </Stack.Screen>
      <Stack.Screen name="Account" options={{ title: 'Minha Conta' }}>
        {() => (
          <ScreenWrapper>
            <AccountScreen />
          </ScreenWrapper>
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

export default AppNavigator;
