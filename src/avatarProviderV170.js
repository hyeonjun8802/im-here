/** AFTERDAY official avatar provider metadata; independent of any renderer. */
export const OFFICIAL_AVATAR = Object.freeze({
  engine: '@pixiv/three-vrm',
  model: './assets/avatar/survivor.vrm',
  attribution: 'Sakurada Fumiriya, pixiv Inc. / VRoid Studio (CC0 sample)',
  source: 'https://github.com/madjin/vrm-samples/blob/master/vroid/beta/Sakurada_Fumiriya.vrm',
  license: 'https://vroid.pixiv.help/hc/en-us/articles/360014788554-Sakurada-Fumiriya',
  expectedBytes: 19342280,
  targetHeight: 3.25,
});
export const normalizeAvatarHeight = (bboxHeight, target=OFFICIAL_AVATAR.targetHeight) => {
  if(!Number.isFinite(bboxHeight) || bboxHeight<0.4 || bboxHeight>40) throw new Error('VRM humanoid size invalid');
  return target/bboxHeight;
};
export const officialAvatarAction = (life) => {
  if(life?.stage==='approach') return 'walk';
  if(life?.stage!=='perform') return 'idle';
  if(['eat','guitar','rest','sit'].includes(life.current)) return 'seated';
  if(life.current==='radio') return 'radio';
  return 'idle';
};
