import helpers from "../helpers.js";

export default async (feedConfig, formattedMessageObject, config) => {
  const mastodonConfig = config.mastodon.users.find((u) => u.userId.toString() == feedConfig.user_id);
  if (!mastodonConfig) {
    console.log(`❌ User not found for ${feedConfig.user_id}`);
    return;
  }
  //   if (formattedMessageObject.spoilers) {
  //     config.sensitive = true;
  //   }

  let formattedContent = formattedMessageObject.content;
  formattedContent = `${formattedContent}`;

  const res = await createPost(formattedContent, mastodonConfig, formattedMessageObject.image);
  console.log(`⭐ Created post at ${res.url}!`);
};

const createPost = async (content, config, image, spoilerText = null) => {
  const mediaIds = [];
  if (image) {
    const imageBuffer = await helpers.downloadImage(image.url);
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
