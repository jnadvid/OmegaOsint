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
  { name: 'Behance', cat: 'design', url: 'https://www.behance.net/{u}', eCode: 200, mCode: 404 },
  { name: 'Dribbble', cat: 'design', url: 'https://dribbble.com/{u}', eCode: 200, mCode: 404 },
  { name: 'DeviantArt', cat: 'art', url: 'https://www.deviantart.com/{u}', eCode: 200, mCode: 404 },
  { name: 'Flickr', cat: 'photo', url: 'https://www.flickr.com/people/{u}', eCode: 200, mCode: 404 },
  { name: 'Disqus', cat: 'social', url: 'https://disqus.com/by/{u}/', eCode: 200, mCode: 404 },
  { name: 'Imgur', cat: 'photo', url: 'https://imgur.com/user/{u}', eCode: 200, mCode: 404 },
  { name: 'Bandcamp', cat: 'music', url: 'https://{u}.bandcamp.com', eCode: 200, mCode: 404 },
  { name: 'Mixcloud', cat: 'music', url: 'https://www.mixcloud.com/{u}/', eCode: 200, mCode: 404 },
  { name: 'Trakt', cat: 'media', url: 'https://trakt.tv/users/{u}', eCode: 200, mCode: 404 },
  { name: 'MyAnimeList', cat: 'media', url: 'https://myanimelist.net/profile/{u}', eCode: 200, mCode: 404 },
  { name: 'AllMyLinks', cat: 'identity', url: 'https://allmylinks.com/{u}', eCode: 200, mCode: 404 },
  { name: 'Ko-fi', cat: 'social', url: 'https://ko-fi.com/{u}', eCode: 200, mCode: 404 },
  { name: 'ProductHunt', cat: 'tech', url: 'https://www.producthunt.com/@{u}', eCode: 200, mCode: 404 },
  { name: 'Hashnode', cat: 'dev', url: 'https://hashnode.com/@{u}', eCode: 200, mCode: 404 },
  { name: 'npm', cat: 'dev', url: 'https://www.npmjs.com/~{u}', eCode: 200, mCode: 404 },
  { name: 'PyPI', cat: 'dev', url: 'https://pypi.org/user/{u}/', eCode: 200, mCode: 404 },
  { name: 'Docker Hub', cat: 'dev', url: 'https://hub.docker.com/u/{u}', eCode: 200, mCode: 404 },
  { name: 'CodePen', cat: 'dev', url: 'https://codepen.io/{u}', eCode: 200, mCode: 404 },
  { name: 'Wattpad', cat: 'writing', url: 'https://www.wattpad.com/user/{u}', eCode: 200, mCode: 404 },
  { name: 'Scratch', cat: 'dev', url: 'https://scratch.mit.edu/users/{u}', eCode: 200, mCode: 404 },
  { name: 'itch.io', cat: 'gaming', url: 'https://{u}.itch.io', eCode: 200, mCode: 404 },
  { name: 'HackerOne', cat: 'security', url: 'https://hackerone.com/{u}', eCode: 200, mCode: 404 },
  { name: 'Bugcrowd', cat: 'security', url: 'https://bugcrowd.com/{u}', eCode: 200, mCode: 404 },
  { name: 'VSCO', cat: 'photo', url: 'https://vsco.co/{u}/gallery', eCode: 200, mCode: 404 },
  { name: 'Genius', cat: 'music', url: 'https://genius.com/{u}', eCode: 200, mCode: 404 },
];
