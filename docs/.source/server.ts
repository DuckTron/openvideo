// @ts-nocheck
import * as __fd_glob_30 from "../content/docs/engine-pixi/transitions.mdx?collection=docs";
import * as __fd_glob_29 from "../content/docs/engine-pixi/tracks.mdx?collection=docs";
import * as __fd_glob_28 from "../content/docs/engine-pixi/serialization.mdx?collection=docs";
import * as __fd_glob_27 from "../content/docs/engine-pixi/rendering.mdx?collection=docs";
import * as __fd_glob_26 from "../content/docs/engine-pixi/quickstart.mdx?collection=docs";
import * as __fd_glob_25 from "../content/docs/engine-pixi/installation.mdx?collection=docs";
import * as __fd_glob_24 from "../content/docs/engine-pixi/index.mdx?collection=docs";
import * as __fd_glob_23 from "../content/docs/engine-pixi/events.mdx?collection=docs";
import * as __fd_glob_22 from "../content/docs/engine-pixi/effects.mdx?collection=docs";
import * as __fd_glob_21 from "../content/docs/engine-pixi/clips.mdx?collection=docs";
import * as __fd_glob_20 from "../content/docs/engine-pixi/chroma-key.mdx?collection=docs";
import * as __fd_glob_19 from "../content/docs/engine-pixi/basic-usage.mdx?collection=docs";
import * as __fd_glob_18 from "../content/docs/engine-pixi/api-reference.mdx?collection=docs";
import * as __fd_glob_17 from "../content/docs/engine-pixi/animations.mdx?collection=docs";
import * as __fd_glob_16 from "../content/docs/core/transitions.mdx?collection=docs";
import * as __fd_glob_15 from "../content/docs/core/tracks.mdx?collection=docs";
import * as __fd_glob_14 from "../content/docs/core/serialization.mdx?collection=docs";
import * as __fd_glob_13 from "../content/docs/core/rendering.mdx?collection=docs";
import * as __fd_glob_12 from "../content/docs/core/installation.mdx?collection=docs";
import * as __fd_glob_11 from "../content/docs/core/index.mdx?collection=docs";
import * as __fd_glob_10 from "../content/docs/core/events.mdx?collection=docs";
import * as __fd_glob_9 from "../content/docs/core/effects.mdx?collection=docs";
import * as __fd_glob_8 from "../content/docs/core/commands.mdx?collection=docs";
import * as __fd_glob_7 from "../content/docs/core/clips.mdx?collection=docs";
import * as __fd_glob_6 from "../content/docs/core/chroma-key.mdx?collection=docs";
import * as __fd_glob_5 from "../content/docs/core/changelog.mdx?collection=docs";
import * as __fd_glob_4 from "../content/docs/core/basic-usage.mdx?collection=docs";
import * as __fd_glob_3 from "../content/docs/core/api-reference.mdx?collection=docs";
import * as __fd_glob_2 from "../content/docs/core/animations.mdx?collection=docs";
import { default as __fd_glob_1 } from "../content/docs/engine-pixi/meta.json?collection=docs";
import { default as __fd_glob_0 } from "../content/docs/core/meta.json?collection=docs";
import { server } from "fumadocs-mdx/runtime/server";
import type * as Config from "../source.config";

const create = server<
  typeof Config,
  import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
    DocData: {};
  }
>({ doc: { passthroughs: ["extractedReferences"] } });

export const docs = await create.docs(
  "docs",
  "content/docs",
  { "core/meta.json": __fd_glob_0, "engine-pixi/meta.json": __fd_glob_1 },
  {
    "core/animations.mdx": __fd_glob_2,
    "core/api-reference.mdx": __fd_glob_3,
    "core/basic-usage.mdx": __fd_glob_4,
    "core/changelog.mdx": __fd_glob_5,
    "core/chroma-key.mdx": __fd_glob_6,
    "core/clips.mdx": __fd_glob_7,
    "core/commands.mdx": __fd_glob_8,
    "core/effects.mdx": __fd_glob_9,
    "core/events.mdx": __fd_glob_10,
    "core/index.mdx": __fd_glob_11,
    "core/installation.mdx": __fd_glob_12,
    "core/rendering.mdx": __fd_glob_13,
    "core/serialization.mdx": __fd_glob_14,
    "core/tracks.mdx": __fd_glob_15,
    "core/transitions.mdx": __fd_glob_16,
    "engine-pixi/animations.mdx": __fd_glob_17,
    "engine-pixi/api-reference.mdx": __fd_glob_18,
    "engine-pixi/basic-usage.mdx": __fd_glob_19,
    "engine-pixi/chroma-key.mdx": __fd_glob_20,
    "engine-pixi/clips.mdx": __fd_glob_21,
    "engine-pixi/effects.mdx": __fd_glob_22,
    "engine-pixi/events.mdx": __fd_glob_23,
    "engine-pixi/index.mdx": __fd_glob_24,
    "engine-pixi/installation.mdx": __fd_glob_25,
    "engine-pixi/quickstart.mdx": __fd_glob_26,
    "engine-pixi/rendering.mdx": __fd_glob_27,
    "engine-pixi/serialization.mdx": __fd_glob_28,
    "engine-pixi/tracks.mdx": __fd_glob_29,
    "engine-pixi/transitions.mdx": __fd_glob_30,
  },
);
