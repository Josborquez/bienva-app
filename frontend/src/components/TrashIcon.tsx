import Svg, { Path } from 'react-native-svg';
import { theme } from '../theme';

export function TrashIcon({ size = 20, color = theme.colors.muted }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
  </Svg>;
}
