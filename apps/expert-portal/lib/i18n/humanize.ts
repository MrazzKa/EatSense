import type { Locale } from './messages';

// Centralized human-readable, localized labels for enum-ish backend values.
// Kept out of the typed MessagesShape on purpose: these are large value maps,
// not UI copy, and several pages share them (consultations, calendar, clients).
// Any unknown value falls back to a prettified version of the raw slug.

type LocaleMap = Partial<Record<Locale, string>>;

function pick(map: LocaleMap, locale: Locale, raw: string): string {
  return map[locale] || map.en || prettifySlug(raw);
}

/** "high_cholesterol" → "High cholesterol" (safe fallback for unmapped values). */
function prettifySlug(raw: string): string {
  const s = String(raw || '').replace(/[_-]+/g, ' ').trim();
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---- Consultation status ----
const STATUS: Record<string, LocaleMap> = {
  SCHEDULED: { en: 'Scheduled', ru: 'Запланирована', kk: 'Жоспарланған', fr: 'Planifiée', de: 'Geplant', es: 'Programada' },
  PENDING_RESCHEDULE: { en: 'Reschedule pending', ru: 'Ожидает переноса', kk: 'Ауыстыру күтілуде', fr: 'Report en attente', de: 'Verschiebung offen', es: 'Reprogramación pendiente' },
  IN_PROGRESS: { en: 'In progress', ru: 'Идёт', kk: 'Өтуде', fr: 'En cours', de: 'Läuft', es: 'En curso' },
  COMPLETED: { en: 'Completed', ru: 'Завершена', kk: 'Аяқталды', fr: 'Terminée', de: 'Abgeschlossen', es: 'Completada' },
  CANCELLED: { en: 'Cancelled', ru: 'Отменена', kk: 'Тоқтатылды', fr: 'Annulée', de: 'Abgesagt', es: 'Cancelada' },
  NO_SHOW: { en: 'No-show', ru: 'Неявка', kk: 'Келмеді', fr: 'Absence', de: 'Nicht erschienen', es: 'Ausencia' },
};

export function humanizeStatus(status: string, locale: Locale): string {
  return pick(STATUS[status] || {}, locale, status);
}

// ---- Health conditions (onboarding / profile) ----
const HEALTH_CONDITIONS: Record<string, LocaleMap> = {
  gastritis: { en: 'Gastritis', ru: 'Гастрит', kk: 'Гастрит', fr: 'Gastrite', de: 'Gastritis', es: 'Gastritis' },
  diabetes: { en: 'Diabetes', ru: 'Диабет', kk: 'Диабет', fr: 'Diabète', de: 'Diabetes', es: 'Diabetes' },
  high_cholesterol: { en: 'High cholesterol', ru: 'Высокий холестерин', kk: 'Жоғары холестерин', fr: 'Cholestérol élevé', de: 'Hoher Cholesterinspiegel', es: 'Colesterol alto' },
  thyroid: { en: 'Thyroid condition', ru: 'Заболевание щитовидной железы', kk: 'Қалқанша без ауруы', fr: 'Trouble thyroïdien', de: 'Schilddrüsenerkrankung', es: 'Trastorno tiroideo' },
  hypertension: { en: 'Hypertension', ru: 'Гипертония', kk: 'Гипертония', fr: 'Hypertension', de: 'Bluthochdruck', es: 'Hipertensión' },
};

export function humanizeHealthCondition(value: string, locale: Locale): string {
  return pick(HEALTH_CONDITIONS[value] || {}, locale, value);
}

// ---- Goal ----
const GOALS: Record<string, LocaleMap> = {
  lose_weight: { en: 'Lose weight', ru: 'Снизить вес', kk: 'Салмақ тастау', fr: 'Perdre du poids', de: 'Abnehmen', es: 'Bajar de peso' },
  maintain_weight: { en: 'Maintain weight', ru: 'Поддерживать вес', kk: 'Салмақты сақтау', fr: 'Maintenir le poids', de: 'Gewicht halten', es: 'Mantener el peso' },
  gain_weight: { en: 'Gain weight', ru: 'Набрать вес', kk: 'Салмақ қосу', fr: 'Prendre du poids', de: 'Zunehmen', es: 'Subir de peso' },
};

export function humanizeGoal(value: string, locale: Locale): string {
  return pick(GOALS[value] || {}, locale, value);
}

// ---- Gender ----
const GENDERS: Record<string, LocaleMap> = {
  male: { en: 'Male', ru: 'Мужской', kk: 'Ер', fr: 'Homme', de: 'Männlich', es: 'Hombre' },
  female: { en: 'Female', ru: 'Женский', kk: 'Әйел', fr: 'Femme', de: 'Weiblich', es: 'Mujer' },
  other: { en: 'Other', ru: 'Другой', kk: 'Басқа', fr: 'Autre', de: 'Andere', es: 'Otro' },
};

export function humanizeGender(value: string, locale: Locale): string {
  return pick(GENDERS[value] || {}, locale, value);
}

// ---- Dietary preferences (canonical list) ----
const DIETS: Record<string, LocaleMap> = {
  none: { en: 'No restrictions', ru: 'Без ограничений', kk: 'Шектеусіз', fr: 'Sans restriction', de: 'Keine Einschränkung', es: 'Sin restricciones' },
  balanced: { en: 'Balanced', ru: 'Сбалансированная', kk: 'Теңгерімді', fr: 'Équilibré', de: 'Ausgewogen', es: 'Equilibrada' },
  keto: { en: 'Keto', ru: 'Кето', kk: 'Кето', fr: 'Kéto', de: 'Keto', es: 'Keto' },
  paleo: { en: 'Paleo', ru: 'Палео', kk: 'Палео', fr: 'Paléo', de: 'Paläo', es: 'Paleo' },
  vegan: { en: 'Vegan', ru: 'Веган', kk: 'Веган', fr: 'Végan', de: 'Vegan', es: 'Vegano' },
  vegetarian: { en: 'Vegetarian', ru: 'Вегетарианская', kk: 'Вегетариандық', fr: 'Végétarien', de: 'Vegetarisch', es: 'Vegetariana' },
  pescatarian: { en: 'Pescatarian', ru: 'Пескетарианство', kk: 'Пескетариандық', fr: 'Pescétarien', de: 'Pescetarisch', es: 'Pescetariana' },
  mediterranean: { en: 'Mediterranean', ru: 'Средиземноморская', kk: 'Жерортатеңіздік', fr: 'Méditerranéen', de: 'Mediterran', es: 'Mediterránea' },
  low_carb: { en: 'Low carb', ru: 'Низкоуглеводная', kk: 'Аз көмірсулы', fr: 'Faible en glucides', de: 'Kohlenhydratarm', es: 'Baja en carbohidratos' },
  high_protein: { en: 'High protein', ru: 'Высокобелковая', kk: 'Жоғары ақуызды', fr: 'Riche en protéines', de: 'Eiweißreich', es: 'Alta en proteínas' },
  plant_based: { en: 'Plant-based', ru: 'Растительная', kk: 'Өсімдік негізді', fr: 'À base de plantes', de: 'Pflanzenbasiert', es: 'A base de plantas' },
  gluten_free: { en: 'Gluten-free', ru: 'Без глютена', kk: 'Глютенсіз', fr: 'Sans gluten', de: 'Glutenfrei', es: 'Sin gluten' },
  lactose_free: { en: 'Lactose-free', ru: 'Без лактозы', kk: 'Лактозасыз', fr: 'Sans lactose', de: 'Laktosefrei', es: 'Sin lactosa' },
  halal: { en: 'Halal', ru: 'Халяль', kk: 'Халал', fr: 'Halal', de: 'Halal', es: 'Halal' },
  kosher: { en: 'Kosher', ru: 'Кошерная', kk: 'Кошер', fr: 'Casher', de: 'Koscher', es: 'Kosher' },
};

export function humanizeDiet(value: string, locale: Locale): string {
  return pick(DIETS[value] || {}, locale, value);
}

/** Join an array of slugs into a localized, comma-separated string. */
export function humanizeList(
  values: string[] | undefined,
  fn: (value: string, locale: Locale) => string,
  locale: Locale,
): string {
  if (!values?.length) return '';
  return values.map((v) => fn(v, locale)).join(', ');
}

// ---- Misc short units ----
export const MIN_SHORT: Record<Locale, string> = {
  en: 'min', ru: 'мин', kk: 'мин', fr: 'min', de: 'Min.', es: 'min',
};

export function minShort(locale: Locale): string {
  return MIN_SHORT[locale] || 'min';
}

// ---- Clinical flags banner (clients/[id]) ----
const CLINICAL_BANNER: Record<Locale, { title: string; subtitle: string; conflict: (n: number, cond: string) => string }> = {
  en: {
    title: 'Health conditions',
    subtitle: 'Reported during onboarding. Keep in mind when advising.',
    conflict: (n, cond) => `${n} recent ${n === 1 ? 'meal' : 'meals'} may aggravate ${cond.toLowerCase()}`,
  },
  ru: {
    title: 'Состояния здоровья',
    subtitle: 'Указаны при онбординге. Учитывайте при рекомендациях.',
    conflict: (n, cond) => `${n} ${n === 1 ? 'блюдо' : 'блюд'} за период могут усугубить: ${cond.toLowerCase()}`,
  },
  kk: {
    title: 'Денсаулық жағдайлары',
    subtitle: 'Онбордингте көрсетілген. Кеңес бергенде ескеріңіз.',
    conflict: (n, cond) => `${n} тағам ${cond.toLowerCase()} жағдайын нашарлатуы мүмкін`,
  },
  fr: {
    title: 'Problèmes de santé',
    subtitle: 'Signalés lors de l’inscription. À garder à l’esprit.',
    conflict: (n, cond) => `${n} ${n === 1 ? 'repas récent' : 'repas récents'} peuvent aggraver : ${cond.toLowerCase()}`,
  },
  de: {
    title: 'Gesundheitszustände',
    subtitle: 'Beim Onboarding angegeben. Bei der Beratung beachten.',
    conflict: (n, cond) => `${n} ${n === 1 ? 'Mahlzeit' : 'Mahlzeiten'} könnten ${cond.toLowerCase()} verschlimmern`,
  },
  es: {
    title: 'Condiciones de salud',
    subtitle: 'Indicadas en el onboarding. Tenlas en cuenta al asesorar.',
    conflict: (n, cond) => `${n} ${n === 1 ? 'comida reciente' : 'comidas recientes'} pueden agravar: ${cond.toLowerCase()}`,
  },
};

export function clinicalBanner(locale: Locale) {
  return CLINICAL_BANNER[locale] || CLINICAL_BANNER.en;
}
