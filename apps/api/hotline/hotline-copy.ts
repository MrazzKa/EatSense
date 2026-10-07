/**
 * Push copy for the hotline.
 *
 * Fixed strings with no detail from the request. A notification is read on a
 * lock screen, in public, by whoever is holding the phone — the last place a
 * health complaint should be spelled out. The detail lives behind the login.
 */

export type HotlinePushKind = 'expertAlert' | 'clientAccepted' | 'clientExpired';

type Lang = 'en' | 'ru' | 'kk' | 'fr' | 'de' | 'es';

export const HOTLINE_PUSH_TITLE = 'EatSense';

const COPY: Record<Lang, Record<HotlinePushKind, string>> = {
  en: {
    expertAlert: 'Someone is waiting on the hotline',
    clientAccepted: 'A specialist has joined — open the chat',
    clientExpired: 'Nobody was free in time. Try again or book a consultation.',
  },
  ru: {
    expertAlert: 'На горячей линии ждут ответа',
    clientAccepted: 'Специалист на связи — откройте чат',
    clientExpired: 'Никто не успел ответить. Попробуйте ещё раз или запишитесь на консультацию.',
  },
  kk: {
    expertAlert: 'Жедел желіде жауап күтуде',
    clientAccepted: 'Маман байланыста — чатты ашыңыз',
    clientExpired: 'Ешкім уақытында жауап бере алмады. Қайталап көріңіз немесе кеңеске жазылыңыз.',
  },
  fr: {
    expertAlert: 'Quelqu’un attend sur la ligne directe',
    clientAccepted: 'Un spécialiste a rejoint — ouvrez le chat',
    clientExpired: 'Personne n’a pu répondre à temps. Réessayez ou réservez une consultation.',
  },
  de: {
    expertAlert: 'Jemand wartet auf der Hotline',
    clientAccepted: 'Eine Fachperson ist da — öffnen Sie den Chat',
    clientExpired: 'Niemand war rechtzeitig frei. Versuchen Sie es erneut oder buchen Sie eine Beratung.',
  },
  es: {
    expertAlert: 'Alguien espera en la línea directa',
    clientAccepted: 'Un especialista se ha unido — abre el chat',
    clientExpired: 'Nadie pudo responder a tiempo. Inténtalo de nuevo o reserva una consulta.',
  },
};

function toLang(locale?: string | null): Lang {
  const value = String(locale || '').split('-')[0].toLowerCase();
  return value in COPY ? (value as Lang) : 'en';
}

export function hotlinePushBody(kind: HotlinePushKind, locale?: string | null): string {
  return COPY[toLang(locale)][kind];
}
