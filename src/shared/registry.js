// All articles (browser-safe: no fs).  Order = order in the selector.
import { spec as H031 } from "./H031/model.js";
import { spec as H005 } from "./H005/model.js";
import { spec as H050 } from "./H050/model.js";
import { spec as H027_1 } from "./H027-1/model.js";
import { spec as H112 } from "./H112/model.js";
import { spec as H028 } from "./H028/model.js";
import { spec as H030_2 } from "./H030-2/model.js";
import { spec as H043 } from "./H043/model.js";
import { spec as H038 } from "./H038/model.js";
import { spec as H098 } from "./H098/model.js";
import { spec as A0090 } from "./0090/model.js";
import { spec as A0011 } from "./0011/model.js";
export const ARTICLES = [H031, H005, H050, H027_1, H112, H028, H030_2, H043, H038, H098, A0090, A0011];
export const BY_ID = Object.fromEntries(ARTICLES.map((s) => [s.id, s]));
/** serialisable description of all articles for the UI (no functions) */
export const meta = () => ARTICLES.map((s) => ({ id: s.id, type: s.type, name: s.name, about: s.about, controls: s.controls, defaults: s.normalize({}).p }));
