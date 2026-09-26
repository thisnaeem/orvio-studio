import type {IconName} from './icons';
export type Page='Home'|'All tools'|'Instagram'|'Automations'|'Settings'|'Chat'|'Integrations';
export type StudioTool={id:string;name:Page;description:string;category:string;icon:IconName;color:string;label:string};
// Extend this registry and add the tool's route to grow the workspace.
export const studioTools:StudioTool[]=[
{id:'instagram',name:'Instagram',description:'Connect your pages. Bring your content and community together.',category:'Social media',icon:'instagram',color:'rose',label:'Connect to get started'},

{id:'chat',name:'Chat',description:'Chat with an agent that can prepare posts and use connected tools.',category:'Productivity',icon:'sparkles',color:'purple',label:'Actions and chat history'},
{id:'integrations',name:'Integrations',description:'Connect Meta, Google Drive, media and AI in one place.',category:'Productivity',icon:'link',color:'green',label:'Connect your tools'},
{id:'automations',name:'Automations',description:'Publish or schedule Facebook Page and Instagram posts.',category:'Productivity',icon:'workflow',color:'green',label:'Schedule your first post'},
];
