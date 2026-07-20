import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSellerJourney } from '../../hooks/useSellerJourney';
import { SELLER_JOURNEY_STEP_UI_ACTION } from '../../config/seller-journey/types';
import type { SellerJourneyStepStatus } from '../../config/seller-journey/types';
import { SELLER_JOURNEY_STRINGS as t } from '../../config/seller-journey/strings';
import { sellerJourneyApi } from '../../services/seller-journey';
import { type ShopShareChannel } from '../../utils/shop-share';
import { showToast } from '../CustomToast';
import { Button } from '../Button';
import { ShopShareButton } from '../shop/ShopShareButton';
import { COLORS } from '../../theme/colors';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type CustomCheckpointsVariant = 'fab' | 'minimized';

type Props = {
  variant?: CustomCheckpointsVariant;
  defaultExpanded?: boolean;
};

function progressPercent(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}

function stepLabel(labelKey: string): string {
  const steps = t.steps as Record<string, string>;
  return steps[labelKey] ?? labelKey;
}

function stepHint(hintKey?: string): string | null {
  if (!hintKey) return null;
  const steps = t.steps as Record<string, string>;
  return steps[hintKey] ?? null;
}

export function CustomCheckpoints({ variant = 'minimized', defaultExpanded = false }: Props) {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const isCompact = width < 600;
  const { data, loading, refresh, markShareCompleted } = useSellerJourney();
  const [expanded, setExpanded] = useState(defaultExpanded || variant === 'fab');

  const username = data?.username ?? '';
  const percent = useMemo(
    () => progressPercent(data?.completedCount ?? 0, data?.totalCount ?? 0),
    [data?.completedCount, data?.totalCount]
  );

  const toggleExpanded = useCallback(() => {
    if (variant !== 'minimized') return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  }, [variant]);

  const openShop = useCallback(() => {
    navigation.navigate('ProfileStack', { screen: 'MyShop' });
  }, [navigation]);

  const openCreateProduct = useCallback(() => {
    navigation.navigate('ProfileStack', {
      screen: 'MyShop',
      params: { openCreateProduct: true },
    });
  }, [navigation]);

  const handleJourneyShareRecorded = useCallback(
    async (channel: ShopShareChannel) => {
      if (!username) return;
      try {
        const res = await sellerJourneyApi.recordShare(channel);
        if (!res.success) {
          showToast.error(t.shareRecordError);
          return;
        }
        markShareCompleted();
        showToast.success(t.shareRecorded);
        void refresh();
      } catch {
        showToast.error(t.shareRecordError);
      }
    },
    [username, markShareCompleted, refresh]
  );

  const renderStepActionButton = (step: SellerJourneyStepStatus) => {
    if (!username) return null;
    if (step.completed && step.key !== 'hasSharedShopLink') return null;

    const uiAction = SELLER_JOURNEY_STEP_UI_ACTION[step.key];

    switch (uiAction) {
      case 'open_shop':
        return (
          <Button variant="ghost" size="xs" onPress={openShop}>
            {t.actions.openShop}
          </Button>
        );
      case 'create_product':
        return (
          <Button variant="ghost" size="xs" onPress={openCreateProduct}>
            {t.actions.createProduct}
          </Button>
        );
      case 'copy_referral_link':
        return (
          <ShopShareButton
            username={username}
            label={t.actions.share}
            size="xs"
            onAfterShare={
              step.key === 'hasSharedShopLink' && !step.completed
                ? handleJourneyShareRecorded
                : undefined
            }
          />
        );
      default:
        return null;
    }
  };

  const renderStepRow = (step: SellerJourneyStepStatus) => {
    return (
      <View key={step.key} style={styles.stepRow}>
        <View style={styles.stepCheck}>
          <Ionicons
            name={step.completed ? 'checkmark-circle' : 'ellipse-outline'}
            size={isCompact ? 18 : 20}
            color={step.completed ? COLORS.states.success : COLORS.text.tertiary}
          />
        </View>

        <View style={styles.stepTextCol}>
          <Text
            style={[
              styles.stepTitle,
              isCompact && styles.stepTitleCompact,
              step.completed && styles.stepTitleDone,
            ]}
          >
            {stepLabel(step.labelKey)}
          </Text>
          {!step.completed && step.hintKey ? (
            <Text style={styles.stepHint}>{stepHint(step.hintKey)}</Text>
          ) : null}
        </View>

        <View style={styles.stepActionCol}>{renderStepActionButton(step)}</View>
      </View>
    );
  };

  if (!data?.show && !loading) return null;

  const showBody = variant === 'fab' || expanded;

  return (
    <View style={[styles.card, variant === 'fab' && styles.cardFab]}>
      <Pressable
        style={styles.header}
        onPress={variant === 'minimized' ? toggleExpanded : undefined}
      >
        <Ionicons name="trophy-outline" size={isCompact ? 20 : 22} color="#f59e0b" />
        <View style={styles.headerText}>
          <Text style={[styles.title, isCompact && styles.titleCompact]}>{t.title}</Text>
          <Text style={styles.progress}>
            {t.progress(data?.completedCount ?? 0, data?.totalCount ?? 0)}
          </Text>
        </View>
        {variant === 'minimized' ? (
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={COLORS.text.secondary}
          />
        ) : null}
      </Pressable>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${percent}%` }]} />
      </View>

      {showBody ? (
        <View style={styles.body}>
          {data?.rewardClaimed && data.allCompleted ? (
            <Text style={styles.rewardDone}>
              {t.rewardClaimed(data.reward.trialDays, data.reward.planType)}
            </Text>
          ) : (
            <Text style={styles.rewardHint}>
              {t.rewardHint(data?.reward.trialDays ?? 7, data?.reward.planType ?? 'LITE')}
            </Text>
          )}
          {data?.steps.map((step) => renderStepRow(step))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
    marginVertical: 6,
  },
  cardFab: {
    maxHeight: 420,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text.primary,
  },
  titleCompact: {
    fontSize: 14,
  },
  progress: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 1,
  },
  progressTrack: {
    height: 5,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
  },
  body: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  rewardHint: {
    fontSize: 12,
    color: COLORS.text.secondary,
    lineHeight: 17,
    marginBottom: 2,
  },
  rewardDone: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.states.success,
    marginBottom: 2,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  stepCheck: {
    width: 22,
    alignItems: 'center',
  },
  stepTextCol: {
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    lineHeight: 18,
  },
  stepTitleCompact: {
    fontSize: 13,
  },
  stepTitleDone: {
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  referralCode: {
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: COLORS.text.secondary,
  },
  stepHint: {
    marginTop: 2,
    fontSize: 11,
    color: COLORS.text.tertiary,
    lineHeight: 14,
  },
  stepActionCol: {
    flexShrink: 0,
    maxWidth: 130,
    alignItems: 'flex-end',
  },
});
