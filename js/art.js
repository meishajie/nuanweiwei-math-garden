const strokes = 'stroke-linecap="round" stroke-linejoin="round"';
export function icon(name, cls = '') {
  const shapes = {
    chat: '<path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8l-6 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="M7 9h10M7 13h6"/>',
    leaf: '<path d="M12 21V9m0 7C4 17 2 11 3 6c6 0 9 4 9 10Zm0-4c0-7 5-10 10-9 0 6-4 10-10 9Z"/>',
    map: '<path d="m3 5 6-2 6 3 6-2v15l-6 2-6-3-6 2Zm6-2v15m6-12v15"/>',
    chest: '<path d="M3 10h18v10H3Zm0 0V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v3M10 8h4v6h-4Z"/>',
    book: '<path d="M12 5C8 2 4 3 2 4v15c4-2 7-1 10 1 3-2 6-3 10-1V4c-4-2-7-1-10 1Zm0 0v15"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    back: '<path d="m10 5-7 7 7 7M3 12h18"/>',
    star: '<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>',
    spark: '<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z"/>',
    sound: '<path d="m11 4-5 4H2v8h4l5 4Zm5 3a8 8 0 0 1 0 10m3-13a12 12 0 0 1 0 16"/>',
    mute: '<path d="m11 4-5 4H2v8h4l5 4Zm5 5 6 6m0-6-6 6"/>',
    settings: '<path d="M4 5h16M4 12h16M4 19h16"/><circle cx="8" cy="5" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="9" cy="19" r="2"/>',
    close: '<path d="m5 5 14 14M19 5 5 19"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
    pause: '<path d="M8 4v16M16 4v16"/>',
    play: '<path d="m7 3 14 9-14 9Z"/>',
    frame: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 12h20M7 5v14m5-14v14m5-14v14"/>',
    line: '<path d="M2 16h20M4 13v6m8-6v6m8-6v6M4 8c3-7 13-7 16 0m-4-2 4 2 1-4"/>',
    moon: '<path d="M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z"/>',
    reset: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2"/>'
  };
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ${strokes} aria-hidden="true">${shapes[name] || shapes.spark}</svg>`;
}

export function emblem(id, big = false) {
  const group = {
    1: '<path d="m48 14 7 20 21 4-16 14 3 21-18-10-18 11 4-23-16-13 23-4Z" fill="#F4CE7A"/><circle cx="74" cy="15" r="4" fill="#F2E5A6"/><circle cx="18" cy="70" r="5" fill="#F2E5A6"/>',
    2: '<path d="M47 83V44M47 70Q16 72 22 55q22-4 25 15m0-8q22-20 29-8-10 18-29 8" fill="#9AB9A3" stroke="#64836D" stroke-width="2"/><g fill="#E9A9AA"><ellipse cx="47" cy="30" rx="13" ry="21"/><ellipse cx="47" cy="30" rx="13" ry="21" transform="rotate(60 47 30)"/><ellipse cx="47" cy="30" rx="13" ry="21" transform="rotate(120 47 30)"/></g><circle cx="47" cy="30" r="10" fill="#F6D67E"/>',
    3: '<ellipse cx="48" cy="73" rx="35" ry="10" fill="none" stroke="#A6C5D0" stroke-width="4"/><ellipse cx="48" cy="71" rx="21" ry="5" fill="#C8DCE1"/><path d="M63 16a25 25 0 1 0 11 37A28 28 0 0 1 63 16" fill="#F5D987"/>',
    4: '<path d="M13 71V57a35 35 0 0 1 70 0v14" fill="none" stroke="#DEAAA9" stroke-width="11"/><path d="M25 72V57a23 23 0 0 1 46 0v15" fill="none" stroke="#F4D98C" stroke-width="10"/><path d="M37 72V57a11 11 0 0 1 22 0v15" fill="none" stroke="#ABC3AF" stroke-width="10"/><path d="M9 77h24m33 0h22" stroke="#F7F4ED" stroke-width="8"/>',
    5: '<path d="M47 85V17" stroke="#65836A" stroke-width="4"/><path d="M47 66Q13 70 17 44q27-5 30 22m0-16q35 3 30-22-26-3-30 22m0-14Q20 31 30 10q21 1 17 26" fill="#A5BEA1" stroke="#7B987B" stroke-width="2"/>',
    6: '<path d="M49 51v35" stroke="#BE9B77" stroke-width="6"/><path d="m49 49-28-6 12-28 16 11Zm0 0 6-28 28 12-11 16Zm0 0 28 6-12 28-16-11Zm0 0-6 28L15 65l11-16Z" fill="#B7A4CC"/><circle cx="49" cy="49" r="8" fill="#F3D286"/>',
    7: '<path d="m48 10 27 26-9 41-30 6-16-39Z" fill="#B6AFD8"/><path d="m48 10-9 36 36-10-27-26Zm-9 36 27 31-30 6 3-37Z" fill="#D7D1E9"/><path d="m48 10-9 36-3 37m3-37 36-10m-36 10 27 31m-27-31-19-2" fill="none" stroke="#8B81AF" stroke-width="2"/>',
    8: '<path d="M48 85V40m0 24L27 48m21 8 22-17" stroke="#A38972" stroke-width="6"/><path d="m48 6 9 21 25 3-19 17 5 24-20-13-22 13 6-24L13 30l25-3Z" fill="#C1CDA0"/><path d="m48 12 5 14 15 3-12 9 3 15-11-8-13 8 4-15-12-9 15-3Z" fill="#F5D886"/>',
    9: '<path d="M19 65q-13-18 5-24 0-22 23-18 14-20 29-2 22-5 22 15 14 14-4 29Z" transform="translate(-7 5)" fill="#E9DFD6"/><path d="M25 64h49l-9 14H38Z" fill="#A98BB6"/><path d="M49 60V21l23 36H49" fill="#F2D88F" stroke="#BA9D71" stroke-width="2"/>',
    10: '<path d="M14 73Q25 8 43 51T85 20" fill="none" stroke="#8CBAAE" stroke-width="13"/><path d="M16 85Q30 23 47 63T88 36" fill="none" stroke="#B7A3D1" stroke-width="11"/><path d="m34 10 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" fill="#F2D786"/>'
  };
  return `<svg viewBox="0 0 96 96" class="emblem ${big?'big':''}" aria-hidden="true">${group[id] || group[1]}</svg>`;
}

export function heroGarden() {
  return `<div class="hero-garden" aria-label="暖尾尾站在柔和的数字花园里" role="img">
    <span class="orbit orbit-one"></span><span class="orbit orbit-two"></span>
    <div class="sun-disc"></div><div class="hero-spark a">✦</div><div class="hero-spark b">✦</div>
    <div class="math-note note-one">1 <span>+</span> 2</div><div class="math-note note-two">10 <small>的小秘密</small></div>
    <div class="garden-ground"></div><div class="garden-plant plant-left">${emblem(5)}</div><div class="garden-plant plant-right">${emblem(2)}</div>
    <img class="hero-character" src="./assets/nuanweiwei-neutral.png" alt="" width="1072" height="1034">
    <div class="character-note">慢慢想，我陪你。<span>♡</span></div>
    <div class="little-card">${emblem(1)}<span>第一张魔法卡</span></div>
  </div>`;
}

export function magicArt(id = 1, finale = false) {
  const on = n => finale ? n <= 8 : id === n;
  const stars = Array.from({length:22},(_,i)=>`<circle class="sky-star" style="--i:${i}" cx="${35+(i*113)%850}" cy="${28+(i*53)%260}" r="${i%3+1.5}" fill="#F4D995"/>`).join('');
  const blooms = Array.from({length:9},(_,i)=>`<g class="bloom" style="--i:${i}" transform="translate(${70+i*100} ${350+(i%3)*24})"><path d="M0 30V0" stroke="#9CC0A2" stroke-width="4"/><g class="petals"><circle cx="0" cy="-9" r="11" fill="${i%2?'#EABAC2':'#D7C5E9'}"/><circle cx="-10" cy="0" r="11" fill="${i%2?'#EABAC2':'#D7C5E9'}"/><circle cx="10" cy="0" r="11" fill="${i%2?'#EABAC2':'#D7C5E9'}"/><circle cx="0" cy="9" r="11" fill="${i%2?'#EABAC2':'#D7C5E9'}"/><circle r="7" fill="#F6D98B"/></g></g>`).join('');
  return `<svg class="magic-art" viewBox="0 0 960 460" role="img" aria-label="${finale?'星光、花朵、彩虹和魔法树一起点亮花园':'可观看的花园魔法场景'}">
  <defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#282844"/><stop offset="1" stop-color="#716085"/></linearGradient><linearGradient id="aurora"><stop stop-color="#ABCAB0" stop-opacity="0"/><stop offset=".45" stop-color="#ABCAB0" stop-opacity=".85"/><stop offset="1" stop-color="#B8A0D4" stop-opacity=".1"/></linearGradient><radialGradient id="glow"><stop stop-color="#F5D687" stop-opacity=".6"/><stop offset="1" stop-color="#F5D687" stop-opacity="0"/></radialGradient></defs>
  <rect width="960" height="460" rx="28" fill="url(#sky)"/>
  ${stars}<circle cx="790" cy="100" r="49" fill="#F4E2B0" opacity=".9"/><circle cx="810" cy="82" r="44" fill="#3C3454"/>
  ${on(10)?'<g class="aurora"><path d="M0 170Q180-140 350 180T960 70v80Q700 340 470 140T0 230Z" fill="url(#aurora)"/><path d="M0 245Q180-80 370 230T960 120" stroke="#B8A8DC" stroke-width="28" opacity=".4" fill="none"/></g>':''}
  ${on(4)?'<g class="rainbow"><path d="M195 340a285 285 0 0 1 570 0" fill="none" stroke="#DFA6B5" stroke-width="19"/><path d="M215 340a265 265 0 0 1 530 0" fill="none" stroke="#F0D190" stroke-width="18"/><path d="M235 340a245 245 0 0 1 490 0" fill="none" stroke="#9CBDB0" stroke-width="18"/></g>':''}
  <path d="M0 320Q230 235 460 320T960 308V460H0Z" fill="#667A7A"/><path d="M0 391Q205 325 455 370T960 358V460H0Z" fill="#485D5B"/>
  <ellipse cx="480" cy="413" rx="190" ry="24" fill="#809C9D" opacity=".45"/>
  ${on(3)?'<g class="ripples"><ellipse cx="480" cy="406" rx="130" ry="16" fill="none" stroke="#CCE0DF" stroke-width="3"/><ellipse cx="480" cy="406" rx="82" ry="10" fill="none" stroke="#CCE0DF" stroke-width="3"/><circle cx="480" cy="378" r="7" fill="#E8E2C0"/></g>':''}
  ${(on(5)||on(8))?'<g class="magic-tree"><path d="M680 355q-10-95 0-170m-2 92-60-42m62 8 62-50m-63 34-35-45" fill="none" stroke="#B6A189" stroke-width="15" stroke-linecap="round"/><g fill="#A5BCA4"><ellipse cx="615" cy="211" rx="40" ry="22" transform="rotate(30 615 211)"/><ellipse cx="734" cy="175" rx="42" ry="24" transform="rotate(-28 734 175)"/><ellipse cx="646" cy="167" rx="31" ry="22" transform="rotate(50 646 167)"/><ellipse cx="682" cy="131" rx="29" ry="43"/></g><path class="tree-star" d="m681 70 9 19 23 3-17 16 4 23-20-12-20 12 4-23-17-16 24-3Z" fill="#F4D889"/></g>':''}
  ${on(9)?'<g class="cloud-boat"><path d="M290 188q-20-37 20-45 0-39 43-27 23-30 45-8 50-10 51 28 30 38-2 53Z" fill="#E3DAE8"/><path d="M312 167h129l-24 29h-83Z" fill="#C3ACD3"/><path d="M365 159V58l64 92h-64" fill="#F2D496"/></g>':''}
  ${on(7)?'<g class="crystals"><path d="m757 239 45 38-14 74-54 11-27-75Z" fill="#C3B4DF"/><path d="m757 239-11 62 56-24m-56 24 42 50m-42-50-12 61" fill="none" stroke="#E9DFFA" stroke-width="3"/><path d="m165 290 30 25-10 51-36 5-20-51Z" fill="#C0C7E1"/></g>':''}
  ${on(2)||on(6)?`<g class="flower-field ${on(6)?'wind':''}">${blooms}</g>`:''}
  ${on(1)||on(8)?`<g class="fireflies">${Array.from({length:18},(_,i)=>`<g class="firefly" style="--i:${i}"><circle cx="${70+(i*137)%820}" cy="${130+(i*71)%240}" r="25" fill="url(#glow)"/><circle cx="${70+(i*137)%820}" cy="${130+(i*71)%240}" r="4" fill="#FFE4A0"/></g>`).join('')}</g>`:''}
  <g opacity=".7" fill="#BBD1A7"><path d="M72 460q-24-80-11-93 25 25 11 93m0 0q38-82 56-72-6 48-56 72M879 460q-29-81-12-93 19 28 12 93m0 0q30-65 52-56-9 42-52 56"/></g>
  </svg>`;
}
