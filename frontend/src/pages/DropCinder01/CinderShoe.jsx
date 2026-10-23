// Ilustração vetorial do CINDER 01 (feature 019) — perfil lateral do tênis:
// cabedal preto, faixa creme diagonal, abas laranja e entressola vulcanizada
// creme com ripagem. Puramente decorativa; o alt vive no elemento pai.
function CinderShoe() {
  return (
    <svg
      viewBox="0 0 900 470"
      role="img"
      aria-label="Tênis CINDER 01: cabedal preto com faixa creme e detalhes laranja sobre entressola vulcanizada creme"
    >
      <defs>
        <linearGradient id="cinderUpper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#232327" />
          <stop offset="1" stopColor="#0c0c0e" />
        </linearGradient>
        <linearGradient id="cinderSole" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#efe9db" />
          <stop offset="1" stopColor="#cfc7b4" />
        </linearGradient>
        <clipPath id="cinderSoleClip">
          <path d="M70 372 C70 332 150 322 250 322 L720 322 C812 322 852 340 852 372 C852 404 806 420 726 420 L188 420 C112 420 70 406 70 372 Z" />
        </clipPath>
      </defs>

      <ellipse cx="460" cy="440" rx="360" ry="18" fill="#000" opacity="0.45" />

      {/* entressola vulcanizada */}
      <path
        d="M70 372 C70 332 150 322 250 322 L720 322 C812 322 852 340 852 372 C852 404 806 420 726 420 L188 420 C112 420 70 406 70 372 Z"
        fill="url(#cinderSole)"
      />
      <g clipPath="url(#cinderSoleClip)" stroke="#b9b09b" strokeWidth="3" opacity="0.8">
        {Array.from({ length: 24 }, (_, i) => 120 + i * 30).map((x) => (
          <path key={x} d={`M${x} 322 V420`} />
        ))}
      </g>
      <path
        d="M70 372 C70 332 150 322 250 322 L720 322 C812 322 852 340 852 372"
        fill="none"
        stroke="#fbf7ec"
        strokeWidth="3"
        opacity="0.8"
      />

      {/* cabedal preto */}
      <path
        d="M150 326 C150 250 180 210 250 196 C300 186 330 176 360 150 C382 132 404 128 430 138 L470 156 C486 150 520 150 560 168 L690 214 C760 238 800 276 806 322 Z"
        fill="url(#cinderUpper)"
      />
      <path d="M690 218 C742 240 782 276 792 320" fill="none" stroke="#000" strokeWidth="2" opacity="0.5" />
      <path d="M160 320 L800 320" stroke="#000" strokeWidth="2" opacity="0.35" />

      {/* faixa creme diagonal */}
      <path d="M470 300 L556 196 L612 214 L520 322 Z" fill="#e9e3d4" />
      <g stroke="#cfc6ae" strokeWidth="2" opacity="0.6">
        <path d="M494 300 L566 214" />
        <path d="M512 302 L582 214" />
      </g>

      {/* gola / abertura do calcanhar */}
      <path
        d="M250 196 C300 186 328 178 356 156 C338 196 322 214 300 226 C280 236 262 232 250 220 Z"
        fill="#161619"
      />
      <g stroke="#0a0a0a" strokeWidth="9" strokeLinecap="round" opacity="0.9">
        <path d="M398 168 L452 196" />
        <path d="M392 188 L446 216" />
        <path d="M388 210 L440 236" />
      </g>
      <path d="M430 138 L470 156 L455 250 L418 236 Z" fill="#1c1c20" opacity="0.8" />

      {/* aba laranja do calcanhar */}
      <g transform="rotate(-16 200 176)">
        <rect x="150" y="150" width="70" height="30" rx="6" fill="#ff4d16" />
        <rect x="150" y="150" width="70" height="30" rx="6" fill="none" stroke="#c9370d" strokeWidth="1.5" />
      </g>
      {/* aba laranja da língua */}
      <g transform="rotate(-30 470 132)">
        <rect x="452" y="112" width="52" height="26" rx="6" fill="#ff4d16" />
      </g>

      {/* marca lateral */}
      <path d="M300 258 l20 -22 l6 6 l-20 22 Z M322 236 l18 20 l-6 6 l-18 -20 Z" fill="#e9e3d4" opacity="0.9" />
    </svg>
  );
}

export default CinderShoe;
