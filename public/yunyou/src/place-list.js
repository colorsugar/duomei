export function installPlaceList({landmarks:LANDMARKS,onSelect,distance}) {
const kindMark = { hill: '山', pagoda: '塔', building: '阁', bridge: '桥', street: '路', river: '舟', lake: '湖', poi: '点', park: '园' };
const list = document.getElementById('list');
for (const lm of LANDMARKS) {
  const li = document.createElement('li');
  li.dataset.id = lm.id; li.tabIndex = 0; li.setAttribute('role', 'button'); li.setAttribute('aria-label', lm.name);
  li.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(lm); } });
  const dist = distance(lm);
  li.innerHTML = `<span class="k">${kindMark[lm.kind]}</span><span>${lm.name}</span><span class="m">${dist < 950 ? Math.round(dist) + ' m' : (dist / 1000).toFixed(1) + ' km'}</span>`;
  li.addEventListener('click', () => onSelect(lm));
  list.appendChild(li);
}
const placeSearch=document.getElementById('place-search');
placeSearch.addEventListener('input',()=>{list.scrollTop=0;const q=placeSearch.value.trim().toLowerCase();let count=0;for(const li of list.children){const lm=LANDMARKS.find(l=>l.id===li.dataset.id);li.hidden=!!q&&!`${lm.name} ${lm.desc}`.toLowerCase().includes(q);if(!li.hidden)count++;}document.getElementById('place-count').textContent=count?`${count} 个地点`:'没有找到，换个名称试试';});
document.getElementById('place-count').textContent=LANDMARKS.length+' 个地点';
return list;
}
