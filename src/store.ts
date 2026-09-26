export type Preferences={name:string;workspace:string;theme:'light'|'dark'|'system';accent:'coral'|'violet'|'mint'|'blue'|'amber';density:'comfortable'|'compact';typeScale:'standard'|'large';motion:'full'|'reduced';onboarded:boolean};
export type Draft={id:string;title:string;caption:string;format:string;updatedAt:string};
export type Workflow={id:string;name:string;keyword:string;reply:string;createdAt:string};
export const defaults:Preferences={name:'',workspace:'My workspace',theme:'light',accent:'coral',density:'comfortable',typeScale:'standard',motion:'full',onboarded:false};
export function read<T>(key:string,fallback:T):T{try{return JSON.parse(localStorage.getItem('orvio.v2.'+key)||'null')??fallback}catch{return fallback}}
export function save(key:string,value:unknown){localStorage.setItem('orvio.v2.'+key,JSON.stringify(value))}
export function clearLegacyDemo(){if(localStorage.getItem('orvio.v2.migrated'))return;['orvio-posts','orvio-rules','orvio-theme'].forEach(key=>localStorage.removeItem(key));localStorage.setItem('orvio.v2.migrated','true')}
