import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ReactionType, REACTIONS } from '../../types/feed';
import { storiesApi } from '../../services/api';
import { COLORS } from '../../theme/colors';
import { showToast } from '../CustomToast';

interface StoryReactionButtonProps {
  storyId: string;
  currentUserId?: string;
  isFriend: boolean;
  onReactionAdded?: () => void;
}

const REACTION_CONFIG = [
  { type: 'LIKE' as ReactionType, emoji: '👍', label: 'Curtir', color: '#2196F3' },
  { type: 'LOVE' as ReactionType, emoji: '❤️', label: 'Amei', color: '#F44336' },
  { type: 'HAPPY' as ReactionType, emoji: '😂', label: 'Haha', color: '#FDB813' },
  { type: 'FIRE' as ReactionType, emoji: '🔥', label: 'Foguinho', color: '#FF6B35' },
  { type: 'STRONG' as ReactionType, emoji: '💪', label: 'Força', color: '#2196F3' },
  { type: 'SAD' as ReactionType, emoji: '😢', label: 'Tristeza', color: '#9C27B0' },
  { type: 'ANGRY' as ReactionType, emoji: '😡', label: 'Raiva', color: '#FF5722' },
];

export function StoryReactionButton({
  storyId,
  currentUserId,
  isFriend,
  onReactionAdded,
}: StoryReactionButtonProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<Array<{ id: string; emoji: string; x: number; y: number }>>([]);

  const handleReaction = async (type: ReactionType) => {
    // Mostrar animação de reação flutuante
    const reactionConfig = REACTION_CONFIG.find(r => r.type === type);
    if (reactionConfig) {
      const newReaction = {
        id: `${Date.now()}-${Math.random()}`,
        emoji: reactionConfig.emoji,
        x: Math.random() * 200 + 50,
        y: Math.random() * 200 + 50,
      };
      setFloatingReactions(prev => [...prev, newReaction]);

      // Remover após animação
      setTimeout(() => {
        setFloatingReactions(prev => prev.filter(r => r.id !== newReaction.id));
      }, 2000);
    }

    try {
      const response = await storiesApi.reactToStory(storyId, type);
      if (response.success) {
        if (onReactionAdded) {
          onReactionAdded();
        }
      }
    } catch (error: any) {
      // Silencioso - não mostrar erro ao usuário
      console.log('Reação já registrada ou limite atingido');
    } finally {
      setShowPicker(false);
    }
  };

  // Se é amigo, mostra apenas o botão (será posicionado pelo pai)
  if (isFriend) {
    return (
      <>
        <TouchableOpacity
          style={styles.reactionButton}
          onPress={() => setShowPicker(true)}
        >
          <Ionicons name="heart-outline" size={24} color="#ffffff" />
        </TouchableOpacity>

        <Modal
          visible={showPicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowPicker(false)}
        >
          <TouchableOpacity
            style={styles.pickerOverlay}
            activeOpacity={1}
            onPress={() => setShowPicker(false)}
          >
            <View style={styles.pickerContainer}>
              {REACTION_CONFIG.map((reaction) => (
                <TouchableOpacity
                  key={reaction.type}
                  style={styles.reactionOption}
                  onPress={() => handleReaction(reaction.type)}
                >
                  <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </>
    );
  }

  // Se não é amigo, mostra todas as reações inline centralizadas
  return (
    <View style={styles.inlineReactions}>
      {REACTION_CONFIG.map((reaction) => (
        <TouchableOpacity
          key={reaction.type}
          style={styles.inlineReactionButton}
          onPress={() => handleReaction(reaction.type)}
        >
          <Text style={styles.inlineReactionEmoji}>{reaction.emoji}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  reactionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.background.paper,
    borderRadius: 30,
    padding: 8,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  reactionOption: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionEmoji: {
    fontSize: 32,
  },
  inlineReactions: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 30,
    padding: 8,
    paddingHorizontal: 12,
  },
  inlineReactionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineReactionEmoji: {
    fontSize: 28,
  },
});

