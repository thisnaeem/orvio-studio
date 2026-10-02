// Batch microphone samples so the renderer receives five small messages per second.
class DictationPCM extends AudioWorkletProcessor {
 constructor(){super();this.samples=new Float32Array(3200);this.offset=0;this.port.onmessage=event=>{if(event.data==='flush'){if(this.offset)this.port.postMessage(this.samples.slice(0,this.offset));this.offset=0;this.port.postMessage('flushed')}}}
 process(inputs){const channel=inputs[0]?.[0];if(channel)for(const sample of channel){this.samples[this.offset++]=sample;if(this.offset===this.samples.length){this.port.postMessage(this.samples);this.samples=new Float32Array(3200);this.offset=0}}return true}
}
registerProcessor('dictation-pcm',DictationPCM);
