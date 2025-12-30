import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BackButton } from '../components/BackButton';
import { COLORS } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';
import { userApi } from '../services/api';
import { showToast } from '../components/CustomToast';
import { CURRENT_TERMS_VERSION } from '../constants/terms';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function TermsScreen() {
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
    setNeedsAcceptance(!hasAccepted || userTermsVersion !== CURRENT_TERMS_VERSION);
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
            Última atualização: 26 de Janeiro de 2025 • Versão {CURRENT_TERMS_VERSION}
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

            {/* 4. Produtos Digitais */}
            <Text style={styles.sectionTitle}>4. Produtos Digitais e Políticas de Compra</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>4.1 Tipos de Produto:</Text> A plataforma suporta três tipos de produtos:
            </Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Produtos Digitais:</Text> Acesso permanente após compra (cursos, ebooks, softwares, etc.)</Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Produtos Físicos:</Text> Envio físico do produto para o endereço do comprador</Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Assinaturas:</Text> Acesso recorrente com cobrança periódica através de planos de assinatura</Text>

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

            {/* 6. Responsabilidades */}
            <Text style={styles.sectionTitle}>6. Responsabilidades do Usuário e Vendedor</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>6.1 Responsabilidades Gerais do Usuário:</Text> Você é inteiramente responsável por:
            </Text>
            <Text style={styles.bulletPoint}>• Todo conteúdo que você publica (posts, links, produtos, mensagens)</Text>
            <Text style={styles.bulletPoint}>• Manter a segurança de sua conta (senha, autenticação, dispositivos)</Text>
            <Text style={styles.bulletPoint}>• Usar a plataforma de forma ética e legal</Text>
            <Text style={styles.bulletPoint}>• Respeitar os direitos de outros usuários e terceiros</Text>

            {/* 7. Doações */}
            <Text style={styles.sectionTitle}>7. Sistema de Doações</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>7.1 Doações Voluntárias:</Text> Usuários podem receber doações de outros usuários. 
              Doações são voluntárias e não reversíveis.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>7.2 Taxa sobre Doações:</Text> A plataforma retém uma taxa sobre todas as doações para 
              manutenção do serviço. Esta taxa é configurável e pode ser alterada conforme necessário.
            </Text>

            {/* 8. Promoções */}
            <Text style={styles.sectionTitle}>8. Promoções e Campanhas Publicitárias</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>8.1 Posts Patrocinados:</Text> Usuários podem promover seus posts pagando para 
              aumentar sua visibilidade na plataforma.
            </Text>

            {/* 9. Privacidade LGPD */}
            <Text style={styles.sectionTitle}>9. Privacidade e Proteção de Dados (LGPD)</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>9.1 Conformidade com LGPD:</Text> A Melter está comprometida com a proteção dos seus dados pessoais 
              e cumpre rigorosamente a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD).
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>9.2 Coleta de Dados:</Text> Coletamos informações necessárias para funcionamento 
              da plataforma: nome, email, telefone, data de nascimento, endereço IP, dados de pagamento (via Stripe), 
              documentos de verificação (quando aplicável para vendedores), e dados de navegação essenciais.
            </Text>

            {/* 10. Moderação */}
            <Text style={styles.sectionTitle}>10. Moderação de Conteúdo</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>10.1 Sistema de Denúncias:</Text> Usuários podem denunciar perfis, posts e produtos 
              que violem estes termos. Denúncias são analisadas pelo administrador.
            </Text>

            {/* 11. Isenção */}
            <Text style={styles.sectionTitle}>11. Isenção de Responsabilidade</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>11.1 Natureza da Plataforma:</Text> A Melter atua exclusivamente como uma plataforma intermediária, 
              fornecendo infraestrutura tecnológica para que usuários possam interagir, criar conteúdo e realizar transações.
            </Text>

            {/* 12. Cancelamento */}
            <Text style={styles.sectionTitle}>12. Cancelamento de Conta</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>12.1 Pelo Usuário:</Text> Você pode cancelar sua conta a qualquer momento. 
              Saldo restante pode ser sacado conforme regras de saque.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>12.2 Pela Plataforma:</Text> Podemos encerrar contas que violem estes termos, 
              com ou sem aviso prévio.
            </Text>

            {/* 13. Indicações */}
            <Text style={styles.sectionTitle}>13. Sistema de Indicações e Níveis</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>13.1 Programa de Indicações:</Text> A Melter oferece um sistema de indicações baseado em níveis e pontos, onde usuários podem ganhar recompensas por indicar novos usuários que façam compras na plataforma.
            </Text>

            {/* 14. Alterações */}
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

            {/* 16. Marketing */}
            <Text style={styles.sectionTitle}>16. Consentimento para Comunicações de Marketing</Text>
            <Text style={styles.sectionText}>
              Ao aceitar estes Termos de Uso, você consente em receber comunicações de marketing da plataforma Melter, incluindo:
            </Text>
            <Text style={styles.bulletPoint}>• Emails promocionais sobre novos recursos e funcionalidades</Text>
            <Text style={styles.bulletPoint}>• Dicas e tutoriais para melhor aproveitamento da plataforma</Text>
            <Text style={styles.bulletPoint}>• Ofertas especiais e campanhas promocionais</Text>
            <Text style={styles.sectionText}>
              Você pode retirar seu consentimento a qualquer momento através das configurações da sua conta.
            </Text>

            {/* 17. Lei */}
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
                <Text style={styles.infoAlertTitle}>Consentimento para Marketing</Text>
                <Text style={styles.infoAlertText}>
                  Ao aceitar os termos, você também consente em receber emails promocionais, dicas, tutoriais e atualizações da plataforma. Você pode retirar este consentimento a qualquer momento nas configurações da sua conta.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.acceptButton, (!accepted || accepting) && styles.acceptButtonDisabled]}
                onPress={handleAccept}
                disabled={!accepted || accepting}
              >
                {accepting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.acceptButtonText}>Aceitar e Continuar</Text>
                )}
              </TouchableOpacity>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background.default,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.medium,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginLeft: 12,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border.medium,
    marginVertical: 16,
  },
  warningAlert: {
    backgroundColor: COLORS.states.warning + '20',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.states.warning,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.states.warning,
    marginBottom: 4,
  },
  alertText: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  termsContent: {
    maxHeight: 400,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 20,
    marginBottom: 12,
  },
  bold: {
    fontWeight: 'bold',
  },
  bulletPoint: {
    fontSize: 14,
    color: COLORS.text.primary,
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
    borderColor: COLORS.border.medium,
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary.main,
    borderColor: COLORS.primary.main,
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  infoAlert: {
    backgroundColor: COLORS.states.info + '20',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.states.info,
  },
  infoAlertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.states.info,
    marginBottom: 4,
  },
  infoAlertText: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  acceptButton: {
    backgroundColor: COLORS.primary.main,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonDisabled: {
    opacity: 0.5,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  successAlert: {
    backgroundColor: COLORS.states.success + '20',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.states.success,
  },
  successAlertText: {
    fontSize: 14,
    color: COLORS.states.success,
    marginBottom: 4,
  },
  successAlertSubtext: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
});

