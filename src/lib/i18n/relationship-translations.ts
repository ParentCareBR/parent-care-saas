/**
 * Multilingual Relationship / Kinship Dictionary
 * Translates relationship strings (e.g. 'Filho(a)', 'Esposa', 'Cuidador')
 * saved in the database into the user's active locale.
 */

export type SupportedLang = 'pt-BR' | 'en' | 'es' | 'fr' | 'de';

export function normalizeLang(locale?: string): SupportedLang {
  if (!locale) return 'pt-BR';
  const lower = locale.toLowerCase();
  if (lower.startsWith('pt')) return 'pt-BR';
  if (lower.startsWith('es')) return 'es';
  if (lower.startsWith('fr')) return 'fr';
  if (lower.startsWith('de')) return 'de';
  if (lower.startsWith('en')) return 'en';
  return 'pt-BR';
}

const RELATIONSHIP_MAP: Record<string, Record<SupportedLang, string>> = {
  // Filhos
  'filho(a)': { 'pt-BR': 'Filho(a)', en: 'Son / Daughter', es: 'Hijo(a)', fr: 'Fils / Fille', de: 'Sohn / Tochter' },
  'filho': { 'pt-BR': 'Filho', en: 'Son', es: 'Hijo', fr: 'Fils', de: 'Sohn' },
  'filha': { 'pt-BR': 'Filha', en: 'Daughter', es: 'Hija', fr: 'Fille', de: 'Tochter' },
  'filhos': { 'pt-BR': 'Filhos', en: 'Children', es: 'Hijos', fr: 'Enfants', de: 'Kinder' },
  'filho mais velho': { 'pt-BR': 'Filho mais velho', en: 'Eldest son', es: 'Hijo mayor', fr: 'Fils aîné', de: 'Ältester Sohn' },
  'filha mais velha': { 'pt-BR': 'Filha mais velha', en: 'Eldest daughter', es: 'Hija mayor', fr: 'Fille aînée', de: 'Älteste Tochter' },
  'filho mais novo': { 'pt-BR': 'Filho mais novo', en: 'Youngest son', es: 'Hijo menor', fr: 'Fils cadet', de: 'Jüngster Sohn' },
  'filha mais nova': { 'pt-BR': 'Filha mais nova', en: 'Youngest daughter', es: 'Hija menor', fr: 'Fille cadette', de: 'Jüngste Tochter' },
  'filho caçula': { 'pt-BR': 'Filho caçula', en: 'Youngest son', es: 'Hijo menor', fr: 'Fils cadet', de: 'Jüngster Sohn' },
  'filha caçula': { 'pt-BR': 'Filha caçula', en: 'Youngest daughter', es: 'Hija menor', fr: 'Fille cadette', de: 'Jüngste Tochter' },
  'enteado': { 'pt-BR': 'Enteado', en: 'Stepson', es: 'Hijastro', fr: 'Beau-fils', de: 'Stiefsohn' },
  'enteada': { 'pt-BR': 'Enteada', en: 'Stepdaughter', es: 'Hijastra', fr: 'Belle-fille', de: 'Stieftochter' },
  'enteado(a)': { 'pt-BR': 'Enteado(a)', en: 'Stepchild', es: 'Hijastro(a)', fr: 'Beau-fils / Belle-fille', de: 'Stiefkind' },

  // Pais
  'pai': { 'pt-BR': 'Pai', en: 'Father', es: 'Padre', fr: 'Père', de: 'Vater' },
  'mãe': { 'pt-BR': 'Mãe', en: 'Mother', es: 'Madre', fr: 'Mère', de: 'Mutter' },
  'mae': { 'pt-BR': 'Mãe', en: 'Mother', es: 'Madre', fr: 'Mère', de: 'Mutter' },
  'pais': { 'pt-BR': 'Pais', en: 'Parents', es: 'Padres', fr: 'Parents', de: 'Eltern' },
  'padrasto': { 'pt-BR': 'Padrasto', en: 'Stepfather', es: 'Padrastro', fr: 'Beau-père', de: 'Stiefvater' },
  'madrasta': { 'pt-BR': 'Madrasta', en: 'Stepmother', es: 'Madrastra', fr: 'Belle-mère', de: 'Stiefmutter' },

  // Cônjuge
  'esposo(a)': { 'pt-BR': 'Esposo(a)', en: 'Spouse', es: 'Esposo(a)', fr: 'Conjoint(e)', de: 'Ehepartner(in)' },
  'esposo': { 'pt-BR': 'Esposo', en: 'Husband', es: 'Esposo', fr: 'Mari', de: 'Ehemann' },
  'esposa': { 'pt-BR': 'Esposa', en: 'Wife', es: 'Esposa', fr: 'Femme', de: 'Ehefrau' },
  'marido': { 'pt-BR': 'Marido', en: 'Husband', es: 'Esposo', fr: 'Mari', de: 'Ehemann' },
  'mulher': { 'pt-BR': 'Mulher', en: 'Wife', es: 'Esposa', fr: 'Femme', de: 'Ehefrau' },
  'cônjuge': { 'pt-BR': 'Cônjuge', en: 'Spouse', es: 'Cónyuge', fr: 'Conjoint(e)', de: 'Ehepartner(in)' },
  'conjuge': { 'pt-BR': 'Cônjuge', en: 'Spouse', es: 'Cónyuge', fr: 'Conjoint(e)', de: 'Ehepartner(in)' },
  'companheiro': { 'pt-BR': 'Companheiro', en: 'Partner', es: 'Compañero', fr: 'Partenaire', de: 'Partner' },
  'companheira': { 'pt-BR': 'Companheira', en: 'Partner', es: 'Compañera', fr: 'Partenaire', de: 'Partnerin' },
  'companheiro(a)': { 'pt-BR': 'Companheiro(a)', en: 'Partner', es: 'Compañero(a)', fr: 'Partenaire', de: 'Partner(in)' },

  // Irmãos
  'irmão(ã)': { 'pt-BR': 'Irmão(ã)', en: 'Brother / Sister', es: 'Hermano(a)', fr: 'Frère / Sœur', de: 'Geschwister' },
  'irmao(a)': { 'pt-BR': 'Irmão(ã)', en: 'Brother / Sister', es: 'Hermano(a)', fr: 'Frère / Sœur', de: 'Geschwister' },
  'irmão': { 'pt-BR': 'Irmão', en: 'Brother', es: 'Hermano', fr: 'Frère', de: 'Bruder' },
  'irmao': { 'pt-BR': 'Irmão', en: 'Brother', es: 'Hermano', fr: 'Frère', de: 'Bruder' },
  'irmã': { 'pt-BR': 'Irmã', en: 'Sister', es: 'Hermana', fr: 'Sœur', de: 'Schwester' },
  'irma': { 'pt-BR': 'Irmã', en: 'Sister', es: 'Hermana', fr: 'Sœur', de: 'Schwester' },
  'irmãos': { 'pt-BR': 'Irmãos', en: 'Siblings', es: 'Hermanos', fr: 'Frères et Sœurs', de: 'Geschwister' },
  'irmaos': { 'pt-BR': 'Irmãos', en: 'Siblings', es: 'Hermanos', fr: 'Frères et Sœurs', de: 'Geschwister' },

  // Netos
  'neto(a)': { 'pt-BR': 'Neto(a)', en: 'Grandchild', es: 'Nieto(a)', fr: 'Petit-enfant', de: 'Enkelkind' },
  'neto': { 'pt-BR': 'Neto', en: 'Grandson', es: 'Nieto', fr: 'Petit-fils', de: 'Enkel' },
  'neta': { 'pt-BR': 'Neta', en: 'Granddaughter', es: 'Nieta', fr: 'Petite-fille', de: 'Enkelin' },
  'netos': { 'pt-BR': 'Netos', en: 'Grandchildren', es: 'Nietos', fr: 'Petits-enfants', de: 'Enkelkinder' },
  'bisneto(a)': { 'pt-BR': 'Bisneto(a)', en: 'Great-grandchild', es: 'Bisnieto(a)', fr: 'Arrière-petit-enfant', de: 'Urenkelkind' },
  'bisneto': { 'pt-BR': 'Bisneto', en: 'Great-grandson', es: 'Bisnieto', fr: 'Arrière-petit-fils', de: 'Urenkel' },
  'bisneta': { 'pt-BR': 'Bisneta', en: 'Great-granddaughter', es: 'Bisnieta', fr: 'Arrière-petite-fille', de: 'Urenkelin' },

  // Avós
  'avô': { 'pt-BR': 'Avô', en: 'Grandfather', es: 'Abuelo', fr: 'Grand-père', de: 'Großvater' },
  'avo': { 'pt-BR': 'Avô', en: 'Grandfather', es: 'Abuelo', fr: 'Grand-père', de: 'Großvater' },
  'avó': { 'pt-BR': 'Avó', en: 'Grandmother', es: 'Abuela', fr: 'Grand-mère', de: 'Großmutter' },
  'avós': { 'pt-BR': 'Avós', en: 'Grandparents', es: 'Abuelos', fr: 'Grands-parents', de: 'Großeltern' },

  // Tios e Sobrinhos
  'tio(a)': { 'pt-BR': 'Tio(a)', en: 'Uncle / Aunt', es: 'Tío(a)', fr: 'Oncle / Tante', de: 'Onkel / Tante' },
  'tio': { 'pt-BR': 'Tio', en: 'Uncle', es: 'Tío', fr: 'Oncle', de: 'Onkel' },
  'tia': { 'pt-BR': 'Tia', en: 'Aunt', es: 'Tía', fr: 'Tante', de: 'Tante' },
  'sobrinho(a)': { 'pt-BR': 'Sobrinho(a)', en: 'Nephew / Niece', es: 'Sobrino(a)', fr: 'Neveu / Nièce', de: 'Neffe / Nichte' },
  'sobrinho': { 'pt-BR': 'Sobrinho', en: 'Nephew', es: 'Sobrino', fr: 'Neveu', de: 'Neffe' },
  'sobrinha': { 'pt-BR': 'Sobrinha', en: 'Niece', es: 'Sobrina', fr: 'Nièce', de: 'Nichte' },

  // Primos
  'primo(a)': { 'pt-BR': 'Primo(a)', en: 'Cousin', es: 'Primo(a)', fr: 'Cousin(e)', de: 'Cousin(e)' },
  'primo': { 'pt-BR': 'Primo', en: 'Cousin', es: 'Primo', fr: 'Cousin', de: 'Cousin' },
  'prima': { 'pt-BR': 'Prima', en: 'Cousin', es: 'Prima', fr: 'Cousine', de: 'Cousine' },

  // Sogros / Genros / Noras / Cunhados
  'genro': { 'pt-BR': 'Genro', en: 'Son-in-law', es: 'Yerno', fr: 'Gendre', de: 'Schwiegersohn' },
  'nora': { 'pt-BR': 'Nora', en: 'Daughter-in-law', es: 'Nuera', fr: 'Belle-fille', de: 'Schwiegertochter' },
  'sogro(a)': { 'pt-BR': 'Sogro(a)', en: 'Parent-in-law', es: 'Suegro(a)', fr: 'Beau-parent', de: 'Schwiegereltern' },
  'sogro': { 'pt-BR': 'Sogro', en: 'Father-in-law', es: 'Suegro', fr: 'Beau-père', de: 'Schwiegervater' },
  'sogra': { 'pt-BR': 'Sogra', en: 'Mother-in-law', es: 'Suegra', fr: 'Belle-mère', de: 'Schwiegermutter' },
  'cunhado(a)': { 'pt-BR': 'Cunhado(a)', en: 'Brother / Sister-in-law', es: 'Cuñado(a)', fr: 'Beau-frère / Belle-sœur', de: 'Schwäger(in)' },
  'cunhado': { 'pt-BR': 'Cunhado', en: 'Brother-in-law', es: 'Cuñado', fr: 'Beau-frère', de: 'Schwager' },
  'cunhada': { 'pt-BR': 'Cunhada', en: 'Sister-in-law', es: 'Cuñada', fr: 'Belle-sœur', de: 'Schwägerin' },

  // Cuidador / Saúde
  'cuidador(a)': { 'pt-BR': 'Cuidador(a)', en: 'Caregiver', es: 'Cuidador(a)', fr: 'Aidant(e)', de: 'Pflegekraft' },
  'cuidador': { 'pt-BR': 'Cuidador', en: 'Caregiver', es: 'Cuidador', fr: 'Aidant', de: 'Pflegekraft' },
  'cuidadora': { 'pt-BR': 'Cuidadora', en: 'Caregiver', es: 'Cuidadora', fr: 'Aidante', de: 'Pflegekraft' },
  'enfermeiro(a)': { 'pt-BR': 'Enfermeiro(a)', en: 'Nurse', es: 'Enfermero(a)', fr: 'Infirmier(ère)', de: 'Pflegefachkraft' },
  'enfermeiro': { 'pt-BR': 'Enfermeiro', en: 'Nurse', es: 'Enfermero', fr: 'Infirmier', de: 'Krankenpfleger' },
  'enfermeira': { 'pt-BR': 'Enfermeira', en: 'Nurse', es: 'Enfermera', fr: 'Infirmière', de: 'Krankenschwester' },
  'médico(a)': { 'pt-BR': 'Médico(a)', en: 'Doctor', es: 'Médico(a)', fr: 'Médecin', de: 'Arzt / Ärztin' },
  'medico(a)': { 'pt-BR': 'Médico(a)', en: 'Doctor', es: 'Médico(a)', fr: 'Médecin', de: 'Arzt / Ärztin' },
  'médico': { 'pt-BR': 'Médico', en: 'Doctor', es: 'Médico', fr: 'Médecin', de: 'Arzt' },
  'medico': { 'pt-BR': 'Médico', en: 'Doctor', es: 'Médico', fr: 'Médecin', de: 'Arzt' },
  'médica': { 'pt-BR': 'Médica', en: 'Doctor', es: 'Médica', fr: 'Médecin', de: 'Ärztin' },
  'medica': { 'pt-BR': 'Médica', en: 'Doctor', es: 'Médica', fr: 'Médecin', de: 'Ärztin' },
  'fisioterapeuta': { 'pt-BR': 'Fisioterapeuta', en: 'Physical Therapist', es: 'Fisioterapeuta', fr: 'Kinésithérapeute', de: 'Physiotherapeut(in)' },

  // Outros
  'vizinho(a)': { 'pt-BR': 'Vizinho(a)', en: 'Neighbor', es: 'Vecino(a)', fr: 'Voisin(e)', de: 'Nachbar(in)' },
  'vizinho': { 'pt-BR': 'Vizinho', en: 'Neighbor', es: 'Vecino', fr: 'Voisin', de: 'Nachbar' },
  'vizinha': { 'pt-BR': 'Vizinha', en: 'Neighbor', es: 'Vecina', fr: 'Voisine', de: 'Nachbarin' },
  'amigo(a)': { 'pt-BR': 'Amigo(a)', en: 'Friend', es: 'Amigo(a)', fr: 'Ami(e)', de: 'Freund(in)' },
  'amigo': { 'pt-BR': 'Amigo', en: 'Friend', es: 'Amigo', fr: 'Ami', de: 'Freund' },
  'amiga': { 'pt-BR': 'Amiga', en: 'Friend', es: 'Amiga', fr: 'Amie', de: 'Freundin' },
  'familiar': { 'pt-BR': 'Familiar', en: 'Family member', es: 'Familiar', fr: 'Membre de la famille', de: 'Familienmitglied' },
  'parente': { 'pt-BR': 'Parente', en: 'Relative', es: 'Pariente', fr: 'Parent(e)', de: 'Verwandte(r)' },
  'outro': { 'pt-BR': 'Outro', en: 'Other', es: 'Otro', fr: 'Autre', de: 'Andere' },
  'outra': { 'pt-BR': 'Outra', en: 'Other', es: 'Otra', fr: 'Autre', de: 'Andere' },
};

