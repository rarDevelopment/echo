import fs from "fs";
import RSSParser from "rss-parser";
import posters from "./lib/posters/index.js";
import config from "./config.js";

const echoPath = process.argv[1].replace("index.js", "");

const url = "https://rardk64.com/rss/feed-configs/json/";

const cachedFeedItems = {};

const allFeedConfigsResponse = await fetch(url);
const allFeedConfigs = await allFeedConfigsResponse.json();

const args = process.argv.slice(2);
//let INIT_MODE = args.includes("init");
const DRY_MODE = args.includes("dry");

// if (DRY_MODE && INIT_MODE) {
//   console.log("🚨 You cannot run Echo with init mode AND dry mode enabled at the same time");
//   process.exit();
// }

if (DRY_MODE) {
  console.log("🌵 Running in dry mode, no posts will be created");
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (!fs.existsSync(`${echoPath}data`)) {
  fs.mkdirSync(`${echoPath}data`);
  console.log("📁 Data folder created!");
}

for (const feedConfig of allFeedConfigs) {
  const feedFile = buildFeedFileName(feedConfig);

  if (!fs.existsSync(`${echoPath}data/${feedFile}`)) {
    // if (!DRY_MODE) {
    //   INIT_MODE = true;
    // }
    await fs.writeFile(`${echoPath}data/${feedFile}`, JSON.stringify([], "", 2), { flag: "wx" }, (err) => {
      if (err) {
        throw err;
      }
      console.log(`✅ ${feedConfig.feed_display_name} data file created!`);
    });
  }

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

  const existingIds = JSON.parse(fs.readFileSync(`${echoPath}data/${feedFile}`, "utf8"));

  if (existingIds.length > 0) {
    items = items.filter((item) => {
      return !existingIds.includes(item.guid);
    });
  }

  //now filter out the items before the feed was created that weren't filtered above

  let newExistingItemsToAdd = false;
  const feedConfigCreatedDate = new Date(feedConfig.created_at);
  for (const item of items) {
    if (new Date(item.isoDate) < feedConfigCreatedDate) {
      existingIds.push(item.guid);
      newExistingItemsToAdd = true;
    }
  }

  if (existingIds.length > 0) {
    items = items.filter((item) => {
      return !existingIds.includes(item.guid);
    });
  }

  const newIds = items.map((i) => i.guid);

  //   if (newExistingItemsToAdd && !DRY_MODE) {
  //     fs.writeFileSync(`${echoPath}data/${feedFile}`, JSON.stringify([...newIds, ...existingIds], "", 2));
  //   }

  if (!items.length) {
    console.log(`❌ No new items found for ${feedConfig.feed_display_name}`);
    //update the file anyway, since we want the file to be up to date with all existing ids
    fs.writeFileSync(`${echoPath}data/${feedFile}`, JSON.stringify([...existingIds], "", 2));
    continue;
  }

  //update file with new ids (as well as existing ids) if we're not in dry mode so that we don't post the same items again
  if (!DRY_MODE) {
    console.log("writing", [...newIds, ...existingIds]);
    fs.writeFileSync(`${echoPath}data/${feedFile}`, JSON.stringify([...newIds, ...existingIds], "", 2));
  }

  //   if (INIT_MODE) {
  //     console.log(`⚙️ Echo initialised for ${feedConfig.feed_display_name}!`);
  //     continue;
  //   }
  //   INIT_MODE = args.includes("init"); // TODO: remove this if I refactor how feeds are tracked

  for (const item of items) {
    const formattedMessageObject = formatMessage(feedConfig.message_template, item);
    //console.log("formatted", formattedMessageObject);
    if (DRY_MODE) {
      console.log(
        `✅ Will create ${feedConfig.feed_display_name} post for ${formattedMessageObject.date}\n\n${formattedMessageObject.content}`
      );
    } else {
      //console.log("config", feedConfig);
      await delay(2000);
      await posters[feedConfig.service_type](feedConfig, formattedMessageObject, config);
    }
  }
  console.log(`✅ ${items.length} items found for ${feedConfig.feed_display_name}`);
}

process.exit();

///////// END OF SCRIPT /////////

async function getFeedItems(feed, isJson, customFields) {
  if (cachedFeedItems[feed]) {
    console.log("using cached items", cachedFeedItems);
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
