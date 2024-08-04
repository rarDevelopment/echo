import pkg from "@atproto/api";
const { BskyAgent, RichText } = pkg;
import sharp from "sharp";

const createPost = async (content, config, image) => {
  const agent = new BskyAgent({
    service: config.instance,
  });

  const richText = new RichText({
    text: content,
  });

  await richText.detectFacets();

  await agent.login({
    identifier: config.identifier,
    password: config.password,
  });

  const imagePath = image ? image.url : null;
  const imageType = image ? image.type : null;
  const imageAltText = image ? image.alt : null;
  let imageBlob = null;

  if (imagePath && imageType) {
    imageBlob = await uploadImage(agent, imagePath, imageType);
  }

  const embedData = {
    $type: "app.bsky.embed.images",
    images: [
      {
        image: imageBlob,
        alt: imageAltText,
      },
    ],
  };

  const postResponse = await agent.post({
    text: richText.text,
    facets: richText.facets,
    embed: embedData,
    createdAt: new Date().toISOString(),
  });

  const splitUri = postResponse.uri.split("/");
  const postId = splitUri[splitUri.length - 1];
  const postUrl = `https://bsky.app/profile/${config.identifier}/post/${postId}`;

  return {
    postUrl: postUrl,
    ...postResponse,
  };
};

export default async (feedConfig, formattedMessageObject, config) => {
  const blueskyConfig = config.bluesky.users.find((u) => u.userId.toString() == feedConfig.user_id);
  if (!blueskyConfig) {
    console.log(`❌ User not found for ${feedConfig.user_id}`);
    return;
  }

  let formattedContent = formattedMessageObject.content;
  formattedContent = `${formattedContent}`;

  const res = await createPost(formattedContent, blueskyConfig, formattedMessageObject.image);

  console.log(`⭐ Created post at ${res.postUrl}`);
};

const downloadImage = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return arrayBuffer;
};

const resizeImage = async (imageArrayBuffer, imageType, maxWidth, maxHeight) => {
  let resizedImage = sharp(imageArrayBuffer).rotate().resize(maxWidth, maxHeight, {
    fit: sharp.fit.inside,
    withoutEnlargement: true,
  });

  if (imageType.includes("png")) {
    resizedImage = resizedImage.png({ quality: 60 });
  } else if (imageType.includes("jpeg") || imageType.includes("jpg")) {
    resizedImage = resizedImage.jpeg({ quality: 60 });
  }

  return await resizedImage.toBuffer();
};

const uploadImage = async (agent, imagePath, imageType) => {
  let imageArrayBuffer;
  imageArrayBuffer = await downloadImage(imagePath);
  const resizedImageBuffer = await resizeImage(imageArrayBuffer, imageType, 800, 800);

  const imageBufferAsUIntArray = new Uint8Array(resizedImageBuffer);
  const uploadResponse = await agent.uploadBlob(imageBufferAsUIntArray, {
    encoding: imageType,
  });
  return uploadResponse.data.blob;
};
