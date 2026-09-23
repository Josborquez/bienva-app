import { ActivityIndicator, Text } from 'react-native';
import { Screen } from './Screen';
import { theme } from '../theme';
import { es } from '../i18n/es';

export function LoadingScreen() {
  return <Screen><ActivityIndicator color={theme.colors.primary} size="large" /><Text style={{ textAlign: 'center', color: theme.colors.muted }}>{es.auth.loading}</Text></Screen>;
}
