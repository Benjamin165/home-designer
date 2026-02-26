// WCAG Contrast Ratio Calculator
// Checks if color combinations meet WCAG AA standards

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  const rgb = {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  };
  console.log(`Converted ${hex} to RGB(${rgb.r}, ${rgb.g}, ${rgb.b})`);
  return rgb;
}

function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    if (c <= 0.03928) {
      const val = c / 12.92;
      return val;
    } else {
      const val = Math.pow((c + 0.055) / 1.055, 2.4);
      return val;
    }
  });
  const lum = 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  return lum;
}

function getContrastRatio(hex1, hex2) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  const ratio = (brightest + 0.05) / (darkest + 0.05);
  return ratio;
}

// Tailwind color definitions
const colors = {
  white: '#ffffff',
  'gray-50': '#f9fafb',
  'gray-200': '#e5e7eb',
  'gray-300': '#d1d5db',
  'gray-400': '#9ca3af',
  'gray-500': '#6b7280',
  'gray-600': '#4b5563',
  'gray-700': '#374151',
  'gray-800': '#1f2937',
  'gray-900': '#111827',
  'blue-600': '#2563eb',
  'blue-700': '#1d4ed8',
  'red-600': '#dc2626',
  'red-700': '#b91c1c',
};

// Color combinations used in the app
const combinations = [
  // Project Hub (light theme)
  { name: 'Heading (Home Designer)', fg: 'gray-900', bg: 'white', type: 'large-text' },
  { name: 'Subtitle (Your Projects)', fg: 'gray-600', bg: 'gray-50', type: 'normal-text' },
  { name: 'Import button text', fg: 'gray-700', bg: 'white', type: 'normal-text' },
  { name: 'New Project button', fg: 'white', bg: 'blue-600', type: 'normal-text' },
  { name: 'Project title', fg: 'gray-900', bg: 'white', type: 'large-text' },
  { name: 'Project description', fg: 'gray-500', bg: 'white', type: 'normal-text' },
  { name: 'Updated date', fg: 'gray-500', bg: 'white', type: 'normal-text' },
  { name: 'Modal heading', fg: 'gray-900', bg: 'white', type: 'large-text' },
  { name: 'Form label', fg: 'gray-700', bg: 'white', type: 'normal-text' },
  { name: 'Delete button', fg: 'white', bg: 'red-600', type: 'normal-text' },

  // Editor (dark theme)
  { name: 'Editor heading', fg: 'white', bg: 'gray-800', type: 'large-text' },
  { name: 'Editor body text', fg: 'gray-300', bg: 'gray-900', type: 'normal-text' },
  { name: 'Editor secondary text', fg: 'gray-400', bg: 'gray-900', type: 'normal-text' },
  { name: 'Editor button text', fg: 'gray-300', bg: 'gray-700', type: 'normal-text' },
  { name: 'Editor button hover', fg: 'gray-300', bg: 'gray-600', type: 'normal-text' },
  { name: 'Editor active button', fg: 'white', bg: 'blue-600', type: 'normal-text' },
  { name: 'Editor form label', fg: 'gray-300', bg: 'gray-800', type: 'normal-text' },
  { name: 'Editor input text', fg: 'white', bg: 'gray-700', type: 'normal-text' },
];

console.log('\n=== WCAG AA Contrast Ratio Check ===\n');
console.log('Standards:');
console.log('- Normal text (< 18pt): 4.5:1 minimum');
console.log('- Large text (>= 18pt or bold >= 14pt): 3:1 minimum');
console.log('- UI components: 3:1 minimum\n');

let allPass = true;
const failures = [];

combinations.forEach(combo => {
  const ratio = getContrastRatio(colors[combo.fg], colors[combo.bg]);
  const requiredRatio = combo.type === 'large-text' ? 3 : 4.5;
  const passes = ratio >= requiredRatio;
  const status = passes ? '✓ PASS' : '✗ FAIL';

  if (!passes) {
    allPass = false;
    failures.push({
      name: combo.name,
      ratio: ratio.toFixed(2),
      required: requiredRatio,
      fg: combo.fg,
      bg: combo.bg
    });
  }

  console.log(`${status} ${combo.name}`);
  console.log(`     ${combo.fg} on ${combo.bg}`);
  console.log(`     Ratio: ${ratio.toFixed(2)}:1 (required: ${requiredRatio}:1)`);
  console.log('');
});

if (allPass) {
  console.log('✅ All color combinations meet WCAG AA standards!\n');
  process.exit(0);
} else {
  console.log('❌ Some color combinations fail WCAG AA standards:\n');
  failures.forEach(f => {
    console.log(`   ${f.name}: ${f.ratio}:1 (need ${f.required}:1)`);
    console.log(`   Colors: ${f.fg} on ${f.bg}\n`);
  });
  process.exit(1);
}
