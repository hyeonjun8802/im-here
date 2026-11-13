/**
 * Per-browser anonymous cloud backup. Supabase Auth + PostgREST are accessed
 * with a public PUBLISHABLE key and ownership-protected RLS, never service_role.
 * LocalStorage remains authoritative when offline or Auth is not enabled.
 */
export const SUPABASE_GAME_URL='https://nxltvnwszhdqnhbxbkpa.supabase.co';
export const SUPABASE_GAME_PUBLISHABLE_KEY='sb_publishable_PWmSX_do8bsEhw3ilbYHAQ_00kAanDc';
export const ANON_SESSION_STORAGE_KEY='AFTERDAY_DEVICE_ANON_SESSION_V1';
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class DeviceCloudSave {
 constructor({storage=globalThis.localStorage,fetcher=globalThis.fetch,timeoutMs=3500}={}){
  this.storage=storage;
  this.fetcher=fetcher;
  this.timeoutMs=timeoutMs;
  this.disabled=false;
  this.queue=Promise.resolve();
  this.session=null;
  try{this.session=JSON.parse(storage?.getItem(ANON_SESSION_STORAGE_KEY)||'null');}catch{}
 }
 async request(path,{method='GET',token=null,body,prefer}={}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),this.timeoutMs);
  try{
   const headers={apikey:SUPABASE_GAME_PUBLISHABLE_KEY};
   if(token)headers.Authorization='Bearer '+token;
   if(body!==undefined)headers['Content-Type']='application/json';
   if(prefer)headers.Prefer=prefer;
   const response=await this.fetcher(SUPABASE_GAME_URL+path,{
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
  return this.session;
 }
 async authenticate(){
  if(this.disabled)return null;
  if(this.session?.access_token&&this.session.expires_at>Date.now()/1000+90)return this.session;
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
  }catch{return null;}
 }
 async load(){
  const session=await this.authenticate();
  if(!session)return null;
  try{
   const records=await this.request('/rest/v1/afterday_device_saves?select=state&user_id=eq.'+session.user_id+'&limit=1',{
    token:session.access_token
   });
   const payload=Array.isArray(records)?records[0]?.state:null;
   return payload&&typeof payload==='object'&&payload.version===4?payload:null;
  }catch{return null;}
 }
 save(state){
  if(this.disabled)return this.queue;
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
   }catch{/* Local game remains playable without network. */}
  });
  return this.queue;
 }
}
