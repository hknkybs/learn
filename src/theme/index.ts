export { shadow } from './palette';
export type { ThemeColors } from './palette';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
};

export const tenseLabels: Record<string, string> = {
  general: 'Genel',
  present_simple: 'Geniş zaman',
  present_continuous: 'Şimdiki zaman',
  past_simple: 'Geçmiş zaman',
  future: 'Gelecek zaman',
};

export const partOfSpeechLabels: Record<string, string> = {
  verb: 'fiil',
  noun: 'isim',
  adjective: 'sıfat',
  adverb: 'zarf',
  phrase: 'kalıp',
  other: 'diğer',
};

export const formTypeLabels: Record<string, string> = {
  base: 'Yalın hâl',
  third_person_singular: '3. tekil şahıs',
  past_simple: 'Geçmiş zaman',
  past_participle: 'Geçmiş ortaç (V3)',
  gerund: '-ing hâli',
  singular: 'Tekil',
  plural: 'Çoğul',
  comparative: 'Karşılaştırma',
  superlative: 'En üstünlük',
};

export const statusLabels: Record<string, string> = {
  new: 'Yeni',
  learning: 'Öğreniyorum',
  known: 'Biliyorum',
};
