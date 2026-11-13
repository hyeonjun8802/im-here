/**
 * Per-browser anonymous cloud backup. Supabase Auth + PostgREST are accessed
 * with a public PUBLISHABLE key and ownership-protected RLS, never service_role.
 * LocalStorage remains authoritative when offline or Auth is not enabled.
 */
// Use a dedicated RLS-secured game project. Missing environment variables
// leave the existing device-local game saves available.
export const SUPABASE_GAME_URL=import.meta.env?.VITE_AFTERDAY_SUPABASE_URL||'';
export const SUPABASE_GAME_PUBLISHABLE_KEY=import.meta.env?.VITE_AFTERDAY_SUPABASE_PUBLISHABLE_KEY||'';
export const ANON_SESSION_STORAGE_KEY='AFTERDAY_DEVICE_ANON_SESSION_V1';
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class DeviceCloudSave {
 constructor({storage=globalThis.localStorage,fetcher=globalThis.fetch,timeoutMs=3500,
  url=SUPABASE_GAME_URL,publishableKey=SUPABASE_GAME_PUBLISHABLE_KEY}={}){
  this.storage=storage;
  this.fetcher=fetcher;
  this.timeoutMs=timeoutMs;
  this.url=typeof url==='string'?url.replace(/\/$/,''):'';
  this.publishableKey=publishableKey||'';
  this.disabled=!(this.url&&this.publishableKey);
  this.status=this.disabled?'setup-required':'local';
  this.lastErrorCode=null;
  this.onStatusChange=null;
  this.queue=Promise.resolve();
  this.session=null;
  try{this.session=JSON.parse(storage?.getItem(ANON_SESSION_STORAGE_KEY)||'null');}catch{}
 }
 setStatus(status,code=null){
  this.status=status;
  this.lastErrorCode=code;
  this.onStatusChange?.(status,code);
 }
 async request(path,{method='GET',token=null,body,prefer}={}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),this.timeoutMs);
  try{
   const headers={apikey:this.publishableKey};
   if(token)headers.Authorization='Bearer '+token;
   if(body!==undefined)headers['Content-Type']='application/json';
   if(prefer)headers.Prefer=prefer;
   const response=await this.fetcher(this.url+path,{
    method,headers,signal:controller.signal,
    ...(body===undefined?{}:{body:JSON.stringify(body)})
   });
   const payload=await response.text();
   if(!response.ok){
    const error=new Error('Cloud HTTP '+response.status);
    error.status=response.status;
    // Bad setup (such as disabled anonymous sign-ins) must not retry every
    // 15-second autosave until the next page visit.
    if([400,403,404,422].includes(response.status))this.disabled=true;
    throw error;
   }
   return payload?JSON.parse(payload):null;
  }finally{clearTimeout(timer);}
 }
 storeSession(data){
  const record=data?.session||data;
  const userId=record?.user?.id||this.session?.user_id;
  if(!UUID_RE.test(userId||'')||!record?.access_token||!record?.refresh_token)
   throw Error('Invalid anonymous session');
  this.session={
   user_id:userId,
   access_token:record.access_token,
   refresh_token:record.refresh_token,
   expires_at:Number(record.expires_at)||Math.floor(Date.now()/1000)+Number(record.expires_in||3600)
  };
  try{this.storage?.setItem(ANON_SESSION_STORAGE_KEY,JSON.stringify(this.session));}catch{}
  this.setStatus('connected');
  return this.session;
 }
 async authenticate(){
  if(!this.url||!this.publishableKey)this.disabled=true;
  if(this.disabled){this.setStatus('setup-required',this.lastErrorCode);return null;}
  if(this.session?.access_token&&this.session.expires_at>Date.now()/1000+90){
   this.setStatus('connected');return this.session;
  }
  this.setStatus('connecting');
  try{
   if(this.session?.refresh_token){
    try{
     const result=await this.request('/auth/v1/token?grant_type=refresh_token',{
      method:'POST',body:{refresh_token:this.session.refresh_token}
     });
     return this.storeSession(result);
    }catch(error){
     if(error.status!==400&&error.status!==401)return null;
     this.disabled=false;
     this.session=null;
    }
   }
   // Equivalent to Supabase Auth signInAnonymously(): no email or password.
   const signed=await this.request('/auth/v1/signup',{
    method:'POST',body:{data:{},gotrue_meta_security:{}}
   });
   return this.storeSession(signed);
  }catch(error){
   this.setStatus(this.disabled?'setup-required':'offline',error.status??null);
   return null;
  }
 }
 async load(){
  const session=await this.authenticate();
  if(!session)return null;
  try{
   const records=await this.request('/rest/v1/afterday_device_saves?select=state&user_id=eq.'+session.user_id+'&limit=1',{
    token:session.access_token
   });
   const payload=Array.isArray(records)?records[0]?.state:null;
   this.setStatus('connected');
   return payload&&typeof payload==='object'&&payload.version===4?payload:null;
  }catch(error){
   this.setStatus(this.disabled?'setup-required':'offline',error.status??null);
   return null;
  }
 }
 async retry(){
  this.disabled=false;
  this.setStatus('connecting');
  await this.load();
  return this.status==='connected'||this.status==='saved';
 }
 save(state){
  if(this.disabled){this.setStatus('setup-required',this.lastErrorCode);return this.queue;}
  const snapshot=JSON.parse(JSON.stringify(state));
  this.queue=this.queue.catch(()=>{}).then(async()=>{
   const session=await this.authenticate();
   if(!session)return;
   try{
    await this.request('/rest/v1/afterday_device_saves?on_conflict=user_id',{
     method:'POST',token:session.access_token,
     prefer:'resolution=merge-duplicates,return=minimal',
     body:{
      user_id:session.user_id,
      state:snapshot,
      saved_at:new Date(snapshot.deviceSaveAtMs||Date.now()).toISOString()
     }
    });
    this.setStatus('saved');
   }catch(error){
    this.setStatus(this.disabled?'setup-required':'offline',error.status??null);
   }
  });
  return this.queue;
 }
}
