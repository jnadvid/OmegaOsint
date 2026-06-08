/**
 * Definitions for every built-in identifier type plus the "custom" catch-all.
 *
 * Each type declares:
 *   - label:    human-readable name shown in the picker and badges
 *   - category: groups types in the picker (see CATEGORIES below)
 *   - glyph:    2-character abbreviation rendered inside the colored badge
 *   - color:    badge background color
 *   - fields:   array of field descriptors rendered as form inputs
 *
 * Field descriptor shape:
 *   - key:         unique key inside identifier.fields
 *   - label:       form label
 *   - type:        'text' | 'textarea' | 'url' | 'email' | 'tel' | 'number' | 'date'
 *   - placeholder: optional input placeholder
 *   - primary:     when true, this field's value is used as the list display label
 *                  and is required when saving
 */

export const CATEGORIES = {
  social: { label: 'Redes sociales', order: 1 },
  contact: { label: 'Contacto', order: 2 },
  personal: { label: 'Personal', order: 3 },
  vehicle: { label: 'Vehículo', order: 4 },
  other: { label: 'Otros', order: 5 },
};

const socialNumericFields = [
  { key: 'followers', label: 'Seguidores', type: 'number' },
  { key: 'following', label: 'Siguiendo', type: 'number' },
  { key: 'posts', label: 'Publicaciones', type: 'number' },
];

