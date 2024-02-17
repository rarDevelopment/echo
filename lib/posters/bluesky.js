import helpers from '../helpers.js'
import pkg from '@atproto/api';
const { BskyAgent, RichText } = pkg;

const createPost = async (content, config) => {

    const agent = new BskyAgent({
        service: config.instance,
    });

    const richText = new RichText({
        text: content
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

    const splitUri = postResponse.uri.split('/');
    const postId = splitUri[splitUri.length - 1];
    const postUrl = `${config.instance}/profile/${config.identifier}/post/${postId}`;

    return {
        postUrl: postUrl,
        ...postResponse,
    };
}

export default async (config, formatted, site) => {
    const categories = (site.categories || []).map(c => `#${c}`).join(' ')
    let formattedContent = site.skipConversion ? formatted.content : helpers.htmlToText(formatted.content)
    formattedContent = `${formattedContent}\n${categories}`;

    const res = await createPost(formattedContent, config, formatted.spoilers)

    console.log(`⭐ Created post at ${res.postUrl}`);
}
