import settings from '../runtime/creative-settings.json';
import type {Model} from './model-data';
export type StudioKind='image'|'video'|'voice'|'lipsync'|'3d';
export type Controls={resolution:number;steps:number;guidance:number;frames:number;fps:number;sampler:string;negativePrompt:string;seed:string;batch:number};
export const profiles=settings.profiles as Record<string,Omit<typeof settings.profiles.image,'frames'|'fps'>&{frames:number[];fps:number[]}>;
export {settings};
export function controlsFor(model?:Model,saved:Partial<Controls>={}):Controls{
 const p=profiles[model?.parameterProfile||''];const bounded=(value:unknown,fallback:number,min:number,max:number)=>typeof value==='number'&&Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;
 return {resolution:p?.resolutions[saved.resolution??-1]?saved.resolution!:0,steps:p?.fixedSteps?model?.steps||4:Math.round(bounded(saved.steps,model?.steps||p?.steps.default||32,p?.steps.min||16,p?.steps.max||64)),guidance:bounded(saved.guidance,model?.guidance??p?.guidance.default??(model?.input==='text'?15:3),p?.guidance.min??1,p?.guidance.max??30),frames:p?.frames.includes(saved.frames||0)?saved.frames!:model?.frames||16,fps:p?.fps.includes(saved.fps||0)?saved.fps!:model?.fps||8,sampler:p?.samplers.includes(saved.sampler||'')?saved.sampler!:'default',negativePrompt:p?.negativePrompt?String(saved.negativePrompt||'').slice(0,1500):'',seed:/^\d{1,10}$/.test(String(saved.seed??''))&&Number(saved.seed)<=4294967295?String(saved.seed):'',batch:Math.round(bounded(saved.batch,1,1,4))};
}
export const promptHints={
 Style:['Cinematic','Editorial photography','Anime illustration','Clay render','Minimalism'],
 Color:['Pastel purple and peach','Monochrome','Warm earth tones','Cool blue and silver','Vibrant colors'],
 Camera:['Close-up','Wide shot','Macro detail','Isometric view','Eye-level view'],
 Lighting:['Soft studio lighting','Backlight','Glowing','Direct sunlight','Neon light','Golden hour'],
 Material:['Pearl','Foil','Glass','Brushed metal','Clay','Velvet'],
 Motion:['Gentle camera drift','Slow rotation','Subtle natural movement','Locked-off camera']
};
export function applyHints(prompt:string,hints:Record<string,string>,limit:number){const phrases=Object.values(hints).filter(value=>value&&!prompt.toLowerCase().includes(value.toLowerCase()));return [prompt.trim(),...phrases].filter(Boolean).join(', ').slice(0,limit)}
