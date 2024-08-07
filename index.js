import { promises as fs } from "fs";
import RSSParser from "rss-parser";
import posters from "./lib/posters/index.js";
import config from "./config.js";
import contentBuilder from "./lib/contentBuilder.js";

const echoPath = process.argv[1].replace("index.js", "");
const dataFilePath = `${echoPath}data`;

let cachedFeedItems = {};

const baseUrl = "https://rardk64.com/";
const feedConfigsJsonUrl = `${baseUrl}rss/feed-configs/json/`;
const manualPostsJsonUrl = `${baseUrl}rss/feed-manual-posts/json/`;
const updateManualPostUrlWebhooks = `${baseUrl}panel/feeds/mark-manual-post-processed-webhooks.php`;
const updateManualPostUrlSocials = `${baseUrl}panel/feeds/mark-manual-post-processed-socials.php`;

const allFeedConfigsResponse = await fetch(feedConfigsJsonUrl);
const allFeedConfigs = await allFeedConfigsResponse.json();

const manualPostsResponse = await fetch(manualPostsJsonUrl);
const manualPostsResponseJson = await manualPostsResponse.json();

const manualPostsWebhooks = manualPostsResponseJson["webhooks"];
const manualPostsSocials = manualPostsResponseJson["socials"];

const args = process.argv.slice(2);
const DRY_MODE = args.includes("dry");
const DEV_MODE = args.includes("dev");

const characterLimits = {
  mastodon: 479,
  bluesky: 279,
  webhook: 1979,
};

