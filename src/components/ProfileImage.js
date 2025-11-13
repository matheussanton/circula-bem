import React from 'react';
import { Image, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const ProfileImage = ({ 
  imageUrl, 
  size = 40, 
  style = {}, 
  showPlaceholder = true,
  borderColor = '#4F8CFF',
  borderWidth = 0
}) => {
  const imageSize = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const containerStyle = {
    ...imageSize,
    borderColor: borderColor,
    borderWidth: borderWidth,
    backgroundColor: '#F7F8FA',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    ...style
  };

  // Se não tem URL da imagem, mostrar placeholder
  if (!imageUrl) {
    if (!showPlaceholder) {
      return null;
    }
    
    return (
      <View style={containerStyle}>
        <MaterialCommunityIcons 
          name="account-circle" 
          size={size * 0.8} 
          color="#C0C0C0" 
        />
      </View>
    );
  }

  // Se tem URL da imagem, tentar carregar
  return (
    <Image
      source={{ uri: imageUrl }}
      style={containerStyle}
      onError={(error) => {
        // Se falhar ao carregar, você pode implementar um estado de erro aqui
        console.log('Erro ao carregar imagem de perfil:', imageUrl);
      }}
    />
  );
};

export default ProfileImage; 