/**
 * Translates a relationship string according to the active locale.
 * Fallbacks gracefully if no translation is found.
 */
export function translateRelationship(rawRelationship?: string | null, rawLocale?: string): string {
  if (!rawRelationship || typeof rawRelationship !== 'string') return '';
  const lang = normalizeLang(rawLocale);
  const clean = rawRelationship.trim().replace(/^\(|\)$/g, '').trim().toLowerCase();

  const entry = RELATIONSHIP_MAP[clean];
  if (entry && entry[lang]) {
    return entry[lang];
  }

  // Partial matches (e.g. contains 'filho', 'filha', etc.)
  for (const [key, translations] of Object.entries(RELATIONSHIP_MAP)) {
    if (clean.includes(key)) {
      return translations[lang];
    }
  }

  // If already Portuguese and target is Portuguese, return raw
  if (lang === 'pt-BR') return rawRelationship.trim();

  return rawRelationship.trim();
}

/**
 * Formats a contact's display label:
 * Example: 'James' + 'Filho(a)' in EN -> 'James (Son / Daughter)'
 * Also cleans up if the name already contains embedded Portuguese parentheses like 'James (Filho)'.
 */
export function formatContactNameWithRelationship(
  rawName?: string | null,
  rawRelationship?: string | null,
  locale?: string
): string {
  const lang = normalizeLang(locale);
  let name = (rawName || '').trim();
  let relationship = (rawRelationship || '').trim();

  // If name contains embedded parenthesis e.g. "James (Filho(a))"
  const embeddedMatch = name.match(/^(.*?)\s*\(([^)]+)\)$/);
  if (embeddedMatch) {
    name = embeddedMatch[1].trim();
    if (!relationship) {
      relationship = embeddedMatch[2].trim();
    }
  }

  const translatedRel = translateRelationship(relationship, lang);

  if (name && translatedRel) {
    return `${name} (${translatedRel})`;
  }
  if (name) return name;
  if (translatedRel) return translatedRel;

  const defaultFallbacks: Record<SupportedLang, string> = {
    'pt-BR': 'Contato da Família',
    'en': 'Family Contact',
    'es': 'Contacto de la Familia',
    'fr': 'Contact Familial',
    'de': 'Familienkontakt',
  };

  return defaultFallbacks[lang] || defaultFallbacks['pt-BR'];
}
