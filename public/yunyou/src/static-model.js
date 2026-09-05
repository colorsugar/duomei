// Imported landmarks have no animated transforms. Remove dead exporter nodes
// after batching, then retain their local matrices instead of recomposing them
// on every rendered frame. World matrices remain responsive to parent changes.
export function compactStaticModel(root) {
  const nodes=[];root.traverse(o=>nodes.push(o));
  if(nodes.some(o=>o.isSkinnedMesh||o.isBone))return {removed:0,frozen:0};
  let removed=0;
  for(const o of nodes.reverse()){
    if(o!==root&&!o.isMesh&&!o.isLight&&!o.isCamera&&!o.isLOD&&!o.children.length){o.removeFromParent();removed++;}
  }
  root.updateMatrixWorld(true);
  let frozen=0;root.traverse(o=>{o.updateMatrix();o.matrixAutoUpdate=false;frozen++;});
  return {removed,frozen};
}
