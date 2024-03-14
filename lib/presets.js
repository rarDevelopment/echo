export default {
    default: {
        getId: (data) => {
            return data.id
        },
        format: (data) => {
            return {
                content: data.content,
                date: data.isoDate,
                title: data.title
            }
        }
    },
    blog: {
        getId: (data) => {
            return data.guid
        },
        format: (data) => {
            return {
                content: `📰 ${data.title}<br /><br />${data.content}<br /><br />${data.link}`,
                date: data.pubDate,
                title: data.title
            }
        }
    },
    link: {
        getId: (data) => {
            return data.guid
        },
        format: (data) => {
            return {
                content: `🔗 ${data.title}<br /><br />${data.content}<br /><br />${data.link}`,
                date: data.pubDate,
            }
        }
    },
    statuslol: {
        getId: (data) => {
            return data.id
        },
        format: (data) => {
            return {
                content: data.summary,
                date: data.isoDate,
            }
        }
    },
    letterboxd: {
        getId: (data) => {
            return data.guid
        },
        format: (data) => {
            let content = data.content.trim()
            content = `${data.title}

            ${content}`
            return {
                content: content.trim(),
                date: new Date(data.isoDate).toISOString(),
            }
        }
    },
    letterboxdNoPoster: {
        getId: (data) => {
            return data.guid
        },
        format: (data) => {
            const SPOILER_TEXT = '<p><em>This review may contain spoilers.</em></p>'
            const SPOILER_TEXT_REVIEW = ' (contains spoilers)'
            let content = data.content.trim()
            data.title = data.title.replace(SPOILER_TEXT_REVIEW, '')
            const spoilers = content.includes(SPOILER_TEXT) ? data['letterboxd:filmTitle'] : false
            content = content.replace(SPOILER_TEXT, '')
            // remove movie poster from content
            if (data.content.includes('img src=')) {
                content = content.replace(content.match(/(<p>.*?<\/p>)/g)[0], '')
            }
            content = `${data.title}

            ${content}
            
            ${data.link}`;

            return {
                content: content,
                date: new Date(data.isoDate).toISOString(),
                spoilers: spoilers,
            }
        }
    },
    backloggd: {
        getId: (data) => {
            return data.guid
        },
        format: (data) => {
            let contentSnippet = data.contentSnippet.trim();

            if (contentSnippet.length > 120) {
                contentSnippet = contentSnippet.substring(0, 117) + "...";
            }

            let finalContent = contentSnippet = `${data.title}

            ${contentSnippet}
            
            ${data.link}`;

            return {
                content: finalContent,
                date: new Date(data.isoDate).toISOString(),
            }
        }
    },
    goodreads: {
        getId: (data) => {
            return data.guid
        },
        format: (data) => {
            let review = data.contentSnippet.trim()

            if(review.length === 0) {
                review = "Just finished this book!"
            }

            if(review.length > 120) {
                review.substring(0, 117) + "...";
            }

            const ratingText = "rating: ";
            const indexOfRating = data.content.indexOf(ratingText);
            
            let rating = 0;
            if(indexOfRating > -1) {
                rating = data.content.substring(indexOfRating + ratingText.length, indexOfRating + ratingText.length + 1);
            }

            let title = data.title;
            
            if(rating > 0){
                let ratingString = "⭐".repeat(rating);
                title = `${title} - ${ratingString}`;
            }

            let output = `${title}

            ${review}
            
            ${data.link}`;

            return {
                content: output,
                date: new Date(data.isoDate).toISOString(),
            }
        }
    },
}
