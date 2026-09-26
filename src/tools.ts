import type {IconName} from './icons';
export type Page='Home'|'All tools'|'Instagram'|'Automations'|'Settings'|'Chat'|'Integrations';
export type StudioTool={id:string;name:Page;description:string;category:string;icon:IconName;color:string;label:string};
// Extend this registry and add the tool's route to grow the workspace.
export const studioTools:StudioTool[]=[
{id:'instagram',name:'Instagram',description:'Connect your pages. Bring your content and community together.',category:'Social media',icon:'instagram',color:'rose',label:'Connect to get started'},

{id:'chat',name:'Chat',description:'Think, write and plan with an AI agent connected to your studio.',category:'Productivity',icon:'sparkles',color:'purple',label:'Three creative agents'},
{id:'integrations',name:'Integrations',description:'Bring Meta, media hosting, AI and MCP tools together.',category:'Productivity',icon:'link',color:'green',label:'Connect your tools'},
{id:'automations',name:'Automations',description:'Schedule Instagram image posts. Let your studio take care of publishing.',category:'Productivity',icon:'workflow',color:'green',label:'Schedule your first post'},
];
