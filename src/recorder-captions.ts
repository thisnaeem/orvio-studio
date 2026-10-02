import type {Clip} from './recorder-timeline';
export type Caption={id:string;start:number;end:number;text:string};
export function mapCaptions(source:Caption[],clips:Clip[]):Caption[]{
 const result:Caption[]=[];let offset=0;
 for(const clip of clips){for(const caption of source){const start=Math.max(caption.start,clip.start),end=Math.min(caption.end,clip.end);if(end-start>.02)result.push({...caption,id:`c${result.length}-${caption.id}`.slice(0,64),start:offset+start-clip.start,end:offset+end-clip.start})}offset+=clip.end-clip.start}
 return result.sort((a,b)=>a.start-b.start);
}
export function remapCaptions(captions:Caption[],oldClips:Clip[],newClips:Clip[]):Caption[]{
 const ranges=(clips:Clip[])=>{const result:{start:number;end:number}[]=[];for(const c of clips){const last=result[result.length-1];if(last&&Math.abs(last.end-c.start)<.00001)last.end=c.end;else result.push({start:c.start,end:c.end})}return result};
 if(JSON.stringify(ranges(oldClips))===JSON.stringify(ranges(newClips)))return captions;
 const source:Caption[]=[];let offset=0;
 for(const clip of oldClips){for(const caption of captions){const start=Math.max(caption.start,offset),end=Math.min(caption.end,offset+clip.end-clip.start);if(end-start>.02)source.push({...caption,id:`s${source.length}`,start:clip.start+start-offset,end:clip.start+end-offset})}offset+=clip.end-clip.start}
 return mapCaptions(source,newClips);
}
export function groupTranscript(segments:{start:number;end:number;text:string;words?:{start:number;end:number;text:string}[]}[],wordsPerCaption=5):Caption[]{
 const result:Caption[]=[];
 for(const segment of segments){if(segment.words?.length){for(let i=0;i<segment.words.length;i+=wordsPerCaption){const words=segment.words.slice(i,i+wordsPerCaption);const start=words[0].start,end=words[words.length-1].end;if(Number.isFinite(start)&&Number.isFinite(end)&&end>start)result.push({id:`auto-${result.length}`,start,end,text:words.map(w=>w.text.trim()).join(' ').trim()})}}else if(segment.end>segment.start&&segment.text.trim())result.push({id:`auto-${result.length}`,start:segment.start,end:segment.end,text:segment.text.trim()})}
 return result;
}
