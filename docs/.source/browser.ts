// @ts-nocheck
import { browser } from "fumadocs-mdx/runtime/browser";
import type * as Config from "../source.config";

const create = browser<
  typeof Config,
  import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
    DocData: {};
  }
>();
const browserCollections = {
  docs: create.doc("docs", {
    "core/animations.mdx": () => import("../content/docs/core/animations.mdx?collection=docs"),
    "core/api-reference.mdx": () =>
      import("../content/docs/core/api-reference.mdx?collection=docs"),
    "core/basic-usage.mdx": () => import("../content/docs/core/basic-usage.mdx?collection=docs"),
    "core/changelog.mdx": () => import("../content/docs/core/changelog.mdx?collection=docs"),
    "core/chroma-key.mdx": () => import("../content/docs/core/chroma-key.mdx?collection=docs"),
    "core/clips.mdx": () => import("../content/docs/core/clips.mdx?collection=docs"),
    "core/commands.mdx": () => import("../content/docs/core/commands.mdx?collection=docs"),
    "core/effects.mdx": () => import("../content/docs/core/effects.mdx?collection=docs"),
    "core/events.mdx": () => import("../content/docs/core/events.mdx?collection=docs"),
    "core/index.mdx": () => import("../content/docs/core/index.mdx?collection=docs"),
    "core/installation.mdx": () => import("../content/docs/core/installation.mdx?collection=docs"),
    "core/rendering.mdx": () => import("../content/docs/core/rendering.mdx?collection=docs"),
    "core/serialization.mdx": () =>
      import("../content/docs/core/serialization.mdx?collection=docs"),
    "core/tracks.mdx": () => import("../content/docs/core/tracks.mdx?collection=docs"),
    "core/transitions.mdx": () => import("../content/docs/core/transitions.mdx?collection=docs"),
    "engine-pixi/animations.mdx": () =>
      import("../content/docs/engine-pixi/animations.mdx?collection=docs"),
    "engine-pixi/api-reference.mdx": () =>
      import("../content/docs/engine-pixi/api-reference.mdx?collection=docs"),
    "engine-pixi/basic-usage.mdx": () =>
      import("../content/docs/engine-pixi/basic-usage.mdx?collection=docs"),
    "engine-pixi/chroma-key.mdx": () =>
      import("../content/docs/engine-pixi/chroma-key.mdx?collection=docs"),
    "engine-pixi/clips.mdx": () => import("../content/docs/engine-pixi/clips.mdx?collection=docs"),
    "engine-pixi/effects.mdx": () =>
      import("../content/docs/engine-pixi/effects.mdx?collection=docs"),
    "engine-pixi/events.mdx": () =>
      import("../content/docs/engine-pixi/events.mdx?collection=docs"),
    "engine-pixi/index.mdx": () => import("../content/docs/engine-pixi/index.mdx?collection=docs"),
    "engine-pixi/installation.mdx": () =>
      import("../content/docs/engine-pixi/installation.mdx?collection=docs"),
    "engine-pixi/quickstart.mdx": () =>
      import("../content/docs/engine-pixi/quickstart.mdx?collection=docs"),
    "engine-pixi/rendering.mdx": () =>
      import("../content/docs/engine-pixi/rendering.mdx?collection=docs"),
    "engine-pixi/serialization.mdx": () =>
      import("../content/docs/engine-pixi/serialization.mdx?collection=docs"),
    "engine-pixi/tracks.mdx": () =>
      import("../content/docs/engine-pixi/tracks.mdx?collection=docs"),
    "engine-pixi/transitions.mdx": () =>
      import("../content/docs/engine-pixi/transitions.mdx?collection=docs"),
  }),
};
export default browserCollections;
