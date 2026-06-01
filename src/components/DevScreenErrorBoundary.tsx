import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

type Props = { children: ReactNode; screenName: string };
type State = { error: Error | null; componentStack: string };

/** Em __DEV__, mostra crash de render na tela e loga no Metro (erros que fecham o app nativo não passam aqui). */
export class DevScreenErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const stack = info.componentStack ?? '';
    this.setState({ componentStack: stack });
    console.error(`[CRASH ${this.props.screenName}]`, error.message, error.stack);
    console.error(`[CRASH ${this.props.screenName}] componentStack:`, stack);
  }

  render() {
    if (!__DEV__ || !this.state.error) {
      return this.props.children;
    }

    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Erro em {this.props.screenName}</Text>
        <Text style={styles.message}>{this.state.error.message}</Text>
        <ScrollView style={styles.scroll}>
          <Text style={styles.mono}>{this.state.error.stack}</Text>
          {this.state.componentStack ? (
            <Text style={styles.mono}>{this.state.componentStack}</Text>
          ) : null}
        </ScrollView>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => this.setState({ error: null, componentStack: '' })}
        >
          <Text style={styles.btnText}>Tentar de novo</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16, backgroundColor: '#1e1b4b' },
  title: { color: '#f472b6', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  message: { color: '#fff', fontSize: 15, marginBottom: 12 },
  scroll: { flex: 1, marginBottom: 12 },
  mono: { color: '#cbd5e1', fontSize: 11, fontFamily: 'monospace' },
  btn: {
    backgroundColor: '#B63385',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600' },
});
