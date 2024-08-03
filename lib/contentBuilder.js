import textCleaner from "./textCleaner.js";

export default {
  buildGoodreads: (data, characterLimit) => {
    let review = data.contentSnippet.trim();

    if (review.length === 0) {
      review = "Just finished this book!";
    }

    const ratingText = "rating: ";
    const contentToCheckForRating = data.content.replace("average rating:", "average:");
    const indexOfRating = contentToCheckForRating.indexOf(ratingText);

    let ratingString = "0";
    if (indexOfRating > -1) {
      ratingString = contentToCheckForRating.substring(
        indexOfRating + ratingText.length,
        indexOfRating + ratingText.length + 1
      );
    }

    let rating = parseInt(ratingString);

    let title = data.title;

    if (rating > 0) {
      let ratingString = "⭐".repeat(rating);
      title = `${title} - ${ratingString}`;
    }

    const output = textCleaner.getOutputTrimmedToCharacterLimit(title, data.link, review, characterLimit);
    return output;
  },
};
