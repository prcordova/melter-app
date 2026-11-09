import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userApi } from '../services/api';
import { CURRENT_TERMS_VERSION } from '../constants/terms';
import {
  CustomTooltipTutorial,
  type CustomTooltipTutorialAnchor,
  type CustomTooltipTutorialStep,
} from './CustomTooltipTutorial';

/** Passo do tutorial → nome da aba destacada (mesma ordem do web, sem "baixar app"). */
const TOUR_STEPS: Array<CustomTooltipTutorialStep & { tab: string }> = [
  {
    id: 'shop',
    tab: 'ProfileStack',
    title: 'Venda seus produtos',
    description: 'No seu Perfil fica a Minha loja: aqui você cadastra produtos para vender.',
  },
  {
    id: 'feed',
    tab: 'FeedTab',
    title: 'Feed',
    description: 'Aqui você vê o feed, posta e engaja com a comunidade.',
  },
  {
    id: 'marketplace',
    tab: 'ShopsTab',
    title: 'Lojas',
    description: 'Aqui você vê o marketplace: produtos e lojas de todos os vendedores.',
  },
  {
    id: 'explorer',
    tab: 'CommunityStack',
    title: 'Comunidade',
    description: 'Aqui você explora vendedores e a comunidade.',
  },
  {
    id: 'messages',
    tab: 'MessagesStack',
    title: 'Mensagens',
    description: 'Aqui você conversa com vendedores, clientes e amigos.',
  },
];

const OPEN_DELAY_MS = 800;
const ANCHOR_RADIUS = 28;

interface OnboardingTourGateProps {
  /** Abas visíveis, na ordem em que aparecem na barra. */
  visibleTabs: string[];
  tabBarHeight: number;
  tabBarPaddingTop: number;
  tabBarPaddingBottom: number;
}

export function OnboardingTourGate({
  visibleTabs,
  tabBarHeight,
  tabBarPaddingTop,
  tabBarPaddingBottom,
}: OnboardingTourGateProps) {
  const { user } = useAuth();
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);

  const termsAccepted =
    Boolean(user?.termsAndPrivacy?.terms?.accepted) &&
    (user?.termsAndPrivacy?.terms?.version || '1.0') === CURRENT_TERMS_VERSION;

  useEffect(() => {
    setPending(false);
    if (!user?.id) return;
    let cancelled = false;
    userApi
      .getCompletionStatus()
      .then((res) => {
        if (!cancelled) setPending(Boolean(res.data?.onboardingTour?.shouldShow));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const canOpen = pending && termsAccepted;

  useEffect(() => {
    if (!canOpen) {
      setReady(false);
      return;
    }
    const timer = setTimeout(() => setReady(true), OPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [canOpen]);

  const resolveAnchor = useCallback(
    (stepId: string, screen: { width: number; height: number }): CustomTooltipTutorialAnchor | null => {
      const tab = TOUR_STEPS.find((s) => s.id === stepId)?.tab;
      const tabIndex = tab ? visibleTabs.indexOf(tab) : -1;
      if (tabIndex < 0) return null;
      const tabWidth = screen.width / visibleTabs.length;
      const contentHeight = tabBarHeight - tabBarPaddingTop - tabBarPaddingBottom;
      return {
        x: tabWidth * (tabIndex + 0.5),
        y: screen.height - tabBarHeight + tabBarPaddingTop + contentHeight / 2,
        radius: ANCHOR_RADIUS,
      };
    },
    [visibleTabs, tabBarHeight, tabBarPaddingTop, tabBarPaddingBottom]
  );

  const close = (action: 'completed' | 'skipped') => {
    setPending(false);
    void userApi.trackOnboardingTour(action).catch(() => {});
  };

  return (
    <CustomTooltipTutorial
      visible={canOpen && ready}
      steps={TOUR_STEPS}
      resolveAnchor={resolveAnchor}
      nextLabel="Avançar"
      finishLabel="Concluir"
      skipLabel="Pular tutorial"
      onSkip={() => close('skipped')}
      onFinish={() => close('completed')}
    />
  );
}
