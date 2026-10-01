import {
  Rocket, Briefcase, Zap, Star, Layout, Database, Terminal, CheckCircle, 
  Lightbulb, Compass, Target, Navigation, Crown, Award, Book, Command,
  Box, Hexagon, Shield, Package, Cpu, Code, Smartphone, Monitor,
  Music, Camera, Gamepad, Folder, Archive, Paperclip, Activity, Layers
} from 'lucide-react';

const ICONS = [
  Rocket, Briefcase, Zap, Star, Layout, Database, Terminal, CheckCircle,
  Lightbulb, Compass, Target, Navigation, Crown, Award, Book, Command,
  Box, Hexagon, Shield, Package, Cpu, Code, Smartphone, Monitor,
  Music, Camera, Gamepad, Folder, Archive, Paperclip, Activity
];

export const getSpaceIcon = (name) => {
  if (!name) return Layers;
  
  // Deterministic index based on string characters
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % ICONS.length;
  return ICONS[index];
};
