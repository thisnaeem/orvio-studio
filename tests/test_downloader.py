import unittest,sys,pathlib,tempfile,types
from unittest.mock import patch,MagicMock
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'runtime'))
import worker
class DownloadTests(unittest.TestCase):
    def test_audio_and_video_options_reach_extractor_and_converter(self):
        for audio in (True,False):
            with self.subTest(audio=audio),tempfile.TemporaryDirectory() as root:
                source=pathlib.Path(root)/'source.webm';source.write_bytes(b'test')
                captured=[]
                class Downloader:
                    def __init__(self,options):captured.append(options)
                    def __enter__(self):return self
                    def __exit__(self,*args):pass
                    def extract_info(self,*args,**kwargs):
                        info={'filepath':str(source),'title':'Fixture','duration':1,'thumbnail':'https://example.com/thumb.jpg'}
                        captured[0]['progress_hooks'][0]({'status':'downloading','info_dict':info,'downloaded_bytes':1})
                        return info
                modules={'yt_dlp':types.SimpleNamespace(YoutubeDL=Downloader),'imageio_ffmpeg':types.SimpleNamespace(get_ffmpeg_exe=lambda:'ffmpeg')}
                with patch.dict(sys.modules,modules),patch.object(worker.subprocess,'run') as run,patch.object(worker,'emit') as emit:
                    worker.run({'models':root,'action':'download','url':'https://example.com/video','output':str(pathlib.Path(root)/'output'),'audio':audio,'quality':720,'rate':256})
                self.assertEqual(emit.call_args_list[0].args[1]['thumbnail'],'https://example.com/thumb.jpg')
                self.assertEqual(captured[0]['ratelimit'],256*1024)
                self.assertEqual(captured[0]['format'],'ba/b' if audio else 'bv*[height<=720]+ba/b[height<=720]/b')
                self.assertIn('libmp3lame' if audio else 'libx264',run.call_args.args[0])
                self.assertFalse(source.exists())
if __name__=='__main__':unittest.main()
