import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import Constants from 'expo-constants';

interface PermissionsState {
  camera: boolean;
  mediaLibrary: boolean;
  notifications: boolean;
  allGranted: boolean;
  loading: boolean;
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<PermissionsState>({
    camera: false,
    mediaLibrary: false,
    notifications: false,
    allGranted: false,
    loading: false,
  });

  // Verificar se é Expo Go (onde notificações push android não funcionam mais no SDK 54)
  const isExpoGo = Constants.appOwnership === 'expo';

  const requestPermissions = async () => {
    try {
      // Solicitar permissão de câmera
      const cameraPermission = await Camera.requestCameraPermissionsAsync();

      // Solicitar permissão de galeria (ImagePicker é mais compatível que MediaLibrary)
      const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      // Temporariamente desativado no boot: integração com expo-notifications
      // estava quebrando o parser Hermes no runtime.
      const notificationsGranted = true;

      const cameraGranted = cameraPermission.status === 'granted';
      const mediaGranted = mediaPermission.status === 'granted';
      
      const allGranted = cameraGranted && mediaGranted && notificationsGranted;

      setPermissions({
        camera: cameraGranted,
        mediaLibrary: mediaGranted,
        notifications: notificationsGranted,
        allGranted,
        loading: false,
      });

      return allGranted;
    } catch (error) {
      console.error('[PERMISSIONS] Erro:', error);
      setPermissions({
        camera: false,
        mediaLibrary: false,
        notifications: false,
        allGranted: false,
        loading: false,
      });
      return false;
    }
  };

  const checkPermissions = async () => {
    try {
      const cameraPermission = await Camera.getCameraPermissionsAsync();
      const mediaPermission = await ImagePicker.getMediaLibraryPermissionsAsync();
      
      const notificationsGranted = true;

      const cameraGranted = cameraPermission.status === 'granted';
      const mediaGranted = mediaPermission.status === 'granted';
      
      const allGranted = cameraGranted && mediaGranted && (isExpoGo || notificationsGranted);

      setPermissions({
        camera: cameraGranted,
        mediaLibrary: mediaGranted,
        notifications: notificationsGranted,
        allGranted,
        loading: false,
      });

      return allGranted;
    } catch (error) {
      console.error('[PERMISSIONS] Erro:', error);
      setPermissions({
        camera: false,
        mediaLibrary: false,
        notifications: false,
        allGranted: false,
        loading: false,
      });
      return false;
    }
  };

  useEffect(() => {
    const init = async () => {
      const hasPermissions = await checkPermissions();
      if (!hasPermissions) {
        requestPermissions();
      }
    };
    init();
  }, []);

  return {
    ...permissions,
    requestPermissions,
    checkPermissions,
  };
}

