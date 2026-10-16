// Original Pixel Frog Monk: preserve every authored walk and casting pose.
export const NATIVE_SHAMAN_STATES=Object.freeze({
 stand:{source:'Idle',poses:[0,1,2,3,4,5],fps:1.5},
 walk:{source:'Run',poses:[0,1,2,3],fps:12},
 attack:{source:'Heal',poses:[0,1,2,3,7,10],fps:16},
 heal:{source:'Heal',poses:[0,1,2,3,4,5,6,7,8,9,10],fps:9},
 hit:{source:'Idle',poses:[0,1],fps:10},
 death:{source:'Idle',poses:[0,1,1,1],fps:8}
})
