import {useEffect,useRef,useState} from 'react';
/** Queue only user edits, serialize writes, and flush pending edits on navigation. */
export function useAutoSave<T>(persist:(value:T)=>Promise<unknown>,onError:(error:unknown)=>void){
 const [status,setStatus]=useState('');const latest=useRef({persist,onError});latest.current={persist,onError};
 const queue=useRef<{value:T}|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),running=useRef(false),alive=useRef(true);
 async function flush(){if(running.current)return;running.current=true;try{while(queue.current){const item=queue.current;queue.current=null;try{await latest.current.persist(item.value);if(alive.current&&!queue.current)setStatus('All changes saved')}catch(error){if(alive.current){setStatus('Could not save changes');latest.current.onError(error)}}}}finally{running.current=false}}
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;if(timer.current)clearTimeout(timer.current);void flush()}},[]);
 function save(value:T,immediate=false){queue.current={value};if(timer.current)clearTimeout(timer.current);setStatus('Saving…');if(immediate)void flush();else timer.current=setTimeout(()=>void flush(),500)}
 return {save,status};
}
