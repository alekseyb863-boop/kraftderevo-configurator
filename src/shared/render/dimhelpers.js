// Dimension descriptors (3D points) used by the article models.  Pure data, no fs / no replicad.
/** dim(p0,p1,text,off) helper for the table/leg style (offset vector), or the full form dimAB */
export const dim = (p0, p1, text, off) => ({ s0: p0, s1: p1, a: p0.map((v, i) => v + off[i]), b: p1.map((v, i) => v + off[i]), text });
/** s0,s1 = points on the part; a,b = ends of the dimension line; shift = label shift along the line (px) */
/** out = -1 / +1: if the label does not fit between the arrows, put it beyond the start (a) / end (b) of the dimension line (chains of short dimensions) */
export const dimAB = (s0, s1, a, b, text, shift = 0, out = 0) => ({ s0, s1, a, b, text, shift, out });
