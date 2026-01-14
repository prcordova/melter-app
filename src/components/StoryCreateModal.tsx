import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Dimensions,
  TouchableWithoutFeedback,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Video, ResizeMode } from 'expo-av';
import { storiesApi } from '../services/api';
import { COLORS } from '../theme/colors';
import { showToast } from './CustomToast';

const { width, height } = Dimensions.get('window');

interface StoryCreateModalProps {
  visible: boolean;
  onClose: () => void;
  onStoryCreated: () => void;
}

export function StoryCreateModal({
  visible,
  onClose,
  onStoryCreated,
}: StoryCreateModalProps) {
  const insets = useSafeAreaInsets();
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [selectedMediaSize, setSelectedMediaSize] = useState<number | null>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoStartTime, setVideoStartTime] = useState<number>(0);
  const [videoEndTime, setVideoEndTime] = useState<number>(30);
  const [videoPosition, setVideoPosition] = useState<number>(0);
  const videoRef = useRef<Video>(null);
  const [storyText, setStoryText] = useState('');
  const [loading, setLoading] = useState(false);
  const [visibility, setVisibility] = useState<'followers' | 'friends'>('followers');
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [flash, setFlash] = useState<'on' | 'off'>('off');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [wasRecording, setWasRecording] = useState(false); // Rastrear se estava gravando para evitar tirar foto ao soltar
  const cameraRef = useRef<CameraView>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const recordingPromiseRef = useRef<Promise<{ uri: string } | undefined> | null>(null);
  const wasStoppedManuallyRef = useRef<boolean>(false);
  const recordingStartedRef = useRef<boolean>(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();

  const handlePickMedia = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        // NOTE: a versão atual do expo-image-picker neste projeto ainda usa MediaTypeOptions
        // (apesar do warning de depreciação no runtime).
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
        videoMaxDuration: 300, // Permitir vídeos de até 5 minutos
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedMedia(asset.uri);
        setSelectedMediaSize(asset.fileSize || null);
        
        // Determinar tipo MIME: usar mimeType se disponível, senão inferir da URI
        let mimeType: string | null = null;
        if ((asset as any).mimeType) {
          mimeType = (asset as any).mimeType;
        } else if ((asset as any).type) {
          mimeType = (asset as any).type;
        } else {
          // Inferir do nome do arquivo
          const filename = asset.uri.split('/').pop() || '';
          const match = /\.(\w+)$/.exec(filename.toLowerCase());
          if (match) {
            const ext = match[1].toLowerCase();
            const extToMime: { [key: string]: string } = {
              'jpg': 'image/jpeg',
              'jpeg': 'image/jpeg',
              'png': 'image/png',
              'gif': 'image/gif',
              'webp': 'image/webp',
              'mp4': 'video/mp4',
              'mov': 'video/quicktime',
              'webm': 'video/webm',
              'avi': 'video/x-msvideo',
            };
            mimeType = extToMime[ext] || 'image/jpeg';
          } else {
            mimeType = 'image/jpeg'; // Padrão seguro
          }
        }
        
        const isVideoFile = mimeType ? mimeType.startsWith('video/') : false;
        setIsVideo(isVideoFile);
        setSelectedMediaType(mimeType);
        
        // Se for vídeo, configurar duração e limites
        if (isVideoFile && asset.duration) {
          const duration = Math.floor(asset.duration);
          setVideoDuration(duration);
          // Padrão: primeiros 30 segundos ou duração total se menor
          const defaultEnd = Math.min(30, duration);
          setVideoStartTime(0);
          setVideoEndTime(defaultEnd);
          setVideoPosition(0);
        } else {
          setVideoDuration(0);
          setVideoStartTime(0);
          setVideoEndTime(30);
        }
        
        setStoryText('');
      }
    } catch (error) {
      showToast.error('Erro', 'Não foi possível selecionar a mídia');
    }
  };

  const handleTakePhoto = async () => {
    try {
      if (!cameraPermission?.granted) {
        const result = await requestCameraPermission();
        if (!result.granted) {
        showToast.error('Permissão negada', 'Precisamos de acesso à câmera para tirar fotos.');
        return;
        }
      }

      if (!microphonePermission?.granted) {
        const result = await requestMicrophonePermission();
        if (!result.granted) {
          showToast.error('Permissão negada', 'Precisamos de acesso ao microfone para gravar vídeos.');
          return;
        }
      }

      setShowCamera(true);
    } catch (error) {
      showToast.error('Erro', 'Não foi possível abrir a câmera');
    }
  };

  const handleCapturePhoto = async () => {
    // Se estava gravando, não tirar foto (o vídeo já foi processado)
    if (wasRecording) {
      setWasRecording(false);
      return;
    }

    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: false,
      });

      if (photo) {
        setSelectedMedia(photo.uri);
        setSelectedMediaSize(null); // Será calculado depois
        setIsVideo(false);
        setSelectedMediaType('image/jpeg');
        setVideoDuration(0);
        setVideoStartTime(0);
        setVideoEndTime(30);
        setStoryText('');
        setShowCamera(false);
      }
    } catch (error) {
      console.error('[StoryCreate] Erro ao capturar foto:', error);
      showToast.error('Erro', 'Não foi possível capturar a foto');
    }
  };

  const handleStartRecording = async () => {
    if (!cameraRef.current || isRecording) return;

    try {
      recordingStartTimeRef.current = Date.now();
      setIsRecording(true);
      setWasRecording(true); // Marcar que estamos gravando
      setRecordingDuration(0);

      // Timer para mostrar duração da gravação
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          const newDuration = prev + 0.1;
          // Limitar a 30 segundos
          if (newDuration >= 30) {
            handleStopRecording();
            return 30;
          }
          return newDuration;
        });
      }, 100);

      // Resetar flag de parada manual e início da gravação
      wasStoppedManuallyRef.current = false;
      recordingStartedRef.current = false;
      
      // Iniciar gravação de forma não bloqueante
      // Armazenar a promise da gravação para poder processar quando parar
      recordingPromiseRef.current = cameraRef.current.recordAsync({
        maxDuration: 30,
      });
      
      // Aguardar mais tempo para garantir que a gravação realmente iniciou e está gravando dados
      // Isso evita o erro "stopped before any data could be produced"
      // Aumentamos para 2 segundos para garantir que há dados sendo gravados
      setTimeout(() => {
        recordingStartedRef.current = true;
        console.error('[StoryCreate] Gravação iniciada e pronta para parar');
      }, 2000); // 2 segundos de delay para garantir que a gravação iniciou e há dados
      
      // Tratar a promise - ela resolve quando stopRecording() é chamado ou maxDuration é atingido
      recordingPromiseRef.current.then((video) => {
        console.error('[StoryCreate] Promise resolvida no handleStartRecording:', video, 'wasStoppedManually:', wasStoppedManuallyRef.current);
        // Processar vídeo se foi parado manualmente ou se atingiu maxDuration
        if (video && video.uri) {
          handleVideoRecorded(video);
        }
      }).catch((error: any) => {
        console.error('[StoryCreate] Erro na promise do recordAsync:', error);
        // Se a gravação foi cancelada muito rápido, ignorar silenciosamente
        if (error?.message && error.message.includes('stopped before any data')) {
          // Não logar - apenas limpar estado silenciosamente
          setIsRecording(false);
          setWasRecording(false);
          setRecordingDuration(0);
          recordingStartTimeRef.current = 0;
          recordingPromiseRef.current = null;
          if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
          }
        } else {
          setIsRecording(false);
          setWasRecording(false);
          setRecordingDuration(0);
          recordingStartTimeRef.current = 0;
          recordingPromiseRef.current = null;
          if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
          }
        }
      });
    } catch (error) {
      console.error('[StoryCreate] Erro ao iniciar gravação:', error);
      setIsRecording(false);
      setWasRecording(false);
      setRecordingDuration(0);
      recordingStartTimeRef.current = 0;
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      showToast.error('Erro', 'Não foi possível iniciar a gravação');
    }
  };

  const handleStopRecording = async () => {
    if (!cameraRef.current || !isRecording) {
      console.error('[StoryCreate] handleStopRecording: cameraRef ou isRecording inválido');
      return;
    }

    console.error('[StoryCreate] handleStopRecording chamado, duration:', recordingDuration, 'recordingStarted:', recordingStartedRef.current);

    // Duração mínima obrigatória de 2.5 segundos para evitar o erro
    // Isso garante que há dados suficientes sendo gravados
    // O delay inicial é de 2 segundos, então precisamos de pelo menos 2.5 segundos totais
    const MIN_RECORDING_DURATION = 2.5;
    
    // Se a gravação ainda não iniciou completamente OU a duração é muito curta, aguardar
    if (!recordingStartedRef.current || recordingDuration < MIN_RECORDING_DURATION) {
      const reason = !recordingStartedRef.current 
        ? 'Gravação ainda não iniciou completamente' 
        : `Duração muito curta (${recordingDuration.toFixed(1)}s < ${MIN_RECORDING_DURATION}s)`;
      console.error(`[StoryCreate] ${reason}, aguardando...`);
      
      // Aguardar até que a gravação esteja pronta e tenha duração mínima
      let attempts = 0;
      const checkInterval = setInterval(() => {
        attempts++;
        const canStop = recordingStartedRef.current && recordingDuration >= MIN_RECORDING_DURATION;
        
        if (canStop || attempts >= 20) { // Máximo 2 segundos de espera
          clearInterval(checkInterval);
          if (canStop) {
            console.error('[StoryCreate] Condições atendidas, parando agora');
            // Chamar novamente após as condições serem atendidas
            setTimeout(() => handleStopRecording(), 100);
          } else {
            console.error('[StoryCreate] Timeout aguardando condições');
            // Mesmo assim, tentar parar se já passou tempo suficiente
            if (recordingDuration >= MIN_RECORDING_DURATION) {
              setTimeout(() => handleStopRecording(), 100);
            }
          }
        }
      }, 100);
      return;
    }

    try {
      // Marcar que foi parado manualmente
      wasStoppedManuallyRef.current = true;
      
      // Parar a gravação - isso vai resolver a promise do recordAsync com o vídeo
      cameraRef.current.stopRecording();
      console.error('[StoryCreate] stopRecording() chamado');
      
      // A promise já está sendo tratada no handleStartRecording
      // Apenas limpar o estado de gravação
      setIsRecording(false);
      recordingStartTimeRef.current = 0;
      recordingStartedRef.current = false;
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      // Não resetar wasRecording aqui - será resetado quando o vídeo for processado no handleStartRecording
    } catch (error) {
      console.error('[StoryCreate] Erro ao parar gravação:', error);
      setIsRecording(false);
      setWasRecording(false); // Resetar em caso de erro
      recordingStartTimeRef.current = 0;
      recordingPromiseRef.current = null;
      wasStoppedManuallyRef.current = false;
      recordingStartedRef.current = false;
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const handleVideoRecorded = (video: { uri: string }) => {
    if (video.uri) {
      setSelectedMedia(video.uri);
      setSelectedMediaSize(null); // Será calculado depois
      setIsVideo(true);
      setSelectedMediaType('video/mp4');
      const duration = Math.floor(recordingDuration);
      setVideoDuration(duration);
      const defaultEnd = Math.min(30, duration);
      setVideoStartTime(0);
      setVideoEndTime(defaultEnd);
      setVideoPosition(0);
      setStoryText('');
      setShowCamera(false);
      setRecordingDuration(0);
      setWasRecording(false); // Resetar flag após processar vídeo
    }
  };

  const toggleCameraType = () => {
    setFacing(current => 
      current === 'back' ? 'front' : 'back'
    );
  };

  const toggleFlash = () => {
    setFlash(current => 
      current === 'off' ? 'on' : 'off'
    );
  };

  // Cleanup ao fechar câmera
  useEffect(() => {
    if (!showCamera && recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
      setIsRecording(false);
      setRecordingDuration(0);
    }
  }, [showCamera]);

  const handleUpload = async () => {
    if (!selectedMedia) return;

    // Salvar dados antes de fechar o modal
    const mediaToUpload = selectedMedia;
    const mediaSizeToUpload = selectedMediaSize;
    const mediaTypeToUpload = selectedMediaType;
    const isVideoToUpload = isVideo;
    const videoStartTimeToUpload = videoStartTime;
    const videoEndTimeToUpload = videoEndTime;
    const textToUpload = storyText.trim();
    const visibilityToUpload = visibility;

    // Fechar modal imediatamente e limpar estado
    setSelectedMedia(null);
    setSelectedMediaSize(null);
    setSelectedMediaType(null);
    setIsVideo(false);
    setVideoDuration(0);
    setVideoStartTime(0);
    setVideoEndTime(30);
    setVideoPosition(0);
    setStoryText('');
    onClose();

    // Mostrar notificação de início do upload
    showToast.info('Upload', 'Enviando story...');

    // Fazer upload em background
    (async () => {
      try {

        // 1. Obter informações do arquivo
        const filename = mediaToUpload.split('/').pop() || `story_${Date.now()}.${isVideoToUpload ? 'mp4' : 'jpg'}`;
        
        // Determinar o tipo de arquivo - priorizar o tipo armazenado
        let fileType = mediaTypeToUpload;
        
        // Se não tiver tipo armazenado ou for inválido, inferir do nome do arquivo
        if (!fileType || (!fileType.startsWith('image/') && !fileType.startsWith('video/'))) {
          const match = /\.(\w+)$/.exec(filename.toLowerCase());
          if (match) {
            const ext = match[1].toLowerCase();
            // Mapear extensões para tipos MIME válidos (usar exatamente como o backend espera)
            const extToMime: { [key: string]: string } = {
              'jpg': 'image/jpeg',
              'jpeg': 'image/jpeg',
              'png': 'image/png',
              'gif': 'image/gif',
              'webp': 'image/webp',
              'mp4': 'video/mp4',
              'mov': 'video/quicktime',
              'webm': 'video/webm',
              'avi': 'video/x-msvideo',
            };
            fileType = extToMime[ext];
            
            // Se ainda não encontrou, usar padrão baseado no isVideo
            if (!fileType) {
              fileType = isVideoToUpload ? 'video/mp4' : 'image/jpeg';
            }
          } else {
            // Sem extensão, usar padrão baseado no isVideo
            fileType = isVideoToUpload ? 'video/mp4' : 'image/jpeg';
          }
        }
        
        // Normalizar tipo de arquivo (garantir lowercase)
        fileType = fileType.toLowerCase().trim();
        
        // Garantir que seja um tipo válido aceito pelo backend
        const validTypes = [
          'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
          'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'
        ];
        
        if (!validTypes.includes(fileType)) {
          fileType = isVideoToUpload ? 'video/mp4' : 'image/jpeg';
        }
        
        // Obter tamanho do arquivo (usar do ImagePicker se disponível, senão buscar via fetch)
        let fileSize = mediaSizeToUpload;
        if (!fileSize || fileSize === 0) {
          try {
            const response = await fetch(mediaToUpload);
            const blob = await response.blob();
            fileSize = blob.size;
          } catch (error) {
            console.error('[StoryCreate] Erro ao obter tamanho do arquivo:', error);
            fileSize = isVideoToUpload ? 10 * 1024 * 1024 : 1024 * 1024; // 10MB para vídeo, 1MB para imagem
          }
        }
        
        // Validar tamanho mínimo
        if (!fileSize || fileSize === 0) {
          throw new Error('Não foi possível determinar o tamanho do arquivo');
        }

        // 2. Fazer upload do arquivo usando presigned URL (upload direto ao S3)
      const uploadResponse = await storiesApi.uploadStoryMedia(
          mediaToUpload,
        filename,
          fileType,
          fileSize,
          isVideoToUpload ? videoStartTimeToUpload : undefined,
          isVideoToUpload ? Math.min(30, videoEndTimeToUpload - videoStartTimeToUpload) : undefined
      );

      if (!uploadResponse.success || !uploadResponse.data?.url) {
        throw new Error(uploadResponse.message || 'Erro ao fazer upload');
      }

        // 3. Criar story com texto simples (fixo na parte inferior)
      const storyData = {
        content: {
            type: isVideoToUpload ? ('video' as const) : ('image' as const),
          mediaUrl: uploadResponse.data.url,
            text: textToUpload || null,
          elements: [],
          zoom: 1,
          panX: 0,
          panY: 0,
        },
          visibility: visibilityToUpload,
          duration: isVideoToUpload ? Math.min(30, videoEndTimeToUpload - videoStartTimeToUpload) : 10,
      };

      const response = await storiesApi.createStory(storyData);

      if (response.success) {
        showToast.success('Sucesso', 'Story criado com sucesso!');
        onStoryCreated();
      } else {
        throw new Error(response.message || 'Erro ao criar story');
      }
    } catch (error: any) {
        console.error('[StoryCreate] Erro ao criar story:', error);
      showToast.error(
        'Erro',
        error?.response?.data?.message || error?.message || 'Não foi possível criar o story'
      );
      }
    })();
  };

  // Função para renderizar timeline de vídeo
  const renderVideoTimeline = () => {
    if (!isVideo || videoDuration === 0) return null;
    
    const timelineWidth = width - 40;
    const startPercent = (videoStartTime / videoDuration) * 100;
    const endPercent = (videoEndTime / videoDuration) * 100;
    const selectedWidth = ((videoEndTime - videoStartTime) / videoDuration) * 100;
    
    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    
    const handleStartDrag = (gestureState: any) => {
      const x = gestureState.moveX - 20; // Ajustar para o início do timeline
      const percent = Math.max(0, Math.min(100, (x / timelineWidth) * 100));
      const newStart = (percent / 100) * videoDuration;
      const maxStart = videoEndTime - 1; // Mínimo 1 segundo de duração
      const finalStart = Math.max(0, Math.min(maxStart, newStart));
      setVideoStartTime(Math.floor(finalStart));
      if (videoRef.current) {
        videoRef.current.setPositionAsync(finalStart * 1000);
      }
    };
    
    const handleEndDrag = (gestureState: any) => {
      const x = gestureState.moveX - 20;
      const percent = Math.max(0, Math.min(100, (x / timelineWidth) * 100));
      const newEnd = (percent / 100) * videoDuration;
      const minEnd = videoStartTime + 1; // Mínimo 1 segundo de duração
      const maxEnd = Math.min(videoDuration, videoStartTime + 30); // Máximo 30 segundos
      const finalEnd = Math.max(minEnd, Math.min(maxEnd, newEnd));
      setVideoEndTime(Math.floor(finalEnd));
    };
    
    const startPanResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => handleStartDrag(gestureState),
      onPanResponderRelease: () => {},
    });
    
    const endPanResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => handleEndDrag(gestureState),
      onPanResponderRelease: () => {},
    });
    
    return (
      <View style={styles.timelineContainer}>
        <View style={styles.timelineLabels}>
          <Text style={styles.timelineTime}>{formatTime(videoStartTime)}</Text>
          <Text style={styles.timelineDuration}>
            {formatTime(videoEndTime - videoStartTime)} / {formatTime(videoDuration)}
          </Text>
          <Text style={styles.timelineTime}>{formatTime(videoEndTime)}</Text>
        </View>
        <View style={styles.timelineTrack}>
          <View style={[styles.timelineSelected, { left: `${startPercent}%`, width: `${selectedWidth}%` }]} />
          <View
            {...startPanResponder.panHandlers}
            style={[styles.timelineHandle, { left: `${startPercent}%` }]}
          >
            <View style={styles.timelineHandleInner} />
          </View>
          <View
            {...endPanResponder.panHandlers}
            style={[styles.timelineHandle, { left: `${endPercent}%` }]}
          >
            <View style={styles.timelineHandleInner} />
          </View>
        </View>
      </View>
    );
  };

  const renderContent = () => {
    // Renderizar interface da câmera customizada
    if (showCamera) {
      return (
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={facing}
            flash={flash}
          />
          {/* Overlay da câmera - posicionamento absoluto (CameraView não aceita children) */}
          <View style={styles.cameraOverlay} pointerEvents="box-none">
              {/* Header */}
              <View style={[styles.cameraHeader, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity
                  style={styles.cameraButton}
                  onPress={() => {
                    setShowCamera(false);
                    if (isRecording) {
                      handleStopRecording();
                    }
                  }}
                >
                  <Ionicons name="close" size={28} color="#ffffff" />
                </TouchableOpacity>
                
                <View style={styles.cameraHeaderRight}>
                  <TouchableOpacity
                    style={styles.cameraButton}
                    onPress={toggleFlash}
                  >
                    <Ionicons 
                      name={flash === 'on' ? "flash" : "flash-off"} 
                      size={24} 
                      color="#ffffff" 
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cameraButton}
                    onPress={toggleCameraType}
                  >
                    <Ionicons name="camera-reverse" size={28} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Indicador de gravação */}
              {isRecording && (
                <View style={styles.recordingIndicator}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingText}>
                    {Math.floor(recordingDuration)}s
                  </Text>
                </View>
              )}

              {/* Controles inferiores */}
              <View style={[styles.cameraControls, { paddingBottom: insets.bottom + 20 }]}>
                <View style={styles.cameraButtonArea} />
                
                {/* Botão de captura - segurar para gravar, toque para foto */}
                <TouchableOpacity
                  style={[styles.captureButton, isRecording && styles.captureButtonRecording]}
                  onPress={handleCapturePhoto}
                  onPressIn={handleStartRecording}
                  onPressOut={handleStopRecording}
                  activeOpacity={1}
                >
                  <View style={styles.captureButtonInner} />
                </TouchableOpacity>
                
                <View style={styles.cameraButtonArea} />
              </View>
            </View>
        </View>
      );
    }

    if (selectedMedia) {
      return (
        <TouchableWithoutFeedback onPress={() => setShowVisibilityMenu(false)}>
          <View style={styles.previewContainer}>
            {isVideo ? (
              <Video
                ref={videoRef}
                source={{ uri: selectedMedia }}
                style={styles.previewImage}
                resizeMode={ResizeMode.COVER}
                shouldPlay
                isLooping
                onLoad={(status) => {
                  if (status.isLoaded && status.durationMillis && videoDuration === 0) {
                    const duration = Math.floor(status.durationMillis / 1000);
                    setVideoDuration(duration);
                    const defaultEnd = Math.min(30, duration);
                    setVideoEndTime(defaultEnd);
                  }
                }}
              />
            ) : (
              <Image source={{ uri: selectedMedia }} style={styles.previewImage} />
            )}

            {/* Overlay com controles */}
            <View style={[styles.previewOverlay, { paddingTop: insets.top + 20 }]}>
              <View style={styles.topControls}>
                <TouchableOpacity
                  style={styles.cancelPreview}
                  onPress={() => {
                    setSelectedMedia(null);
                    setSelectedMediaSize(null);
                    setSelectedMediaType(null);
                    setIsVideo(false);
                    setVideoDuration(0);
                    setVideoStartTime(0);
                    setVideoEndTime(30);
                    setStoryText('');
                  }}
                >
                  <Ionicons name="close" size={30} color="#ffffff" />
                </TouchableOpacity>
                
                {/* Seletor de visibilidade */}
                <View style={styles.visibilityContainer}>
                  <TouchableOpacity
                    style={styles.visibilityButton}
                    onPress={() => setShowVisibilityMenu(!showVisibilityMenu)}
                  >
                    <Ionicons 
                      name={visibility === 'friends' ? 'people' : 'people-outline'} 
                      size={24} 
                      color="#ffffff" 
                    />
                  </TouchableOpacity>
                  
                  {showVisibilityMenu && (
                    <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                      <View style={styles.visibilityMenu}>
                        <TouchableOpacity
                          style={[
                            styles.visibilityOption,
                            visibility === 'followers' && styles.visibilityOptionActive
                          ]}
                          onPress={() => {
                            setVisibility('followers');
                            setShowVisibilityMenu(false);
                          }}
                        >
                          <Ionicons name="people-outline" size={20} color="#ffffff" />
                          <Text style={styles.visibilityOptionText}>Seguidores</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.visibilityOption,
                            visibility === 'friends' && styles.visibilityOptionActive
                          ]}
                          onPress={() => {
                            setVisibility('friends');
                            setShowVisibilityMenu(false);
                          }}
                        >
                          <Ionicons name="people" size={20} color="#ffffff" />
                          <Text style={styles.visibilityOptionText}>Amigos</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableWithoutFeedback>
                  )}
                </View>
              </View>
            </View>

          {/* Timeline de vídeo (se for vídeo) */}
          {isVideo && renderVideoTimeline()}

          {/* Input de texto fixo na parte inferior com botão de compartilhar ao lado (estilo WhatsApp) */}
          <View style={[styles.textInputContainer, { bottom: insets.bottom + (isVideo ? 100 : 20) }]}>
            <TextInput
              style={styles.textInput}
              placeholder="Digite seu texto..."
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={storyText}
              onChangeText={setStoryText}
              multiline
              maxLength={200}
              autoFocus={false}
            />
            <TouchableOpacity
              style={[styles.sendButton, loading && styles.sendButtonDisabled]}
              onPress={handleUpload}
              disabled={loading || !selectedMedia}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Ionicons name="send" size={24} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>
          </View>
        </TouchableWithoutFeedback>
      );
    }

    return (
      <View style={styles.selectionContainer}>
        <View style={styles.selectionHeader}>
          <Text style={styles.selectionTitle}>Criar Story</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={COLORS.text.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.optionsContainer}>
          <TouchableOpacity style={styles.optionCard} onPress={handlePickMedia}>
            <View style={[styles.iconContainer, { backgroundColor: COLORS.secondary.main }]}>
              <Ionicons name="images" size={32} color="#ffffff" />
            </View>
            <Text style={styles.optionText}>Galeria</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionCard} onPress={handleTakePhoto}>
            <View style={[styles.iconContainer, { backgroundColor: COLORS.primary.main }]}>
              <Ionicons name="camera" size={32} color="#ffffff" />
            </View>
            <Text style={styles.optionText}>Câmera</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={selectedMedia ? false : true}
      onRequestClose={onClose}
    >
      <View style={[styles.container, !selectedMedia && styles.modalOverlay]}>
        {renderContent()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalOverlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  selectionContainer: {
    backgroundColor: COLORS.background.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  selectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 20,
  },
  optionCard: {
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  previewImage: {
    width: width,
    height: height,
    resizeMode: 'cover',
  },
  timelineContainer: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    padding: 12,
  },
  timelineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timelineTime: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  timelineDuration: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  timelineTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    position: 'relative',
  },
  timelineSelected: {
    position: 'absolute',
    height: '100%',
    backgroundColor: COLORS.primary.main,
    borderRadius: 2,
  },
  timelineHandle: {
    position: 'absolute',
    width: 20,
    height: 20,
    top: -8,
    marginLeft: -10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineHandleInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: COLORS.primary.main,
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cancelPreview: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
  },
  textInputContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    gap: 12,
  },
  textInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'left',
    minHeight: 40,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  visibilityContainer: {
    position: 'relative',
  },
  visibilityButton: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
  },
  visibilityMenu: {
    position: 'absolute',
    top: 50,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderRadius: 12,
    padding: 8,
    minWidth: 140,
    zIndex: 1000,
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderRadius: 8,
  },
  visibilityOptionActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  visibilityOptionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  cameraHeaderRight: {
    flexDirection: 'row',
    gap: 20,
  },
  cameraButton: {
    padding: 8,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ff0000',
  },
  recordingText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  cameraButtonArea: {
    width: 60,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ffffff',
    borderWidth: 4,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonRecording: {
    backgroundColor: '#ff0000',
    borderColor: '#ff0000',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ffffff',
  },
});
