/** Stable identities shared by the bot directory, navigation and tool headers. */
export type ToolBot={name:string;role:string;intro:string;accent:string};
export const toolBots:Record<string,ToolBot>={
 seo:{name:'Atlas',role:'Search analyst',intro:'Find the next opportunity in your search traffic.',accent:'#67c99b'},
 'pc-helper':{name:'Tidy',role:'PC caretaker',intro:'Make space, review duplicates and keep your computer organized.',accent:'#72bdb0'},
 instagram:{name:'Mingle',role:'Social accounts guide',intro:'Bring your Instagram and Facebook pages together.',accent:'#ee91b2'},
 chat:{name:'Orbi',role:'Studio assistant',intro:'Turn a conversation into your next step.',accent:'#aa91ff'},
 integrations:{name:'Relay',role:'Connection specialist',intro:'Connect the services your workspace relies on.',accent:'#6ac4d1'},
 automations:{name:'Tempo',role:'Publishing coordinator',intro:'Give every post its moment.',accent:'#e7bb75'},
 studio:{name:'Prisma',role:'Creative partner',intro:'Explore images, motion, voices and worlds in 3D.',accent:'#b092ff'},
 models:{name:'Sage',role:'Model librarian',intro:'Find and manage the models behind your creations.',accent:'#92aaff'},
 live:{name:'Beacon',role:'Broadcast producer',intro:'Bring your videos to a live audience.',accent:'#ef9b83'},
 captions:{name:'Glyph',role:'Caption editor',intro:'Make every word readable and every moment accessible.',accent:'#d69bea'},
 'video-editor':{name:'Cut',role:'Video editor',intro:'Shape your footage into something worth sharing.',accent:'#b092ff'},
 recorder:{name:'Frame',role:'Recording partner',intro:'Capture your screen, camera and next big idea.',accent:'#81c4a9'},
 voice:{name:'Echo',role:'Voice creator',intro:'Give your words a voice, in your language.',accent:'#e5abcf'},
 clipping:{name:'Slice',role:'Highlight editor',intro:'Find the moments worth sharing.',accent:'#e9a884'},
 downloader:{name:'Fetch',role:'Download manager',intro:'Bring your files and media into the studio.',accent:'#94c77c'},
};
