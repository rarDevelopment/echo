import webhook from "./webhook.js";
import mastodon from "./mastodon.js";
import bluesky from "./bluesky.js";

export const SERVICES = {
  WEBHOOK: "webhook",
  MASTODON: "mastodon",
  BLUESKY: "bluesky",
};

export default {
  [SERVICES.WEBHOOK]: webhook,
  [SERVICES.MASTODON]: mastodon,
  [SERVICES.BLUESKY]: bluesky,
};
