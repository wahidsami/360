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
export type AccessibilityAuditOutputLocale = 'en' | 'ar';
export type AccessibilityAuditTaxonomySelection = Record<string, Record<string, boolean>>;

export const createDefaultAccessibilityTaxonomySelection = (): AccessibilityAuditTaxonomySelection =>
  ACCESSIBILITY_AUDIT_MAIN_CATEGORIES.reduce<AccessibilityAuditTaxonomySelection>((acc, category) => {
    acc[category] = ACCESSIBILITY_AUDIT_CATEGORIES[category].reduce<Record<string, boolean>>((subAcc, subcategory) => {
      subAcc[subcategory] = true;
      return subAcc;
    }, {});
    return acc;
  }, {});

export const resolveAccessibilityTaxonomy = (
  taxonomyJson?: Record<string, unknown> | null,
): {
  categories: string[];
  subcategories: Record<string, string[]>;
} => {
  const rawCategories = Array.isArray((taxonomyJson as any)?.accessibilityCategories)
    ? ((taxonomyJson as any).accessibilityCategories as Array<string | { value?: string }>)
    : [];

  const selectedCategories = rawCategories
    .map((item) => (typeof item === 'string' ? item : item?.value))
    .filter((value): value is string => !!value && value in ACCESSIBILITY_AUDIT_CATEGORIES);

  const categories = selectedCategories.length > 0 ? selectedCategories : [...ACCESSIBILITY_AUDIT_MAIN_CATEGORIES];
  const rawSubcategories = ((taxonomyJson as any)?.accessibilitySubcategories || {}) as Record<
    string,
    Array<string | { value?: string }>
  >;

  const subcategories = categories.reduce<Record<string, string[]>>((acc, category) => {
    const selected = (Array.isArray(rawSubcategories[category]) ? rawSubcategories[category] : [])
      .map((item) => (typeof item === 'string' ? item : item?.value))
      .filter(
        (value): value is string =>
          !!value && ACCESSIBILITY_AUDIT_CATEGORIES[category as AccessibilityAuditMainCategory].includes(value as never),
      );

    acc[category] = selected.length > 0 ? selected : [...ACCESSIBILITY_AUDIT_CATEGORIES[category as AccessibilityAuditMainCategory]];
    return acc;
  }, {});

  return { categories, subcategories };
};

export const buildAccessibilityTaxonomySelection = (
  taxonomyJson?: Record<string, unknown> | null,
): AccessibilityAuditTaxonomySelection => {
  const resolved = resolveAccessibilityTaxonomy(taxonomyJson);
  const selection = createDefaultAccessibilityTaxonomySelection();

  ACCESSIBILITY_AUDIT_MAIN_CATEGORIES.forEach((category) => {
    const enabledSubcategories = new Set(resolved.subcategories[category] || []);
    const categoryEnabled = resolved.categories.includes(category);

    Object.keys(selection[category]).forEach((subcategory) => {
      selection[category][subcategory] = categoryEnabled && enabledSubcategories.has(subcategory);
    });
  });

  return selection;
};

export const buildAccessibilityTaxonomyPayload = (
  selection: AccessibilityAuditTaxonomySelection,
): {
  accessibilityCategories: Array<{ value: string; label: string }>;
  accessibilitySubcategories: Record<string, Array<{ value: string; label: string }>>;
} => {
  const enabledCategories = ACCESSIBILITY_AUDIT_MAIN_CATEGORIES.filter((category) =>
    Object.values(selection[category] || {}).some(Boolean),
  );

  return {
    accessibilityCategories: enabledCategories.map((category) => ({ value: category, label: category })),
    accessibilitySubcategories: enabledCategories.reduce<Record<string, Array<{ value: string; label: string }>>>(
      (acc, category) => {
        acc[category] = Object.entries(selection[category] || {})
          .filter(([, enabled]) => enabled)
          .map(([subcategory]) => ({ value: subcategory, label: subcategory }));
        return acc;
      },
      {},
    ),
  };
};

export const countEnabledAccessibilityCategories = (selection: AccessibilityAuditTaxonomySelection) =>
  ACCESSIBILITY_AUDIT_MAIN_CATEGORIES.filter((category) => Object.values(selection[category] || {}).some(Boolean)).length;

export const getAccessibilityOutputLocale = (version?: {
  schemaJson?: Record<string, any> | null;
  pdfConfigJson?: Record<string, any> | null;
} | null): AccessibilityAuditOutputLocale => {
  const rawLocale =
    String(version?.schemaJson?.locale?.primary || version?.pdfConfigJson?.locale || 'en').toLowerCase();
  return rawLocale.startsWith('ar') ? 'ar' : 'en';
};
