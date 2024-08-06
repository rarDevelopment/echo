const createPost = async (content, config, image, spoilerText = null) => {
  const mediaIds = [];
  if (image) {
    const imageBuffer = await downloadImage(image.url);
    const imageBufferAsUIntArray = new Uint8Array(imageBuffer);
    const blob = new Blob([imageBufferAsUIntArray], { type: image.type });
    const mediaId = await uploadMedia(blob, config, image.alt);
    mediaIds.push(mediaId);
  }
  const formData = new FormData();
  formData.append("status", content);
  formData.append("visibility", config.visibility || "public");
  formData.append("sensitive", config.sensitive || false);
  if (mediaIds.length > 0) {
    formData.append("media_ids[]", mediaIds);
  }
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
  // console.log("mastodon", config.mastodon);
  const mastodonConfig = config.mastodon.users.find((u) => u.userId.toString() == feedConfig.user_id);
  if (!mastodonConfig) {
    console.log(`❌ User not found for ${feedConfig.user_id}`);
    return;
  }
  //   if (formattedMessageObject.spoilers) {
  //     config.sensitive = true;
  //   }
  //const categories = (site.categories || []).map((c) => `#${c}`).join(" ");
  let formattedContent = formattedMessageObject.content; //helpers.htmlToText(formattedMessageObject.content); //site.skipConversion ? formatted.content : helpers.htmlToText(formatted.content)
  formattedContent = `${formattedContent}`; //\n${categories}`;

  const res = await createPost(formattedContent, mastodonConfig, formattedMessageObject.image);
  console.log(`⭐ Created post at ${res.url}!`);
};

const uploadMedia = async (imagePath, config, altText) => {
  try {
    const formData = new FormData();
    formData.append("file", imagePath);
    if (altText.trim() != "") {
      formData.append("description", altText);
    }

    const res = await fetch(`${config.instance}/api/v2/media`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${config.accessToken}`,
      },
      body: formData,
    });

    const data = await res.json();
    return data.id;
  } catch (err) {
    console.error("error", err);
  }
};

const downloadImage = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return arrayBuffer;
};
