import type {IconName} from './icons';
export type Page='Pets'|'Home'|'All tools'|'Instagram'|'Automations'|'Settings'|'Chat'|'Integrations'|'Images'|'Downloader'|'Voice'|'Clipping'|'Live'|'Captions'|'Recorder'|'Models'|'Videos'|'PC Helper';
export type StudioTool={id:string;name:Page;description:string;category:string;icon:IconName;color:string;label:string};
// Extend this registry and add the tool's route to grow the workspace.
export const studioTools:StudioTool[]=[
{id:'pc-helper',name:'PC Helper',description:'Review large files, duplicates and app leftovers.',category:'Productivity',icon:'system',color:'green',label:'Review your storage'},
{id:'instagram',name:'Instagram',description:'Connect your pages. Bring your content and community together.',category:'Social media',icon:'instagram',color:'rose',label:'Connect to get started'},

{id:'chat',name:'Chat',description:'Chat with an agent that can prepare posts and use connected tools.',category:'Productivity',icon:'sparkles',color:'purple',label:'Actions and chat history'},
{id:'integrations',name:'Integrations',description:'Connect Meta, Google Drive, media and AI in one place.',category:'Productivity',icon:'link',color:'green',label:'Connect your tools'},
{id:'automations',name:'Automations',description:'Publish or schedule Facebook Page and Instagram posts.',category:'Productivity',icon:'workflow',color:'green',label:'Schedule your first post'},
{id:'images',name:'Images',description:'Generate images with models downloaded directly into Orvio.',category:'Creativity',icon:'image',color:'purple',label:'Local image generation'},
{id:'models',name:'Models',description:'Download and manage built-in chat, image and video models.',category:'Creativity',icon:'sparkles',color:'purple',label:'Your local model library'},
{id:'videos',name:'Videos',description:'Create short animations using built-in video models.',category:'Creativity',icon:'workflow',color:'rose',label:'Local video generation'},
{id:'live',name:'Live',description:'Stream a local video to YouTube with quality and looping controls.',category:'Creativity',icon:'workflow',color:'rose',label:'Your broadcast studio'},
{id:'captions',name:'Captions',description:'Automatic local transcription, editable timing and styled captions.',category:'Creativity',icon:'edit',color:'purple',label:'Make every word count'},
{id:'recorder',name:'Recorder',description:'Record your screen, a window or camera with microphone audio.',category:'Creativity',icon:'image',color:'green',label:'Capture your next story'},
{id:'voice',name:'Voice',description:'Multilingual local speech and voice cloning.',category:'Creativity',icon:'sparkles',color:'purple',label:'Download a voice'},
{id:'clipping',name:'Clipping',description:'Find highlights, edit clips and publish.',category:'Creativity',icon:'workflow',color:'rose',label:'AI video highlights'},
{id:'downloader',name:'Downloader',description:'Download videos from supported websites.',category:'Creativity',icon:'download',color:'green',label:'Save your videos'},
];
