function hexToHsl(hex) {
  hex = hex.replace(/^#/, '');
  let r = parseInt(hex.substring(0,2), 16) / 255;
  let g = parseInt(hex.substring(2,4), 16) / 255;
  let b = parseInt(hex.substring(4,6), 16) / 255;
  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if(max == min) { h = s = 0; }
  else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch(max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
console.log('--background: ' + hexToHsl('#0A0F1C'));
console.log('--sidebar-background: ' + hexToHsl('#0D1626'));
console.log('--card: ' + hexToHsl('#131A2C'));
console.log('--popover: ' + hexToHsl('#1A2238'));
console.log('--border: ' + hexToHsl('#1F2E47'));
console.log('--input: ' + hexToHsl('#1F2E47'));
console.log('--accent: ' + hexToHsl('#2B3B56'));
console.log('--foreground: ' + hexToHsl('#E8EDF2'));
console.log('--sidebar-foreground: ' + hexToHsl('#E8EDF2'));
console.log('--muted-foreground: ' + hexToHsl('#94A3B8'));
console.log('--primary: ' + hexToHsl('#006065'));
console.log('--primary-hover: ' + hexToHsl('#007A7C'));
