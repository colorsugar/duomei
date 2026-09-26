export function bindUI({ onNight, onTeleport }) {
  const teleports = [
    { id: 'plaza', label: '广场', pos: [0, 0, 22], yaw: 0, pitch: -0.12 },
    { id: 'floor1', label: '一层', pos: [0, 3.05, 2], yaw: 0, pitch: -0.02 },
    { id: 'south', label: '二层·南', pos: [0, 7.35, 9.2], yaw: Math.PI, pitch: -0.05 },
    { id: 'east', label: '二层·东', pos: [9.2, 7.35, 0], yaw: -Math.PI / 2, pitch: -0.04 },
  ];

  const bar = document.getElementById('teleport-bar');
  for (const t of teleports) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = t.label;
    b.dataset.id = t.id;
    b.onclick = () => onTeleport(t);
    bar.appendChild(b);
  }

  const nightBtn = document.getElementById('night-toggle');
  let night = true;
  nightBtn.onclick = () => {
    night = !night;
    nightBtn.setAttribute('aria-pressed', String(night));
    nightBtn.textContent = night ? '夜景' : '日景';
    document.documentElement.dataset.theme = night ? 'night' : 'day';
    onNight(night);
  };
  nightBtn.setAttribute('aria-pressed', 'true');

  return { teleports, getNight: () => night };
}
