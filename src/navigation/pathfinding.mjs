/** Eight-way A* on a footprint grid, disallowing diagonal corner cuts. */
export function unpackNavigation(packed) {
  if (!packed || packed.cell !== 16 || !Number.isInteger(packed.cols) ||
      !Number.isInteger(packed.rows) || packed.cols<=0 || packed.rows<=0)
    throw new Error('Invalid Tiled navigation data');
  const size=Math.ceil(packed.cols*packed.rows/8);
  if(typeof packed.blocked!=='string'||packed.blocked.length!==size*2||!/^[a-f0-9]*$/i.test(packed.blocked))
    throw new Error('Invalid navigation bitmap');
  const bits=new Uint8Array(size);
  for(let i=0;i<size;i++)bits[i]=parseInt(packed.blocked.slice(i*2,i*2+2),16);
  return {cell:16,cols:packed.cols,rows:packed.rows,bits};
}

export function isBlocked(nav,x,y) {
  if(x<0||y<0||x>=nav.cols||y>=nav.rows)return true;
  const i=y*nav.cols+x;
  return Boolean(nav.bits[i>>3]&(1<<(i&7)));
}

/** If the requested point is obstructed, approach the nearest reachable cell. */
export function findRoute(nav,from,target) {
  if(!nav||![from?.x,from?.y,target?.x,target?.y].every(Number.isFinite))return [];
  const {cols,rows,cell}=nav;
  const clamp=(v,max)=>Math.max(0,Math.min(max-1,Math.round(v/cell)));
  let sx=clamp(from.x,cols),sy=clamp(from.y,rows);
  const gx=clamp(target.x,cols),gy=clamp(target.y,rows);
  if(isBlocked(nav,sx,sy)){
    let found=null;
    for(let radius=1;radius<=6&&!found;radius++){
      for(let dy=-radius;dy<=radius&&!found;dy++){
        for(let dx=-radius;dx<=radius;dx++){
          if(Math.max(Math.abs(dx),Math.abs(dy))===radius&&!isBlocked(nav,sx+dx,sy+dy)){
            found=[sx+dx,sy+dy];break;
          }
        }
      }
    }
    if(!found)return [];
    [sx,sy]=found;
  }
  const start=sy*cols+sx,goal=gy*cols+gx,size=cols*rows;
  const dist=new Float64Array(size).fill(Infinity);
  const previous=new Int32Array(size).fill(-1);
  const visited=new Uint8Array(size);
  const h=(x,y)=>{const dx=Math.abs(x-gx),dy=Math.abs(y-gy);return dx+dy+(Math.SQRT2-2)*Math.min(dx,dy)};
  const heap=[];
  const push=value=>{
    let i=heap.length;heap.push(value);
    while(i>0){
      const p=(i-1)>>1;if(heap[p].f<=value.f)break;
      heap[i]=heap[p];i=p;
    }
    heap[i]=value;
  };
  const pop=()=>{
    const first=heap[0],last=heap.pop();
    if(heap.length){
      let i=0;
      while(true){
        const l=2*i+1;if(l>=heap.length)break;
        const r=l+1,c=r<heap.length&&heap[r].f<heap[l].f?r:l;
        if(heap[c].f>=last.f)break;
        heap[i]=heap[c];i=c;
      }
      heap[i]=last;
    }
    return first;
  };
  dist[start]=0;push({at:start,g:0,f:h(sx,sy)});
  let nearest=start,nearestDist=Infinity;
  while(heap.length){
    const {at,g}=pop();
    if(visited[at]||g!==dist[at])continue;
    visited[at]=1;
    const x=at%cols,y=(at-x)/cols;
    const goalDist=(x-gx)**2+(y-gy)**2;
    if(goalDist<nearestDist){nearestDist=goalDist;nearest=at;}
    if(at===goal){nearest=at;break;}
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
      const nx=x+dx,ny=y+dy;
      if(isBlocked(nav,nx,ny))continue;
      // Do not slide diagonally past corners of two solid tiles.
      if(dx!==0&&dy!==0&&(isBlocked(nav,x+dx,y)||isBlocked(nav,x,y+dy)))continue;
      const next=ny*cols+nx;
      // Equal-distance routes can zigzag tile-by-tile. Prefer long straight
      // stretches so the character does not snap direction every 16 pixels.
      const earlier=previous[at]
      const turn=earlier<0?0:
        ((x-(earlier%cols))!==dx||(y-Math.floor(earlier/cols))!==dy?0.12:0)
      const cost=g+(dx!==0&&dy!==0?Math.SQRT2:1)+turn
      if(visited[next]||cost>=dist[next])continue;
      dist[next]=cost;previous[next]=at;
      push({at:next,g:cost,f:cost+h(nx,ny)});
    }
  }
  if(nearest===start)return [];
  const cells=[];
  for(let i=nearest;i!==-1;i=previous[i]){
    cells.push({x:(i%cols)*cell,y:Math.floor(i/cols)*cell});
    if(i===start)break;
  }
  cells.reverse();
  const waypoints=[];
  for(let i=1;i<cells.length;i++){
    const a=cells[i-1],b=cells[i],c=cells[i+1];
    if(!c||b.x-a.x!==c.x-b.x||b.y-a.y!==c.y-b.y)waypoints.push(b);
  }
  return waypoints;
}
