export const ACCESSIBILITY_AUDIT_CATEGORIES = {
  Images: [
    'Missing alt text',
    'Decorative images incorrectly announced',
    'Icons without labels',
    'CAPTCHA without alternatives',
    'Image-based buttons without description',
  ],
  Content: [
    'Missing or incorrect headings structure (H1-H6)',
    'Poor readability (complex language)',
    'Missing page titles',
    'Incorrect language declaration',
    'Abbreviations not explained',
  ],
  'Color & Contrast': [
    'Low text contrast',
    'Low contrast for UI components',
    'Reliance on color alone',
    'Placeholder text too light to read',
    'Disabled states not distinguishable',
  ],
  'Keyboard & Navigation': [
    'Not accessible via keyboard',
    'Missing focus indicator',
    'Incorrect tab order',
    'Keyboard traps',
    'Missing skip links',
    'Navigation inconsistency',
  ],
  'Forms & Inputs': [
    'Missing labels',
    'Placeholder instead of label',
    'Missing error messages',
    'Errors not explained',
    'Required fields not indicated',
    'No input instructions',
    'Incorrect associations',
  ],
  Multimedia: [
    'Missing captions',
    'Missing transcripts',
    'No audio descriptions',
    'Auto-play without control',
    'No pause/stop controls',
  ],
  'Touch & Mobile': [
    'Small tap targets',
    'Gesture-only interactions',
    'No gesture alternatives',
    'Elements too close',
    'No orientation support',
    'Motion without fallback',
  ],
  'Structure & Semantics': [
    'Missing ARIA roles',
    'Improper HTML structure',
    'Screen reader issues',
    'Inaccessible custom components',
    'Missing landmarks',
    'Duplicate IDs',
  ],
  'Timing & Interaction': [
    'Time limits without warning',
    'No extend option',
    'Auto-refresh',
    'Unstoppable animations',
    'Moving content without control',
  ],
  'Assistive Technology': [
    'Screen reader issues',
    'Voice control problems',
    'Zoom issues',
  ],
  'Authentication & Security': [
    'Cognitive complexity',
    'CAPTCHA barriers',
    'Memory-based challenges',
  ],
} as const;

export const ACCESSIBILITY_AUDIT_MAIN_CATEGORIES = Object.keys(ACCESSIBILITY_AUDIT_CATEGORIES);

export type AccessibilityAuditMainCategory = keyof typeof ACCESSIBILITY_AUDIT_CATEGORIES;
