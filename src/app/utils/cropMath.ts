/** Dimensiones del recuadro renderizado que hace que la imagen cubra el contenedor a zoom=1 (comportamiento "cover"). */
export function getCoverDimensions(Cw: number, Ch: number, Iw: number, Ih: number): { Rw: number; Rh: number } {
  const C_AR = Cw / Ch;
  const I_AR = Iw / Ih;

  let Rw = Cw;
  let Rh = Ch;

  if (I_AR > C_AR) {
    Rw = Ch * I_AR;
  } else {
    Rh = Cw / I_AR;
  }

  return { Rw, Rh };
}

/** Zoom mínimo al que la imagen completa entra en el contenedor (comportamiento "contain"). */
export function getMinZoom(Cw: number, Ch: number, Iw: number, Ih: number): number {
  const C_AR = Cw / Ch;
  const I_AR = Iw / Ih;
  return Math.min(C_AR, I_AR) / Math.max(C_AR, I_AR);
}
