export function PlaceholderCover({ location }: { location: string; title?: string }) {
  return (
    <div className="note-cover-placeholder">
      <svg viewBox="0 0 420 260" aria-hidden="true">
        <path className="cover-moon" d="M328 43c17 10 18 34 1 47 23-6 33-31 18-51" />
        <path className="cover-bird" d="M88 58c6-6 12-6 18 0M111 58c6-6 12-6 18 0" />
        <path className="cover-hill" d="M32 205c35-76 70-80 99 0 32-51 63-56 91 0z" />
        <path className="cover-tower" d="M244 205V74M232 205h25M236 178h17M232 153h25M236 128h17M239 74h9M242 74V55" />
        <path className="cover-tram" d="M296 157h75c9 0 16 7 16 16v28h-107v-28c0-9 7-16 16-16zM284 174h101M301 184h12M323 184h12M345 184h12M304 207a6 6 0 1012 0M354 207a6 6 0 1012 0" />
      </svg>
      <div>
        <span>{location}</span>
      </div>
    </div>
  );
}
