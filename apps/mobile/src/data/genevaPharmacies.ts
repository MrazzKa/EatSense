/**
 * Curated Geneva pharmacy directory for the pilot.
 *
 * Shown as pins on the pharmacy map so users can discover nearby pharmacies and
 * (for opted-in partners) link instantly. Coordinates/addresses are approximate
 * per district — accurate enough to place a pin in the right neighbourhood, and
 * easy to refine once we confirm each pharmacy. Covers the main Geneva chains
 * (Amavita, Sun Store, Pharmacie Principale, Coop Vitality, Pharmacie Populaire)
 * across the city's main districts.
 *
 * `partner: true` means the pharmacy has agreed to receive EatSense refill
 * notifications by email and can be linked directly from the map. Non-partner
 * entries are shown for discovery/directions only (we don't email pharmacies
 * that haven't opted in). As pharmacies sign up, flip `partner` to true and add
 * their contact details (or provision an access code in the admin panel).
 */
export type GenevaPharmacy = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  email?: string;
  website?: string;
  /** Opted-in partner: can be linked directly from the map. */
  partner: boolean;
};

// Geneva city centre — used as the default map region.
export const GENEVA_CENTER = {
  latitude: 46.2050,
  longitude: 6.1432,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

export const GENEVA_PHARMACIES: GenevaPharmacy[] = [
  // --- City centre / station ---
  {
    id: 'amavita-gare-cornavin',
    name: 'Amavita Pharmacie Gare Genève',
    address: 'Place de Cornavin / Gare Cornavin, 1201 Genève',
    latitude: 46.2095,
    longitude: 6.1424,
    phone: '+41 58 878 18 40',
    website: 'https://www.amavita.ch',
    partner: true,
  },
  {
    id: 'pharmacie-principale-mont-blanc',
    name: 'Pharmacie Principale Mont-Blanc',
    address: 'Rue du Mont-Blanc 19, 1201 Genève',
    latitude: 46.2082,
    longitude: 6.1452,
    phone: '+41 22 731 65 80',
    website: 'https://www.pharmacieprincipale.ch',
    partner: true,
  },
  {
    id: 'pharmacie-principale-confederation',
    name: 'Pharmacie Principale Confédération Centre',
    address: 'Rue de la Confédération 8, 1204 Genève',
    latitude: 46.2042,
    longitude: 6.1443,
    website: 'https://www.pharmacieprincipale.ch',
    partner: false,
  },
  {
    id: 'sunstore-rive',
    name: 'Sun Store Pharmacie Rive',
    address: 'Rue de Rive 3, 1204 Genève',
    latitude: 46.2024,
    longitude: 6.1493,
    phone: '+41 58 878 30 30',
    website: 'https://www.sunstore.ch',
    partner: false,
  },
  // --- Pâquis / lakefront ---
  {
    id: 'pharmacie-paquis',
    name: 'Pharmacie des Pâquis',
    address: 'Rue de Berne 7, 1201 Genève',
    latitude: 46.2118,
    longitude: 6.1472,
    partner: false,
  },
  // --- Eaux-Vives ---
  {
    id: 'coop-vitality-eaux-vives',
    name: 'Coop Vitality Eaux-Vives',
    address: 'Rue de la Terrassière 58, 1207 Genève',
    latitude: 46.2008,
    longitude: 6.1601,
    phone: '+41 58 866 03 30',
    website: 'https://www.coopvitality.ch',
    partner: false,
  },
  // --- Plainpalais ---
  {
    id: 'amavita-plainpalais',
    name: 'Amavita Pharmacie Plainpalais',
    address: 'Rue de Carouge 2, 1205 Genève',
    latitude: 46.1965,
    longitude: 6.1408,
    phone: '+41 58 878 18 70',
    website: 'https://www.amavita.ch',
    partner: false,
  },
  // --- Jonction ---
  {
    id: 'pharmacie-populaire-jonction',
    name: 'Pharmacie Populaire Jonction',
    address: 'Boulevard Saint-Georges 72, 1205 Genève',
    latitude: 46.1979,
    longitude: 6.1325,
    phone: '+41 22 320 20 65',
    website: 'https://www.pharmacie-populaire.ch',
    partner: false,
  },
  // --- Servette ---
  {
    id: 'pharmacie-populaire-servette',
    name: 'Pharmacie Populaire Servette',
    address: 'Rue de la Servette 75, 1202 Genève',
    latitude: 46.2155,
    longitude: 6.1320,
    website: 'https://www.pharmacie-populaire.ch',
    partner: false,
  },
  // --- Champel ---
  {
    id: 'pharmacie-champel',
    name: 'Pharmacie de Champel',
    address: 'Avenue de Champel 39, 1206 Genève',
    latitude: 46.1875,
    longitude: 6.1535,
    partner: false,
  },
  // --- Carouge (adjacent, popular) ---
  {
    id: 'sunstore-carouge',
    name: 'Sun Store Pharmacie Carouge',
    address: 'Rue Saint-Joseph 5, 1227 Carouge',
    latitude: 46.1832,
    longitude: 6.1390,
    website: 'https://www.sunstore.ch',
    partner: false,
  },
  // --- Balexert / Châtelaine (mall) ---
  {
    id: 'coop-vitality-balexert',
    name: 'Coop Vitality Balexert',
    address: 'Avenue Louis-Casaï 27, 1209 Genève',
    latitude: 46.2199,
    longitude: 6.1129,
    website: 'https://www.coopvitality.ch',
    partner: false,
  },
];
