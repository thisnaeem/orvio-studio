import unittest,sys,pathlib
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'runtime'))
from captions import validate,stamp,srt
from broadcast import args_for
class RuntimeTests(unittest.TestCase):
    def test_captions_reject_invalid_timings(self):
        for rows in ([{'start':-1,'end':2,'text':'x'}],[{'start':0,'end':11,'text':'x'}],[{'start':float('nan'),'end':2,'text':'x'}]):
            with self.assertRaises(ValueError): validate(rows,10)
    def test_subtitles_preserve_text_and_times(self):
        rows=validate([{'start':1.5,'end':2.25,'text':'Hello, world'}],3)
        self.assertIn('00:00:01,500 --> 00:00:02,250',srt(rows));self.assertEqual(stamp(61.25,True),'0:01:01.25')
    def test_broadcast_arguments_are_validated_and_use_secure_youtube(self):
        args=args_for({'key':'test-stream-key','source':'/tmp/video with spaces.mp4','loop':True,'hasAudio':True},'/tmp/ffmpeg')
        self.assertEqual(args[-1],'rtmps://a.rtmps.youtube.com:443/live2/test-stream-key');self.assertIn('/tmp/video with spaces.mp4',args);self.assertIn('-stream_loop',args)
        with self.assertRaises(ValueError): args_for({'key':'bad key; command','source':'x'},'ffmpeg')
    def test_muting_selects_silent_audio(self):
        args=args_for({'key':'test-key','source':'x','mute':True,'hasAudio':True},'ffmpeg');self.assertIn('1:a:0',args);self.assertNotIn('0:a:0',args)
if __name__=='__main__': unittest.main()
