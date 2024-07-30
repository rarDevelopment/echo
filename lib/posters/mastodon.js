import helpers from "../helpers.js";

const createPost = async (content, config, spoilerText) => {
  const formData = new FormData();
  formData.append("status", content);
  formData.append("visibility", config.visibility || "public");
  formData.append("sensitive", config.sensitive || false);
  if (spoilerText) {
    formData.append("spoiler_text", spoilerText);
  }

  const res = await fetch(`${config.instance}/api/v1/statuses`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${config.accessToken}`,
    },
    body: formData,
  });

  return res.json();
};

export default async (feedConfig, formattedMessageObject, config) => {
  console.log("mastodon", config.mastodon);
  const mastodonConfig = config.mastodon.users.find((u) => u.userId.toString() == feedConfig.user_id);
  if (!mastodonConfig) {
    console.log(`❌ User not found for ${feedConfig.user_id}`);
    return;
  }
  //   if (formattedMessageObject.spoilers) {
  //     config.sensitive = true;
  //   }
  //const categories = (site.categories || []).map((c) => `#${c}`).join(" ");
  let formattedContent = helpers.htmlToText(formattedMessageObject.content); //site.skipConversion ? formatted.content : helpers.htmlToText(formatted.content)
  formattedContent = `${formattedContent}`; //\n${categories}`;

  const res = await createPost(formattedContent, mastodonConfig, formattedMessageObject.spoilers);

  console.log(`⭐ Created post at ${res.url}!`);
};
