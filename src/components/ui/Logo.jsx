import React from 'react';
import { WeftroLogo, KerintLogo, CliPadLogo } from './CliPadLogo';

export { WeftroLogo, KerintLogo, CliPadLogo };

export function Logo({ className = '', style = {}, height = 28, hideText = false }) {
  return <WeftroLogo height={height} className={className} style={style} iconOnly={hideText} />;
}

export default WeftroLogo;
