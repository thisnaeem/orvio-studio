"""Private macOS accessibility bridge for one focused plain text field.
Original text never leaves this process. Changes stop if focus or text changes.
"""
import ctypes as c, json, sys, time
cf=c.CDLL('/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation')
ax=c.CDLL('/System/Library/Frameworks/ApplicationServices.framework/ApplicationServices')
def signature(lib,name,result,args):
    f=getattr(lib,name);f.restype=result;f.argtypes=args;return f
ptr=c.c_void_p
string=signature(cf,'CFStringCreateWithCString',ptr,[ptr,c.c_char_p,c.c_uint32])
release=signature(cf,'CFRelease',None,[ptr]);equal=signature(cf,'CFEqual',c.c_bool,[ptr,ptr])
length=signature(cf,'CFStringGetLength',c.c_long,[ptr]);getstr=signature(cf,'CFStringGetCString',c.c_bool,[ptr,c.c_char_p,c.c_long,c.c_uint32])
copy=signature(ax,'AXUIElementCopyAttributeValue',c.c_int,[ptr,ptr,c.POINTER(ptr)])
setvalue=signature(ax,'AXUIElementSetAttributeValue',c.c_int,[ptr,ptr,ptr])
settable=signature(ax,'AXUIElementIsAttributeSettable',c.c_int,[ptr,ptr,c.POINTER(c.c_bool)])
getrange=signature(ax,'AXValueGetValue',c.c_bool,[ptr,c.c_int,ptr]);makerange=signature(ax,'AXValueCreate',ptr,[c.c_int,ptr])
system=signature(ax,'AXUIElementCreateSystemWide',ptr,[])()
class Range(c.Structure): _fields_=[('location',c.c_long),('length',c.c_long)]
def attr(obj,name):
    key=string(None,name.encode(),0x08000100);out=ptr()
    try:
        if copy(obj,key,c.byref(out)): return None
        return out.value
    finally: release(key)
def text(value):
    if not value or signature(cf,'CFGetTypeID',c.c_ulong,[ptr])(value)!=signature(cf,'CFStringGetTypeID',c.c_ulong,[])():return ''
    buffer=c.create_string_buffer(length(value)*4+1);getstr(value,buffer,len(buffer),0x08000100);return buffer.value.decode()
def read(obj,name):
    v=attr(obj,name)
    try:return text(v)
    finally:
        if v:release(v)
def set_attr(obj,name,value):
    key=string(None,name.encode(),0x08000100)
    try:return setvalue(obj,key,value)==0
    finally:release(key)
# Chromium/Electron can expose no AXFocusedApplication until accessibility is
# enabled. NSWorkspace gives the foreground PID independently of that tree.
appkit=c.CDLL('/System/Library/Frameworks/AppKit.framework/AppKit')
objc=c.CDLL('/usr/lib/libobjc.A.dylib')
objc_class=signature(objc,'objc_getClass',ptr,[c.c_char_p])
selector=signature(objc,'sel_registerName',ptr,[c.c_char_p])
send=c.CFUNCTYPE(ptr,ptr,ptr)(('objc_msgSend',objc))
send_pid=c.CFUNCTYPE(c.c_int,ptr,ptr)(('objc_msgSend',objc))
create_app=signature(ax,'AXUIElementCreateApplication',ptr,[c.c_int])
def foreground_pid():
    workspace=send(objc_class(b'NSWorkspace'),selector(b'sharedWorkspace'))
    application=send(workspace,selector(b'frontmostApplication'))
    return send_pid(application,selector(b'processIdentifier')) if application else 0
def focus():
    application=create_app(foreground_pid())
    try:return attr(application,'AXFocusedUIElement') or attr(system,'AXFocusedUIElement')
    finally:release(application)
field=None;original='';last='';selection=None;wrote=False;selected_mode=False;inserted_length=0;target_pid=0;keyboard_mode=False

