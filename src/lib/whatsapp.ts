// Sin API de WhatsApp: solo ligas wa.me que abren la conversación.

/** «+52 998 214 7730» → «https://wa.me/529982147730». Un número de 10 dígitos se toma como de México. */
export function ligaWhatsApp(numero: string, texto?: string): string | null {
  let d = numero.replace(/\D/g, "");
  if (d.length === 10) d = "52" + d;
  if (d.length < 11 || d.length > 15) return null;
  return `https://wa.me/${d}` + (texto ? `?text=${encodeURIComponent(texto)}` : "");
}
