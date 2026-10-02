import {clamp,type RecorderOptions} from './recorder-render';
export type Clip={id:string;start:number;end:number};
export type TextLayer={id:string;text:string;start:number;end:number;x:number;y:number;size:number;color:string;box:boolean};
export const clipsFor=(o:RecorderOptions,duration:number):Clip[]=>o.clips.length?o.clips:[{id:'original',start:o.start,end:o.end||duration}];
export const timelineDuration=(clips:Clip[])=>clips.reduce((sum,c)=>sum+c.end-c.start,0);
export function sourceAt(time:number,clips:Clip[]){let offset=0;for(let i=0;i<clips.length;i++){const c=clips[i],length=c.end-c.start;if(time<offset+length||i===clips.length-1)return {time:c.start+clamp(time-offset,0,length),index:i};offset+=length}return {time:0,index:0}}
export function timelineAt(source:number,index:number,clips:Clip[]){return clips.slice(0,index).reduce((sum,c)=>sum+c.end-c.start,0)+clamp(source-clips[index].start,0,clips[index].end-clips[index].start)}
export function splitClips(clips:Clip[],index:number,source:number,id:string){const c=clips[index];if(!c||source-c.start<.1||c.end-source<.1)return clips;return [...clips.slice(0,index),{...c,end:source},{id,start:source,end:c.end},...clips.slice(index+1)]}
export const timecode=(n:number)=>`${Math.floor(Math.max(0,n)/60).toString().padStart(2,'0')}:${(Math.max(0,n)%60).toFixed(1).padStart(4,'0')}`;
