const poem = "奈何他西风肆虐，余唯恋花枝春野";

export function DreamCard() {
  const driftingFlowers = Array.from({ length: 9 }, (_, index) => <i key={index} />);

  return (
    <div className="dream-card">
      <strong className="dream-name">多美</strong>
      <span className="dream-tami">TAMI</span>
      <div className="dream-poem-box">
        <span className="dream-poem-text">{poem}</span>
        <svg className="poem-wind-lines" viewBox="0 0 560 92" preserveAspectRatio="none" aria-hidden="true">
          <path d="M-80 36 C8 4 86 64 174 28 S338 14 438 40 S590 54 654 18" />
          <path d="M-120 62 C-20 34 58 80 146 54 S316 46 418 68 S572 84 646 44" />
          <path d="M-46 20 C24 8 72 20 120 18" />
          <path d="M322 26 C372 12 420 20 464 14" />
        </svg>
        <span className="poem-flower-field" aria-hidden="true">{driftingFlowers}</span>
      </div>
    </div>
  );
}
