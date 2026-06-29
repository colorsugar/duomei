export function FooterIllustration() {
  return (
    <section className="footer-illustration" aria-label="多美数字档案馆吉祥物插画">
      <div className="footer-illustration-copy">
        <p>旅の途中で、また記録する。</p>
        <span>在旅途中，再次记录。</span>
      </div>

      <svg
        className="tami-mascot-svg"
        viewBox="0 0 420 270"
        role="img"
        aria-labelledby="footer-illustration-title"
      >
        <title id="footer-illustration-title">坐在旅途中的多美，身边有相机、背包、桂林山、大阪通天阁和阪堺电车。</title>
        <g className="sky-layer">
          <path className="moon" d="M331 54c19 10 21 38 2 51 25-7 36-36 20-57" />
          <path className="bird bird-one" d="M102 73c6-7 12-7 18 0M124 73c6-7 12-7 18 0" />
          <path className="bird bird-two" d="M292 83c5-5 10-5 15 0M310 83c5-5 10-5 15 0" />
          <path className="star star-one" d="M190 41l4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1z" />
          <path className="star star-two" d="M364 101l3 6 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1z" />
          <circle className="dot-star" cx="256" cy="58" r="2.5" />
          <circle className="dot-star delay" cx="83" cy="106" r="2" />
        </g>

        <g className="ground-layer">
          <path d="M34 218c63 5 126 6 189 4 59-2 110 3 159-3" />
          <path className="soft-shadow" d="M104 225c41 12 125 12 165 0" />
        </g>

        <g className="left-memory">
          <path className="guilin-fill" d="M41 218c14-29 27-34 42-10 12-22 26-29 43 10z" />
          <path d="M41 218c14-29 27-34 42-10 12-22 26-29 43 10" />
          <path d="M128 218V92M116 218h25M121 196h16M119 179h20M114 160h30M121 145h16M118 130h22M124 92h8M126 92v-19" />
          <path d="M118 130l22 30M140 130l-22 30M118 160l22 36M140 160l-22 36" />
        </g>

        <g className="tami-character">
          <g className="body-sway">
            <path className="hoodie-fill" d="M201 100c24-2 43 15 46 46l9 58h-86l5-56c2-25 9-44 26-48z" />
            <path d="M184 118c16-23 48-23 61 3 7 15 8 37 11 83M176 204l5-61c2-23 10-38 25-42" />
            <path className="pants-fill" d="M160 177c-26 19-36 34-28 47h95c-3-19-14-36-32-51z" />
            <path d="M174 164c-18 20-39 30-43 55M191 171c20 16 31 31 35 50M143 222h84" />
            <path d="M139 218c-18 2-31 7-36 16 16 5 33 4 48-2M205 220c-16 3-27 8-32 17 17 4 34 3 49-5" />
            <path className="skin-fill" d="M211 63c19 0 31 14 27 32-4 16-19 24-34 18-14-5-20-20-15-34 4-10 11-16 22-16z" />
            <path d="M190 91c-3-17 7-30 23-31 19-1 30 12 27 30-3 17-17 27-33 23" />
            <path className="hair-fill" d="M190 80c9-25 48-27 56 4-10-6-17-5-25 0-9-6-18-7-31-4z" />
            <path d="M190 80c9-25 48-27 56 4M199 71c-5 8-7 15-6 23M213 66c-4 7-5 13-4 20M229 67c5 6 8 13 8 22" />
            <path d="M238 92c7 2 7 12-1 14M206 92c3 1 6 1 9 0M217 104c5 3 11 3 16-1" />
            <path d="M179 140c-11 11-24 20-35 29M246 139c13 10 25 20 36 32" />
            <g className="camera-float">
              <rect className="camera-fill" x="143" y="151" width="42" height="27" rx="7" />
              <circle cx="164" cy="165" r="10" />
              <path d="M151 151l5-8h17l5 8M185 160h8M156 165h16" />
            </g>
          </g>
        </g>

        <g className="right-travel">
          <g className="backpack-float">
            <path className="bag-fill" d="M276 138c25 0 39 14 39 41v48h-79v-49c0-26 14-40 40-40z" />
            <path d="M236 227v-49c0-26 14-40 40-40s39 14 39 41v48M256 139c1-18 39-18 40 0" />
            <path d="M247 168h57M250 194h51M258 209h35M238 176c-10 5-13 21-6 31M315 176c10 5 13 21 6 31" />
          </g>
          <g className="tram">
            <rect className="tram-fill" x="324" y="161" width="60" height="39" rx="9" />
            <path d="M324 172h60M333 181h10M349 181h10M365 181h10M331 200h48M340 161l20-19 20 19M360 142v-16M343 207a6 6 0 1012 0M365 207a6 6 0 1012 0" />
          </g>
          <g className="tools">
            <path className="notebook-fill" d="M222 233c21-9 37-7 49 7-18 2-34 5-49 13z" />
            <path d="M222 233c21-9 37-7 49 7-18 2-34 5-49 13zM246 231l-3 19M232 240l18-4M227 247l19-5" />
            <path d="M280 245l37-8M282 250l36-8" />
            <circle className="lens-fill" cx="323" cy="237" r="12" />
            <path d="M313 237a10 10 0 1020 0 10 10 0 10-20 0M318 237h10" />
          </g>
        </g>
      </svg>
    </section>
  );
}