export const IDENTIFIER_TYPES = {
  instagram: {
    label: 'Instagram',
    category: 'social',
    glyph: 'IG',
    color: '#E1306C',
    fields: [
      { key: 'username', label: 'Usuario', type: 'text', primary: true, placeholder: '@username' },
      { key: 'profileUrl', label: 'URL del perfil', type: 'url' },
      { key: 'displayName', label: 'Nombre visible', type: 'text' },
      { key: 'email', label: 'Correo vinculado', type: 'email' },
      { key: 'phone', label: 'Teléfono vinculado', type: 'tel' },
      ...socialNumericFields,
      { key: 'videos', label: 'Vídeos', type: 'number' },
      { key: 'taggedPhotos', label: 'Fotos etiquetadas', type: 'number' },
      { key: 'bio', label: 'Biografía', type: 'textarea' },
    ],
  },
  facebook: {
    label: 'Facebook',
    category: 'social',
    glyph: 'FB',
    color: '#1877F2',
    fields: [
      { key: 'username', label: 'Usuario o alias', type: 'text', primary: true },
      { key: 'profileUrl', label: 'URL del perfil', type: 'url' },
      { key: 'displayName', label: 'Nombre visible', type: 'text' },
      { key: 'email', label: 'Correo vinculado', type: 'email' },
      ...socialNumericFields,
      { key: 'bio', label: 'Biografía', type: 'textarea' },
    ],
  },
  twitter: {
    label: 'X / Twitter',
    category: 'social',
    glyph: 'X',
    color: '#1d1d1f',
    fields: [
      { key: 'username', label: 'Usuario', type: 'text', primary: true, placeholder: '@handle' },
      { key: 'profileUrl', label: 'URL del perfil', type: 'url' },
      { key: 'displayName', label: 'Nombre visible', type: 'text' },
      ...socialNumericFields,
      { key: 'bio', label: 'Biografía', type: 'textarea' },
    ],
  },
  youtube: {
    label: 'YouTube',
    category: 'social',
    glyph: 'YT',
    color: '#FF0000',
    fields: [
      { key: 'channelName', label: 'Nombre del canal', type: 'text', primary: true },
      { key: 'channelUrl', label: 'URL del canal', type: 'url' },
      { key: 'handle', label: 'Alias', type: 'text', placeholder: '@alias' },
      { key: 'subscribers', label: 'Suscriptores', type: 'number' },
      { key: 'videos', label: 'Vídeos', type: 'number' },
      { key: 'bio', label: 'Acerca de', type: 'textarea' },
    ],
  },
  tiktok: {
    label: 'TikTok',
    category: 'social',
    glyph: 'TT',
    color: '#000000',
    fields: [
      { key: 'username', label: 'Usuario', type: 'text', primary: true, placeholder: '@username' },
      { key: 'profileUrl', label: 'URL del perfil', type: 'url' },
      { key: 'displayName', label: 'Nombre visible', type: 'text' },
      ...socialNumericFields,
      { key: 'likes', label: 'Me gusta', type: 'number' },
      { key: 'bio', label: 'Biografía', type: 'textarea' },
    ],
  },
  linkedin: {
    label: 'LinkedIn',
    category: 'social',
    glyph: 'LI',
    color: '#0A66C2',
    fields: [
      { key: 'fullName', label: 'Nombre completo', type: 'text', primary: true },
      { key: 'profileUrl', label: 'URL del perfil', type: 'url' },
      { key: 'headline', label: 'Titular', type: 'text' },
      { key: 'company', label: 'Empresa actual', type: 'text' },
      { key: 'role', label: 'Puesto actual', type: 'text' },
      { key: 'location', label: 'Ubicación', type: 'text' },
      { key: 'connections', label: 'Contactos', type: 'number' },
    ],
  },
  snapchat: {
    label: 'Snapchat',
    category: 'social',
    glyph: 'SC',
    color: '#FFFC00',
    fields: [
      { key: 'username', label: 'Usuario', type: 'text', primary: true },
      { key: 'displayName', label: 'Nombre visible', type: 'text' },
      { key: 'snapcode', label: 'URL del Snapcode', type: 'url' },
    ],
  },
  reddit: {
    label: 'Reddit',
    category: 'social',
    glyph: 'RD',
    color: '#FF4500',
    fields: [
      { key: 'username', label: 'Usuario', type: 'text', primary: true, placeholder: 'u/username' },
      { key: 'profileUrl', label: 'URL del perfil', type: 'url' },
      { key: 'karma', label: 'Karma', type: 'number' },
      { key: 'accountAge', label: 'Antigüedad de la cuenta', type: 'text', placeholder: 'p. ej. 4 años' },
    ],
  },
  discord: {
    label: 'Discord',
    category: 'social',
    glyph: 'DC',
    color: '#5865F2',
    fields: [
      { key: 'username', label: 'Usuario', type: 'text', primary: true },
      { key: 'displayName', label: 'Nombre visible', type: 'text' },
      { key: 'userId', label: 'ID de usuario', type: 'text' },
    ],
  },
  telegram: {
    label: 'Telegram',
    category: 'social',
    glyph: 'TG',
    color: '#2AABEE',
    fields: [
      { key: 'username', label: 'Usuario', type: 'text', primary: true, placeholder: '@username' },
      { key: 'phone', label: 'Teléfono vinculado', type: 'tel' },
      { key: 'displayName', label: 'Nombre visible', type: 'text' },
    ],
  },

  email: {
    label: 'Correo',
    category: 'contact',
    glyph: '@',
    color: '#7C4DFF',
    fields: [
      { key: 'address', label: 'Dirección de correo', type: 'email', primary: true, placeholder: 'nombre@ejemplo.com' },
      { key: 'provider', label: 'Proveedor', type: 'text', placeholder: 'Gmail, Outlook, ProtonMail…' },
      { key: 'context', label: 'Contexto', type: 'text', placeholder: 'Trabajo, personal, desechable…' },
    ],
  },
  phone: {
    label: 'Teléfono',
    category: 'contact',
    glyph: '☎',
    color: '#0EA5A0',
    fields: [
      { key: 'number', label: 'Número de teléfono', type: 'tel', primary: true, placeholder: '+34 600 000 000' },
      { key: 'carrier', label: 'Operador', type: 'text' },
      { key: 'lineType', label: 'Tipo de línea', type: 'text', placeholder: 'Móvil, fijo, VoIP…' },
      { key: 'country', label: 'País', type: 'text' },
    ],
  },

  name: {
    label: 'Nombre',
    category: 'personal',
    glyph: 'N',
    color: '#3B82F6',
    fields: [
      { key: 'fullName', label: 'Nombre completo', type: 'text', primary: true },
      { key: 'aliases', label: 'Alias / apodos', type: 'text' },
      { key: 'dob', label: 'Fecha de nacimiento', type: 'date' },
      { key: 'gender', label: 'Género', type: 'text' },
    ],
  },
  address: {
    label: 'Dirección',
    category: 'personal',
    glyph: 'AD',
    color: '#10B981',
    fields: [
      { key: 'line1', label: 'Dirección', type: 'text', primary: true },
      { key: 'line2', label: 'Piso / Puerta', type: 'text' },
      { key: 'city', label: 'Ciudad', type: 'text' },
      { key: 'region', label: 'Estado / Región', type: 'text' },
      { key: 'postal', label: 'Código postal', type: 'text' },
      { key: 'country', label: 'País', type: 'text' },
      { key: 'context', label: 'Contexto', type: 'text', placeholder: 'Casa, trabajo, anterior…' },
    ],
  },
  family: {
    label: 'Familiar',
    category: 'personal',
    glyph: 'FM',
    color: '#F59E0B',
    fields: [
      { key: 'name', label: 'Nombre', type: 'text', primary: true },
      { key: 'relation', label: 'Parentesco', type: 'text', placeholder: 'Pareja, padre/madre, hermano/a…' },
      { key: 'dob', label: 'Fecha de nacimiento', type: 'date' },
      { key: 'contact', label: 'Contacto', type: 'text' },
    ],
  },

  vehicle: {
    label: 'Vehículo',
    category: 'vehicle',
    glyph: 'CR',
    color: '#EF4444',
    fields: [
      { key: 'description', label: 'Descripción', type: 'text', primary: true, placeholder: 'Honda Civic 2018, plateado' },
      { key: 'make', label: 'Marca', type: 'text' },
      { key: 'model', label: 'Modelo', type: 'text' },
      { key: 'year', label: 'Año', type: 'number' },
      { key: 'color', label: 'Color', type: 'text' },
      { key: 'owner', label: 'Titular registrado', type: 'text' },
    ],
  },
  vin: {
    label: 'VIN',
    category: 'vehicle',
    glyph: 'VN',
    color: '#DC2626',
    fields: [
      { key: 'vin', label: 'VIN', type: 'text', primary: true, placeholder: '17 caracteres' },
      { key: 'vehicleDescription', label: 'Descripción del vehículo', type: 'text' },
    ],
  },
  licensePlate: {
    label: 'Matrícula',
    category: 'vehicle',
    glyph: 'LP',
    color: '#B91C1C',
    fields: [
      { key: 'plate', label: 'Matrícula', type: 'text', primary: true },
      { key: 'region', label: 'Estado / Región', type: 'text' },
      { key: 'country', label: 'País', type: 'text' },
      { key: 'vehicleDescription', label: 'Descripción del vehículo', type: 'text' },
    ],
  },

  custom: {
    label: 'Personalizado',
    category: 'other',
    glyph: '*',
    color: '#6B7280',
    fields: [
      { key: 'title', label: 'Título', type: 'text', primary: true, placeholder: '¿Qué es este identificador?' },
      { key: 'value', label: 'Valor', type: 'text' },
      { key: 'url', label: 'URL', type: 'url' },
    ],
  },
};

