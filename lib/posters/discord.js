import helpers from '../helpers.js'

const createPost = async (content, webhook) => {
    const bodyJson = JSON.stringify({ username: webhook.username ?? undefined, avatar_url: webhook.avatar_url ?? undefined, content: content });
    const res = await fetch(`${webhook.webhookUrl}`, {
        method: 'POST',
        headers: {
            'Accept': 'text/plain',
            'Content-Type': 'application/json'
        },
        body: bodyJson,
    })
}

export default async (config, formatted, site) => {
    const categories = (site.categories || []).map(c => `#${c}`).join(' ')
    let formattedContent = site.skipConversion ? formatted.content : helpers.htmlToText(formatted.content)
    formattedContent = `${formattedContent} ${categories}`

    //TODO: account for rate limiting
    config.webhooks.forEach(async (webhook) => {
        await createPost(formattedContent, webhook)
    });

    console.log(`⭐ Created post in Discord channel!`, formattedContent);
}
