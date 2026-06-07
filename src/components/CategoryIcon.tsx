import React from 'react';
import { 
  ShoppingCart, 
  Utensils, 
  Car, 
  Home, 
  Sparkles, 
  HeartPulse, 
  HelpCircle,
  Briefcase,
  GraduationCap,
  Plane,
  Smartphone,
  Gift,
  Zap,
  Coffee,
  Palette,
  Music,
  Gamepad,
  Ticket,
  LucideProps
} from 'lucide-react';

export const iconMap: Record<string, React.ComponentType<LucideProps>> = {
  ShoppingCart,
  Utensils,
  Car,
  Home,
  Sparkles,
  HeartPulse,
  Briefcase,
  GraduationCap,
  Plane,
  Smartphone,
  Gift,
  Zap,
  Coffee,
  Palette,
  Music,
  Gamepad,
  Ticket,
};

export const AVAILABLE_ICONS = Object.keys(iconMap);

interface CategoryIconProps extends Omit<LucideProps, 'ref'> {
  name: string;
  className?: string;
}

export default function CategoryIcon({ name, ...props }: CategoryIconProps) {
  const IconComponent = iconMap[name] || HelpCircle;
  return <IconComponent {...props} />;
}


