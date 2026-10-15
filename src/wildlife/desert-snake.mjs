import {isBlocked} from '../navigation/pathfinding.mjs'
export function snakeStep(nav,home,position,step){
 const moves=[['left',-64,0],['up',0,-64],['right',64,0],['down',0,64]]
 if(step%3===0)return null
 for(let i=0;i<4;i++){
  const [direction,dx,dy]=moves[(step*7+i)%4]
  const end={x:position.x+dx,y:position.y+dy}
  if(Math.hypot(end.x-home.x,end.y-home.y)>128)continue
  let free=true
  for(let t=0;t<=4;t++)if(isBlocked(nav,Math.round((position.x+dx*t/4)/16),Math.round((position.y+dy*t/4)/16)))free=false
  if(free)return direction
 }
 return null
}
