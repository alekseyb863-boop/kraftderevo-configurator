// Dimension descriptors (3D points) used by the article models.  Pure data, no fs / no replicad.
/** dim(p0,p1,text,off) helper for the table/leg style (offset vector), or the full form dimAB */
export const dim = (p0, p1, text, off) => ({ s0: p0, s1: p1, a: p0.map((v, i) => v + off[i]), b: p1.map((v, i) => v + off[i]), text });
/** s0,s1 = points on the part; a,b = ends of the dimension line; shift = label shift along the line (px) */
/** out = -1 / +1: if the label does not fit between the arrows, put it beyond the start (a) / end (b) of the dimension line (chains of short dimensions) */
/** lab (необязательно) = { rot: [x,y,z] | "h", push: [[x,y,z], px] } — поворот подписи (вдоль проекции 3D-направления rot или горизонтально "h")
 *  и смещение центра подписи на px вдоль проекции 3D-направления (подпись «поперёк» линии / сбоку от неё) */
export const dimAB = (s0, s1, a, b, text, shift = 0, out = 0, lab = null) => ({ s0, s1, a, b, text, shift, out, lab });
