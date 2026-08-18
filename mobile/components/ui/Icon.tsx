import { withUniwind } from 'uniwind';
import Ionicons from '@expo/vector-icons/Ionicons';

const StyledIonicons = withUniwind(Ionicons);

interface IconProps {
  name: React.ComponentProps<typeof Ionicons>['name'];
  className?: string;
  size?: number;
  color?: string;
}

export function Icon({ name, className, size = 24, ...props }: IconProps) {
  return (
    <StyledIonicons
      name={name}
      size={size}
      className={className}
      {...props}
    />
  );
}
