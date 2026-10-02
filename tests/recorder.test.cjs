const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{randomUUID}=require('node:crypto');
const {normalizeProject,rectangle,createRecorderProjects}=require('../electron/recorder-project.cjs');
const {createRecorderCapture}=require('../electron/recorder-capture.cjs');
const {createProduction}=require('../electron/production.cjs');
function directory(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'orvio-recorder-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir}
test('editing and shortcut workflow settings persist without altering originals',t=>{const dir=directory(t),id=randomUUID(),projects=createRecorderProjects(dir);projects.settings({editScreenshot:false,shortcutArea:false});const input={start:1,end:10,background:'solid',color:'#ffcc33',cameraId:randomUUID(),zooms:[{start:2,end:4,x:.3,y:.7,scale:2}]};projects.save(id,input);const reopened=createRecorderProjects(dir);assert.equal(reopened.get(id).cameraId,input.cameraId);assert.deepEqual(reopened.get(id).zooms,input.zooms);assert.equal(reopened.state().settings.editScreenshot,false);assert.deepEqual(reopened.state().recent,[id]);assert.throws(()=>projects.get('../secrets'),/saved capture/)});
test('invalid crop and zoom timing cannot reach a render',()=>{for(const crop of [{x:-.1,y:0,width:.5,height:.5},{x:1,y:0,width:.5,height:.5},{x:0,y:0,width:NaN,height:1}])assert.throws(()=>rectangle(crop));assert.deepEqual(rectangle({x:.1,y:.2,width:.4,height:.3}),{x:.1,y:.2,width:.4,height:.3});for(const input of [{end:1,start:2},{color:'red;evil'},{resolution:90000},{cameraId:'/etc/passwd'},{zooms:[null]},{zooms:[{start:0,end:2,x:.5,y:.5,scale:2},{start:1,end:3,x:.5,y:.5,scale:2}]}])assert.throws(()=>normalizeProject(input))});
test('screen and webcam chunks remain separate and both survive completion',t=>{const dir=directory(t),saved=[];const production=createProduction({directory:dir,localStudio:{import(file,kind){const asset={id:randomUUID(),kind,preview:'test'};saved.push({bytes:fs.readFileSync(file).toString(),asset});return asset}}});const {id}=production.beginRecording({camera:true});const backing=new Uint8Array([88,65,66,89]);production.appendRecording(id,backing.subarray(1,3),'screen');production.appendRecording(id,Buffer.from('camera'),'camera');assert.throws(()=>production.appendRecording(id,Buffer.from('x'),'other'));const result=production.finishRecording(id);assert.equal(saved[0].bytes,'camera');assert.equal(saved[1].bytes,'AB');assert.equal(result.cameraId,saved[0].asset.id);assert.equal(result.id,saved[1].asset.id);assert.deepEqual(fs.readdirSync(path.join(dir,'recordings')),[])});
test('quick screenshots copy once without creating an asset when editing is disabled',async t=>{const dir=directory(t),copied=[],imports=[];let cropped;const image={isEmpty:()=>false,getSize:()=>({width:200,height:100}),crop:rect=>{cropped=rect;return image},toPNG:()=>Buffer.from('PNG'),toDataURL:()=>''};const capture=createRecorderCapture({directory:dir,desktopCapturer:{getSources:async()=>[{id:'screen:1:0',display_id:'1',thumbnail:image}]},screen:{getAllDisplays:()=>[{id:1,size:{width:200,height:100},scaleFactor:1,bounds:{x:0,y:0,width:200,height:100}}],getDisplayNearestPoint:()=>({id:1}),getCursorScreenPoint:()=>({x:10,y:10})},clipboard:{writeImage:img=>copied.push(img)},nativeImage:{createFromDataURL:()=>image},localStudio:{import:(file,kind)=>{imports.push(file);return {id:randomUUID(),kind}}},ipcMain:{handle(){},on(){}}});capture.projects.settings({editScreenshot:false});await capture.capture({sourceId:'screen:1:0',crop:{x:.25,y:.1,width:.5,height:.8}});assert.deepEqual(cropped,{x:50,y:10,width:100,height:80});assert.equal(copied.length,1);assert.equal(imports.length,0);await capture.capture({edit:true});assert.equal(imports.length,1);assert.equal(capture.projects.state().recent.length,1);assert.deepEqual(fs.readdirSync(path.join(dir,'screenshots')),[])});
test('cursor projects preserve tracking and reject invalid or unordered samples',t=>{
 const id=randomUUID(),projects=createRecorderProjects(directory(t)),cursor=[{time:0,x:.1,y:.3},{time:1,x:.9,y:.6}];
 projects.save(id,{cursor,cursorDuration:2,zoomStrength:2.1});
 assert.deepEqual(projects.get(id).cursor,cursor);assert.equal(projects.get(id).zoomMode,'cursor');
 assert.equal(normalizeProject({zooms:[{start:0,end:1,x:.5,y:.5,scale:2}]}).zoomMode,'moments');
 for(const input of [{cursor:[{time:0,x:2,y:0}]},{cursor:[cursor[1],cursor[0]]},{cursor:[null]},{zoomStrength:8},{cursorDuration:Infinity}])assert.throws(()=>normalizeProject(input));
});
test('cursor follow pans continuously, respects trim and can be disabled',()=>{
 const ts=require('typescript'),vm=require('node:vm'),module={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/recorder-render.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports});const {zoomAt,smoothCursor,defaultOptions}=module.exports;
 const cursor=smoothCursor([{time:0,x:.1,y:.3},{time:1,x:.2,y:.3},{time:2,x:.8,y:.7},{time:3,x:.9,y:.7}]);
 const options={...defaultOptions,cursor,cursorDuration:4,zoomStrength:2};
 assert.equal(zoomAt(0,options).scale,1);assert.equal(zoomAt(4,options).scale,1);
 const a=zoomAt(1,options),b=zoomAt(2,options),mid=zoomAt(1.5,options);
 assert.equal(a.scale,2);assert.ok(a.x<mid.x&&mid.x<b.x);assert.ok(a.y<b.y);
 assert.equal(zoomAt(2,{...options,autoZoom:false}).scale,1);
 assert.equal(zoomAt(1,{...options,start:1,end:3}).scale,1);
 assert.equal(zoomAt(2,{...options,cursor:[]}).scale,1);
});
test('capture editors are separate trusted windows, reused and safely closed',()=>{
 const {EventEmitter}=require('node:events'),{createRecorderWindows}=require('../electron/recorder-windows.cjs');const created=[],workspaceWindows=new Set();
 class Window extends EventEmitter{
  constructor(options){super();this.options=options;this.webContents=new EventEmitter();this.webContents.setWindowOpenHandler=()=>{};this.webContents.send=(...args)=>this.sent=args;created.push(this)}
  loadURL(url){this.url=url}loadFile(file,options){this.file=file;this.hash=options.hash}show(){this.visible=true}focus(){}restore(){}isDestroyed(){return !!this.destroyed}destroy(){this.destroyed=true;this.emit('closed')}
 }
 const id=randomUUID(),windows=createRecorderWindows({BrowserWindow:Window,workspaceWindows,localStudio:{file(value){if(value!==id)throw Error('Missing asset')},state:()=>({assets:[{id,kind:'video',title:'Test'}]})},packaged:true,directory:'/app/electron'});
 assert.throws(()=>windows.open('invalid'));windows.open(id);const win=created[0];assert.equal(win.hash,`recorder-editor=${id}`);assert.ok(workspaceWindows.has(win));assert.equal(win.options.webPreferences.nodeIntegration,false);
 windows.open(id);assert.equal(created.length,1);let prevented=false;win.emit('close',{preventDefault(){prevented=true}});assert.equal(prevented,true);assert.deepEqual(win.sent,['recorder:editor-close']);assert.equal(win.destroyed,undefined);
 assert.throws(()=>windows.close({}));windows.close(win);assert.equal(workspaceWindows.size,0);windows.open(id);windows.shutdown();assert.equal(workspaceWindows.size,0);
});
test('timeline projects validate clip cuts, text timing and camera coordinates',()=>{
 const result=normalizeProject({clips:[{id:'first',start:0,end:1},{id:'second',start:2,end:4}],texts:[{id:'title',text:'Hello',start:0,end:2,x:.5,y:.8,size:42,color:'#ffffff',box:true}],volume:.5,backgroundPreset:'silk',cameraX:.3,cameraY:.7});
 assert.equal(result.clips.length,2);assert.equal(result.texts[0].text,'Hello');assert.equal(result.volume,.5);assert.equal(result.backgroundPreset,'silk');
 for(const patch of [{clips:[{id:'x',start:3,end:1}]},{clips:[{id:'x',start:0,end:1},{id:'x',start:1,end:2}]},{texts:[{...result.texts[0],end:-1}]},{texts:[{...result.texts[0],text:'x'.repeat(501)}]},{backgroundPreset:'../../private'},{volume:2},{cameraX:NaN}])assert.throws(()=>normalizeProject(patch));
});
test('timeline split, deletion and reordering map playback to the correct source',()=>{
 const ts=require('typescript'),vm=require('node:vm'),module={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/recorder-timeline.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,require:()=>({clamp:(n,a=0,b=1)=>Math.max(a,Math.min(b,n))})});const {splitClips,sourceAt,timelineAt,timelineDuration}=module.exports;
 const clips=splitClips([{id:'a',start:0,end:10}],0,4,'b');assert.equal(clips.length,2);assert.equal(timelineDuration(clips),10);
 const remaining=[clips[1]];assert.equal(sourceAt(2,remaining).time,6);assert.equal(timelineDuration(remaining),6);assert.equal(timelineAt(6,0,remaining),2);
 const reordered=[clips[1],clips[0]];assert.equal(sourceAt(7,reordered).time,1);assert.equal(sourceAt(7,reordered).index,1);assert.equal(splitClips(clips,0,.01,'c'),clips);
});
test('captions use word timestamps and remain aligned through cuts and reordering',()=>{
 const ts=require('typescript'),vm=require('node:vm'),module={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/recorder-captions.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports});const {groupTranscript,mapCaptions,remapCaptions}=module.exports;
 const grouped=groupTranscript([{start:0,end:3,text:'One two three',words:[{start:0,end:1,text:'One'},{start:1,end:2,text:'two'},{start:2,end:3,text:'three'}]}],2);
 assert.equal(grouped.length,2);assert.equal(grouped[0].text,'One two');assert.equal(grouped[1].start,2);
 const mapped=mapCaptions(grouped,[{id:'b',start:2,end:3}]);assert.equal(mapped.length,1);assert.equal(mapped[0].text,'three');assert.equal(mapped[0].start,0);assert.equal(mapped[0].end,1);
 const reordered=remapCaptions(grouped,[{id:'a',start:0,end:3}],[{id:'b',start:2,end:3},{id:'a',start:0,end:2}]);assert.equal(reordered[0].text,'three');assert.equal(reordered[1].text,'One two');assert.equal(reordered[1].start,1);
 const project=normalizeProject({captions:grouped,captionModel:'whisper-small',captionLanguage:'ur',captionColor:'#ffe65c'});assert.equal(project.captions.length,2);assert.equal(project.captionModel,'whisper-small');
 assert.throws(()=>normalizeProject({captionModel:'unknown'}));assert.throws(()=>normalizeProject({captions:[{id:'bad',text:'Oops',start:5,end:2}]}));
});
test('effects, transitions, caption styles and image layers survive project normalization',()=>{
 const imageId=randomUUID();const project=normalizeProject({effect:'vivid',transition:'black',transitionDuration:.4,captionStyle:'hormozi',captionHighlight:'#ffee11',captionUppercase:true,texts:[{id:'logo',imageId,text:'Logo',start:0,end:2,x:.3,y:.4,size:30,color:'#ffffff',box:false}]});
 assert.equal(project.texts[0].imageId,imageId);assert.equal(project.captionStyle,'hormozi');assert.equal(project.transitionDuration,.4);
 for(const patch of [{effect:'unknown'},{transitionDuration:99},{captionStyle:'unknown'},{texts:[{...project.texts[0],imageId:'../../secret'}]}])assert.throws(()=>normalizeProject(patch));
});
