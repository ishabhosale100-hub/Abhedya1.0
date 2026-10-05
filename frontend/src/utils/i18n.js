/**
 * i18n translation dictionary for navigation and module titles.
 * Supports: en (English), hi (Hindi), mr (Marathi).
 */

export const translations = {
  en: {
    appName: "ABHEDYA",
    appTagline: "Digital Safety",
    workspace: "Workspace",
    photoProtection: "Photo Protection",
    imageInvestigation: "Image Investigation",
    commentSafety: "Comment Safety",
    evidenceVault: "Evidence Vault",
    dossierModules: "Dossier Modules",
    chainOfCustody: "Chain of Custody",
    recordsInBrowser: "Records stay in this browser",
    workspaceSecure: "Local session",
    backToWorkspace: "Back to workspace",
    getStarted: "Get Started",
    continue: "Continue",
    chooseLanguage: "Choose your language",
    chooseLanguageSub: "Select the language you are most comfortable using.",
    welcomeTitle: "Welcome to Abhedya",
    welcomeSub: "Secure your digital safety workspace.",
    heroTitle: "Your digital safety workspace",
    heroSub: "Choose what you want to protect, investigate or monitor.",
  },
  hi: {
    appName: "अभेद्य",
    appTagline: "डिजिटल सुरक्षा",
    workspace: "कार्यक्षेत्र",
    photoProtection: "फ़ोटो सुरक्षा",
    imageInvestigation: "छवि जांच",
    commentSafety: "टिप्पणी सुरक्षा",
    evidenceVault: "साक्ष्य तिजोरी",
    dossierModules: "सुरक्षा मॉडल",
    chainOfCustody: "कस्टडी रिकॉर्ड",
    recordsInBrowser: "रिकॉर्ड इस ब्राउज़र में सुरक्षित हैं",
    workspaceSecure: "स्थानीय सत्र",
    backToWorkspace: "कार्यक्षेत्र पर वापस जाएं",
    getStarted: "शुरू करें",
    continue: "आगे बढ़ें",
    chooseLanguage: "अपनी भाषा चुनें",
    chooseLanguageSub: "वह भाषा चुनें जिसमें आप सबसे सहज हैं।",
    welcomeTitle: "अभेद्य में आपका स्वागत है",
    welcomeSub: "अपने डिजिटल सुरक्षा कार्यक्षेत्र को सुरक्षित करें।",
    heroTitle: "आपका डिजिटल सुरक्षा कार्यक्षेत्र",
    heroSub: "चुनें कि आप क्या सुरक्षित, जांच या निगरानी करना चाहते हैं।",
  },
  mr: {
    appName: "अभेद्य",
    appTagline: "डिजिटल सुरक्षा",
    workspace: "कार्यक्षेत्र",
    photoProtection: "फोटो संरक्षण",
    imageInvestigation: "प्रतिमा तपासणी",
    commentSafety: "कमेंट सुरक्षा",
    evidenceVault: "पुरावा तिजोरी",
    dossierModules: "सुरक्षा मॉड्यूल्स",
    chainOfCustody: "कस्टडी रेकॉर्ड",
    recordsInBrowser: "रेकॉर्ड या ब्राउझरमध्ये सुरक्षित राहतील",
    workspaceSecure: "स्थानिक सत्र",
    backToWorkspace: "कार्यक्षेत्रावर परत जा",
    getStarted: "प्रारंभ करा",
    continue: "पुढे चला",
    chooseLanguage: "तुमची भाषा निवडा",
    chooseLanguageSub: "तुम्हाला वापरण्यास सोपी वाटणारी भाषा निवडा.",
    welcomeTitle: "अभेद्य मध्ये आपले स्वागत आहे",
    welcomeSub: "तुमचे डिजिटल सुरक्षा कार्यक्षेत्र सुरक्षित करा.",
    heroTitle: "तुमचे डिजिटल सुरक्षा कार्यक्षेत्र",
    heroSub: "तुम्हाला कशाचे संरक्षण, तपासणी किंवा निरीक्षण करायचे आहे ते निवडा.",
  }
};

/**
 * Get stored language code (default 'en')
 */
export function getLanguage() {
  return localStorage.getItem('abhedya_lang') || 'en';
}

/**
 * Save language code
 */
export function setLanguage(lang) {
  if (translations[lang]) {
    localStorage.setItem('abhedya_lang', lang);
  }
}

/**
 * Translate key for current language
 */
export function t(key) {
  const lang = getLanguage();
  return translations[lang]?.[key] || translations.en[key] || key;
}
