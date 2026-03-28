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

const ACCESSIBILITY_AUDIT_CATEGORY_LABELS_AR: Record<string, string> = {
  Images: 'الصور',
  Content: 'المحتوى',
  'Color & Contrast': 'الألوان والتباين',
  'Keyboard & Navigation': 'لوحة المفاتيح والتنقل',
  'Forms & Inputs': 'النماذج وحقول الإدخال',
  Multimedia: 'الوسائط المتعددة',
  'Touch & Mobile': 'اللمس والجوال',
  'Structure & Semantics': 'البنية والدلالات',
  'Timing & Interaction': 'التوقيت والتفاعل',
  'Assistive Technology': 'التقنيات المساعدة',
  'Authentication & Security': 'المصادقة والأمان',
};

const ACCESSIBILITY_AUDIT_SUBCATEGORY_LABELS_AR: Record<string, Record<string, string>> = {
  Images: {
    'Missing alt text': 'غياب النص البديل',
    'Decorative images incorrectly announced': 'الإعلان الخاطئ عن الصور الزخرفية',
    'Icons without labels': 'أيقونات بدون تسميات',
    'CAPTCHA without alternatives': 'اختبار CAPTCHA بدون بدائل',
    'Image-based buttons without description': 'أزرار صورية بدون وصف',
  },
  Content: {
    'Missing or incorrect headings structure (H1-H6)': 'هيكل العناوين مفقود أو غير صحيح (H1-H6)',
    'Poor readability (complex language)': 'ضعف قابلية القراءة بسبب اللغة المعقدة',
    'Missing page titles': 'غياب عناوين الصفحات',
    'Incorrect language declaration': 'تعريف اللغة غير صحيح',
    'Abbreviations not explained': 'اختصارات غير موضحة',
  },
  'Color & Contrast': {
    'Low text contrast': 'تباين النص منخفض',
    'Low contrast for UI components': 'تباين منخفض لعناصر الواجهة',
    'Reliance on color alone': 'الاعتماد على اللون فقط',
    'Placeholder text too light to read': 'نص العنصر النائب باهت ويصعب قراءته',
    'Disabled states not distinguishable': 'حالات التعطيل غير واضحة',
  },
  'Keyboard & Navigation': {
    'Not accessible via keyboard': 'غير قابل للوصول عبر لوحة المفاتيح',
    'Missing focus indicator': 'مؤشر التركيز مفقود',
    'Incorrect tab order': 'ترتيب التنقل غير صحيح',
    'Keyboard traps': 'مصائد لوحة المفاتيح',
    'Missing skip links': 'غياب روابط التخطي',
    'Navigation inconsistency': 'عدم اتساق التنقل',
  },
  'Forms & Inputs': {
    'Missing labels': 'تسميات الحقول مفقودة',
    'Placeholder instead of label': 'استخدام العنصر النائب بدل التسمية',
    'Missing error messages': 'رسائل الخطأ مفقودة',
    'Errors not explained': 'الأخطاء غير موضحة',
    'Required fields not indicated': 'الحقول المطلوبة غير محددة',
    'No input instructions': 'لا توجد تعليمات للإدخال',
    'Incorrect associations': 'ربط غير صحيح بين الحقول والعناوين',
  },
  Multimedia: {
    'Missing captions': 'الترجمة النصية مفقودة',
    'Missing transcripts': 'النصوص التفريغية مفقودة',
    'No audio descriptions': 'لا توجد أوصاف صوتية',
    'Auto-play without control': 'تشغيل تلقائي بدون تحكم',
    'No pause/stop controls': 'لا توجد أدوات إيقاف مؤقت أو توقف',
  },
  'Touch & Mobile': {
    'Small tap targets': 'أهداف اللمس صغيرة',
    'Gesture-only interactions': 'تفاعلات تعتمد على الإيماءات فقط',
    'No gesture alternatives': 'لا توجد بدائل للإيماءات',
    'Elements too close': 'العناصر متقاربة جداً',
    'No orientation support': 'لا يوجد دعم لتغيير الاتجاه',
    'Motion without fallback': 'حركة بدون بديل',
  },
  'Structure & Semantics': {
    'Missing ARIA roles': 'أدوار ARIA مفقودة',
    'Improper HTML structure': 'بنية HTML غير صحيحة',
    'Screen reader issues': 'مشكلات قارئ الشاشة',
    'Inaccessible custom components': 'مكونات مخصصة غير قابلة للوصول',
    'Missing landmarks': 'المعالم الدلالية مفقودة',
    'Duplicate IDs': 'معرّفات مكررة',
  },
  'Timing & Interaction': {
    'Time limits without warning': 'مهل زمنية بدون تنبيه',
    'No extend option': 'لا يوجد خيار للتمديد',
    'Auto-refresh': 'تحديث تلقائي',
    'Unstoppable animations': 'حركات لا يمكن إيقافها',
    'Moving content without control': 'محتوى متحرك بدون تحكم',
  },
  'Assistive Technology': {
    'Screen reader issues': 'مشكلات قارئ الشاشة',
    'Voice control problems': 'مشكلات التحكم الصوتي',
    'Zoom issues': 'مشكلات التكبير',
  },
  'Authentication & Security': {
    'Cognitive complexity': 'تعقيد إدراكي',
    'CAPTCHA barriers': 'عوائق CAPTCHA',
    'Memory-based challenges': 'تحديات تعتمد على التذكر',
  },
};

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

export const getAccessibilityCategoryLabel = (
  category: string,
  locale: AccessibilityAuditOutputLocale = 'en',
) => {
  if (locale === 'ar') {
    return ACCESSIBILITY_AUDIT_CATEGORY_LABELS_AR[category] || category;
  }
  return category;
};

export const getAccessibilitySubcategoryLabel = (
  category: string,
  subcategory: string,
  locale: AccessibilityAuditOutputLocale = 'en',
) => {
  if (locale === 'ar') {
    return ACCESSIBILITY_AUDIT_SUBCATEGORY_LABELS_AR[category]?.[subcategory] || subcategory;
  }
  return subcategory;
};
