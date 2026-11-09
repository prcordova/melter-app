import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BackButton } from '../components/BackButton';
import { Button } from '../components/Button';
import { ThemedStatusBar } from '../components/ThemedStatusBar';
import { useThemedStyles } from '../contexts/ThemeContext';
import type { AppPalette } from '../theme/palettes';
import { useAuth } from '../contexts/AuthContext';
import { userApi } from '../services/api';
import { showToast } from '../components/CustomToast';
import {
  CURRENT_TERMS_VERSION,
  TERMS_LAST_UPDATED_LABEL,
  isTermsVersionCurrent,
} from '../constants/terms';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function TermsScreen() {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, refreshUser } = useAuth();

  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [needsAcceptance, setNeedsAcceptance] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('');
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (user) {
      checkTermsStatus();
    } else {
      setNeedsAcceptance(false);
    }
  }, [user, CURRENT_TERMS_VERSION]);

  const checkTermsStatus = () => {
    if (!user) {
      setNeedsAcceptance(false);
      return;
    }

    const userTermsVersion = user?.termsAndPrivacy?.terms?.version || '1.0';
    const hasAccepted = user?.termsAndPrivacy?.terms?.accepted || false;

    setCurrentVersion(userTermsVersion);
    setNeedsAcceptance(!hasAccepted || !isTermsVersionCurrent(userTermsVersion));
  };

  const handleAccept = async () => {
    try {
      setAccepting(true);
      
      const response = await userApi.acceptTerms(CURRENT_TERMS_VERSION);
      
      if (response.success) {
        showToast.success('Termos aceitos com sucesso!');
        
        if (refreshUser) {
          await refreshUser();
        }
        
        // Atualizar status local
        checkTermsStatus();
      }
    } catch (error: any) {
      console.error('Erro ao aceitar termos:', error);
      showToast.error(error?.response?.data?.message || 'Erro ao aceitar termos');
    } finally {
      setAccepting(false);
    }
  };

  const formatDate = (date: string) => {
    try {
      return format(new Date(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return date;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ThemedStatusBar />
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Termos de Uso</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Card Principal */}
        <View style={styles.card}>
          {/* Header */}
          <Text style={styles.title}>Termos de Uso e Política de Privacidade</Text>
          <Text style={styles.subtitle}>
            Última atualização: {TERMS_LAST_UPDATED_LABEL} • Versão {CURRENT_TERMS_VERSION}
          </Text>

          <View style={styles.divider} />

          {/* Alert se precisa aceitar */}
          {needsAcceptance && user && (
            <View style={styles.warningAlert}>
              <Text style={styles.alertTitle}>⚠️ Novos Termos Disponíveis</Text>
              <Text style={styles.alertText}>
                Os termos foram atualizados. Por favor, leia e aceite para continuar usando a plataforma.
                {currentVersion && ` (Sua versão: ${currentVersion})`}
              </Text>
            </View>
          )}

          {/* Conteúdo dos Termos */}
          <ScrollView
            style={styles.termsContent}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
          >
            {/* 1. Aceitação dos Termos */}
            <Text style={styles.sectionTitle}>1. Aceitação dos Termos</Text>
            <Text style={styles.sectionText}>
              Ao acessar e usar a plataforma Melter, você concorda em cumprir e estar vinculado a estes 
              Termos de Uso. Se você não concordar com qualquer parte destes termos, não deve usar nossos serviços.
            </Text>

            {/* 2. Idade Mínima */}
            <Text style={styles.sectionTitle}>2. Restrição de Idade</Text>
            <Text style={styles.sectionText}>
              ⚠️ <Text style={styles.bold}>Você deve ter pelo menos 18 anos de idade</Text> para usar a plataforma Melter. 
              Ao aceitar estes termos, você declara e garante que possui 18 anos ou mais.
            </Text>
            <Text style={styles.sectionText}>
              Esta restrição existe porque:
            </Text>
            <Text style={styles.bulletPoint}>• A plataforma permite transações financeiras (compras, vendas, doações)</Text>
            <Text style={styles.bulletPoint}>• Usuários podem criar lojas e vender produtos/serviços</Text>
            <Text style={styles.bulletPoint}>• Alguns criadores podem compartilhar links para conteúdo adulto (+18) em seus perfis</Text>
            <Text style={styles.bulletPoint}>• Responsabilidade legal sobre transações e conteúdo</Text>

            {/* 3. Marketplace e Vendas */}
            <Text style={styles.sectionTitle}>3. Marketplace e Transações Financeiras</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>3.1 Sistema de Loja:</Text> Usuários podem criar lojas virtuais e vender produtos 
              (digitais ou físicos), cursos, assinaturas e outros serviços através da plataforma.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>3.2 Comissão da Plataforma:</Text> A Melter retém uma comissão sobre todas 
              as vendas realizadas na plataforma. Esta taxa é configurável pelo administrador e pode ser alterada conforme necessário.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>3.3 Carteira Digital:</Text> Usuários podem adicionar saldo à carteira via pagamentos 
              seguros (Stripe) e usar este saldo para compras, doações e promoções.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>3.4 Saques:</Text> Vendedores podem solicitar saques via Pix. Há um valor mínimo 
              configurável e taxa de saque definida pelo administrador. Saques são processados em até 48 horas úteis.
            </Text>

            {/* 3.5 Taxas da Plataforma */}
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>3.5 Taxas da Plataforma:</Text> A Melter aplica diferentes taxas para manter a plataforma operacional:
            </Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Taxa de Depósito:</Text> Aplicada ao adicionar saldo à carteira via Stripe</Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Taxa de Venda:</Text> Comissão sobre vendas de produtos na plataforma</Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Taxa de Saque:</Text> Taxa aplicada ao solicitar saques via Pix</Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Taxa de Doação:</Text> Taxa sobre doações entre usuários</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>3.6 Alteração de Taxas:</Text> A Melter reserva-se o direito de alterar as taxas a qualquer momento, 
              conforme necessário para cobrir custos operacionais, taxas de processamento de pagamento (Stripe), 
              e manter a sustentabilidade da plataforma.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>3.7 Consulta de Taxas Atuais:</Text> As taxas atuais estão sempre disponíveis na página{' '}
              <Text style={styles.bold}>/fees</Text> da plataforma. Recomendamos verificar regularmente as taxas vigentes, 
              pois elas podem ser alteradas conforme custos operacionais e condições de mercado.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>3.8 Notificação de Alterações:</Text> Quando houver alterações significativas nas taxas, 
              os usuários serão notificados através de:
            </Text>
            <Text style={styles.bulletPoint}>• Email para todos os usuários ativos</Text>
            <Text style={styles.bulletPoint}>• Notificação na plataforma</Text>
            <Text style={styles.bulletPoint}>• Atualização na página /fees</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>3.9 Aceitação das Taxas:</Text> Ao continuar usando a plataforma após alterações nas taxas, 
              você concorda automaticamente com as novas taxas. Se não concordar, pode encerrar sua conta 
              conforme descrito na seção 12.
            </Text>

            <Text style={styles.sectionText}>
              <Text style={styles.bold}>3.10 Planos da Plataforma Melter (LITE, STARTER, PRO e PRO+):</Text> A Melter oferece planos pagos 
              que ampliam limites e recursos do perfil, loja e ferramentas da plataforma — por exemplo, quantidade 
              de links e de produtos, armazenamento por arquivo e por produto, personalização de perfil e loja, 
              recursos de posts, doações e analytics. Os preços, benefícios, limites e periodicidades vigentes estão 
              descritos na página <Text style={styles.bold}>/plans</Text> e podem ser alterados a qualquer momento.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>3.10.1 Periodicidades e descontos:</Text> Os planos pagos podem ser contratados em periodicidade 
              mensal, trimestral ou anual. Periodicidades mais longas podem oferecer desconto sobre a soma das 
              mensalidades equivalentes, conforme exibido em <Text style={styles.bold}>/plans</Text> no momento da contratação.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>3.10.2 Alteração de preços e benefícios:</Text> Reservamo-nos o direito de alterar preços, 
              limites e benefícios dos planos. Quando houver alteração relevante de preço para assinantes ativos, 
              buscaremos comunicar com antecedência razoável (por exemplo, por e-mail). O novo valor passa a valer 
              na <Text style={styles.bold}>próxima cobrança/renovação</Text> após o aviso, e não retroage sobre o período já pago. 
              Se não concordar, você pode cancelar antes da próxima cobrança e manter o acesso até o fim do período 
              já contratado (seção 12.3).
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>3.10.3 Meios de pagamento:</Text> A contratação pode ocorrer via Mercado Pago, Stripe ou saldo 
              da carteira Melter, conforme opções disponíveis na interface. A renovação segue as regras do meio 
              escolhido e do período contratado.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>3.10.4 Experimentação e reembolso:</Text> Em ofertas de experimentação (quando disponíveis
              na interface, tipicamente 7 dias para planos elegíveis), o valor do plano é{' '}
              <Text style={styles.bold}>cobrado na adesão</Text>. Se você cancelar a assinatura dentro dessa janela, a Melter
              solicita o <Text style={styles.bold}>reembolso integral</Text> da primeira cobrança pelo mesmo meio de pagamento,
              e os benefícios do plano experimentado são encerrados na hora (ou o plano anterior é restaurado,
              se aplicável). Fora dessa janela, não há reembolso automático de parcelas já pagas por
              cancelamento antecipado ou por alteração de preços/benefícios, salvo quando a lei aplicável exigir.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>3.10.5 Cadastro de loja, pacotes e plano mínimo:</Text> A Melter pode permitir que 
              você conclua o cadastro de vendedor e prepare pacotes digitais <Text style={styles.bold}>antes</Text> de assinar 
              um plano pago da plataforma. Quando houver plano mínimo configurado (por exemplo, STARTER ou 
              superior), a <Text style={styles.bold}>publicação</Text> de pacotes para moderação, a <Text style={styles.bold}>ativação</Text> da 
              loja na vitrine e demais ações de venda podem ficar <Text style={styles.bold}>pendentes de assinatura</Text> até 
              que sua conta atenda ao plano exigido na interface. Você será informado na página da loja quando 
              essa etapa for necessária.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>3.10.6 Reserva de direito — limites, planos exigidos e loja:</Text> A Melter reserva-se o 
              direito de, a qualquer momento e a seu exclusivo critério, <Text style={styles.bold}>exigir ou deixar de exigir</Text> plano 
              ativo da plataforma para cadastrar, manter, publicar, exibir ou vender por meio da loja — 
              bem como alterar, ampliar, restringir ou remover limites, cotas e regras operacionais — inclusive, 
              sem limitação: tamanho máximo de arquivos e de pacotes; quantidade máxima de produtos/itens; 
              permissão de capas e demais mídias; plano mínimo para publicar ou ativar loja; regras de migração 
              ou adequação de lojas existentes; e quaisquer outros parâmetros relacionados a perfil, loja, 
              produtos, lives, posts e ferramentas. Tais alterações podem ocorrer <Text style={styles.bold}>com ou sem aviso 
              prévio</Text>, inclusive de forma imediata via configuração administrativa. Quando a exigência 
              de plano for <Text style={styles.bold}>relaxada</Text>, rascunhos elegíveis e lojas aprovadas poderão ser 
              publicados ou reativados automaticamente; quando for <Text style={styles.bold}>reintroduzida ou elevada</Text>, 
              lojas e publicações futuras voltam a depender do plano vigente, sem direito a reembolso por 
              períodos já pagos ou não utilizados. O uso contínuo da Melter após a alteração constitui aceitação 
              das novas regras. Se não concordar, você deve deixar de usar o recurso afetado e/ou cancelar a 
              conta ou o plano conforme as seções 12.1 e 12.3. Nada nesta cláusula afasta direitos 
              irrenunciáveis previstos em lei aplicável.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>3.11 Contas inativas e saldo em carteira:</Text> Consideramos conta em situação de abandono 
              quando o usuário permanece <Text style={styles.bold}>180 (cento e oitenta) dias consecutivos sem realizar login</Text> na 
              plataforma. Nessa hipótese, a Melter poderá, quando permitido pela legislação aplicável e após esforços 
              razoáveis de comunicação (por exemplo, por e-mail cadastrado), <Text style={styles.bold}>recolher o saldo remanescente 
              na carteira digital</Text> do usuário, a título de compensação administrativa pela manutenção prolongada 
              de conta inativa e custos operacionais associados.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>3.11.1 Recomendação ao usuário:</Text> Se você pretende deixar de usar a plataforma por um 
              período prolongado, solicite o saque do saldo disponível antes da inatividade, conforme as regras de saque 
              vigentes. O recolhimento por abandono não substitui obrigações legais que exijam devolução de valores ao titular.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>3.11.2 Reativação:</Text> Se você voltar a acessar a conta após o período de inatividade, o acesso 
              poderá ser restabelecido conforme políticas vigentes, mas valores eventualmente recolhidos por abandono{' '}
              <Text style={styles.bold}>não serão recreditados automaticamente</Text>, salvo determinação legal em contrário.
            </Text>

            {/* 4. Produtos Digitais e Tipos de Compra */}
            <Text style={styles.sectionTitle}>4. Produtos Digitais e Políticas de Compra</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>4.1 Tipos de Produto:</Text> A plataforma suporta três tipos de produtos:
            </Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Produtos Digitais:</Text> Acesso permanente após compra (cursos, ebooks, softwares, etc.)</Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Produtos Físicos:</Text> Envio físico do produto para o endereço do comprador</Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Assinaturas:</Text> Acesso recorrente com cobrança periódica através de planos de assinatura</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>4.1.1 Planos de Assinatura:</Text> Vendedores podem criar planos de assinatura que dão acesso a múltiplos produtos. Ao assinar um plano, você terá acesso automático a todos os produtos vinculados àquele plano específico. <Text style={styles.bold}>IMPORTANTE:</Text> Cada plano de assinatura libera apenas os produtos que estão vinculados a ele. Se você assinar o Plano A, terá acesso apenas aos produtos do Plano A, não aos produtos de outros planos.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>4.1.2 Produtos Adicionados Durante Assinatura Ativa:</Text> Se você possui uma assinatura ativa e o vendedor adicionar novos produtos ao plano durante o período de sua assinatura, você terá acesso automático a esses novos produtos sem custo adicional, desde que sua assinatura continue ativa. Isso significa que você terá acesso a todos os produtos atuais e futuros vinculados ao plano enquanto sua assinatura estiver ativa.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>4.1.3 Renovação Automática e Cobrança:</Text> As assinaturas são renovadas automaticamente no final de cada período (mensal, trimestral, semestral ou anual, conforme escolhido na compra). A renovação é feita através do débito automático do valor da assinatura na sua carteira digital na plataforma.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>4.1.4 Notificações de Saldo Insuficiente:</Text> Antes de cada renovação automática, o sistema verifica se você possui saldo suficiente na sua carteira. Se o saldo for insuficiente, você receberá notificações por email informando sobre a necessidade de recarregar sua carteira para manter a assinatura ativa. Essas notificações são enviadas:
            </Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>3 dias antes da renovação:</Text> Aviso de que a renovação está próxima e verificação de saldo</Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>No dia da renovação:</Text> Se o saldo for insuficiente, notificação imediata informando que a renovação não pôde ser processada</Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Após falha na renovação:</Text> Notificação de que a assinatura foi desativada por falta de saldo e instruções para reativar</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>4.1.5 Desativação por Falta de Saldo:</Text> Se no momento da renovação automática você não possuir saldo suficiente na carteira, a assinatura será automaticamente desativada e você perderá o acesso a todos os produtos vinculados ao plano. Para evitar spam de emails, a plataforma envia apenas uma notificação de desativação por evento, respeitando um intervalo mínimo de 24 horas entre notificações sobre o mesmo problema.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>4.1.6 Reativação de Assinatura:</Text> Para reativar uma assinatura que foi desativada por falta de saldo, você deve recarregar sua carteira com saldo suficiente e realizar uma nova compra do plano. A nova assinatura começará a partir da data da compra, não sendo possível recuperar o período perdido.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>4.1.7 Estender Assinatura:</Text> Se você já possui uma assinatura ativa de um plano e comprar novamente o mesmo plano, os dias serão adicionados à sua assinatura atual, estendendo o período de validade. Não será criada uma nova assinatura duplicada.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>4.2 Perda de Acesso:</Text> Se o vendedor deletar um produto que você comprou:
            </Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Produtos Digitais:</Text> Você PERDE o acesso imediatamente. Não há reembolso automático.</Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Assinaturas:</Text> Acesso é cancelado na próxima cobrança. Não há reembolso de períodos já pagos.</Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Produtos Físicos:</Text> Se já enviado, você mantém o produto. Se não enviado, pode solicitar reembolso.</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>4.3 Restrições de Download:</Text> Produtos digitais só podem ser baixados se:
            </Text>
            <Text style={styles.bulletPoint}>• O produto estiver marcado como &quot;liberado para download&quot; pelo vendedor</Text>
            <Text style={styles.bulletPoint}>• Você tiver comprado o produto e ele ainda estiver ativo na loja</Text>
            <Text style={styles.bulletPoint}>• O vendedor não tiver removido o arquivo do servidor</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>4.4 Proibição de Revenda:</Text> É estritamente proibido:
            </Text>
            <Text style={styles.bulletPoint}>• Revender produtos digitais comprados na plataforma</Text>
            <Text style={styles.bulletPoint}>• Compartilhar links de download com terceiros</Text>
            <Text style={styles.bulletPoint}>• Distribuir conteúdo de assinaturas para não-assinantes</Text>
            <Text style={styles.bulletPoint}>• Criar contas múltiplas para obter acesso a produtos</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>4.5 Penalidades por Violação:</Text> Violações das políticas de produtos digitais podem resultar em
              banimento permanente, perda de acesso a todos os produtos comprados, e retenção de saldo em carteira.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>4.6 Vídeo de apresentação do pacote:</Text> Vendedores com plano <Text style={styles.bold}>PRO+</Text> podem
              enviar <Text style={styles.bold}>1 vídeo de apresentação</Text> por pacote (máximo 5 minutos ou 100 MB). O arquivo é
              armazenado de forma <Text style={styles.bold}>pública</Text> no armazenamento da Melter, <Text style={styles.bold}>conta na cota de
              armazenamento do pacote</Text> e passa por <Text style={styles.bold}>moderação</Text> antes de aparecer na vitrine
              (botão &quot;Saiba mais&quot;) e no modal de compra. Se o plano for rebaixado abaixo de PRO+, o vídeo permanece
              guardado mas deixa de ser exibido publicamente até a reativação do plano elegível. A Melter pode
              aprovar, rejeitar (com motivo) ou remover o vídeo a qualquer momento.
            </Text>

            {/* 5. Conteúdo Adulto */}
            <Text style={styles.sectionTitle}>5. Conteúdo Adulto e Responsabilidades</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>5.1 Links para Conteúdo +18:</Text> A plataforma Melter permite que usuários compartilhem 
              links em seus perfis. Alguns destes links podem direcionar para conteúdo adulto (+18) hospedado 
              em sites externos.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>5.2 Isenção de Responsabilidade:</Text> A Melter NÃO hospeda conteúdo adulto explícito 
              em seus servidores. Apenas permitimos links para sites externos. Ao clicar em um link, você 
              reconhece que está acessando conteúdo de terceiros sob sua própria responsabilidade.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>5.3 Verificação de Idade:</Text> É responsabilidade do usuário verificar se possui 
              idade legal para acessar conteúdo adulto em sua jurisdição. Vendedores que comercializam 
              conteúdo adulto devem confirmar explicitamente que são maiores de 18 anos e que estão cientes 
              das responsabilidades legais envolvidas.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>5.4 Responsabilidade do Vendedor de Conteúdo Adulto:</Text> Vendedores que comercializam 
              produtos ou serviços classificados como conteúdo adulto são inteiramente responsáveis por:
            </Text>
            <Text style={styles.bulletPoint}>• Garantir que todo conteúdo comercializado é de sua autoria ou possui licença adequada</Text>
            <Text style={styles.bulletPoint}>• Cumprir todas as leis e regulamentações aplicáveis ao conteúdo adulto em sua jurisdição</Text>
            <Text style={styles.bulletPoint}>• Manter registros adequados de consentimento e verificação de idade quando aplicável</Text>
            <Text style={styles.bulletPoint}>• Responder por quaisquer violações de direitos de terceiros relacionadas ao conteúdo comercializado</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>5.5 Conteúdo Proibido:</Text> É estritamente proibido compartilhar links ou comercializar:
            </Text>
            <Text style={styles.bulletPoint}>• Conteúdo ilegal (pornografia infantil, exploração, etc.)</Text>
            <Text style={styles.bulletPoint}>• Material que viole direitos autorais ou de propriedade intelectual</Text>
            <Text style={styles.bulletPoint}>• Conteúdo de violência extrema ou gore</Text>
            <Text style={styles.bulletPoint}>• Discurso de ódio, terrorismo ou atividades ilegais</Text>
            <Text style={styles.bulletPoint}>• Conteúdo de terceiros sem autorização expressa do titular dos direitos</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>5.6 Penalidades por Violação:</Text> Violações das políticas de conteúdo adulto podem resultar 
              em: remoção imediata do conteúdo, suspensão ou banimento permanente da conta, retenção de saldo em carteira, 
              e notificação às autoridades competentes quando aplicável.
            </Text>

            {/* 6. Responsabilidades do Usuário e Vendedor */}
            <Text style={styles.sectionTitle}>6. Responsabilidades do Usuário e Vendedor</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>6.1 Responsabilidades Gerais do Usuário:</Text> Você é inteiramente responsável por:
            </Text>
            <Text style={styles.bulletPoint}>• Todo conteúdo que você publica (posts, links, produtos, mensagens)</Text>
            <Text style={styles.bulletPoint}>• Manter a segurança de sua conta (senha, autenticação, dispositivos)</Text>
            <Text style={styles.bulletPoint}>• Usar a plataforma de forma ética e legal</Text>
            <Text style={styles.bulletPoint}>• Respeitar os direitos de outros usuários e terceiros</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>6.2 Responsabilidades Específicas do Vendedor:</Text> Se você opera uma loja na plataforma, 
              você é inteiramente responsável por:
            </Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.bold}>Propriedade e Direitos Autorais:</Text> Garantir que possui todos os direitos necessários 
              sobre os produtos/serviços que vende, incluindo direitos autorais, de imagem, marca e propriedade intelectual. 
              Você declara e garante que todo conteúdo comercializado é de sua autoria ou possui licença adequada do titular dos direitos.
            </Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.bold}>Conteúdo de Terceiros:</Text> É estritamente proibido comercializar conteúdo de terceiros sem 
              autorização expressa. Você se compromete a não vender, distribuir ou disponibilizar qualquer material que 
              viole direitos de propriedade intelectual, incluindo mas não limitado a: cursos, ebooks, softwares, imagens, 
              vídeos, músicas ou qualquer outro conteúdo protegido por direitos autorais sem a devida autorização.
            </Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.bold}>Entrega e Qualidade:</Text> Entregar produtos/serviços vendidos exatamente conforme descrito 
              na página do produto, dentro dos prazos anunciados, e com a qualidade prometida.
            </Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.bold}>Obrigações Fiscais e Legais:</Text> Cumprir todas as obrigações fiscais, tributárias e legais 
              relacionadas às suas vendas, incluindo emissão de notas fiscais quando aplicável, recolhimento de impostos, 
              e conformidade com regulamentações do seu setor.
            </Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.bold}>Pagamentos e Reembolsos:</Text> Processar reembolsos quando aplicável conforme políticas da 
              plataforma e legislação consumerista. Responder por disputas de pagamento e garantir que todas as transações 
              sejam legítimas.
            </Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.bold}>Violações de Terceiros:</Text> Você é inteiramente responsável por qualquer violação de direitos 
              de terceiros relacionada aos produtos/serviços que comercializa, incluindo mas não limitado a: violações de 
              direitos autorais, marcas registradas, direitos de imagem, privacidade, ou qualquer outro direito de propriedade 
              intelectual. A Melter não se responsabiliza por tais violações e você se compromete a indenizar e isentar a 
              Melter de qualquer responsabilidade decorrente.
            </Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.bold}>Conteúdo Adulto:</Text> Se comercializa conteúdo adulto, você é responsável por garantir conformidade 
              com todas as leis aplicáveis, verificação de idade quando necessário, e manutenção de registros adequados.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>6.3 Indenização:</Text> Você concorda em indenizar, defender e isentar a Melter, seus diretores, 
              funcionários e parceiros de qualquer reclamação, demanda, perda, responsabilidade e despesa (incluindo honorários 
              advocatícios) decorrentes de: (a) seu uso da plataforma; (b) violação destes termos; (c) violação de direitos de 
              terceiros; (d) produtos/serviços que você comercializa; ou (e) qualquer conteúdo que você publique.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>6.4 Penalidades por Violação:</Text> Violações das responsabilidades descritas nesta seção podem 
              resultar em: remoção imediata de produtos/conteúdo, suspensão ou banimento permanente da conta, retenção de saldo 
              em carteira, notificação às autoridades competentes, e ações legais quando aplicável.
            </Text>

            {/* 7. Sistema de Doações */}
            <Text style={styles.sectionTitle}>7. Sistema de Doações</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>7.1 Doações Voluntárias:</Text> Usuários com plano elegível (atualmente STARTER ou superior, 
              conforme <Text style={styles.bold}>/plans</Text>) podem receber doações de outros usuários. Qualquer usuário pode doar. 
              Doações são voluntárias e não reversíveis.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>7.2 Taxa sobre Doações:</Text> A plataforma retém uma taxa sobre todas as doações para 
              manutenção do serviço. Esta taxa é configurável e pode ser alterada conforme necessário. 
              Consulte a página /fees para verificar a taxa atual.
            </Text>

            {/* 8. Promoções e Publicidade */}
            <Text style={styles.sectionTitle}>8. Promoções e Campanhas Publicitárias</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>8.1 Posts Patrocinados:</Text> Usuários podem promover seus posts pagando com saldo da carteira 
              para aumentar sua visibilidade na plataforma (feed e áreas elegíveis da Melter).
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>8.1.1 Conteúdo permitido em posts patrocinados:</Text> O post promovido deve respeitar estes 
              Termos e as políticas da plataforma. É proibido promover conteúdo com imagens impróprias, nudez explícita, 
              violência gráfica, discurso de ódio, material ilegal, spam enganoso ou qualquer violação de direitos de terceiros.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>8.1.2 Remoção por violação (posts):</Text> Se um post patrocinado violar políticas da plataforma, 
              a promoção poderá ser <Text style={styles.bold}>removida imediatamente, sem aviso prévio e sem reembolso</Text> do valor pago 
              pela divulgação.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>8.2 Campanhas Publicitárias (customAd):</Text> Usuários podem criar campanhas publicitárias 
              direcionadas a categorias específicas ou ao público geral. As campanhas são criadas mediante 
              pagamento antecipado com saldo da carteira e ficam sujeitas à <Text style={styles.bold}>aprovação administrativa</Text> antes 
              de serem ativadas.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>8.2.1 Criativos e mídias (customAd):</Text> Imagens, textos e links da campanha devem ser 
              verdadeiros, adequados à categoria escolhida e livres de conteúdo proibido (incluindo nudez explícita, 
              violência, discriminação, material ilegal ou enganoso).
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>8.3 Remoção de Campanhas:</Text> Usuários podem remover suas próprias campanhas a 
              qualquer momento através do painel de promoções. <Text style={styles.bold}>IMPORTANTE:</Text> Ao remover uma 
              campanha voluntariamente, o usuário <Text style={styles.bold}>NÃO receberá reembolso</Text> do valor pago. 
              O valor já foi debitado e utilizado para manter a campanha ativa até o momento da remoção.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>8.4 Cancelamento Administrativo:</Text> Campanhas publicitárias (customAd), posts patrocinados 
              e promoções no marketplace podem ser canceladas ou removidas pelo administrador se violarem as políticas 
              da plataforma — inclusive por imagens impróprias, nudez explícita, violência, discurso de ódio ou conteúdo 
              ilegal. Em caso de cancelamento ou remoção por violação, <Text style={styles.bold}>não haverá reembolso</Text>. 
              Se uma campanha customAd for <Text style={styles.bold}>rejeitada durante o processo de aprovação inicial</Text>, o valor 
              será reembolsado automaticamente à carteira, conforme regras do sistema.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>8.5 Extensão de Campanhas:</Text> Usuários podem estender campanhas ativas ou finalizadas 
              adicionando mais dias, mediante novo pagamento calculado com base nas médias atuais de visualizações 
              e no custo por visualização vigente.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>8.6 Política de Reembolso:</Text> Reembolsos em promoções pagas são aplicados apenas em casos 
              de rejeição durante a aprovação inicial de campanhas customAd. Remoções voluntárias pelo usuário, 
              cancelamentos ou remoções por violação de políticas, término natural da campanha ou expiração do período 
              contratado <Text style={styles.bold}>não são elegíveis para reembolso</Text>.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>8.7 Promoção no marketplace (slider de lojas):</Text> Usuários com loja ativa podem promover 
              pacotes aprovados no carrossel do marketplace (<Text style={styles.bold}>/shops</Text>), mediante pagamento antecipado com 
              saldo da carteira, em pacotes de tempo (diária, semanal ou mensal). A campanha pode iniciar imediatamente 
              ou de forma programada, conforme opções da interface.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>8.7.1 Elegibilidade:</Text> A promoção depende de loja habilitada, pacote aprovado e demais 
              regras técnicas exibidas na plataforma. Não há aprovação administrativa prévia quando os requisitos de 
              elegibilidade forem atendidos; o débito na carteira confirma a contratação.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>8.7.2 Capa e criativos:</Text> O usuário é responsável pela capa exibida no slider (padrão do 
              pacote ou URL personalizada, quando disponível no plano). Imagens devem representar o pacote anunciado e 
              respeitar estes Termos.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>8.7.3 Cancelamento pelo usuário:</Text> O usuário pode cancelar a campanha ativa pelo painel de 
              promoções; a campanha deixa de ser exibida na hora, <Text style={styles.bold}>sem reembolso</Text> do valor já pago.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>8.7.4 Extensão:</Text> Campanhas ativas ou programadas podem ser estendidas mediante novo 
              pagamento; o tempo comprado é somado ao fim do período já contratado.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>8.7.5 Remoção por violação (marketplace):</Text> Campanhas no slider que violem políticas — 
              incluindo, sem limitação, imagens impróprias, nudez explícita, violência, discurso de ódio, conteúdo 
              ilegal ou publicidade enganosa — poderão ser <Text style={styles.bold}>removidas imediatamente, sem aviso prévio e sem 
              reembolso</Text>, além das demais penalidades previstas nestes Termos.
            </Text>

            {/* 9. Privacidade e Proteção de Dados (LGPD) */}
            <Text style={styles.sectionTitle}>9. Privacidade e Proteção de Dados (LGPD)</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>9.1 Conformidade com LGPD:</Text> A Melter está comprometida com a proteção dos seus dados pessoais 
              e cumpre rigorosamente a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD). Implementamos medidas 
              técnicas e organizacionais adequadas para garantir a segurança e privacidade das informações coletadas.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>9.2 Coleta de Dados:</Text> Coletamos informações necessárias para funcionamento 
              da plataforma: nome, email, telefone, data de nascimento, endereço IP, dados de pagamento (via Stripe), 
              documentos de verificação (quando aplicável para vendedores), e dados de navegação essenciais para 
              funcionalidades da plataforma.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>9.2.1 Permissões do App Móvel:</Text> O aplicativo móvel do Melter solicita as seguintes permissões para funcionamento:
            </Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Câmera:</Text> Para tirar fotos e gravar vídeos que você deseja postar no feed</Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Microfone:</Text> Para gravar áudio em vídeos que você deseja postar</Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Armazenamento/Galeria:</Text> Para acessar fotos e vídeos da sua galeria para postar no feed</Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Notificações:</Text> Para enviar notificações sobre interações, mensagens e atualizações da plataforma</Text>
            <Text style={styles.sectionText}>
              Todas essas permissões são utilizadas exclusivamente para as funcionalidades descritas acima. Você pode negar qualquer permissão, 
              mas isso pode limitar algumas funcionalidades do app. Não acessamos dados da câmera, microfone ou galeria sem sua autorização explícita.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>9.3 Uso dos Dados:</Text> Seus dados são usados exclusivamente para:
            </Text>
            <Text style={styles.bulletPoint}>• Funcionamento da plataforma (autenticação, perfil, mensagens, lojas)</Text>
            <Text style={styles.bulletPoint}>• Processamento de pagamentos e saques</Text>
            <Text style={styles.bulletPoint}>• Analytics e métricas de posts/perfil (dados agregados e anonimizados)</Text>
            <Text style={styles.bulletPoint}>• Prevenção de fraudes e moderação de conteúdo</Text>
            <Text style={styles.bulletPoint}>• Verificação de identidade para vendedores (conforme necessário)</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>9.4 Compartilhamento de Dados:</Text> Não vendemos seus dados pessoais. Compartilhamos apenas com:
            </Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Processadores de pagamento:</Text> Stripe (para processamento seguro de transações financeiras)</Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.bold}>Serviços de infraestrutura:</Text> AWS S3 (armazenamento de arquivos), MongoDB Atlas (banco de dados), 
              todos com certificações de segurança e conformidade com padrões internacionais
            </Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Autoridades competentes:</Text> Quando exigido por lei ou ordem judicial</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>9.5 Medidas de Segurança Implementadas:</Text> Implementamos múltiplas camadas de proteção para 
              garantir a segurança dos seus dados:
            </Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Criptografia:</Text> Dados sensíveis são criptografados em trânsito (HTTPS/TLS) e em repouso</Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Autenticação:</Text> Sistema de autenticação seguro com tokens e validação de identidade</Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Monitoramento:</Text> Sistemas de monitoramento contínuo para detectar atividades suspeitas</Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Backups:</Text> Backups regulares e seguros dos dados essenciais</Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Controles de Acesso:</Text> Acesso restrito aos dados apenas para pessoal autorizado e treinado</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>9.6 Proteção em Caso de Incidentes de Segurança:</Text> Embora implementemos medidas robustas 
              de segurança, nenhum sistema é completamente imune a riscos externos. Em caso de incidente de segurança 
              que possa afetar seus dados pessoais:
            </Text>
            <Text style={styles.bulletPoint}>
              • Notificaremos os usuários afetados e a Autoridade Nacional de Proteção de Dados (ANPD) conforme 
              exigido pela LGPD, no prazo legal estabelecido
            </Text>
            <Text style={styles.bulletPoint}>• Tomaremos medidas imediatas para conter e mitigar o incidente</Text>
            <Text style={styles.bulletPoint}>• Investigaremos a causa raiz e implementaremos correções para prevenir recorrências</Text>
            <Text style={styles.bulletPoint}>• Forneceremos orientações sobre medidas que os usuários podem tomar para proteger suas informações</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>9.7 Limitação de Responsabilidade em Incidentes:</Text> A Melter não se responsabiliza por 
              danos decorrentes de incidentes de segurança causados por fatores externos fora de nosso controle razoável, 
              incluindo, mas não se limitando a: ataques cibernéticos sofisticados, falhas em serviços de terceiros 
              (Stripe, AWS, MongoDB), ou ações de terceiros mal-intencionados que ultrapassem as medidas de segurança 
              padrão da indústria. Nos comprometemos a manter nossos sistemas atualizados com as melhores práticas de 
              segurança, mas reconhecemos que a segurança digital é um campo em constante evolução.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>9.8 Direitos do Titular dos Dados (LGPD):</Text> Você tem os seguintes direitos sobre seus dados pessoais:
            </Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Confirmação e Acesso:</Text> Confirmar a existência de tratamento e acessar seus dados</Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Correção:</Text> Solicitar correção de dados incompletos, inexatos ou desatualizados</Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.bold}>Anonimização, Bloqueio ou Eliminação:</Text> Solicitar anonimização, bloqueio ou eliminação 
              de dados desnecessários, excessivos ou tratados em desconformidade com a LGPD
            </Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Portabilidade:</Text> Solicitar a portabilidade dos dados para outro fornecedor de serviço</Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Revogação do Consentimento:</Text> Revogar seu consentimento a qualquer momento (quando aplicável)</Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.bold}>Informação sobre Compartilhamento:</Text> Obter informações sobre entidades públicas e privadas 
              com as quais compartilhamos dados
            </Text>
            <Text style={styles.sectionText}>
              Para exercer seus direitos, entre em contato através do email: <Text style={styles.bold}>privacidade@melter.com.br</Text>
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>9.9 Retenção de Dados:</Text> Mantemos seus dados pessoais apenas pelo tempo necessário para 
              cumprir as finalidades para as quais foram coletados, ou conforme exigido por lei. Dados de transações 
              financeiras são mantidos conforme exigências legais e fiscais. Ao encerrar sua conta, seus dados serão 
              excluídos ou anonimizados, exceto quando a retenção for necessária por obrigações legais.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>9.10 Visibilidade de imagens e mídias:</Text> Para transparência sobre o que é público na plataforma:
            </Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Foto de perfil (avatar):</Text> pública — visível a outros usuários conforme as configurações do perfil e da plataforma.</Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Documentos enviados para validação de vendedor:</Text> privados — acessíveis apenas à equipe de verificação/administração autorizada, para fins de conformidade e segurança.</Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Capas/imagens de produtos na loja:</Text> públicas — exibidas na vitrine e páginas de produto acessíveis conforme visibilidade da loja.</Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Vídeo de apresentação do pacote:</Text> público após aprovação — teaser na vitrine (Saiba mais) e no modal de compra; conta na cota do pacote.</Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Imagens em posts:</Text> conteúdo da plataforma com visibilidade conforme o feed e regras de acesso; em geral, expostas a todos os usuários da Melter no contexto social da plataforma (não são arquivos privados fora do ecossistema Melter), salvo recursos específicos de privacidade que venham a ser oferecidos.</Text>

            {/* 10. Moderação e Denúncias */}
            <Text style={styles.sectionTitle}>10. Moderação de Conteúdo</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>10.1 Sistema de Denúncias:</Text> Usuários podem denunciar perfis, posts e produtos 
              que violem estes termos. Denúncias são analisadas pelo administrador.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>10.2 Penalidades:</Text> Violações podem resultar em:
            </Text>
            <Text style={styles.bulletPoint}>• Advertência</Text>
            <Text style={styles.bulletPoint}>• Suspensão temporária (impossibilidade de postar, vender, etc.)</Text>
            <Text style={styles.bulletPoint}>• Banimento permanente da plataforma</Text>
            <Text style={styles.bulletPoint}>• Retenção de saldo em casos graves</Text>

            {/* 11. Isenção de Responsabilidade */}
            <Text style={styles.sectionTitle}>11. Isenção de Responsabilidade</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>11.1 Natureza da Plataforma:</Text> A Melter atua exclusivamente como uma plataforma intermediária, 
              fornecendo infraestrutura tecnológica para que usuários possam interagir, criar conteúdo e realizar transações. 
              Não somos parte nas transações entre usuários, não possuímos, controlamos ou garantimos produtos/serviços vendidos 
              por vendedores.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>11.2 Limitações de Responsabilidade:</Text> A plataforma Melter:
            </Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.bold}>Não se responsabiliza</Text> por produtos/serviços vendidos por usuários, incluindo qualidade, 
              entrega, conformidade legal, ou qualquer aspecto relacionado
            </Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.bold}>Não garante</Text> a qualidade, legalidade, veracidade, autenticidade ou conformidade de qualquer 
              conteúdo publicado por usuários
            </Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.bold}>Não se responsabiliza</Text> por links externos compartilhados por usuários, incluindo conteúdo 
              adulto, sites de terceiros, ou qualquer destino fora de nossos servidores
            </Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.bold}>Não se responsabiliza</Text> por violações de direitos autorais, marcas registradas, ou propriedade 
              intelectual cometidas por usuários. A responsabilidade é exclusiva do usuário que cometeu a violação
            </Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.bold}>Não se responsabiliza</Text> por disputas entre compradores e vendedores, embora possamos 
              fornecer ferramentas de mediação quando apropriado
            </Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.bold}>Não garante</Text> disponibilidade ininterrupta do serviço, embora nos esforcemos para manter 
              alta disponibilidade
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>11.3 Responsabilidade por Conteúdo de Terceiros:</Text> Todo conteúdo publicado na plataforma é de 
              responsabilidade exclusiva do usuário que o publicou. A Melter não revisa, edita ou controla previamente o 
              conteúdo publicado. Embora implementemos sistemas de moderação e denúncia, não garantimos que todo conteúdo 
              inadequado será detectado ou removido imediatamente.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>11.4 Limitação de Danos:</Text> Na máxima extensão permitida por lei, a Melter não será responsável 
              por danos diretos, indiretos, incidentais, especiais, consequenciais ou punitivos, incluindo mas não limitado 
              a: perda de lucros, perda de dados, perda de oportunidades de negócio, ou qualquer outro dano decorrente do uso 
              ou incapacidade de usar a plataforma.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>11.5 Exceções Legais:</Text> Nada nestes termos limita nossa responsabilidade em casos de dolo, 
              culpa grave, ou quando a limitação for vedada por lei aplicável.
            </Text>

            {/* 12. Cancelamento e Encerramento */}
            <Text style={styles.sectionTitle}>12. Cancelamento de Conta</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>12.1 Pelo Usuário:</Text> Você pode cancelar sua conta a qualquer momento. 
              Saldo restante pode ser sacado conforme regras de saque.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>12.2 Pela Plataforma:</Text> Podemos encerrar contas que violem estes termos, 
              com ou sem aviso prévio.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>12.3 Cancelamento de planos da plataforma (LITE, STARTER, PRO, PRO+):</Text>
            </Text>
            <Text style={styles.bulletPoint}>
              • Você pode cancelar a assinatura do plano a qualquer momento nas configurações ou em <Text style={styles.bold}>/plans</Text>.
            </Text>
            <Text style={styles.bulletPoint}>
              • O cancelamento interrompe novas cobranças. Fora da janela de experimentação, o acesso aos
              benefícios permanece até o fim do período já pago (data de expiração exibida na conta).
            </Text>
            <Text style={styles.bulletPoint}>
              • Na janela de experimentação (quando aplicável): cancelar em até 7 dias após a adesão encerra
              o acesso na hora e gera solicitação de reembolso integral da primeira cobrança.
            </Text>
            <Text style={styles.bulletPoint}>
              • Fora dessa janela, não há reembolso proporcional do tempo não utilizado, salvo quando a lei
              aplicável exigir.
            </Text>
            <Text style={styles.bulletPoint}>
              • Downgrade para plano inferior pode ser agendado para após o término do período atual; upgrade pode exigir novo checkout conforme a interface.
            </Text>
            <Text style={styles.bulletPoint}>
              • Após a expiração, a conta volta aos limites do plano gratuito (FREE), e recursos exclusivos podem ser desativados ou ajustados conforme as regras vigentes.
            </Text>

            {/* 13. Sistema de Indicações */}
            <Text style={styles.sectionTitle}>13. Sistema de Indicações e Níveis</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>13.1 Programa de Indicações:</Text> A Melter oferece um sistema de indicações baseado em níveis e pontos, onde usuários podem ganhar recompensas por indicar novos usuários que façam compras na plataforma.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>13.2 Como Funciona:</Text> Cada usuário possui um link de indicação único. Quando um novo usuário se cadastra através deste link e realiza compras ou upgrades, o indicador ganha pontos que podem ser trocados por recompensas.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>13.3 Sistema de Pontos:</Text> Os pontos são ganhos da seguinte forma:
            </Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Compras dos indicados:</Text> 1 ponto para cada R$ 100 gastos</Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Upgrade para STARTER:</Text> 1 ponto por upgrade</Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Upgrade para PRO:</Text> 2 pontos por upgrade</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>13.4 Sistema de Níveis:</Text> Os usuários podem atingir diferentes níveis baseados em:
            </Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Número de indicações ativas</Text></Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Valor total gasto pelos indicados</Text></Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Pontos acumulados</Text></Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>13.5 Recompensas por Nível:</Text> Cada nível oferece recompensas específicas, como meses gratuitos de planos STARTER ou PRO. As recompensas são aplicadas automaticamente quando o usuário atinge um novo nível.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>13.6 Alterações e Encerramento do Programa:</Text> A Melter reserva-se o direito de:
            </Text>
            <Text style={styles.bulletPoint}>• Alterar requisitos de níveis, pontos e recompensas a qualquer momento</Text>
            <Text style={styles.bulletPoint}>• Ativar, alterar ou desativar o acumulo mensal de pontos e gastos sem aviso prévio</Text>
            <Text style={styles.bulletPoint}>• Suspender temporariamente o programa de indicações</Text>
            <Text style={styles.bulletPoint}>• Encerrar definitivamente o programa com aviso prévio de 30 dias</Text>
            <Text style={styles.bulletPoint}>• Não nos comprometemos com a manutenção vitalícia do programa</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>13.7 Proibições:</Text> É proibido:
            </Text>
            <Text style={styles.bulletPoint}>• Criar contas falsas para se auto-indicar</Text>
            <Text style={styles.bulletPoint}>• Usar bots ou sistemas automatizados para gerar indicações</Text>
            <Text style={styles.bulletPoint}>• Spam ou envio massivo de links de indicação</Text>
            <Text style={styles.bulletPoint}>• Qualquer forma de fraude no sistema de indicações</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>13.8 Penalidades:</Text> Violações das regras do sistema de indicações podem resultar em perda de pontos acumulados, suspensão do programa para o usuário ou banimento da plataforma.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>13.9 Programa de Afiliados (cupons):</Text> O programa de afiliados é distinto do sistema de indicações (cláusula 13 em geral). Nele, o afiliado divulga a Melter com um <Text style={styles.bold}>cupom exclusivo</Text> e pode receber comissão percentual sobre compras elegíveis feitas com esse cupom.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>13.9.1 Quem pode solicitar:</Text> Em regra, usuários com plano <Text style={styles.bold}>PRO ou PRO+</Text> e <Text style={styles.bold}>selo verificado (badge)</Text> ativo. A Melter pode, a seu critério, atrelar afiliados manualmente. A aprovação é discricionária e pode ser condicionada a análise de redes, alcance e demais critérios internos.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>13.9.2 Como solicitar:</Text> Acesse a página de afiliados na plataforma, informe ao menos uma rede de divulgação (URL/@handle, métricas e prints de comprovação) e envie a solicitação. Após análise, você será notificado sobre aprovação ou rejeição. Em caso de aprovação, um cupom de afiliado é criado e vinculado à sua conta.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>13.9.3 Como funciona a comissão:</Text> A comissão é um percentual sobre o valor da compra elegível, conforme faixas configuradas pela Melter. O crédito é feito na carteira do afiliado após a confirmação da compra. Compras elegíveis tipicamente incluem produtos avulsos, planos Melter adquiridos via carteira e, quando aplicável, a <Text style={styles.bold}>primeira</Text> cobrança de assinatura Melter em gateway. <Text style={styles.bold}>Recargas de carteira e renovações de assinatura não geram comissão.</Text>
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>13.9.4 Alterações e suspensão:</Text> Percentuais, faixas, fontes elegíveis e o próprio programa podem ser alterados, suspensos ou encerrados pela Melter a qualquer momento, sem aviso prévio e sem direito a indenização por expectativas de ganhos futuros. Fraude, auto-compra abusiva, uso indevido do cupom ou violação destes Termos podem resultar em cancelamento do afiliado, estorno de comissões e outras sanções previstas nestes Termos.
            </Text>

            {/* 14. Alterações nos Termos */}
            <Text style={styles.sectionTitle}>14. Alterações nestes Termos</Text>
            <Text style={styles.sectionText}>
              Podemos atualizar estes termos periodicamente. Quando houver alterações significativas:
            </Text>
            <Text style={styles.bulletPoint}>• Você será notificado via email e alert na plataforma</Text>
            <Text style={styles.bulletPoint}>• Será necessário aceitar os novos termos para continuar usando</Text>
            <Text style={styles.bulletPoint}>• Seu acesso será limitado até que aceite a nova versão</Text>

            {/* 15. Contato */}
            <Text style={styles.sectionTitle}>15. Contato</Text>
            <Text style={styles.sectionText}>
              Para dúvidas sobre estes termos, entre em contato:
            </Text>
            <Text style={styles.bulletPoint}>• Email: contato@melter.com.br</Text>
            <Text style={styles.bulletPoint}>• Suporte: suporte@melter.com.br</Text>

            {/* 16. Comunicações (e-mail e telefone) */}
            <Text style={styles.sectionTitle}>16. Comunicações por E-mail e Telefone</Text>
            <Text style={styles.sectionText}>
              Ao aceitar estes Termos de Uso, você autoriza a Melter a utilizar o <Text style={styles.bold}>e-mail</Text> e/ou <Text style={styles.bold}>telefone</Text> cadastrados para comunicações relacionadas à plataforma, incluindo:
            </Text>
            <Text style={styles.bulletPoint}>• Marketing, promoções, novidades e ofertas (conforme preferências e legislação aplicável)</Text>
            <Text style={styles.bulletPoint}>• Notificações de mensagens e interações no perfil (curtidas, comentários, seguidores, menções, etc.)</Text>
            <Text style={styles.bulletPoint}>• Alertas úteis sobre conta, segurança, planos, carteira, loja e assinaturas</Text>
            <Text style={styles.bulletPoint}>• Dicas, tutoriais e atualizações de produtos e serviços da Melter</Text>
            <Text style={styles.bulletPoint}>• SMS, WhatsApp ou notificações push, quando disponíveis</Text>
            <Text style={styles.sectionText}>
              Você pode ajustar preferências de marketing nas configurações da conta ou entrando em contato conosco. 
              Mesmo com opt-out de marketing, poderemos enviar comunicações essenciais (segurança, termos, transações, 
              cobranças e avisos legais).
            </Text>

            {/* 17. Lei Aplicável */}
            <Text style={styles.sectionTitle}>17. Lei Aplicável</Text>
            <Text style={styles.sectionText}>
              Estes termos são regidos pelas leis da República Federativa do Brasil. 
              Qualquer disputa será resolvida no foro da comarca de Canoas - RS, Brasil.
            </Text>
          </ScrollView>

          <View style={styles.divider} />

          {/* Aceite */}
          {user && needsAcceptance ? (
            <View>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setAccepted(!accepted)}
              >
                <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
                  {accepted && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>
                  Li e aceito os Termos de Uso e Política de Privacidade (Versão {CURRENT_TERMS_VERSION})
                </Text>
              </TouchableOpacity>

              <View style={styles.infoAlert}>
                <Text style={styles.infoAlertText}>
                  <Text style={styles.bold}>Comunicações:</Text> Ao aceitar os termos, você autoriza o uso do seu e-mail e telefone para 
                  marketing, notificações de mensagens e interações no perfil, além de avisos úteis da plataforma (seção 16). 
                  Você pode ajustar preferências de marketing nas configurações da conta.
                </Text>
              </View>

              <Button
                variant="primary"
                responsive={false}
                onPress={handleAccept}
                loading={accepting}
                disabled={!accepted || accepting}
              >
                Aceitar e Continuar
              </Button>
            </View>
          ) : user && !needsAcceptance ? (
            <View style={styles.successAlert}>
              <Text style={styles.successAlertText}>
                ✅ Você já aceitou a versão atual dos termos em{' '}
                {user.termsAndPrivacy?.terms?.acceptedAt 
                  ? formatDate(user.termsAndPrivacy.terms.acceptedAt)
                  : 'data desconhecida'}
              </Text>
              <Text style={styles.successAlertSubtext}>
                Versão aceita: {user.termsAndPrivacy?.terms?.version || '1.0'}
              </Text>
            </View>
          ) : (
            <View style={styles.infoAlert}>
              <Text style={styles.infoAlertText}>
                Faça login para aceitar os termos de uso
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (c: AppPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background.default,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: c.background.default,
    borderBottomWidth: 1,
    borderBottomColor: c.border.medium,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: c.text.primary,
    marginLeft: 12,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: c.background.paper,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: c.border.medium,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: c.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    color: c.text.secondary,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: c.border.medium,
    marginVertical: 16,
  },
  warningAlert: {
    backgroundColor: c.states.warning + '20',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: c.states.warning,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: c.states.warning,
    marginBottom: 4,
  },
  alertText: {
    fontSize: 12,
    color: c.text.secondary,
  },
  termsContent: {
    maxHeight: 400,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: c.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: c.text.primary,
    lineHeight: 20,
    marginBottom: 12,
  },
  bold: {
    fontWeight: 'bold',
  },
  bulletPoint: {
    fontSize: 14,
    color: c.text.primary,
    lineHeight: 20,
    marginLeft: 16,
    marginBottom: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: c.border.medium,
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: c.primary.main,
    borderColor: c.primary.main,
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: c.text.primary,
    lineHeight: 20,
  },
  infoAlert: {
    backgroundColor: c.states.info + '20',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: c.states.info,
  },
  infoAlertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: c.states.info,
    marginBottom: 4,
  },
  infoAlertText: {
    fontSize: 12,
    color: c.text.secondary,
  },
  successAlert: {
    backgroundColor: c.states.success + '20',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.states.success,
  },
  successAlertText: {
    fontSize: 14,
    color: c.states.success,
    marginBottom: 4,
  },
  successAlertSubtext: {
    fontSize: 12,
    color: c.text.secondary,
  },
});
