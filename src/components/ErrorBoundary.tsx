import React, { Component, type ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: { componentStack?: string } | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Логируем в консоль и сохраняем для отображения
    console.error('[EBOUNDARY]', error, errorInfo);
    try {
      // Опционально: отправить в API (можно раскомментировать)
      // const { default: ApiService } = require('../services/apiService');
      // ApiService.request('/logs/client', { method: 'POST', body: { error: String(error), stack: error?.stack, info: errorInfo }}).catch(() => {});
    } catch {
      // Ignore errors in error handler
    }
    this.setState({ errorInfo: errorInfo ? { componentStack: errorInfo.componentStack || undefined } : null });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const stack = this.state.error?.stack || this.state.errorInfo?.componentStack || 'no stack';
      const errorMessage = String(this.state.error) || 'Unknown error';

      return (
        <View style={styles.wrap}>
          <Text style={styles.title}>App crashed</Text>
          <ScrollView style={styles.box} contentContainerStyle={styles.boxContent}>
            <Text selectable style={styles.msg}>{errorMessage}</Text>
            <Text selectable style={styles.stack}>{stack}</Text>
          </ScrollView>
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>Debug screen. Collecting stack trace.</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#0B0B0B',
    paddingTop: 48,
    paddingHorizontal: 12,
  },
  title: {
    color: '#ff5555',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  box: {
    backgroundColor: '#121212',
    borderRadius: 12,
    maxHeight: '80%',
  },
  boxContent: {
    padding: 12,
  },
  msg: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
  },
  stack: {
    color: '#bfbfbf',
    fontSize: 12,
    lineHeight: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    color: '#888',
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center',
  },
});

