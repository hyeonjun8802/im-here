import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GameClock,MAX_BACKGROUND_REAL_MS,GAME_CLOCK_RATE,offlineElapsedMs} from '../src/gameClock.js';
import {DeviceCloudSave,ANON_SESSION_STORAGE_KEY} from '../src/deviceCloudSave.js';
import {defaults,sanitize} from '../src/simulation.js';
import {createFreshRestartState} from '../src/restartSession.js';

const read=file=>readFileSync(new URL('../src/'+file,import.meta.url),'utf8');

test('opt-in clock continues by real elapsed while browser is closed',()=>{
 const start=Date.UTC(2026,10,13);
 const clock=new GameClock(start+3600000,0,start,{progressWhileAway:true});
 assert.equal(clock.virtualNow,start+3600000);
 const background=clock.tick(start+3600000+30000,false);
 assert.equal(background,start+3630000);
 const foreground=clock.tick(start+3600000+31000,true);
 assert.equal(foreground,background+1000*GAME_CLOCK_RATE);
 assert.equal(offlineElapsedMs(start,start+86400000),MAX_BACKGROUND_REAL_MS);
 assert.equal(new GameClock(start+3600000,0,start).virtualNow,start);
 const state=defaults(start);
 assert.ok(Number.isFinite(sanitize(JSON.parse(JSON.stringify(state)),start).deviceSaveAtMs));
 assert.equal(createFreshRestartState(start+10).deviceSaveAtMs,start+10);
});
test('anonymous client persists a per-browser auth session and owner-filtered save',async()=>{
 const calls=[],storage=new Map();
 const local={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
 const userId='12345678-1234-4234-8234-123456789abc';
 const mockFetch=async(url,options)=>{
  calls.push({url,options});
  if(url.includes('/auth/v1/signup'))
   return {ok:true,text:async()=>JSON.stringify({
    user:{id:userId},access_token:'access',refresh_token:'refresh',
    expires_at:Math.floor(Date.now()/1000)+3600
   })};
  if(url.includes('select=state'))
   return {ok:true,text:async()=>JSON.stringify([{state:{version:4,deviceSaveAtMs:100}}])};
  if(url.includes('/rest/v1/afterday_device_saves'))
   return {ok:true,text:async()=>''};
  throw Error('Unexpected mock request');
 };
 const cloud=new DeviceCloudSave({storage:local,fetcher:mockFetch});
 const restored=await cloud.load();
 assert.equal(restored.deviceSaveAtMs,100);
 assert.equal(cloud.status,'connected');
 assert.equal(JSON.parse(local.getItem(ANON_SESSION_STORAGE_KEY)).user_id,userId);
 await cloud.save({version:4,deviceSaveAtMs:200});
 assert.equal(cloud.status,'saved');
 assert.ok(calls.some(x=>x.url.includes('user_id=eq.'+userId)));
 const post=calls.find(x=>x.options.method==='POST'&&x.url.includes('/rest/v1/'));
 assert.equal(JSON.parse(post.options.body).user_id,userId);
 assert.equal(post.options.headers.Authorization,'Bearer access');
 assert.match(read('deviceCloudSave.js'),/SUPABASE_GAME_PUBLISHABLE_KEY/);
});
test('unavailable anonymous provider leaves local games functional',async()=>{
 const local={getItem:()=>null,setItem:()=>{}};
 let requests=0;
 const badFetch=async()=>{requests++;return {ok:false,status:422,text:async()=>JSON.stringify({msg:'Anonymous signins disabled'})};};
 const cloud=new DeviceCloudSave({storage:local,fetcher:badFetch});
 assert.equal(await cloud.load(),null);
 assert.equal(cloud.disabled,true);
 assert.equal(cloud.status,'setup-required');
 await cloud.save({version:4,deviceSaveAtMs:123});
 assert.equal(requests,1,'do not retry disabled provider every autosave');
});
test('gear panel duplicate is hidden while bottom button remains functional',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const css=read('hudAlignmentV1300.css');
 const main=read('main.js'),life=read('survivorLife.js');
 assert.match(html,/id="survival-kit-action"[^>]*hidden/);
 assert.doesNotMatch(html,/common-ui-v1202-action-js/);
 assert.match(html,/id="explore" data-action="explore"/);
 assert.match(css,/\.survival-kit > \.survival-kit-action\[hidden\]\s*\{\s*display:none!important/);
 assert.match(main,/else if\(action==='rest'\)world\?\.setAction\('sleep'\)/);
 assert.match(main,/activity==='rest'\?'sleep':activity/);
 assert.match(life,/action==='sleep'&&manual\?18/);
 assert.match(main,/new DeviceCloudSave\(\)/);
 assert.match(main,/progressWhileAway:true/);
 assert.match(main,/cloudSaved\.deviceSaveAtMs/);
});

test('after enabling anonymous Auth, the same browser can retry and sync',async()=>{
 let enabled=false,signups=0,saves=0;
 const local=new Map();
 const storage={getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v)};
 const uuid='12345678-1234-4234-8234-123456789abc';
 const fetcher=async(url,options)=>{
  if(url.includes('/auth/v1/signup')){
   signups++;
   if(!enabled)return {ok:false,status:422,text:async()=>JSON.stringify({msg:'anonymous disabled'})};
   return {ok:true,text:async()=>JSON.stringify({
    user:{id:uuid},access_token:'token',refresh_token:'refresh',
    expires_at:Math.floor(Date.now()/1000)+3600
   })};
  }
  if(url.includes('?select=state&'))return {ok:true,text:async()=>'[]'};
  if(url.includes('/rest/v1/afterday_device_saves')){
   assert.equal(options.headers.Authorization,'Bearer token');
   saves++;
   return {ok:true,text:async()=>''};
  }
  throw Error('unexpected test endpoint');
 };
 const cloud=new DeviceCloudSave({storage,fetcher});
 assert.equal(await cloud.load(),null);
 assert.equal(cloud.status,'setup-required');
 enabled=true;
 assert.equal(await cloud.retry(),true);
 assert.equal(cloud.status,'connected');
 await cloud.save({version:4,deviceSaveAtMs:Date.now()});
 assert.equal(cloud.status,'saved');
 assert.equal(signups,2);
 assert.equal(saves,1);
});
test('cloud status is displayed only inside weather settings, not the main HUD',()=>{
 const main=read('main.js'),css=read('hudAlignmentV1300.css');
 assert.match(main,/function installCloudStatusControl\(\)/);
 assert.match(main,/panel=\$\('#weather-panel'\)/);
 assert.match(main,/deviceCloud\.onStatusChange=update/);
 assert.match(main,/const connected=await deviceCloud\.retry\(\)/);
 assert.match(main,/if\(connected\)await deviceCloud\.save\(state\)/);
 assert.match(css,/#hud #weather-panel \.cloud-save-control/);
});
