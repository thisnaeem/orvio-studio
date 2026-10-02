"""Watch only the configured shortcut until release; never records typed keys."""
import ctypes, json, sys, time

def watch(keys, platform=sys.platform, mode="any", timeout=65):
    if platform=='darwin':
        lib=ctypes.CDLL('/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics')
        lib.CGEventSourceKeyState.argtypes=[ctypes.c_int,ctypes.c_ushort];lib.CGEventSourceKeyState.restype=ctypes.c_bool
        down=lambda key:lib.CGEventSourceKeyState(1,key)
    elif platform=='win32':
        down=lambda key:bool(ctypes.windll.user32.GetAsyncKeyState(key)&0x8000)
    else: raise RuntimeError('Hold-to-talk supports Windows and macOS.')
    deadline=time.monotonic()+timeout
    while time.monotonic()<deadline:
        states=[any(down(k) for k in group) for group in keys]
        if (not any(states)) if mode=='all' else (not all(states)):
            print('released',flush=True);return
        time.sleep(.025)
    print('timeout',flush=True)
if __name__=='__main__': watch(json.loads(sys.argv[1]),mode=sys.argv[2] if len(sys.argv)>2 else 'any',timeout=float(sys.argv[3]) if len(sys.argv)>3 else 65)
