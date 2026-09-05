import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CinematicVideo } from './CinematicVideo';

const scenes = [
  {id:'zaobao', scene:2, title:'早报', en:'A new day', shot:'dolly'},
  {id:'notes', scene:4, title:'小记', en:'Life, in frames', shot:'track'},
  {id:'kuaihuo', scene:3, title:'快活', en:'A little wonder', shot:'iris'},
  {id:'guyu', scene:4, title:'故语', en:'Between the pages', shot:'pullback'},
  {id:'yunyou', scene:2, title:'云游', en:'Beyond the everyday', shot:'panorama'},
  {id:'color', scene:5, title:'颜色', en:'In living colour', shot:'orbit'},
  {id:'weiyan', scene:3, title:'微言', en:'Words in the wild', shot:'rise'},
  {id:'skills', scene:5, title:'Skill', en:'Make something happen', shot:'focus'},
] as const;

export function ChapterScenes({paused}: {paused: boolean}) {
  const [targets, setTargets] = useState<({node: Element} & typeof scenes[number])[]>([]);
  useEffect(() => {
    const found = scenes.flatMap(scene => {
      const section = document.getElementById(scene.id);
      const node = section?.querySelector('.home-section-hold-stage, .poetry-portal-stage');
      if (!node || !section) return [];
      section.dataset.cameraShot = scene.shot;
      return [{...scene, node}];
    });
    setTargets(found);
    return () => found.forEach(({id}) => { delete document.getElementById(id)?.dataset.cameraShot; });
  }, []);
  return <>{targets.map(({id, node, scene, title, en}) => createPortal(
    <div className="cinema-chapter-scene">
      <div className="cinema-chapter-camera"><CinematicVideo scene={scene} paused={paused} /></div>
      <div className="cinema-chapter-vignette" />
      <div className="cinema-establishing-title" aria-hidden="true"><span>{en}</span><strong>{title}</strong><small>向下探索 ↓</small></div>
    </div>, node, id))}</>;
}
