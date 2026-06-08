import './AtomLogo.css';

/**
 * Logo de Omega OSINT: un átomo con núcleo y tres órbitas de electrones.
 *
 * Props:
 *   - size:     tamaño en px (ancho/alto)
 *   - animated: cuando es true, las órbitas giran (efecto cuántico)
 *   - className: clases extra para el <svg>
 *
 * El color se hereda de `currentColor`, así que basta con poner `color`
 * en el contenedor para teñir todo el logo.
 */
export default function AtomLogo({ size = 42, animated = true, className = '' }) {
  return (
    <svg
      className={`atom-logo ${animated ? 'atom-animated' : ''} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      role="img"
      aria-label="Omega OSINT"
    >
      <g className="atom-orbit atom-orbit-1">
        <ellipse cx="12" cy="12" rx="10" ry="4.2" />
        <circle className="atom-electron" cx="22" cy="12" r="1.25" fill="currentColor" stroke="none" />
      </g>
      <g className="atom-orbit atom-orbit-2" transform="rotate(60 12 12)">
        <ellipse cx="12" cy="12" rx="10" ry="4.2" />
        <circle className="atom-electron" cx="22" cy="12" r="1.25" fill="currentColor" stroke="none" />
      </g>
      <g className="atom-orbit atom-orbit-3" transform="rotate(120 12 12)">
        <ellipse cx="12" cy="12" rx="10" ry="4.2" />
        <circle className="atom-electron" cx="22" cy="12" r="1.25" fill="currentColor" stroke="none" />
      </g>
      <circle className="atom-nucleus" cx="12" cy="12" r="2.1" fill="currentColor" stroke="none" />
    </svg>
  );
}
