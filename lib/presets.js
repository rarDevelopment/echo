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
            
            const output = getOutputTrimmedToCharacterLimit(data.title, data.link, content, 279);

            return {
                content: output,
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

            const output = getOutputTrimmedToCharacterLimit(data.title, data.link, contentSnippet, 279);

            return {
                content: output,
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

            const ratingText = "rating: ";
            const contentToCheckForRating = data.content.replace("average rating:","average:");
            const indexOfRating = contentToCheckForRating.indexOf(ratingText);
            
            let ratingString = "0";
            if(indexOfRating > -1) {
                ratingString = contentToCheckForRating.substring(indexOfRating + ratingText.length, indexOfRating + ratingText.length + 1);
            }

            let rating = parseInt(ratingString);

            let title = data.title;
            
            if(rating > 0){
                let ratingString = "⭐".repeat(rating);
                title = `${title} - ${ratingString}`;
            }

            const output = getOutputTrimmedToCharacterLimit(title, data.link, review, 279);

            return {
                content: output,
                date: new Date(data.isoDate).toISOString(),
            }
        }
    },
}

function getOutputTrimmedToCharacterLimit(title, link, review, characterLimit){
    const placeholderText = "{{REVIEW_PLACEHOLDER}}";

    let output = `${title}<br /><br />${placeholderText}<br /><br />${link}`;

    const cleanedOutputForLength = output.replace(placeholderText,"");
    const remainingCharacters = characterLimit - cleanedOutputForLength.length;

    if(remainingCharacters <= 3){
        review = ""; // no room for the review
    }
    else if(review.length > remainingCharacters) {
        review = review.substring(0, remainingCharacters-3) + "...";
    }

    const lastSpaceIndex = review.lastIndexOf(" ");
    if(lastSpaceIndex > 0){
        review = review.substring(0, lastSpaceIndex) + "...";
    }

    if(review.length > 0){
        review = `"${review}"`; //only put quotes if there's a review
    }

    output = output.replace(placeholderText, review);
    return output;
}
