export function bindUI({ onNight, onTeleport }) {
  const pitch = -0.12;
  const teleports = [
    { id: 'plaza', label: '广场', pos: [0, 0, 22], yaw: 0, pitch: -0.12 },
    { id: 'floor1', label: '一层', pos: [-0.5, 3.05, 0.8], yaw: 1.35, pitch: -0.06 },
    { id: 'south', label: '二层·南', pos: [0, 6.9, 8.9], yaw: Math.PI, pitch },
    { id: 'east', label: '二层·东', pos: [8.9, 6.9, 0], yaw: -Math.PI / 2, pitch },
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
