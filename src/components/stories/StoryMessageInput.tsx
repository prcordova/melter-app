import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { messageApi } from '../../services/api';
import { COLORS } from '../../theme/colors';
import { showToast } from '../CustomToast';
import { API_CONFIG } from '../../config/api.config';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface StoryMessageInputProps {
  storyId: string;
  storyMediaUrl: string;
  storyMediaType: 'image' | 'video' | 'gif';
  recipientId: string;
  currentUserId?: string;
  onMessageSent?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  alwaysExpanded?: boolean;
}

export function StoryMessageInput({
  storyId,
  storyMediaUrl,
  storyMediaType,
  recipientId,
  currentUserId,
  onMessageSent,
  onFocus,
  onBlur,
  alwaysExpanded = false,
}: StoryMessageInputProps) {
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'document' | null>(null);
  const [sending, setSending] = useState(false);
  const [isExpanded, setIsExpanded] = useState(alwaysExpanded);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedFile(result.assets[0].uri);
        setFileType('image');
      }
    } catch (error) {
      showToast.error('Erro', 'Não foi possível selecionar a imagem');
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileType(null);
  };

  const handleSendMessage = async () => {
    if (sending) return;
    if (!message.trim() && !selectedFile) {
      if (!storyId?.trim()) {
        showToast.error('Erro', 'Digite uma mensagem ou selecione um arquivo');
        return;
      }
    }

    try {
      setSending(true);
      const token = await AsyncStorage.getItem('token');

      // Se tiver arquivo, fazer upload primeiro
      let uploadedFileUrl = null;
      let uploadedFileData: {
        imageUrl?: string;
        documentUrl?: string;
        documentName?: string;
        documentSize?: number;
      } | null = null;

      if (selectedFile && fileType) {
        const formData = new FormData();
        const filename = selectedFile.split('/').pop() || `file.${fileType === 'image' ? 'jpg' : 'pdf'}`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `${fileType}/${match[1]}` : `${fileType}/jpeg`;

        formData.append('file', {
          uri: selectedFile,
          type,
          name: filename,
        } as any);
        formData.append('type', fileType);

        const uploadResponse = await axios.post(`${API_CONFIG.BASE_URL}/api/upload`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
          timeout: 60000,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        });

        if (uploadResponse.data.success) {
          uploadedFileUrl = uploadResponse.data.fileUrl;

          if (fileType === 'image') {
            uploadedFileData = { imageUrl: uploadedFileUrl };
          } else {
            uploadedFileData = {
              documentUrl: uploadedFileUrl,
              documentName: filename,
              documentSize: 0, // Tamanho não disponível no mobile
            };
          }
        }
      }

      // Enviar mensagem com dados do story reply
      const messageData: any = {
        recipientId,
        content: message.trim(),
        type: uploadedFileData ? fileType : 'text',
        storyReply: {
          storyId,
        },
      };

      // Adicionar dados do arquivo se houver
      if (uploadedFileData) {
        Object.assign(messageData, uploadedFileData);
      }

      const response = await messageApi.sendMessage(messageData);

      if (response.success) {
        showToast.success('Sucesso', 'Mensagem enviada!');
        setMessage('');
        setSelectedFile(null);
        setFileType(null);
        if (onMessageSent) {
          onMessageSent();
        }
      } else {
        throw new Error(response.message || 'Erro ao enviar mensagem');
      }
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      const apiMsg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Não foi possível enviar a mensagem';
      showToast.error('Erro', apiMsg);
    } finally {
      setSending(false);
    }
  };

  // Se não estiver expandido e não estiver sempre expandido, mostrar apenas botão minimizado
  if (!isExpanded && !alwaysExpanded) {
    return (
      <TouchableOpacity
        style={styles.minimizedButton}
        onPress={() => {
          setIsExpanded(true);
          if (onFocus) onFocus();
        }}
      >
        <Ionicons name="chatbubble-outline" size={20} color={COLORS.text.secondary} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {selectedFile && (
        <View style={styles.filePreview}>
          <Image source={{ uri: selectedFile }} style={styles.previewImage} />
          <TouchableOpacity
            style={styles.removeFileButton}
            onPress={handleRemoveFile}
          >
            <Ionicons name="close-circle" size={24} color={COLORS.states.error} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.attachButton}
          onPress={handlePickImage}
          disabled={sending}
        >
          <Ionicons name="image-outline" size={24} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Responder ao story..."
          placeholderTextColor="rgba(255,255,255,0.6)"
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={1000}
          onFocus={() => {
            if (onFocus) onFocus();
            if (!alwaysExpanded) setIsExpanded(true);
          }}
          onBlur={() => {
            if (onBlur) onBlur();
            // Se não tiver mensagem nem arquivo e não estiver sempre expandido, minimizar após blur
            if (!alwaysExpanded && !message.trim() && !selectedFile) {
              setTimeout(() => setIsExpanded(false), 300);
            }
          }}
          editable={!sending}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            !message.trim() && !selectedFile && !storyId?.trim() && styles.sendButtonDisabled,
          ]}
          onPress={handleSendMessage}
          disabled={sending || (!message.trim() && !selectedFile && !storyId?.trim())}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons name="send" size={20} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  minimizedButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 24,
    padding: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  filePreview: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeFileButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  attachButton: {
    padding: 4,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.secondary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

