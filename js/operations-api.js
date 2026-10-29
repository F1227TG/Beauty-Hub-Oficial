import {getSupabaseClient} from './supabase-client.js';
export async function result(query) { const {data,error}=await query; if(error) throw new Error(error.message); return data; }
export async function rpc(name,args={}) {return result((await getSupabaseClient()).rpc(name,args));}
export async function table(name,select='*',filters={},order='created_at',limit=100) {
 const db=await getSupabaseClient(); let q=db.from(name).select(select);
 for(const [key,value] of Object.entries(filters)) q=q.eq(key,value);
 if(order) q=q.order(order,{ascending:order==='name'||order==='display_name'});
 return result(q.limit(limit));
}
export const publicSpaceFields='id,name,slug,kind,description,cover_path,city,state_code,address_line,phone_e164,timezone,status,rating,review_count,attendance_mode,service_area,travel_fee,accessibility_notes,cancellation_policy';
export async function session() {return result((await getSupabaseClient()).auth.getSession()).then(x=>x.session);}
export async function profile() { const s=await session(); if(!s) return null; return (await table('profiles','*',{id:s.user.id},null,1))[0]; }
export async function saveProfile(data){const s=await session(); if(!s)throw new Error('Entre na sua conta.');return result((await getSupabaseClient()).from('profiles').update(data).eq('id',s.user.id).select().single());}
