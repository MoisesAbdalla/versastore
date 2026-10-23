import { useEffect, useState } from "react";

// Contagem regressiva até uma data-alvo (feature 019 / drop CINDER 01).
// Sem dependência externa: recalcula o restante a cada segundo e expõe
// dias/horas/minutos/segundos já formatados, mais o flag `isLive` que vira
// true quando o alvo é atingido (o contador NÃO reinicia — escassez real).

function split(remainingMs) {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

export function useCountdown(target) {
  const targetMs = target instanceof Date ? target.getTime() : new Date(target).getTime();

  const [remaining, setRemaining] = useState(() => targetMs - Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(targetMs - Date.now());
    }, 1000);

    return () => clearInterval(id);
  }, [targetMs]);

  const parts = split(remaining);

  return {
    ...parts,
    isLive: remaining <= 0,
  };
}
