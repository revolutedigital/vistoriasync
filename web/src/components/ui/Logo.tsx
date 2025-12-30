interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className = '', showText = true, size = 'md' }: LogoProps) {
  const sizes = {
    sm: { icon: 32, text: 16 },
    md: { icon: 40, text: 20 },
    lg: { icon: 48, text: 24 },
  };

  const { icon, text } = sizes[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Clipboard base */}
        <rect x="8" y="8" width="32" height="36" rx="4" fill="#3B82F6" />
        {/* Clipboard clip */}
        <rect x="15" y="4" width="18" height="8" rx="2" fill="#1E40AF" />
        {/* Paper lines */}
        <rect x="14" y="20" width="20" height="3" rx="1.5" fill="white" opacity="0.7" />
        <rect x="14" y="27" width="14" height="3" rx="1.5" fill="white" opacity="0.7" />
        <rect x="14" y="34" width="17" height="3" rx="1.5" fill="white" opacity="0.7" />
        {/* Checkmark circle */}
        <circle cx="34" cy="38" r="12" fill="#10B981" />
        {/* Checkmark */}
        <path
          d="M28 38L32 42L40 34"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showText && (
        <span
          className="font-bold text-gray-900"
          style={{ fontSize: text }}
        >
          Vistoria<span className="text-primary-600">Sync</span>
        </span>
      )}
    </div>
  );
}

export function LogoIcon({ className = '', size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Clipboard base */}
      <rect x="8" y="8" width="32" height="36" rx="4" fill="#3B82F6" />
      {/* Clipboard clip */}
      <rect x="15" y="4" width="18" height="8" rx="2" fill="#1E40AF" />
      {/* Paper lines */}
      <rect x="14" y="20" width="20" height="3" rx="1.5" fill="white" opacity="0.7" />
      <rect x="14" y="27" width="14" height="3" rx="1.5" fill="white" opacity="0.7" />
      <rect x="14" y="34" width="17" height="3" rx="1.5" fill="white" opacity="0.7" />
      {/* Checkmark circle */}
      <circle cx="34" cy="38" r="12" fill="#10B981" />
      {/* Checkmark */}
      <path
        d="M28 38L32 42L40 34"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
