import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type Lang = 'nl' | 'en' | 'fr';

const translations = {
  // Header
  'brand.subtitle': {
    nl: 'Tuin Ervaring AI',
    en: 'Garden Experience AI',
    fr: 'Expérience Jardin IA',
  },
  'header.history': {
    nl: 'Geschiedenis',
    en: 'History',
    fr: 'Historique',
  },

  // IntentionsPanel
  'intentions.title': {
    nl: 'Stel Je Intenties In',
    en: 'Set Your Intentions',
    fr: 'Définissez Vos Intentions',
  },
  'intentions.subtitle': {
    nl: 'Bepaal hoe je tuin moet voelen',
    en: 'Define how your garden should feel',
    fr: 'Définissez l\'ambiance de votre jardin',
  },
  'intentions.photo': {
    nl: 'Tuinfoto',
    en: 'Garden Photo',
    fr: 'Photo du Jardin',
  },
  'intentions.upload': {
    nl: 'Klik of sleep een foto',
    en: 'Click or drop photo',
    fr: 'Cliquez ou déposez une photo',
  },
  'intentions.changePhoto': {
    nl: 'Foto Wijzigen',
    en: 'Change Photo',
    fr: 'Changer la Photo',
  },
  'intentions.mood': {
    nl: 'Hoe wil je je voelen?',
    en: 'How do you want to feel?',
    fr: 'Comment voulez-vous vous sentir ?',
  },
  'intentions.time': {
    nl: 'Wanneer gebruik je deze ruimte?',
    en: 'When will you use this space?',
    fr: 'Quand utiliserez-vous cet espace ?',
  },
  'intentions.visibility': {
    nl: 'Zichtbaarheid',
    en: 'Visibility',
    fr: 'Visibilité',
  },
  'intentions.visible': {
    nl: 'Zichtbaar',
    en: 'Visible',
    fr: 'Visible',
  },
  'intentions.hidden': {
    nl: 'Verborgen',
    en: 'Hidden',
    fr: 'Caché',
  },
  'intentions.startCreating': {
    nl: 'Start met Ontwerpen',
    en: 'Start Creating',
    fr: 'Commencer la Création',
  },
  'intentions.creating': {
    nl: 'Ontwerpen...',
    en: 'Creating...',
    fr: 'Création...',
  },
  'intentions.instructions': {
    nl: 'Directe Instructies',
    en: 'Direct Instructions',
    fr: 'Instructions Directes',
  },
  'intentions.placeholder': {
    nl: 'bijv. voeg een bankje toe bij het hek...',
    en: 'e.g. add a bench near the fence...',
    fr: 'ex. ajoutez un banc près de la clôture...',
  },
  'intentions.uploadFirst': {
    nl: 'Upload eerst een foto',
    en: 'Upload a photo first',
    fr: 'Téléchargez d\'abord une photo',
  },
  'intentions.applying': {
    nl: 'Toepassen...',
    en: 'Applying...',
    fr: 'Application...',
  },
  'intentions.sendHint': {
    nl: 'Enter om te sturen · Shift+Enter voor nieuwe regel',
    en: 'Enter to send · Shift+Enter for new line',
    fr: 'Entrée pour envoyer · Shift+Entrée pour nouvelle ligne',
  },

  // Moods
  'mood.tranquil': { nl: 'Rustig', en: 'Tranquil', fr: 'Tranquille' },
  'mood.social': { nl: 'Sociaal', en: 'Social', fr: 'Social' },
  'mood.intimate': { nl: 'Intiem', en: 'Intimate', fr: 'Intime' },

  // Times
  'time.morning': { nl: 'Ochtend', en: 'Morning', fr: 'Matin' },
  'time.daytime': { nl: 'Overdag', en: 'Daytime', fr: 'Journée' },
  'time.evening': { nl: 'Avond', en: 'Evening', fr: 'Soirée' },

  // GardenCanvas
  'canvas.generating': {
    nl: 'Je Ruimte Wordt Ontworpen...',
    en: 'Generating Your Space...',
    fr: 'Création de Votre Espace...',
  },
  'canvas.uploadTitle': {
    nl: 'Upload je tuinfoto',
    en: 'Upload your garden photo',
    fr: 'Téléchargez votre photo de jardin',
  },
  'canvas.uploadSubtitle': {
    nl: 'om je tuin te gaan ontwerpen',
    en: 'to begin designing your sanctuary',
    fr: 'pour commencer à concevoir votre sanctuaire',
  },
  'canvas.explore': { nl: 'Ontdek', en: 'Explore', fr: 'Explorer' },

  // Slider labels
  'slider.tranquil': { nl: 'Rustig', en: 'Tranquil', fr: 'Calme' },
  'slider.vibrant': { nl: 'Levendig', en: 'Vibrant', fr: 'Vibrant' },
  'slider.open': { nl: 'Open', en: 'Open', fr: 'Ouvert' },
  'slider.sheltered': { nl: 'Beschut', en: 'Sheltered', fr: 'Abrité' },
  'slider.light': { nl: 'Licht', en: 'Light', fr: 'Léger' },
  'slider.mass': { nl: 'Massa', en: 'Mass', fr: 'Masse' },
  'slider.social': { nl: 'Sociaal', en: 'Social', fr: 'Social' },
  'slider.solitary': { nl: 'Solitair', en: 'Solitary', fr: 'Solitaire' },

  // Style cards
  'style.contemplative': { nl: 'Contemplatief Toevlucht', en: 'Contemplative Retreat', fr: 'Retraite Contemplative' },
  'style.contemplative.sub': { nl: 'Vredig alleen-zijn', en: 'Peaceful solitude', fr: 'Solitude paisible' },
  'style.social': { nl: 'Sociaal Samenzijn', en: 'Social Gathering', fr: 'Rassemblement Social' },
  'style.social.sub': { nl: 'Warm samenzijn', en: 'Warm togetherness', fr: 'Chaleur collective' },
  'style.evening': { nl: 'Avondlijke Sereniteit', en: 'Evening Serenity', fr: 'Sérénité du Soir' },
  'style.evening.sub': { nl: 'Schemering rust', en: 'Twilight calm', fr: 'Calme crépusculaire' },

  // InsightsPanel
  'insights.title': { nl: 'JENGO Inzichten', en: 'JENGO Insights', fr: 'JENGO Aperçus' },
  'insights.harmony': { nl: 'HARMONIENIVEAU', en: 'HARMONY LEVEL', fr: 'NIVEAU D\'HARMONIE' },
  'insights.aligned': {
    nl: 'Afgestemd op jouw intenties',
    en: 'Aligned with your intentions',
    fr: 'Aligné avec vos intentions',
  },
  'insights.suggestion': { nl: 'Suggestie', en: 'Suggestion', fr: 'Suggestion' },
  'insights.suggestedObjects': { nl: 'Voorgestelde Objecten', en: 'Suggested Objects', fr: 'Objets Suggérés' },
  'insights.place': { nl: 'Plaatsen', en: 'Place', fr: 'Placer' },
  'insights.refreshing': {
    nl: 'Inzichten worden ververst...',
    en: 'Refreshing insights...',
    fr: 'Actualisation des aperçus...',
  },
  'insights.emptyText': {
    nl: 'Upload je tuinfoto en klik',
    en: 'Upload your garden photo and click',
    fr: 'Téléchargez votre photo de jardin et cliquez',
  },
  'insights.emptyAction': {
    nl: 'Start met Ontwerpen',
    en: 'Start Creating',
    fr: 'Commencer la Création',
  },
  'insights.emptyEnd': {
    nl: 'om persoonlijke inzichten te ontvangen.',
    en: 'to receive personalised insights.',
    fr: 'pour recevoir des aperçus personnalisés.',
  },
  'insights.arrangeObjects': { nl: 'Objecten Indelen', en: 'Arrange Objects', fr: 'Organiser les Objets' },
  'insights.scanning': { nl: 'Scannen...', en: 'Scanning...', fr: 'Scan...' },
  'insights.flowMode': { nl: 'Flow Modus', en: 'Enter Flow Mode', fr: 'Mode Flow' },
  'insights.flowSub': { nl: 'Verdiep je erin', en: 'Immerse yourself', fr: 'Plongez-vous' },

  // Flow mode
  'flow.exit': {
    nl: 'Klik om flow modus te verlaten',
    en: 'Click to exit flow mode',
    fr: 'Cliquez pour quitter le mode flow',
  },

  // HistoryPanel
  'history.title': { nl: 'GESCHIEDENIS', en: 'HISTORY', fr: 'HISTORIQUE' },
  'history.items': { nl: 'item', en: 'item', fr: 'élément' },
  'history.items_plural': { nl: 'items', en: 'items', fr: 'éléments' },
  'history.empty': { nl: 'Nog geen geschiedenis', en: 'No history yet', fr: 'Pas encore d\'historique' },
  'history.upload': { nl: 'Upload', en: 'Upload', fr: 'Téléchargement' },
  'history.generated': { nl: 'Gegenereerd', en: 'Generated', fr: 'Généré' },
  'history.instruction': { nl: 'Instructie', en: 'Instruction', fr: 'Instruction' },
  'history.latest': { nl: 'LAATSTE', en: 'LATEST', fr: 'DERNIER' },
  'history.restore': { nl: 'Herstellen', en: 'Restore', fr: 'Restaurer' },

  // ArrangeView
  'arrange.backToDesign': { nl: 'Terug naar Ontwerp', en: 'Back to Design', fr: 'Retour au Design' },
  'arrange.title': { nl: 'Objecten Indelen', en: 'Arrange Objects', fr: 'Organiser les Objets' },
  'arrange.generateViews': { nl: 'Views Genereren', en: 'Generate Views', fr: 'Générer des Vues' },
  'arrange.objects': { nl: 'OBJECTEN', en: 'OBJECTS', fr: 'OBJETS' },
  'arrange.noObjects': { nl: 'Geen objecten gevonden', en: 'No objects identified', fr: 'Aucun objet identifié' },
  'arrange.dragHint': {
    nl: 'Sleep objecten op het canvas om ze te verplaatsen.',
    en: 'Drag objects on the canvas to reposition them.',
    fr: 'Faites glisser les objets sur le canevas pour les repositionner.',
  },
  'arrange.rescan': { nl: 'Opnieuw Scannen', en: 'Re-scan Objects', fr: 'Re-scanner les Objets' },
  'arrange.rescanning': { nl: 'Scannen...', en: 'Scanning...', fr: 'Scan...' },
  'arrange.moving': { nl: 'Verplaatsen', en: 'Moving', fr: 'Déplacement de' },
  'arrange.rescanning2': { nl: 'Objecten opnieuw scannen...', en: 'Re-scanning objects...', fr: 'Nouveau scan des objets...' },
  'arrange.identifying': { nl: 'Objecten identificeren...', en: 'Identifying objects...', fr: 'Identification des objets...' },
  'arrange.identified': { nl: 'objecten gevonden', en: 'objects identified', fr: 'objets identifiés' },

  // Loading messages
  'loading.analyzing': { nl: 'Je tuin wordt geanalyseerd...', en: 'Analyzing your garden space...', fr: 'Analyse de votre espace jardin...' },
  'loading.understanding': { nl: 'Je intenties worden begrepen...', en: 'Understanding your intentions...', fr: 'Compréhension de vos intentions...' },
  'loading.designing': { nl: 'Je toevlucht wordt ontworpen...', en: 'Designing your sanctuary...', fr: 'Conception de votre sanctuaire...' },
  'loading.shaping': { nl: 'Licht en schaduw worden vormgegeven...', en: 'Shaping light and shadow...', fr: 'Modelage de la lumière et de l\'ombre...' },
  'loading.finishing': { nl: 'De laatste details worden toegevoegd...', en: 'Adding the finishing touches...', fr: 'Ajout des touches finales...' },
  'loading.applyInstruction': { nl: 'Je instructie wordt toegepast...', en: 'Applying your instruction...', fr: 'Application de votre instruction...' },
  'loading.blending': { nl: 'Samenvoegen met je tuin...', en: 'Blending with your garden...', fr: 'Fusion avec votre jardin...' },
  'loading.finalising': { nl: 'De bewerking wordt afgerond...', en: 'Finalising the edit...', fr: 'Finalisation de l\'édition...' },
} as const;

type TranslationKey = keyof typeof translations;

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'nl',
  setLang: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem('jengo-lang');
      if (saved === 'nl' || saved === 'en' || saved === 'fr') return saved;
    } catch {}
    return 'nl';
  });

  const handleSetLang = useCallback((newLang: Lang) => {
    setLang(newLang);
    try { localStorage.setItem('jengo-lang', newLang); } catch {}
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang] ?? entry.en ?? key;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang: handleSetLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export function getLoadingMessages(lang: Lang): string[] {
  return [
    translations['loading.analyzing'][lang],
    translations['loading.understanding'][lang],
    translations['loading.designing'][lang],
    translations['loading.shaping'][lang],
    translations['loading.finishing'][lang],
  ];
}

export function getApplyMessages(lang: Lang): string[] {
  return [
    translations['loading.applyInstruction'][lang],
    translations['loading.blending'][lang],
    translations['loading.finalising'][lang],
  ];
}
