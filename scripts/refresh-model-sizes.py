"""Refresh verified model payload sizes without downloading weights.
Run with Orvio's diffusion Python environment (same Diffusers version as runtime).
Only repository metadata and small pipeline configuration files are fetched.
"""
import json, pathlib, sys, tempfile, fnmatch, re
from datetime import datetime, timezone
from unittest.mock import patch
from functools import lru_cache
from huggingface_hub import HfApi
from diffusers import DiffusionPipeline, LTXConditionPipeline, ShapEPipeline, ShapEImg2ImgPipeline
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'runtime'))
from lipsync import REPOS
api=HfApi()
@lru_cache(maxsize=None)
def info(repo,revision='main'):
 return api.model_info(repo,revision=revision,files_metadata=True)
def selected(repo,revision='main',allow=None,ignore=None):
 metadata=info(repo,revision)
 def matches(name,patterns):return any(fnmatch.fnmatchcase(name,p.replace('\\','/')) for p in patterns)
 files=[{'path':f.rfilename,'bytes':f.size} for f in metadata.siblings if (not allow or matches(f.rfilename,allow)) and not matches(f.rfilename,ignore or [])]
 if not files or any(f['bytes'] is None for f in files):raise ValueError('Missing file sizes: '+repo)
 return {'repo':repo,'revision':metadata.sha,'files':files}
class Plan(Exception):pass
@lru_cache(maxsize=None)
def pipeline(repo,revision='main',safetensors=True,variant=None,kind='default'):
 plan={}
 def capture(repo_id,*args,**kwargs):
  plan.update(selected(repo_id,revision,kwargs.get('allow_patterns'),kwargs.get('ignore_patterns')))
  raise Plan()
 cls={'ltx':LTXConditionPipeline,'text3d':ShapEPipeline,'image3d':ShapEImg2ImgPipeline}.get(kind,DiffusionPipeline)
 with tempfile.TemporaryDirectory(prefix='orvio-size-plan-') as cache,patch('diffusers.pipelines.pipeline_utils.snapshot_download',capture):
  try:cls.download(repo,revision=revision,use_safetensors=safetensors,variant=variant,cache_dir=cache,force_download=True)
  except Plan:pass
 if not plan:raise ValueError('No download plan produced: '+repo)
 return plan

def model_sources(model):
 engine=model['engine'];repo=model.get('repo');revision=model.get('revision','main')
 if engine=='llama':return [selected(repo,revision,model.get('files') or [model['filename']])]
 if engine=='modern-image':return [selected(repo,revision,['model_index.json','scheduler/*','text_encoder/*','tokenizer/*','processor/*','transformer/*','vae/*'])]
 if engine=='ltx':return [pipeline(repo,revision,kind='ltx')]
 if engine=='spatial':return [selected(repo,revision,model['downloadPatterns'])]
 if engine=='lipsync':return [selected(r,v,f) for r,v,f in REPOS.values()]
 if engine=='diffusion':
  if model.get('adapter'):return [selected(repo,revision,[model['adapter']]),pipeline(model.get('baseRepo','stable-diffusion-v1-5/stable-diffusion-v1-5'))]
  return [pipeline(repo,revision,safetensors=model.get('weights')!='bin')]
 raise ValueError(engine)

def main():
 catalog=json.loads((ROOT/'runtime/models.json').read_text(encoding='utf-8'))
 out=ROOT/'runtime/model-download-sizes.json';results=json.loads(out.read_text(encoding='utf-8')) if out.exists() else {};failures=[]
 def save(id,sources):
  results[id]={'bytes':sum(f['bytes'] for s in sources for f in s['files']),'checkedAt':datetime.now(timezone.utc).isoformat(),'sources':sources}
  out.write_text(json.dumps(results,indent=2)+'\n',encoding='utf-8')
  print(id,round(results[id]['bytes']/1e9,3),'GB',flush=True)
 for model in catalog:
  try:save(model['id'],model_sources(model))
  except Exception as e:failures.append(model['id']);print('FAILED',model['id'],str(e)[:180],flush=True)
 local=(ROOT/'electron/local-studio.cjs').read_text(encoding='utf-8')
 voices=re.findall(r"\['([a-z]{2}_[A-Z]{2}-[^']+)','",local)
 for voice in voices:
  lang,name,quality=voice.split('-');stem=f'{lang.split("_")[0]}/{lang}/{name}/{quality}/{voice}'
  try:save(voice,[selected('rhasspy/piper-voices',allow=[stem+'.onnx',stem+'.onnx.json'])])
  except Exception as e:failures.append(voice);print('FAILED',voice,str(e)[:180],flush=True)
 extras={
 'chatterbox':[('ResembleAI/chatterbox',['ve.pt','t3_mtl23ls_v2.safetensors','s3gen.pt','grapheme_mtl_merged_expanded_v1.json','conds.pt','Cangjie5_TC.json'])],
 'mms':[('facebook/mms-1b-all',['*.json','model.safetensors','adapter.eng.safetensors'])],
 **{id:[(repo,['config.json','preprocessor_config.json','model.bin','tokenizer.json','vocabulary.*'])] for id,repo in [('whisper','Systran/faster-whisper-tiny'),('whisper-base','Systran/faster-whisper-base'),('whisper-small','Systran/faster-whisper-small'),('whisper-turbo','mobiuslabsgmbh/faster-whisper-large-v3-turbo')]}}
 for id,specs in extras.items():
  try:save(id,[selected(repo,allow=patterns) for repo,patterns in specs])
  except Exception as e:failures.append(id);print('FAILED',id,str(e)[:180],flush=True)
 for model in catalog:
  entry=results.get(model['id'])
  if entry:
   b=entry['bytes'];model['size']=(f'{b/1e9:.2f} GB' if b>=1e9 else f'{b/1e6:.1f} MB')+' model files'
 (ROOT/'runtime/models.json').write_text(json.dumps(catalog,indent=2)+'\n',encoding='utf-8')
 print('Catalog entries:',len(results),'Refresh failures:',failures,flush=True)
 if failures:sys.exit(1)
if __name__=='__main__':main()
