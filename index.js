import { promises as fs } from "fs";
import RSSParser from "rss-parser";
import posters from "./lib/posters/index.js";
import config from "./config.js";

const echoPath = process.argv[1].replace("index.js", "");
const dataFilePath = `${echoPath}data`;

let cachedFeedItems = {};

const feedConfigsJsonUrl = "https://rardk64.com/rss/feed-configs/json/";
const manualPostsJsonUrl = "https://rardk64.com/rss/feed-manual-posts/json/";
const updateManualPostUrl = "https://rardk64.com/panel/feeds/mark-manual-post-processed.php";

const allFeedConfigsResponse = await fetch(feedConfigsJsonUrl);
const allFeedConfigs = await allFeedConfigsResponse.json();

const manualPostsResponse = await fetch(manualPostsJsonUrl);
const manualPosts = await manualPostsResponse.json();

const args = process.argv.slice(2);
const DRY_MODE = args.includes("dry");

if (DRY_MODE) {
  console.log("🌵 Running in dry mode, no posts will be created");
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (!(await folderExists(dataFilePath))) {
  await fs.mkdir(dataFilePath);
  console.log("📁 Data folder created!");
}

for (const feedConfig of allFeedConfigs) {
  const feedFileName = buildFeedFileName(feedConfig);
  const feedFilePath = `${echoPath}data/${feedFileName}`;

  await createFileIfNotExists(feedFilePath, feedFileName);

  console.log(`⚙️ Fetching for ${feedConfig.feed_display_name}`);
  let items = await getFeedItems(feedConfig.feed_url, false, null); // NOTE: have to change that hard-coded false if I want to use json feeds

  if (items.length === 0) {
    console.log(`0️⃣ No items found for ${feedConfig.feed_display_name}`);
    continue;
  }

  if (!items[0].guid) {
    console.log(`❌ No ID found for item in ${feedConfig.feed_display_name}, skipping. 👀 Does this item have a guid?`);
    break;
  }

  let existingIds = JSON.parse(await fs.readFile(feedFilePath, "utf8"));

  //filter out the items from before the feed was created
  const connectionCreatedDate = new Date(feedConfig.connection_created_at);
  for (const item of items) {
    if (new Date(item.isoDate) < connectionCreatedDate && !existingIds.includes(item.guid)) {
      existingIds.push(item.guid);
    }
  }

  //filter out existing ids that will be manually posted
  existingIds = existingIds.filter((id) => {
    //if we find a manual post with the same guid and config_id, we don't want that in existingIds because we want to post it
    const needToPost = manualPosts.find((p) => {
      return p.feed_item_guid === id && p.config_id === feedConfig.config_id && p.webhook_id === feedConfig.webhook_id;
    });
    return !needToPost; //if we want to post it, don't include it in existingIds
  });

  if (existingIds.length > 0) {
    items = items.filter((item) => {
      return !existingIds.includes(item.guid);
    });
  }

  const newIds = items.map((i) => i.guid);

  if (!items.length) {
    console.log(`❌ No new items found for ${feedConfig.feed_display_name}`);
    //update the file anyway, since we want the file to be up to date with all existing ids
    await updateFileWithIds([...existingIds], feedFilePath);
    continue;
  }

  //update file with new ids (as well as existing ids) if we're not in dry mode so that we don't post the same items again
  if (!DRY_MODE) {
    await updateFileWithIds([...newIds, ...existingIds], feedFilePath);
  }

  for (const item of items) {
    const formattedMessageObject = formatMessage(feedConfig.message_template, item);

    if (DRY_MODE) {
      console.log(
        `✅ Will create ${feedConfig.feed_display_name} post for ${formattedMessageObject.date}` //\n\n${formattedMessageObject.content}`
      );
    } else {
      await delay(2000);
      await posters[feedConfig.service_type](feedConfig, formattedMessageObject, config);
      if (manualPosts.length > 0) {
        if (manualPosts.find((p) => p.feed_item_guid === item.guid && p.config_id === feedConfig.config_id)) {
          await markManualPostAsProcessed(item.guid, feedConfig.config_id, feedConfig.webhook_id);
        } else {
          console.log("didn't find that one for some reason", item.guid, feedConfig.config_id, manualPosts);
        }
      }
    }
  }
  console.log(`✅ ${items.length} items found for ${feedConfig.feed_display_name}`);
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

function formatMessage(template, data) {
  const content = template
    .replace(/{{\s*title\s*}}/g, data.title)
    .replace(/{{\s*link\s*}}/g, data.link)
    .replace(/{{\s*content\s*}}/g, data.content);
  return {
    content,
    date: new Date(data.isoDate).toISOString(),
  };
}

function buildFeedFileName(config) {
  if (config.service_type === "webhook") {
    return `${config.feed_display_name}__${config.webhook_display_name}.txt`;
  } else {
    return `${config.feed_display_name}__${config.username}_${config.service_type}.txt`;
  }
}

async function markManualPostAsProcessed(guid, configId, webhookId) {
  const postData = {
    feed_item_guid: guid,
    config_id: configId,
    webhook_id: webhookId,
  };
  const res = await fetch(updateManualPostUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: JSON.stringify(postData),
  })
    .then((r) => r.json())
    .then((data) => {
      4;
      console.log(`✅ Marked manual post ${guid} as processed`);
      return data;
    })
    .catch((error) => {
      console.error(`❌ Error marking manual post ${guid}`, error);
    });
  return res;
}
