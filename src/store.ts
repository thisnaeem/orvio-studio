export type Preferences={name:string;workspace:string;theme:'light'|'dark'|'system';accent:'coral'|'violet'|'mint'|'blue'|'amber';density:'comfortable'|'compact';typeScale:'standard'|'large';motion:'full'|'reduced';sounds:boolean;soundVolume:number;cursor:'studio'|'system';onboarded:boolean};
export type Draft={id:string;title:string;caption:string;format:string;updatedAt:string};
export type Workflow={id:string;name:string;keyword:string;reply:string;createdAt:string};
export const defaults:Preferences={name:'',workspace:'My workspace',theme:'dark',accent:'violet',density:'comfortable',typeScale:'standard',motion:'full',sounds:true,soundVolume:0.35,cursor:'studio',onboarded:false};
export function read<T>(key:string,fallback:T):T{try{return JSON.parse(localStorage.getItem('orvio.v2.'+key)||'null')??fallback}catch{return fallback}}
export function save(key:string,value:unknown){try{localStorage.setItem('orvio.v2.'+key,JSON.stringify(value))}catch(error){console.warn('Could not save preferences',error)}}
export function clearLegacyDemo(){if(localStorage.getItem('orvio.v2.migrated'))return;['orvio-posts','orvio-rules','orvio-theme'].forEach(key=>localStorage.removeItem(key));localStorage.setItem('orvio.v2.migrated','true')}

export function readPreferences():Preferences{const prefs={...defaults,...read<Partial<Preferences>>('preferences',{})};try{if(!localStorage.getItem('orvio.appearance.studio-2026')){prefs.theme='dark';prefs.accent='violet';save('preferences',prefs);localStorage.setItem('orvio.appearance.studio-2026','1')}}catch{}return prefs}
