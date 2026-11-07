// The ToothTwin mark: a molar crown in a soft gradient.
const Logo = ({ className = "h-8 w-8" }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden>
    <defs>
      <linearGradient id="tt-logo" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#13BCFB" />
        <stop offset="1" stopColor="#0A74DA" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="9" fill="url(#tt-logo)" />
    <path
      d="M10.2 8.6c1.9-.9 3.6-.2 5.8.5 2.2-.7 3.9-1.4 5.8-.5 2.4 1.2 2.7 4.3 1.9 7.2-.6 2.3-1.1 4.5-1.6 6.6-.3 1.3-1.9 1.4-2.3.2l-1.3-3.9c-.5-1.4-2.5-1.4-3 0l-1.3 3.9c-.4 1.2-2 1.1-2.3-.2-.5-2.1-1-4.3-1.6-6.6-.8-2.9-.5-6 1.9-7.2Z"
      fill="#fff"
    />
  </svg>
);

export default Logo;
