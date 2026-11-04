// Shared art-direction constants. Neutral/cool materials are restrained while
// motivated warm lamps retain color. This is not a global blue screen filter.
export const PALETTE = Object.freeze({neutralSaturation:.78, warmSaturation:1.04, shadowFloor:.012});
export function warmColorWeight(r,g,b) {
  const x=Math.max(0,Math.min(1,((r-b)/Math.max(r+g+b,.001)-.025)/.255));
  return x*x*(3-2*x);
}
export function cinematicLuminance(luminance,contrast=1.12) {
  const y=Math.max(0,luminance);
  // A monotonic contrast curve preserves true black and avoids negative shadows.
  return .22*Math.pow(y/.22,Math.max(1,Math.min(1.2,contrast)));
}
export const PALETTE_GLSL = `
  float warmWeight(vec3 c){
    return smoothstep(.025,.28,(c.r-c.b)/max(c.r+c.g+c.b,.001));
  }
  vec3 paletteGrade(vec3 color,float saturation,float contrast,float cool,float warm,float lift,float gain){
    vec3 c=max(color,vec3(0.));
    float y=dot(c,vec3(.2126,.7152,.0722));
    float amber=warmWeight(c);
    float chroma=mix(${PALETTE.neutralSaturation},${PALETTE.warmSaturation},amber)*saturation;
    c=mix(vec3(y),c,chroma);
    float shaped=.22*pow(max(y/.22,0.),clamp(contrast,1.,1.2));
    c*=shaped/max(y,.00001);
    float shadow=(1.-smoothstep(.025,.32,y))*smoothstep(0.,.035,y);
    float mid=smoothstep(.025,.16,y)*(1.-smoothstep(.45,1.1,y));
    // Keep black black: detail support fades to zero near the signal floor.
    c+=vec3(lift*.38*shadow+gain*.58*mid);
    float coldMask=(1.-amber)*smoothstep(${PALETTE.shadowFloor},.065,y)*(1.-smoothstep(.38,.85,y));
    c*=vec3(1.-cool*.16*coldMask,1.+cool*.025*coldMask,1.+cool*.14*coldMask);
    float glow=amber*smoothstep(.12,.9,y);
    c*=vec3(1.+warm*.12*glow,1.+warm*.025*glow,1.-warm*.10*glow);
    return max(c,vec3(0.));
  }
`;
