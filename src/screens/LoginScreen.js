import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { authenticateUser } from '../services/api';
import KeyboardDismissView from '../components/KeyboardDismissView';
import { LOGO_URL } from '../utils/brand';

const loginValidationSchema = Yup.object().shape({
  email: Yup.string().email('Email inválido').required('O email é obrigatório'),
  password: Yup.string().required('A senha é obrigatória'),
});

const LoginScreen = () => {
  const navigation = useNavigation();

  return (
    <KeyboardDismissView contentContainerStyle={{ flexGrow: 1 }}>
      <Formik
        initialValues={{ email: '', password: '' }}
        validationSchema={loginValidationSchema}
        onSubmit={async (values, actions) => {
          try {
            await authenticateUser(values);
            Alert.alert('Sucesso', 'Login realizado com sucesso!');
            navigation.navigate('Home');
          } catch (error) {
            Alert.alert('Erro', error.message || 'Falha no login. Verifique suas credenciais.', [
              { text: 'OK' }
            ], {
              titleStyle: { fontSize: 16 },
              messageStyle: { fontSize: 14 }
            });
          } finally {
            actions.setSubmitting(false);
          }
        }}
      >
        {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isSubmitting }) => (
          <View style={styles.container}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <ExpoImage source={{ uri: LOGO_URL }} style={styles.logo} contentFit="contain" />
            </View>
            
            <Text style={styles.title}>Bem-vindo!</Text>
            <Text style={styles.subtitle}>Faça login para continuar</Text>

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#999"
              keyboardType="email-address"
              onChangeText={handleChange('email')}
              onBlur={handleBlur('email')}
              value={values.email}
              autoCapitalize="none"
            />
            {touched.email && errors.email && <Text style={styles.error}>{errors.email}</Text>}

            <TextInput
              style={styles.input}
              placeholder="Senha"
              placeholderTextColor="#999"
              secureTextEntry
              onChangeText={handleChange('password')}
              onBlur={handleBlur('password')}
              value={values.password}
            />
            {touched.password && errors.password && <Text style={styles.error}>{errors.password}</Text>}

            <TouchableOpacity onPress={handleSubmit} style={styles.button} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrar</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.link}>Esqueceu sua senha?</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.link}>Não tem uma conta? <Text style={styles.linkBold}>Criar conta</Text></Text>
            </TouchableOpacity>
          </View>
        )}
      </Formik>
    </KeyboardDismissView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    justifyContent: 'center', 
    backgroundColor: '#F7F8FA' 
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40
  },
  logo: {
    width: 120,
    height: 120
  },
  title: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    textAlign: 'center',
    color: '#222',
    marginBottom: 8
  },
  subtitle: { 
    fontSize: 16, 
    textAlign: 'center', 
    marginBottom: 30,
    color: '#666'
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#E0E0E0', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  error: { 
    color: '#FF6B6B', 
    fontSize: 12, 
    marginBottom: 10,
    marginLeft: 4
  },
  button: { 
    backgroundColor: '#4F8CFF', 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginVertical: 20,
    shadowColor: '#4F8CFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: 'bold',
    fontSize: 16
  },
  link: { 
    color: '#666', 
    textAlign: 'center', 
    marginTop: 15,
    fontSize: 15
  },
  linkBold: {
    fontWeight: 'bold',
    color: '#4F8CFF'
  }
});

export default LoginScreen;