def run(p):
    global field,original,last,selection,wrote,selected_mode,inserted_length,target_pid,keyboard_mode
    if p['action']=='capture':
        target_pid=foreground_pid();app=create_app(target_pid);app_name=''
        trusted=signature(ax,'AXIsProcessTrusted',c.c_bool,[])()
        try:
            app_name=read(app,'AXTitle')
            field=focus()
            if trusted and (not field or read(field,'AXRole') not in ('AXTextField','AXTextArea')):
                enabled=ptr.in_dll(cf,'kCFBooleanTrue')
                set_attr(app,'AXManualAccessibility',enabled)
                for _ in range(5):
                    if field:release(field)
                    time.sleep(.05);field=focus()
                    if field and read(field,'AXRole') in ('AXTextField','AXTextArea'):break
        finally:release(app)
        if not field:return {'live':False,'tracked':False,'identity':str(target_pid),'name':app_name,'permission':trusted}

        role=read(field,'AXRole');sub=read(field,'AXSubrole')
        if 'Secure' in sub:return {'live':False,'tracked':True,'protected':True}
        key=string(None,b'AXValue',0x08000100);yes=c.c_bool()
        try:can=settable(field,key,c.byref(yes))==0 and yes.value
        finally:release(key)
        key=string(None,b'AXSelectedText',0x08000100)
        try:selected_mode=settable(field,key,c.byref(yes))==0 and yes.value
        finally:release(key)
        if selected_mode:can=True
        key=string(None,b'AXSelectedTextRange',0x08000100)
        try:range_settable=settable(field,key,c.byref(yes))==0 and yes.value
        finally:release(key)
        if not can and range_settable:keyboard_mode=True;can=True
        if any(name in app_name.lower() for name in ('terminal','iterm','console')):can=False

        selected=attr(field,'AXSelectedTextRange');r=Range()
        try:can=can and bool(selected) and getrange(selected,4,c.byref(r))
        finally:
            if selected:release(selected)
        if can and role in ('AXTextField','AXTextArea'):
            original=last=read(field,'AXValue');selection=r
            if len(original)>100000:selection=None
        return {'live':selection is not None,'tracked':True,'identity':str(target_pid),'name':app_name,'permission':trusted}
    focused=focus()
    try:same=bool(field and focused and equal(field,focused))
    finally:
        if focused:release(focused)
    if p['action'] in ('paste','check') and not field:same=bool(target_pid and foreground_pid()==target_pid)
    if not same:return {'ok':False,'reason':'focus'}
    if p['action']=='paste':
        if not signature(ax,'AXIsProcessTrusted',c.c_bool,[])():return {'ok':False,'reason':'permission'}
        cg=c.CDLL('/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics')
        create=signature(cg,'CGEventCreateKeyboardEvent',ptr,[ptr,c.c_ushort,c.c_bool]);flags=signature(cg,'CGEventSetFlags',None,[ptr,c.c_uint64]);post=signature(cg,'CGEventPost',None,[c.c_uint32,ptr])
        before=read(field,'AXValue') if field else None
        # A complete chord matters in Chromium; flags on V alone can be dropped.
        # Keep this helper alive until the target has processed the key-up events.
        for code,down,modifiers in ((55,True,1<<20),(9,True,1<<20),(9,False,1<<20),(55,False,0)):
            event=create(None,code,down);flags(event,modifiers);post(0,event);release(event);time.sleep(.02)
        for _ in range(10):
            time.sleep(.03)
            if field and read(field,'AXValue')!=before:return {'ok':True,'verified':True}
        return {'ok':True,'verified':False}

    if p['action']=='check':return {'ok':True}
    if selection is None:return {'ok':False,'reason':'unsupported'}
    if read(field,'AXValue')!=last:return {'ok':False,'reason':'changed'}
    if p['action']=='rollback' and not wrote:return {'ok':True}
    replacement=p.get('text','')
    # AX ranges count UTF-16 units, not Python Unicode codepoints.
    raw=original.encode('utf-16-le');start=selection.location*2;end=(selection.location+selection.length)*2
    value=(raw[:start]+replacement.encode('utf-16-le')+raw[end:]).decode('utf-16-le') if p['action']!='rollback' else original
    if selected_mode or keyboard_mode:
        region=Range(selection.location,inserted_length if wrote else selection.length);v=makerange(4,c.byref(region))
        if not v:return {'ok':False,'reason':'unsupported'}
        try:
            if not set_attr(field,'AXSelectedTextRange',v):return {'ok':False,'reason':'unsupported'}
        finally:release(v)
        replacement=raw[start:end].decode('utf-16-le') if p['action']=='rollback' else replacement
    if keyboard_mode:
        cg=c.CDLL('/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics')
        create=signature(cg,'CGEventCreateKeyboardEvent',ptr,[ptr,c.c_ushort,c.c_bool]);flags=signature(cg,'CGEventSetFlags',None,[ptr,c.c_uint64]);post=signature(cg,'CGEventPost',None,[c.c_uint32,ptr]);unicode=signature(cg,'CGEventKeyboardSetUnicodeString',None,[ptr,c.c_ulong,ptr])
        encoded=replacement.encode('utf-16-le');chars=(c.c_ushort*(len(encoded)//2)).from_buffer_copy(encoded)
        for down in (True,False):
            event=create(None,0 if encoded else 51,down);flags(event,0)
            if encoded:unicode(event,len(encoded)//2,chars)
            post(0,event);release(event)
        time.sleep(.025)
    else:
        v=string(None,(replacement if selected_mode else value).encode(),0x08000100)
        try:
            if not set_attr(field,'AXSelectedText' if selected_mode else 'AXValue',v):return {'ok':False,'reason':'unsupported'}
        finally:release(v)

    # AX setters can report success while a web editor ignores the write.
    # Only claim a live edit after the value is observable in the target.
    observed=read(field,'AXValue')
    for _ in range(10):
        if observed==value:break
        time.sleep(.03);observed=read(field,'AXValue')
    if observed!=value:
        return {'ok':False,'reason':'unsupported' if observed==last else 'changed'}
    last=value;wrote=True;inserted_length=len(replacement.encode('utf-16-le'))//2
    r=Range(selection.location+len(replacement.encode('utf-16-le'))//2,0) if p['action']!='rollback' else selection
    v=makerange(4,c.byref(r))
    if v:
        set_attr(field,'AXSelectedTextRange',v);release(v)
    return {'ok':True}
if __name__=='__main__':
    for line in sys.stdin:
        try:
            request=json.loads(line);result=run(request);print(json.dumps({'id':request['id'],'result':result}),flush=True)
        except Exception:
            print(json.dumps({'id':request.get('id'),'result':{'ok':False,'live':False,'tracked':False}}),flush=True)
