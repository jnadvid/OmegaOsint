/**
 * Lista curada de sitios para verificación de nombres de usuario
 * (estilo WhatsMyName / Sherlock). El proxy consulta cada URL y decide si el
 * perfil existe según las reglas de detección.
 *
 * Reglas por sitio:
 *   - url:     plantilla con {u}
 *   - eCode:   código HTTP que indica "existe" (por defecto 200)
 *   - mString: si la respuesta contiene esta cadena, NO existe
 *   - eString: si se define, debe aparecer para considerar "existe"
 *   - cat:     categoría
 *
 * Se priorizan sitios que responden de forma fiable a peticiones de servidor
 * (sin muros de JavaScript ni bloqueos agresivos). Puedes ampliarla libremente.
 */
export const SITES = [
  { name: 'GitHub', cat: 'dev', url: 'https://github.com/{u}', eCode: 200, mCode: 404 },
  { name: 'GitLab', cat: 'dev', url: 'https://gitlab.com/{u}', eCode: 200, mCode: 404 },
  { name: 'Reddit', cat: 'social', url: 'https://www.reddit.com/user/{u}/about.json', eCode: 200, mString: '"is_suspended": true' },
  { name: 'Telegram', cat: 'messaging', url: 'https://t.me/{u}', eCode: 200, mString: 'tgme_page_title' },
  { name: 'Twitch', cat: 'streaming', url: 'https://m.twitch.tv/{u}', eCode: 200, mCode: 404 },
  { name: 'Steam', cat: 'gaming', url: 'https://steamcommunity.com/id/{u}', eCode: 200, mString: 'The specified profile could not be found' },
  { name: 'Pinterest', cat: 'social', url: 'https://www.pinterest.com/{u}/', eCode: 200, mCode: 404 },
  { name: 'SoundCloud', cat: 'music', url: 'https://soundcloud.com/{u}', eCode: 200, mCode: 404 },
  { name: 'Vimeo', cat: 'social', url: 'https://vimeo.com/{u}', eCode: 200, mCode: 404 },
  { name: 'Medium', cat: 'blog', url: 'https://medium.com/@{u}', eCode: 200, mCode: 404 },
  { name: 'Dev.to', cat: 'dev', url: 'https://dev.to/{u}', eCode: 200, mCode: 404 },
  { name: 'Replit', cat: 'dev', url: 'https://replit.com/@{u}', eCode: 200, mCode: 404 },
  { name: 'Keybase', cat: 'dev', url: 'https://keybase.io/{u}', eCode: 200, mString: 'Sorry, this page' },
  { name: 'Patreon', cat: 'social', url: 'https://www.patreon.com/{u}', eCode: 200, mCode: 404 },
  { name: 'Linktree', cat: 'identity', url: 'https://linktr.ee/{u}', eCode: 200, mCode: 404 },
  { name: 'About.me', cat: 'identity', url: 'https://about.me/{u}', eCode: 200, mCode: 404 },
  { name: 'Wordpress', cat: 'blog', url: 'https://{u}.wordpress.com/', eCode: 200, mCode: 404 },
  { name: 'Chess.com', cat: 'gaming', url: 'https://www.chess.com/member/{u}', eCode: 200, mCode: 404 },
  { name: 'Last.fm', cat: 'music', url: 'https://www.last.fm/user/{u}', eCode: 200, mCode: 404 },
  { name: 'Spotify', cat: 'music', url: 'https://open.spotify.com/user/{u}', eCode: 200, mCode: 404 },
  { name: 'TryHackMe', cat: 'dev', url: 'https://tryhackme.com/p/{u}', eCode: 200, mCode: 404 },
  { name: 'BuyMeACoffee', cat: 'social', url: 'https://www.buymeacoffee.com/{u}', eCode: 200, mCode: 404 },
  { name: 'Kick', cat: 'streaming', url: 'https://kick.com/{u}', eCode: 200, mCode: 404 },
  { name: 'Gravatar', cat: 'identity', url: 'https://gravatar.com/{u}', eCode: 200, mCode: 404 },
];
