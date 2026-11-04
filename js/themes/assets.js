(() => {
  'use strict';
  // Exact, case-sensitive filenames from the repository (including LigthTheme).
  const files = {
    'ano-novo': {photo: 'AnoNovo.jpg', audio: 'AnoNovo.mp3'},
    cyberpunk: {photo: 'Cyberpunk.png', audio: 'Cyberpunk.mp3'},
    escuro: {photo: 'DarkTheme.png', audio: 'musica.mp3'},
    original: {photo: 'foto.jpg', audio: 'musica.mp3'},
    halloween: {photo: 'Halloween.png', audio: 'Halloween.mp3'},
    terror: {video: 'JumpScare.mp4'},
    claro: {photo: 'LigthTheme.jpg', audio: 'musica.mp3'},
    natal: {photo: 'Natal.png', audio: 'Natal.mp3'},
    pascoa: {photo: 'Pascoa.png', audio: 'Pascoa.mp3'},
    'festa-junina': {photo: 'SaoJoao.png', audio: 'SaoJoao.mp3'},
    'glassy-crm': {photo: 'Cyberpunk.png', audio: 'Cyberpunk.mp3'}
  };
  const folders = {
    photo: ['./', 'assets/', 'assets/images/', 'assets/img/'],
    audio: ['./', 'assets/', 'assets/audio/', 'assets/music/'],
    video: ['./', 'assets/', 'assets/video/', 'assets/videos/']
  };
  const resolved = new Map();
  function candidates(filename, type) {
    if (!filename) return [];
    const paths = folders[type].map(folder => new URL(folder + filename, document.baseURI).href);
    const cached = resolved.get(filename);
    return cached ? [cached, ...paths.filter(path => path !== cached)] : paths;
  }
  Object.values(files).forEach(Object.freeze);
  window.ERPThemeAssets = Object.freeze({
    themes: Object.freeze(files), candidates,
    remember(filename, url) { if (filename && url) resolved.set(filename, url); }
  });
})();
