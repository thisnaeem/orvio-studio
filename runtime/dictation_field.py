"""Private macOS accessibility bridge for one focused plain text field.
Original text never leaves this process. Changes stop if focus or text changes.
"""
import ctypes as c, json, sys
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
    if not value:return ''
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
def focus():return attr(system,'AXFocusedUIElement')
field=None;original='';last='';selection=None;wrote=False

def run(p):
    global field,original,last,selection,wrote
    if p['action']=='capture':
        field=focus()
        if not field:return {'live':False,'tracked':False}
        role=read(field,'AXRole');sub=read(field,'AXSubrole')
        if 'Secure' in sub:return {'live':False,'tracked':True,'protected':True}
        key=string(None,b'AXValue',0x08000100);yes=c.c_bool()
        try:can=settable(field,key,c.byref(yes))==0 and yes.value
        finally:release(key)
        selected=attr(field,'AXSelectedTextRange');r=Range()
        try:can=can and bool(selected) and getrange(selected,4,c.byref(r))
        finally:
            if selected:release(selected)
        if can and role in ('AXTextField','AXTextArea'):
            original=last=read(field,'AXValue');selection=r
            if len(original)>100000:selection=None
        return {'live':selection is not None,'tracked':True}
    focused=focus()
    try:same=bool(field and focused and equal(field,focused))
    finally:
        if focused:release(focused)
    if not same:return {'ok':False,'reason':'focus'}
    if p['action']=='check':return {'ok':True}
    if selection is None:return {'ok':False,'reason':'unsupported'}
    if read(field,'AXValue')!=last:return {'ok':False,'reason':'changed'}
    replacement=p.get('text','')
    # AX ranges count UTF-16 units, not Python Unicode codepoints.
    raw=original.encode('utf-16-le');start=selection.location*2;end=(selection.location+selection.length)*2
    value=(raw[:start]+replacement.encode('utf-16-le')+raw[end:]).decode('utf-16-le') if p['action']!='rollback' else original
    v=string(None,value.encode(),0x08000100)
    try:
        if not set_attr(field,'AXValue',v):return {'ok':False,'reason':'unsupported'}
    finally:release(v)
    last=value;wrote=True
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
