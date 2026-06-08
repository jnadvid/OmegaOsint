/**
 * Catálogo de plataformas para el motor de enriquecimiento OSINT.
 *
 * PLATFORMS: mapa tipo-de-identificador → metadatos + plantilla de URL de
 * perfil canónico a partir de un nombre de usuario.
 *
 * CROSS_CHECK_SITES: lista curada de sitios populares para comprobar la
 * existencia de un mismo nombre de usuario (estilo WhatsMyName/Sherlock).
 * Se usa tanto para generar enlaces de pivote en el navegador como por el
 * proxy local para verificar de verdad qué perfiles existen.
 */

export const PLATFORMS = {
  instagram: { label: 'Instagram', profile: (u) => `https://www.instagram.com/${u}/` },
  facebook: { label: 'Facebook', profile: (u) => `https://www.facebook.com/${u}` },
  twitter: { label: 'X / Twitter', profile: (u) => `https://x.com/${u}` },
  tiktok: { label: 'TikTok', profile: (u) => `https://www.tiktok.com/@${u}` },
  youtube: { label: 'YouTube', profile: (u) => `https://www.youtube.com/@${u}` },
  linkedin: { label: 'LinkedIn', profile: (u) => `https://www.linkedin.com/in/${u}` },
  snapchat: { label: 'Snapchat', profile: (u) => `https://www.snapchat.com/add/${u}` },
  reddit: { label: 'Reddit', profile: (u) => `https://www.reddit.com/user/${u}` },
  telegram: { label: 'Telegram', profile: (u) => `https://t.me/${u}` },
  discord: { label: 'Discord', profile: () => null },
};

/**
 * Sitios para comprobación cruzada de nombres de usuario. `url` genera la
 * URL pública del perfil. El proxy usa esta misma lista para verificar la
 * existencia real del perfil (HTTP 200 + heurística de página).
 */
export const CROSS_CHECK_SITES = [
  { name: 'Instagram', cat: 'social', url: (u) => `https://www.instagram.com/${u}/` },
  { name: 'X / Twitter', cat: 'social', url: (u) => `https://x.com/${u}` },
  { name: 'TikTok', cat: 'social', url: (u) => `https://www.tiktok.com/@${u}` },
  { name: 'Reddit', cat: 'social', url: (u) => `https://www.reddit.com/user/${u}` },
  { name: 'GitHub', cat: 'dev', url: (u) => `https://github.com/${u}` },
  { name: 'GitLab', cat: 'dev', url: (u) => `https://gitlab.com/${u}` },
  { name: 'Telegram', cat: 'messaging', url: (u) => `https://t.me/${u}` },
  { name: 'YouTube', cat: 'social', url: (u) => `https://www.youtube.com/@${u}` },
  { name: 'Twitch', cat: 'streaming', url: (u) => `https://www.twitch.tv/${u}` },
  { name: 'Pinterest', cat: 'social', url: (u) => `https://www.pinterest.com/${u}/` },
  { name: 'Steam', cat: 'gaming', url: (u) => `https://steamcommunity.com/id/${u}` },
  { name: 'Spotify', cat: 'music', url: (u) => `https://open.spotify.com/user/${u}` },
  { name: 'SoundCloud', cat: 'music', url: (u) => `https://soundcloud.com/${u}` },
  { name: 'Medium', cat: 'blog', url: (u) => `https://medium.com/@${u}` },
  { name: 'Patreon', cat: 'social', url: (u) => `https://www.patreon.com/${u}` },
  { name: 'Vimeo', cat: 'social', url: (u) => `https://vimeo.com/${u}` },
  { name: 'Keybase', cat: 'dev', url: (u) => `https://keybase.io/${u}` },
  { name: 'About.me', cat: 'social', url: (u) => `https://about.me/${u}` },
  { name: 'Gravatar', cat: 'identity', url: (u) => `https://gravatar.com/${u}` },
  { name: 'Wordpress', cat: 'blog', url: (u) => `https://${u}.wordpress.com/` },
  { name: 'Replit', cat: 'dev', url: (u) => `https://replit.com/@${u}` },
  { name: 'Dev.to', cat: 'dev', url: (u) => `https://dev.to/${u}` },
  { name: 'Linktree', cat: 'identity', url: (u) => `https://linktr.ee/${u}` },
];
