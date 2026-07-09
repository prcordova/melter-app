import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useNavigationState } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CustomCheckpoints } from './CustomCheckpoints';
import { useSellerJourney } from '../../hooks/useSellerJourney';

const TAB_BAR_HEIGHT = 60;

function isOnMessagesTab(state: { routes: { name: string }[]; index?: number } | undefined): boolean {
  if (!state) return false;
  const route = state.routes[state.index ?? 0];
  return route?.name === 'MessagesStack';
}

export function SellerJourneyFabOverlay() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { data, loading } = useSellerJourney();
  const [open, setOpen] = useState(false);

  const onMessages = useNavigationState((state) => isOnMessagesTab(state));

  const bottomOffset = TAB_BAR_HEIGHT + (insets.bottom || 8) + 12;
  const panelWidth = Math.min(width < 600 ? 300 : 340, width - 32);

  const showFab = useMemo(() => {
    if (onMessages) return false;
    return Boolean(data?.show || loading);
  }, [onMessages, data?.show, loading]);

  if (!showFab) return null;

  return (
    <>
      {!open ? (
        <TouchableOpacity
          style={[styles.fab, { bottom: bottomOffset }]}
          onPress={() => setOpen(true)}
          accessibilityLabel="Jornada do Vendedor"
          activeOpacity={0.9}
        >
          <Ionicons name="trophy" size={width < 600 ? 22 : 26} color="#fff" />
        </TouchableOpacity>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.panel, { bottom: bottomOffset + (width < 600 ? 52 : 60), width: panelWidth }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.panelInner}>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setOpen(false)}
                accessibilityLabel="Fechar"
              >
                <Ionicons name="close" size={20} color="#6b7280" />
              </TouchableOpacity>
              <CustomCheckpoints variant="fab" />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    left: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1200,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    paddingLeft: 16,
  },
  panel: {
    position: 'absolute',
    left: 16,
  },
  panelInner: {
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
    padding: 4,
  },
});
