import helpers from "../helpers.js";
import pkg from "@atproto/api";
const { BskyAgent, RichText } = pkg;

const createPost = async (content, config) => {
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

  const postResponse = await agent.post({
    text: richText.text,
    facets: richText.facets,
    createdAt: new Date().toISOString(),
  });

  const splitUri = postResponse.uri.split("/");
  const postId = splitUri[splitUri.length - 1];
  const postUrl = `${config.instance}/profile/${config.identifier}/post/${postId}`;

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

  const res = await createPost(formattedContent, blueskyConfig, formattedMessageObject.spoilers);

  console.log(`⭐ Created post at ${res.postUrl}`);
};
