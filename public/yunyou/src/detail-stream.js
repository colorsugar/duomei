// Serial, demand-driven construction with bounded LRU residency. Imported JS
// modules remain in the browser cache; evicted scene objects release GPU data.
export class DetailStream {
  constructor({ load, dispose, limit = 3, paused = () => false, clock = () => Date.now() }) {
    Object.assign(this, { load, dispose, limit, paused, clock });
    this.cache = new Map(); this.wanted = []; this.busy = null; this.failures = new Map();
  }
  update(ids) {
    this.wanted = [...new Set(ids)].slice(0,this.limit);
    for (const id of this.wanted) { const e=this.cache.get(id); if(e)e.used=this.clock(); }
    this.trim();
    return this.pump();
  }
  trim(reserve = 0) {
    const old=[...this.cache].filter(([id])=>!this.wanted.includes(id)).sort((a,b)=>a[1].used-b[1].used);
    while (this.cache.size + reserve > this.limit && old.length) {
      const [id,e]=old.shift();this.cache.delete(id);this.dispose(id,e.value);
    }
  }
  async pump() {
    if(this.busy || this.paused())return;
    const id=this.wanted.find(id=>!this.cache.has(id)&&this.clock()-(this.failures.get(id)??-Infinity)>15000);
    if(!id)return;
    this.busy=id;this.trim(1);
    try {
      const value=await this.load(id,()=>this.wanted.includes(id));
      if(value) {
        if(this.wanted.includes(id))this.cache.set(id,{value,used:this.clock()});
        else this.dispose(id,value);
      }
    } catch(error) { this.failures.set(id,this.clock());console.warn('Landmark detail unavailable',id,error); }
    finally {this.busy=null;this.trim();}
  }
}
