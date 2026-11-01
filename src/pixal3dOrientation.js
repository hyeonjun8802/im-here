// Pixal3D's visible front is opposite the legacy activity planner's authored
// route/station forward axis. Keep this tiny module free of browser side effects
// so direction math can also be verified in Node.
export const PIXAL3D_FORWARD_YAW=Math.PI;
export const pixal3dFacingYaw=(dx,dz)=>Math.atan2(dx,dz)+PIXAL3D_FORWARD_YAW;