if (DRY_MODE) {
  console.log("🌵 Running in dry mode, no posts will be created");
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (!(await folderExists(dataFilePath))) {
  await fs.mkdir(dataFilePath);
  console.log("📁 Data folder created!");
}

for (const feedConfig of allFeedConfigs) {
  const isWebhookFeedConfig = feedConfig.webhook_id !== null;
  const isSocialFeedConfig = feedConfig.service_type !== null;

  const feedFileName = buildFeedFileName(feedConfig);
  const feedFilePath = `${echoPath}data/${feedFileName}`;
  try {
    await createFileIfNotExists(feedFilePath, feedFileName);

    console.log(`⚙️ Fetching for ${feedConfig.feed_display_name}`);
    let items = await getFeedItems(feedConfig.feed_url, false, null); // NOTE: have to change that hard-coded false if I want to use json feeds

    if (items.length === 0) {
      console.log(`0️⃣ No items found for ${feedConfig.feed_display_name}`);
      continue;
    }

    if (!getGuid(items[0])) {
      console.log(
        `❌ No ID found for item in ${feedConfig.feed_display_name}, skipping. 👀 Does this item have a guid?`
      );
      break;
    }

    let existingIds = JSON.parse(await fs.readFile(feedFilePath, "utf8"));

    //filter out the items from before the feed was created
    const connectionCreatedDate = new Date(feedConfig.connection_created_at);
    for (const item of items) {
      if (new Date(item.isoDate) < connectionCreatedDate && !existingIds.includes(getGuid(item))) {
        existingIds.push(getGuid(item));
      }
    }

    //update the file now anyway, since we want the file to be up to date with all existing ids
    await updateFileWithIds([...existingIds], feedFilePath);

    let manualPostsToDo = [];
    if (isWebhookFeedConfig) {
      manualPostsToDo = manualPostsWebhooks.filter(
        (p) => p.config_id === feedConfig.config_id && p.webhook_id === feedConfig.webhook_id
      );
    } else if (isSocialFeedConfig) {
      manualPostsToDo = manualPostsSocials.filter(
        (p) =>
          p.config_id === feedConfig.config_id &&
          p.service_type === feedConfig.service_type &&
          p.user_id === feedConfig.user_id
      );
    }

    //filter out existing ids that will be manually posted
    existingIds = existingIds.filter((id) => {
      //if we find a manual post with the same guid, we don't want that in existingIds because we want to post it
      const needToPost = manualPostsToDo.find((p) => p.feed_item_guid === id);
      return !needToPost; //negated because we want to exclude the id
    });

    if (existingIds.length > 0) {
      items = items.filter((item) => {
        return !existingIds.includes(getGuid(item));
      });
    }

    const newIds = items.map((i) => getGuid(i));

    if (!items.length) {
      console.log(`❌ No new items found for ${feedFileName}`);
      continue;
    }

    //update file with new ids (as well as existing ids) if we're not in dry mode so that we don't post the same items again
    if (!DRY_MODE) {
      await updateFileWithIds([...newIds, ...existingIds], feedFilePath);
    }

    for (const item of items) {
      const formattedMessageObject = formatMessage(
        feedConfig.message_template,
        item,
        characterLimits[feedConfig.service_type]
      );

      if (DRY_MODE || DEV_MODE) {
        console.log(
          `✅ Will create ${feedConfig.feed_display_name} post for ${formattedMessageObject.date}\n\n${formattedMessageObject.content}`
        );
      } else {
        await delay(2000);
        await posters[feedConfig.service_type](feedConfig, formattedMessageObject, config);
        if (manualPostsToDo.length > 0) {
          if (manualPostsToDo.find((p) => p.feed_item_guid === getGuid(item) && p.config_id === feedConfig.config_id)) {
            await markManualPostAsProcessed(getGuid(item), feedConfig, isWebhookFeedConfig, isSocialFeedConfig);
          } else {
            console.log(
              "didn't find that one for some reason",
              getGuid(item),
              feedConfig.config_id,
              manualPostsWebhooks
            );
          }
        }
      }
    }
    //console.log(`✅ ${items.length} items found for ${feedFileName}`);
  } catch (err) {
    console.error(`There was an error processing the feed ${feedFileName}: `, err);
  }
}

cachedFeedItems = [];
process.exit();

///////// END OF SCRIPT /////////

async function folderExists(folderPath) {
  try {
    await fs.access(folderPath);
    return true;
  } catch (err) {
    if (err.code === "ENOENT") {
      return false;
    } else {
      throw err;
    }
  }
}

async function createFileIfNotExists(feedFilePath, feedFileName) {
  try {
    if (
      !(await fs
        .access(feedFilePath)
        .then(() => true)
        .catch(() => false))
    ) {
      await fs.writeFile(feedFilePath, JSON.stringify([], "", 2), { flag: "wx" });
      console.log(`✅ ${feedFileName} data file created!`);
    }
  } catch (err) {
    console.error(err);
  }
}

async function updateFileWithIds(ids, feedFilePath) {
  await fs.writeFile(feedFilePath, JSON.stringify(ids, "", 2));
}

async function getFeedItems(feed, isJson, customFields) {
  if (cachedFeedItems[feed]) {
    return cachedFeedItems[feed];
  }

  if (isJson) {
    const res = await fetch(feed);
    const feedData = await res.json();
    return feedData.items;
  }

  const data = await new RSSParser({
    customFields: {
      item: customFields || [],
    },
  }).parseURL(feed);

  const items = data.items || [];
  if (cachedFeedItems[feed]) {
    cachedFeedItems[feed] = [];
  }

  cachedFeedItems[feed] = items;
  return items;
}

function formatMessage(template, data, characterLimit) {
  const keywordReplacements = {
    title: (str) => (str = str.replace(/{{\s*title\s*}}/g, data.title)),
    link: (str) => str.replace(/{{\s*link\s*}}/g, data.link),
    linkWithoutEmbed: (str) => str.replace(/{{\s*link:noembed\s*}}/g, `<${data.link}>`),
    content: (str) => str.replace(/{{\s*content\s*}}/g, data.content.replace(/^\s+(?=\S)/gm, "")),
    "content:plain": (str) =>
      str.replace(/{{\s*content:plain\s*}}/g, data.content.replace(/<[^>]*>?/gm, "").replace(/^\s+(?=\S)/gm, "")),
    "content:goodreads": (str) =>
      str.replace(/{{\s*content:goodreads\s*}}/g, contentBuilder.buildGoodreads(data, characterLimit)),
    date: (str) => str.replace(/{{\s*date\s*}}/g, new Date(data.isoDate).toISOString()),
    discordUser: (str) => {
      return str.replace(/{{\s*discord:user:(\d+)\s*}}/g, (_, userId) => {
        return `<@${userId}>`;
      });
    },
    discordRole: (str) => {
      return str.replace(/{{\s*discord:role:(\d+)\s*}}/g, (_, roleId) => {
        return `<@&${roleId}>`;
      });
    },
  };

  let messageContent = template;
  for (const key in keywordReplacements) {
    messageContent = keywordReplacements[key](messageContent);
  }

  messageContent = htmlEntityDecode(messageContent);

  return {
    content: messageContent,
    date: new Date(data.isoDate).toISOString(),
    image: data.enclosure ?? null,
  };
}

function buildFeedFileName(config) {
  if (config.service_type === "webhook") {
    return `${config.feed_display_name}__${config.webhook_display_name}.txt`;
  } else {
    return `${config.feed_display_name}__${config.username}_${config.service_type}.txt`;
  }
}

async function markManualPostAsProcessed(guid, feedConfig, isWebhookFeedConfig, isSocialFeedConfig) {
  let postData = {};
  let urlToUse = "";
  if (isWebhookFeedConfig) {
    urlToUse = updateManualPostUrlWebhooks;
    postData = {
      feed_item_guid: guid,
      config_id: feedConfig.config_id,
      webhook_id: feedConfig.webhook_id,
    };
  } else if (isSocialFeedConfig) {
    urlToUse = updateManualPostUrlSocials;
    postData = {
      feed_item_guid: guid,
      config_id: feedConfig.config_id,
      service_type: feedConfig.service_type,
      user_id: feedConfig.user_id,
    };
  } else {
    console.error("❌ Error: Could not identify feed type for manual post.");
  }
  const res = await fetch(urlToUse, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: JSON.stringify(postData),
  })
    .then((r) => r.json())
    .then((data) => {
      4;
      console.log(`✅ Marked manual post for ${guid} as processed`);
      return data;
    })
    .catch((error) => {
      console.error(`❌ Error marking manual post for ${guid}`, error);
    });
  return res;
}

function getGuid(item) {
  return item.guid ?? item.id ?? null;
}

function htmlEntityDecode(encodedString) {
  const entities = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
  };
  Object.entries(entities).forEach(([key, value]) => {
    encodedString = encodedString.replace(new RegExp(key, "g"), value);
  });
  return encodedString;
}
