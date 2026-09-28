import {DownloadManager} from './DownloadManager';
import {lazy} from 'react';
const LocalStudio=lazy(()=>import('./LocalStudio').then(m=>({default:m.LocalStudio})));
const CreateStudio=lazy(()=>import('./ModelStudio').then(m=>({default:m.CreateStudio})));
export type GeneratedImage={kind?:string;id:string;name:string;model:string;seed:number;size:number;prompt:string;preview:string};
export function ImageStudio({onUse}:{onUse:(image:GeneratedImage)=>void}){return <CreateStudio kind="image" onUse={asset=>onUse({...asset,id:'local:'+asset.id,name:asset.title})}/>}
export function VideoDownloader(_props:{accounts:{id:string;kind:'instagram'|'facebook';username:string}[]}){return <DownloadManager/>}
