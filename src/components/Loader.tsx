import { useEffect, useState } from "react";

interface LoaderProps {
  visible: boolean;
  mensaje?: string;
}

export default function Loader({ visible, mensaje = "Cargando…" }: LoaderProps) {
  const [render, setRender] = useState(visible);
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    if (visible) {
      setRender(true);
      setSaliendo(false);
      return;
    }

    if (render) {
      setSaliendo(true);
      const timeout = setTimeout(() => {
        setRender(false);
        setSaliendo(false);
      }, 350);
      return () => clearTimeout(timeout);
    }
  }, [visible, render]);

  if (!render) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-black/75 backdrop-blur-2xl transition-opacity duration-300 ${
        saliendo ? "opacity-0" : "opacity-100"
      }`}
    >
      <style>{`
        @keyframes torreAntaresLoaderBreathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        @keyframes torreAntaresLoaderChase {
          0% { fill: rgba(255,255,255,0.22); filter: drop-shadow(0 0 0 rgba(255,255,255,0)); }
          18% { fill: #ffffff; filter: drop-shadow(0 0 9px rgba(255,255,255,0.9)); }
          55% { fill: rgba(255,255,255,0.22); filter: drop-shadow(0 0 0 rgba(255,255,255,0)); }
          100% { fill: rgba(255,255,255,0.22); filter: drop-shadow(0 0 0 rgba(255,255,255,0)); }
        }
        .torre-antares-loader-mark { animation: torreAntaresLoaderBreathe 1.8s ease-in-out infinite; }
        .torre-antares-loader-arm { fill: rgba(255,255,255,0.22); }
        .torre-antares-loader-arm-left { animation: torreAntaresLoaderChase 1.8s ease-in-out infinite; animation-delay: 0s; }
        .torre-antares-loader-arm-right { animation: torreAntaresLoaderChase 1.8s ease-in-out infinite; animation-delay: 0.3s; }
        .torre-antares-loader-arm-bottom { animation: torreAntaresLoaderChase 1.8s ease-in-out infinite; animation-delay: 0.6s; }
      `}</style>

      <div className="torre-antares-loader-mark h-24 w-24">
        <svg viewBox="0 0 1254 1254" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
          <g transform="translate(0,1254) scale(1,-1)">
            <path
              className="torre-antares-loader-arm torre-antares-loader-arm-left"
              d="M597.00,839.60 L597.00,623.20 L590.30,618.90 C571.40,606.90 432.00,513.80 386.50,483.00 C357.90,463.60 319.40,437.60 301.00,425.20 C282.60,412.80 262.60,399.30 256.60,395.20 L245.70,387.80 L200.40,433.10 L155.10,478.40 L171.60,487.20 C215.40,510.60 263.40,543.10 302.00,575.40 C318.50,589.20 354.50,624.60 367.10,639.50 C393.60,670.70 412.70,699.30 429.30,732.50 C445.70,765.40 455.00,790.80 464.00,827.20 C480.10,892.30 482.10,973.40 469.40,1051.80 L468.70,1056.00 L532.90,1056.00 L597.00,1056.00 L597.00,839.60 Z"
            />
            <path
              className="torre-antares-loader-arm torre-antares-loader-arm-right"
              d="M785.60,1051.30 C780.50,1015.60 779.00,997.50 778.30,962.50 C777.50,919.90 780.00,885.00 786.10,853.30 C809.90,728.50 876.80,629.60 996.00,543.00 C1023.50,522.90 1066.80,496.10 1091.00,484.00 C1095.70,481.70 1099.70,479.60 1100.00,479.30 C1100.50,478.80 1010.80,389.00 1009.70,389.00 C1009.00,389.00 993.10,399.60 878.20,477.40 C788.30,538.20 678.40,611.10 661.30,621.30 L658.00,623.20 L658.00,839.60 L658.00,1056.00 L722.10,1056.00 L786.30,1056.00 L785.60,1051.30 Z"
            />
            <path
              className="torre-antares-loader-arm torre-antares-loader-arm-bottom"
              d="M650.30,559.30 C727.20,508.20 842.00,428.30 902.50,383.70 C939.00,356.80 968.00,334.60 968.00,333.50 C968.00,332.90 949.10,313.60 926.00,290.50 L883.90,248.50 L881.70,251.50 C864.90,274.20 830.50,307.90 802.60,328.70 C757.90,362.10 712.40,382.10 664.00,389.70 C647.70,392.20 610.20,392.20 593.50,389.60 C563.90,385.10 536.60,376.20 507.00,361.40 C462.30,339.00 419.70,304.90 382.30,261.30 C376.50,254.50 371.50,249.00 371.10,249.00 C370.30,249.00 287.00,332.30 287.00,333.20 C287.00,334.60 365.80,392.60 425.50,435.10 C497.20,486.20 624.50,573.80 627.30,573.90 C627.80,574.00 638.10,567.40 650.30,559.30 Z"
            />
          </g>
        </svg>
      </div>

      <p className="text-xs tracking-wide text-gray-300">{mensaje}</p>
    </div>
  );
}