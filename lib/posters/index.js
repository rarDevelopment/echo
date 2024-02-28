import microblog from './microblog.js'
import webhook from './webhook.js'
import mastodon from './mastodon.js'
import omnivore from './omnivore.js'
import github from './github.js'
import linkace from './linkace.js'
import discord from './discord.js'
import bluesky from './bluesky.js'
import webmention from './webmention.js'

export const SERVICES = {
    MICROBLOG: 'mb',
    WEBHOOK: 'hook',
    MASTODON: 'masto',
    OMNIVORE: 'omnivore',
    GITHUB: 'github',
    LINKACE: 'linkace',
    DISCORD: 'discord',
    BLUESKY: 'bsky',
    WEBMENTION: 'webmention',

    [SERVICES.MICROBLOG]: microblog,
    [SERVICES.WEBHOOK]: webhook,
    [SERVICES.MASTODON]: mastodon,
    [SERVICES.OMNIVORE]: omnivore,
    [SERVICES.GITHUB]: github,
    [SERVICES.LINKACE]: linkace,
    [SERVICES.DISCORD]: discord,
    [SERVICES.BLUESKY]: bluesky,
    [SERVICES.WEBMENTION]: webmention,
}
