"""Watch only the configured shortcut until release; never records typed keys."""
import ctypes, json, sys, time

def watch(keys, platform=sys.platform):
    if platform=='darwin':
        lib=ctypes.CDLL('/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics')
        lib.CGEventSourceKeyState.argtypes=[ctypes.c_int,ctypes.c_ushort];lib.CGEventSourceKeyState.restype=ctypes.c_bool
        down=lambda key:lib.CGEventSourceKeyState(1,key)
    elif platform=='win32':
        down=lambda key:bool(ctypes.windll.user32.GetAsyncKeyState(key)&0x8000)
    else: raise RuntimeError('Hold-to-talk supports Windows and macOS.')
    deadline=time.monotonic()+65
    while time.monotonic()<deadline:
        if not all(any(down(k) for k in group) for group in keys):
            print('released',flush=True);return
        time.sleep(.025)
    print('released',flush=True)
if __name__=='__main__': watch(json.loads(sys.argv[1]))
