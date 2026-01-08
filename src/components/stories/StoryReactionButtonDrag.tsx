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
  onDragStart?: () => void;
  onDragEnd?: () => void;
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

const REACTION_ITEM_SIZE = 44;
const REACTION_ITEM_GAP = 4;
const REACTION_PICKER_PADDING = 12;
// Largura total: (tamanho do item * quantidade) + (gap entre itens * (quantidade - 1)) + (padding lateral * 2)
const REACTION_PICKER_WIDTH = (REACTION_CONFIG.length * REACTION_ITEM_SIZE) + (REACTION_ITEM_GAP * (REACTION_CONFIG.length - 1)) + (REACTION_PICKER_PADDING * 2);
const REACTION_PICKER_HEIGHT = 60;

export function StoryReactionButtonDrag({
  storyId,
  currentUserId,
  onReactionAdded,
  onDragStart,
  onDragEnd,
}: StoryReactionButtonDragProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedReactionIndex, setSelectedReactionIndex] = useState<number | null>(null);
  const [showReactions, setShowReactions] = useState(false);
  
  // Removido pan pois o botão não se move mais, apenas detecta gesto
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
        onDragStart?.(); // Pausar story ao começar a arrastar
        
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
        // Não mover o botão visualmente, apenas detectar o movimento horizontal
        // O botão fica fixo no centro
        
        // Calcular qual reação está sendo selecionada baseado no movimento horizontal (dx)
        // O botão está no centro, então reações à esquerda são índices menores e à direita são maiores
        // Cada reação ocupa aproximadamente (REACTION_ITEM_SIZE + REACTION_ITEM_GAP) pixels
        const itemWidth = REACTION_ITEM_SIZE + REACTION_ITEM_GAP;
        const centerIndex = Math.floor(REACTION_CONFIG.length / 2); // Índice do centro (botão) = 3 para 7 reações
        
        // Calcular índice baseado no movimento horizontal
        // dx negativo = movimento para esquerda = índices menores (0, 1, 2)
        // dx positivo = movimento para direita = índices maiores (4, 5, 6)
        // Usar um threshold para ser mais sensível ao movimento
        const threshold = itemWidth * 0.6; // 60% do tamanho do item para ativar
        const offset = Math.round(gestureState.dx / threshold);
        const calculatedIndex = centerIndex + offset;
        
        // Limitar ao range válido (0 a 6 para 7 reações)
        const clampedIndex = Math.max(0, Math.min(REACTION_CONFIG.length - 1, calculatedIndex));
        setSelectedReactionIndex(clampedIndex);
      },
      onPanResponderRelease: (evt, gestureState) => {
        // Animar botão voltando
        Animated.parallel([
          Animated.spring(scale, {
            toValue: 1,
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
          onDragEnd?.(); // Retomar story ao soltar
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
      { scale: scale },
    ],
  };

  const reactionsStyle = {
    opacity: reactionsOpacity,
    transform: [{ scale: reactionsScale }],
  };

  // Calcular posição do botão no centro do menu
  // O botão deve ficar no centro, então metade das reações à esquerda e metade à direita
  // Com 7 reações, o centro seria o índice 3 (0-6), então 3 à esquerda e 3 à direita
  const centerIndex = Math.floor(REACTION_CONFIG.length / 2); // 3 para 7 reações
  const buttonPositionInMenu = centerIndex * (REACTION_ITEM_SIZE + REACTION_ITEM_GAP) + REACTION_PICKER_PADDING;

  return (
    <View style={styles.container}>
      {/* Container de reações com botão no centro */}
      {showReactions && (
        <Animated.View
          style={[
            styles.reactionsContainer,
            reactionsStyle,
            {
              // Posicionar logo acima do botão original
              // O botão original está no lado direito, então precisamos centralizar o menu
              // mas garantir que apareça logo acima
              bottom: 52, // 44px (altura do botão) + 8px de espaçamento
              // Centralizar o container na tela horizontalmente
              // O botão ficará no centro do menu (índice 3)
              left: Math.max(10, (SCREEN_WIDTH - REACTION_PICKER_WIDTH) / 2),
            },
          ]}
        >
          {/* Reações à esquerda do botão (índices 0, 1, 2) */}
          {REACTION_CONFIG.slice(0, centerIndex).map((reaction, localIndex) => {
            const globalIndex = localIndex; // Índice global = 0, 1, 2
            return (
              <View
                key={reaction.type}
                style={[
                  styles.reactionItem,
                  selectedReactionIndex === globalIndex && styles.reactionItemSelected,
                ]}
              >
                <Text
                  style={[
                    styles.reactionEmoji,
                    selectedReactionIndex === globalIndex && styles.reactionEmojiSelected,
                  ]}
                >
                  {reaction.emoji}
                </Text>
              </View>
            );
          })}
          
          {/* Botão de reação no centro do menu */}
          <Animated.View 
            style={[
              styles.reactionButtonInMenu,
              buttonStyle,
            ]} 
            {...panResponder.panHandlers}
          >
            <TouchableOpacity
              style={styles.reactionButton}
              activeOpacity={0.7}
            >
              <Ionicons name="heart-outline" size={24} color="#ffffff" />
            </TouchableOpacity>
          </Animated.View>
          
          {/* Reações à direita do botão (índices 4, 5, 6) */}
          {REACTION_CONFIG.slice(centerIndex + 1).map((reaction, localIndex) => {
            const globalIndex = centerIndex + 1 + localIndex; // Índice global = 4, 5, 6
            return (
              <View
                key={reaction.type}
                style={[
                  styles.reactionItem,
                  selectedReactionIndex === globalIndex && styles.reactionItemSelected,
                ]}
              >
                <Text
                  style={[
                    styles.reactionEmoji,
                    selectedReactionIndex === globalIndex && styles.reactionEmojiSelected,
                  ]}
                >
                  {reaction.emoji}
                </Text>
              </View>
            );
          })}
        </Animated.View>
      )}

      {/* Botão de reação quando não está arrastando */}
      {!showReactions && (
        <Animated.View style={buttonStyle} {...panResponder.panHandlers}>
          <TouchableOpacity
            style={styles.reactionButton}
            activeOpacity={0.7}
          >
            <Ionicons name="heart-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
        </Animated.View>
      )}
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
  reactionButtonInMenu: {
    width: REACTION_ITEM_SIZE,
    height: REACTION_ITEM_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionsContainer: {
    position: 'absolute',
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 30,
    paddingHorizontal: REACTION_PICKER_PADDING,
    paddingVertical: REACTION_PICKER_PADDING,
    gap: REACTION_ITEM_GAP,
    alignItems: 'center',
    justifyContent: 'center',
    width: REACTION_PICKER_WIDTH, // Largura fixa para garantir que todos os ícones caibam
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  reactionItem: {
    width: REACTION_ITEM_SIZE,
    height: REACTION_ITEM_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: REACTION_ITEM_SIZE / 2,
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

