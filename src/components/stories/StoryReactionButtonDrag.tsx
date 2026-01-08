import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ReactionType, REACTIONS } from '../../types/feed';
import { storiesApi } from '../../services/api';
import { COLORS } from '../../theme/colors';

interface StoryReactionButtonDragProps {
  storyId: string;
  currentUserId?: string;
  onReactionAdded?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const REACTION_CONFIG = [
  { type: 'LIKE' as ReactionType, emoji: '👍', label: 'Curtir', color: '#2196F3' },
  { type: 'LOVE' as ReactionType, emoji: '❤️', label: 'Amei', color: '#F44336' },
  { type: 'HAPPY' as ReactionType, emoji: '😂', label: 'Haha', color: '#FDB813' },
  { type: 'FIRE' as ReactionType, emoji: '🔥', label: 'Foguinho', color: '#FF6B35' },
  { type: 'STRONG' as ReactionType, emoji: '💪', label: 'Força', color: '#2196F3' },
  { type: 'SAD' as ReactionType, emoji: '😢', label: 'Tristeza', color: '#9C27B0' },
  { type: 'ANGRY' as ReactionType, emoji: '😡', label: 'Raiva', color: '#FF5722' },
];

const REACTION_PICKER_WIDTH = REACTION_CONFIG.length * 50 + 20; // Largura total do picker
const REACTION_PICKER_HEIGHT = 60;

export function StoryReactionButtonDrag({
  storyId,
  currentUserId,
  onReactionAdded,
}: StoryReactionButtonDragProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedReactionIndex, setSelectedReactionIndex] = useState<number | null>(null);
  const [showReactions, setShowReactions] = useState(false);
  
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scale = useRef(new Animated.Value(1)).current;
  const reactionsOpacity = useRef(new Animated.Value(0)).current;
  const reactionsScale = useRef(new Animated.Value(0.8)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsDragging(true);
        setShowReactions(true);
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
        
        // Animar escala do botão
        Animated.spring(scale, {
          toValue: 1.2,
          useNativeDriver: true,
        }).start();
        
        // Animar reações aparecendo
        Animated.parallel([
          Animated.spring(reactionsOpacity, {
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.spring(reactionsScale, {
            toValue: 1,
            useNativeDriver: true,
          }),
        ]).start();
      },
      onPanResponderMove: (evt, gestureState) => {
        pan.setValue({ x: gestureState.dx, y: gestureState.dy });
        
        // Calcular qual reação está sendo selecionada baseado na posição X do toque
        // O picker aparece à esquerda do botão, então precisamos calcular baseado na posição do toque
        const touchX = evt.nativeEvent.pageX;
        const buttonX = SCREEN_WIDTH - 60; // Posição X aproximada do botão (lado direito)
        const reactionsStartX = buttonX - REACTION_PICKER_WIDTH; // Início do picker (à esquerda do botão)
        const relativeX = touchX - reactionsStartX;
        
        if (relativeX >= 0 && relativeX <= REACTION_PICKER_WIDTH) {
          const index = Math.floor((relativeX / REACTION_PICKER_WIDTH) * REACTION_CONFIG.length);
          const clampedIndex = Math.max(0, Math.min(REACTION_CONFIG.length - 1, index));
          setSelectedReactionIndex(clampedIndex);
        } else {
          setSelectedReactionIndex(null);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        pan.flattenOffset();
        
        // Animar botão voltando
        Animated.parallel([
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
          }),
          Animated.parallel([
            Animated.timing(reactionsOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(reactionsScale, {
              toValue: 0.8,
              duration: 200,
              useNativeDriver: true,
            }),
          ]),
        ]).start(() => {
          setIsDragging(false);
          setShowReactions(false);
        });
        
        // Se selecionou uma reação, enviar
        if (selectedReactionIndex !== null && selectedReactionIndex >= 0) {
          const selectedReaction = REACTION_CONFIG[selectedReactionIndex];
          handleReaction(selectedReaction.type);
        }
        
        setSelectedReactionIndex(null);
      },
    })
  ).current;

  const handleReaction = async (type: ReactionType) => {
    try {
      const response = await storiesApi.reactToStory(storyId, type);
      if (response.success) {
        if (onReactionAdded) {
          onReactionAdded();
        }
      }
    } catch (error: any) {
      console.log('Reação já registrada ou limite atingido');
    }
  };

  const buttonStyle = {
    transform: [
      { translateX: pan.x },
      { translateY: pan.y },
      { scale: scale },
    ],
  };

  const reactionsStyle = {
    opacity: reactionsOpacity,
    transform: [{ scale: reactionsScale }],
  };

  return (
    <View style={styles.container}>
      {/* Reações aparecendo durante o arrastar */}
      {showReactions && (
        <Animated.View
          style={[
            styles.reactionsContainer,
            reactionsStyle,
            {
              right: 60, // Posição à esquerda do botão
              bottom: 0,
            },
          ]}
        >
          {REACTION_CONFIG.map((reaction, index) => (
            <View
              key={reaction.type}
              style={[
                styles.reactionItem,
                selectedReactionIndex === index && styles.reactionItemSelected,
              ]}
            >
              <Text
                style={[
                  styles.reactionEmoji,
                  selectedReactionIndex === index && styles.reactionEmojiSelected,
                ]}
              >
                {reaction.emoji}
              </Text>
            </View>
          ))}
        </Animated.View>
      )}

      {/* Botão de reação */}
      <Animated.View style={buttonStyle} {...panResponder.panHandlers}>
        <TouchableOpacity
          style={styles.reactionButton}
          activeOpacity={0.7}
        >
          <Ionicons name="heart-outline" size={24} color="#ffffff" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  reactionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionsContainer: {
    position: 'absolute',
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 30,
    padding: 8,
    paddingHorizontal: 12,
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionItem: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  reactionItemSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    transform: [{ scale: 1.3 }],
  },
  reactionEmoji: {
    fontSize: 28,
  },
  reactionEmojiSelected: {
    fontSize: 32,
  },
});

