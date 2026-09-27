import {LocalStudio} from './LocalStudio';
import {CreateStudio} from './ModelStudio';
export type GeneratedImage={kind?:string;id:string;name:string;model:string;seed:number;size:number;prompt:string;preview:string};
export function ImageStudio({onUse}:{onUse:(image:GeneratedImage)=>void}){return <CreateStudio kind="image" onUse={asset=>onUse({...asset,id:'local:'+asset.id,name:asset.title})}/>}
export function VideoDownloader(_props:{accounts:{id:string;kind:'instagram'|'facebook';username:string}[]}){return <LocalStudio mode="Downloader"/>}
