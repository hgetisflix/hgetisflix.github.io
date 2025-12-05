// ---------- small helper ----------
function makeEl(tag, cls){ const e = document.createElement(tag); if(cls) e.className = cls; return e; }

// ---------- fetch JSON and render ----------
async function loadAndRender(){
  try{
    const res = await fetch('videos.json', {cache: "no-store"});
    if(!res.ok) throw new Error(`Failed to load videos.json (${res.status})`);
    const data = await res.json();

    setupFeatured(data.featured || null);
    setupPlaylists(data.playlists || []);
  }catch(err){
    console.error('Error loading videos.json:', err);
    // show a lightweight error message on page
    const main = document.getElementById('playlists-container');
    main.innerHTML = `<p style="color:#faa;padding:20px">Could not load videos.json — check console for details.</p>`;
  }
}

// ---------- featured ----------
function setupFeatured(f){
  const section = document.getElementById('featured');
  const titleEl = document.getElementById('featured-title');
  const playBtn = document.getElementById('featured-play');

  if(!f || !f.id){
    // hide featured if missing
    section.style.display = 'none';
    return;
  }

  titleEl.textContent = f.title || 'Featured';

  // try progressive thumbnail fallback
  loadBestThumbnail(f.thumbnailBase || `https://img.youtube.com/vi/${f.id}`, (best) => {
    section.style.backgroundImage = `url("${best}")`;
  });

  section.onclick = () => openPlayer(f.id);
  playBtn.onclick = (e) => { e.stopPropagation(); openPlayer(f.id); };
}

// ---------- playlists ----------
function setupPlaylists(playlists){
  const container = document.getElementById('playlists-container');
  container.innerHTML = '';

  playlists.forEach((pl, idx) => {
    const plWrap = makeEl('section', 'playlist');
    const title = makeEl('h3'); title.textContent = pl.name || `Playlist ${idx+1}`;
    plWrap.appendChild(title);

    const row = makeEl('div', 'row');
    const left = makeEl('div', 'arrow left-arrow'); left.innerHTML = '&#10094;'; left.dataset.index = idx;
    const right = makeEl('div', 'arrow right-arrow'); right.innerHTML = '&#10095;'; right.dataset.index = idx;
    const inner = makeEl('div', 'row-inner'); inner.id = `row-${idx}`;

    row.appendChild(left);
    row.appendChild(inner);
    row.appendChild(right);
    plWrap.appendChild(row);
    container.appendChild(plWrap);

    // populate
    (pl.videos || []).forEach(video => {
      const card = makeEl('div', 'card');
      const img = makeEl('img');
      const title = makeEl('div', 'card-title');
      title.textContent = video.title || '';
      // thumbnail base allows custom base or direct url
      const thumbBase = video.thumbBase || `https://img.youtube.com/vi/${video.id}`;
      // attempt progressive load
      loadBestThumbnail(thumbBase, (bestUrl) => {
        img.src = bestUrl;
      });
      img.onerror = () => {
        // last resort
        img.src = `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`;
      };
      card.appendChild(img);
      if(title.textContent) card.appendChild(title);
      card.onclick = () => openPlayer(video.id);
      inner.appendChild(card);
    });
  });

  // arrows
  document.querySelectorAll('.arrow').forEach(arrow => {
    arrow.onclick = (e) => {
      const idx = e.currentTarget.dataset.index;
      const inner = document.getElementById(`row-${idx}`);
      const amount = Math.round(inner.clientWidth * 0.7) * (e.currentTarget.classList.contains('right-arrow') ? 1 : -1);
      inner.scrollBy({ left: amount, behavior: 'smooth' });
    };
  });
}

// ---------- player modal ----------
const modal = document.getElementById('playerModal');
const player = document.getElementById('ytplayer');
const closeBtn = document.getElementById('closeBtn');
function openPlayer(id){
  if(!id) return;
  player.src = `https://www.youtube.com/embed/${id}?autoplay=1`;
  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden', 'false');
}
function closePlayer(){
  modal.style.display = 'none';
  player.src = '';
  modal.setAttribute('aria-hidden', 'true');
}
closeBtn.onclick = closePlayer;
modal.onclick = (e) => { if(e.target === modal) closePlayer(); };

// ---------- progressive thumbnail loader ----------
function loadBestThumbnail(baseUrl, cb){
  // baseUrl should be like "https://img.youtube.com/vi/ID" or full URL without extension
  const tryList = [
    `${baseUrl}/maxresdefault.jpg`,
    `${baseUrl}/sddefault.jpg`,
    `${baseUrl}/hqdefault.jpg`,
    `${baseUrl}/mqdefault.jpg`,
    `${baseUrl}/default.jpg`
  ];
  let i = 0;
  (function tryNext(){
    if(i >= tryList.length){ cb(tryList[tryList.length-1]); return; }
    const url = tryList[i++];
    const img = new Image();
    img.onload = () => {
      // sometimes youtube returns a placeholder 120x90 even for missing; accept any loaded with size>120x90 else try next
      if(img.naturalWidth >= 120 && img.naturalHeight >= 90){
        cb(url);
      } else { tryNext(); }
    };
    img.onerror = tryNext;
    // small timeout to guard against hanging, but Image has no native timeout — we accept default
    img.src = url + '?cachebust=' + Date.now();
  })();
}

// ---------- startup ----------
loadAndRender();