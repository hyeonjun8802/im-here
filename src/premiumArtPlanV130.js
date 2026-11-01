/** GPU budget and scene scope for AFTERDAY's single original rooftop. */
export function generateV130ArtPlan(mobile=false){
 return Object.freeze({
   primaryRoofCount:1,
   foliageInstances:mobile?930:2200,
   rooftopShrubClusters:mobile?14:26,
   hangingVines:mobile?32:54,
   grimeFragments:mobile?115:285,
   rainRunoffStreams:mobile?12:20,
   heroRoofHalfWidth:23,
   timeAndSurvivalLogicTouched:false,
   directImageBillboards:0
 });
}