export function listTypesByCategory() {
  const byCat = {};
  for (const [key, def] of Object.entries(IDENTIFIER_TYPES)) {
    if (!byCat[def.category]) byCat[def.category] = [];
    byCat[def.category].push({ key, ...def });
  }
  return Object.entries(CATEGORIES)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([key, meta]) => ({
      key,
      label: meta.label,
      types: byCat[key] ?? [],
    }))
    .filter((c) => c.types.length > 0);
}

export function getTypeDef(typeKey) {
  return IDENTIFIER_TYPES[typeKey] ?? IDENTIFIER_TYPES.custom;
}

export function getPrimaryFieldKey(typeKey) {
  const def = getTypeDef(typeKey);
  return def.fields.find((f) => f.primary)?.key ?? def.fields[0]?.key;
}

export function getDisplayLabel(identifier) {
  if (!identifier) return '';
  const primaryKey = getPrimaryFieldKey(identifier.type);
  const value = identifier.fields?.[primaryKey];
  if (value && String(value).trim()) return String(value);
  return getTypeDef(identifier.type).label;
}

export function getSecondaryLabel(identifier) {
  if (!identifier) return '';
  const def = getTypeDef(identifier.type);
  const primaryKey = getPrimaryFieldKey(identifier.type);
  for (const field of def.fields) {
    if (field.key === primaryKey) continue;
    const value = identifier.fields?.[field.key];
    if (value && String(value).trim()) return String(value);
  }
  return '';
}

/**
 * Resolve which image (if any) to use for a given identifier/type.
 *
 * Resolution order:
 *   1. Explicit customIconId on the identifier (overrides the type default)
 *      - May reference a built-in icon ('instagram', 'snapchat', …)
 *        OR a user-uploaded icon stored in CustomIconsContext.
 *   2. Type default (TYPE_DEFAULT_ICON lookup)
 *   3. null → caller should render the colored glyph badge instead.
 *
 * For built-in icons, the variant (light/dark) is picked from getBuiltInSrc.
 */
export function resolveIconSrc(
  { typeKey, customIconId },
  customIcons = {},
  BUILT_IN_ICONS,
  TYPE_DEFAULT_ICON,
  getBuiltInSrc,
  theme = 'dark',
) {
  if (customIconId) {
    if (BUILT_IN_ICONS[customIconId]) return getBuiltInSrc(customIconId, theme);
    if (customIcons[customIconId]) return customIcons[customIconId].dataUrl;
  }
  const fallback = TYPE_DEFAULT_ICON[typeKey];
  if (fallback && BUILT_IN_ICONS[fallback]) return getBuiltInSrc(fallback, theme);
  return null;
}
