// All articles (browser-safe: no fs).  Order = order in the selector.
import { spec as H031 } from "./H031/model.js";
import { spec as H114 } from "./H114/model.js";
import { spec as V006_2 } from "./V006-2/model.js";
import { spec as V004 } from "./V004/model.js";
import { spec as VA012 } from "./VA012/model.js";
import { spec as H005 } from "./H005/model.js";
import { spec as H050 } from "./H050/model.js";
import { spec as H027_1 } from "./H027-1/model.js";
import { spec as H112 } from "./H112/model.js";
import { spec as H028 } from "./H028/model.js";
import { spec as H030_2 } from "./H030-2/model.js";
import { spec as H043 } from "./H043/model.js";
import { spec as H038 } from "./H038/model.js";
import { spec as H098 } from "./H098/model.js";
import { spec as YOZH } from "./YOZH/model.js";
import { spec as TUMBA_KUH } from "./TUMBA_KUH/model.js";
import { spec as VA008 } from "./VA008/model.js";
import { spec as KONSOL } from "./KONSOL/model.js";
import { spec as H091 } from "./H091/model.js";
import { spec as A0118 } from "./0118/model.js";
import { spec as A0159 } from "./0159/model.js";
import { spec as A0090 } from "./0090/model.js";
import { spec as A0011 } from "./0011/model.js";
// порядок: Ножки и опоры → Подстолья → Подстолья Круглые → Рейлы → Вешалки → Под раковины → Другое
export const ARTICLES = [H031, H005, H050, H027_1, H112, H028, H030_2, H043, H038, A0090, A0011, H114, H098, YOZH, KONSOL, H091, A0118, A0159, V006_2, V004, VA012, VA008, TUMBA_KUH];
export const CATEGORIES = [...new Set(ARTICLES.map((s) => s.category))];
export const BY_ID = Object.fromEntries(ARTICLES.map((s) => [s.id, s]));
/** serialisable description of all articles for the UI (no functions) */
export const meta = () => ARTICLES.map((s) => ({ id: s.id, type: s.type, category: s.category, name: s.name, about: s.about, cardSubtitle: s.cardSubtitle, cardTooltip: s.cardTooltip, controls: s.controls, defaults: s.normalize({}).p }));
