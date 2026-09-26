import type {IconName} from './icons';
export type Page='Home'|'All tools'|'Instagram'|'Content planner'|'Automations'|'Settings'|'Billing';
export type StudioTool={id:string;name:Page;description:string;category:string;icon:IconName;color:string;label:string};
// Extend this registry and add the tool's route to grow the workspace.
export const studioTools:StudioTool[]=[
{id:'instagram',name:'Instagram',description:'Connect your pages. Bring your content and community together.',category:'Social media',icon:'instagram',color:'rose',label:'Connect to get started'},
{id:'planner',name:'Content planner',description:'Capture the idea. Shape the story. Give every post a place.',category:'Productivity',icon:'calendar',color:'purple',label:'Ready to use'},
{id:'automations',name:'Automations',description:'Design thoughtful workflows for the work you do on repeat.',category:'Productivity',icon:'workflow',color:'green',label:'Build your first workflow'},
];
