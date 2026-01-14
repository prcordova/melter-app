import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ReactionType } from '../../types/feed';
import { storiesApi } from '../../services/api';

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
// Altura total para layout vertical: (tamanho do item * quantidade) + (gap entre itens * (quantidade - 1)) + (padding vertical * 2)
const REACTION_PICKER_HEIGHT = (REACTION_CONFIG.length * REACTION_ITEM_SIZE) + (REACTION_ITEM_GAP * (REACTION_CONFIG.length - 1)) + (REACTION_PICKER_PADDING * 2);
const REACTION_PICKER_WIDTH = REACTION_ITEM_SIZE + (REACTION_PICKER_PADDING * 2);

export function StoryReactionButtonDrag({
  storyId,
  currentUserId,
  onReactionAdded,
  onDragStart,
  onDragEnd,
}: StoryReactionButtonDragProps) {
  const [showReactions, setShowReactions] = useState(false);
  
  const scale = useRef(new Animated.Value(1)).current;
  const reactionsOpacity = useRef(new Animated.Value(0)).current;
  const reactionsScale = useRef(new Animated.Value(0.8)).current;

  const handleOpenMenu = () => {
    // Usar setTimeout para evitar atualizações durante renderização
    setTimeout(() => {
      setShowReactions(true);
      onDragStart?.(); // Pausar story
      
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
    }, 0);
  };

  const handleCloseMenu = () => {
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
      // Usar setTimeout para evitar atualizações durante renderização
      setTimeout(() => {
        setShowReactions(false);
        onDragEnd?.(); // Retomar story
      }, 0);
    });
  };

  const handleReaction = async (type: ReactionType) => {
    try {
      const response = await storiesApi.reactToStory(storyId, type);
      if (response.success) {
        if (onReactionAdded) {
          onReactionAdded();
        }
      }
    } catch (error: any) {
      console.error('Erro ao reagir:', error);
    } finally {
      // Sempre fechar o menu após tentar reagir, independente de sucesso ou erro
      // Usar setTimeout para evitar atualizações durante renderização
      setTimeout(() => {
        handleCloseMenu();
      }, 0);
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

  return (
    <View style={styles.container}>
      {/* Container de reações - layout vertical acima do botão */}
      {showReactions && (
        <Animated.View
          style={[
            styles.reactionsContainer,
            reactionsStyle,
            {
              // Posicionar verticalmente acima do botão
              bottom: 52, // 44px (altura do botão) + 8px de espaçamento
              // Centralizar horizontalmente em relação ao botão
              // O botão tem 44px de largura, então centralizamos o menu relativo ao centro do botão
              left: 22 - (REACTION_PICKER_WIDTH / 2), // Centralizar relativo ao centro do botão (22px = metade de 44px)
              // Garantir que não saia da tela à esquerda
              marginLeft: Math.max(0, (REACTION_PICKER_WIDTH / 2) - 22),
            },
          ]}
        >
          {REACTION_CONFIG.map((reaction, index) => (
            <TouchableOpacity
              key={reaction.type}
              style={styles.reactionItem}
              onPress={() => handleReaction(reaction.type)}
              activeOpacity={0.7}
            >
              <Text style={styles.reactionEmoji}>
                {reaction.emoji}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}

      {/* Botão de reação */}
      <Animated.View style={buttonStyle}>
        <TouchableOpacity
          style={styles.reactionButton}
          onPress={showReactions ? handleCloseMenu : handleOpenMenu}
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
    flexDirection: 'column', // Layout vertical
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 30,
    paddingHorizontal: REACTION_PICKER_PADDING,
    paddingVertical: REACTION_PICKER_PADDING,
    gap: REACTION_ITEM_GAP,
    alignItems: 'center',
    justifyContent: 'center',
    width: REACTION_PICKER_WIDTH, // Largura fixa para uma coluna
    height: REACTION_PICKER_HEIGHT, // Altura baseada na quantidade de reações
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
  reactionEmoji: {
    fontSize: 28,
  },
});

