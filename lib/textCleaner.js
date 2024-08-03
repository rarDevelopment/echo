export default {
  getOutputTrimmedToCharacterLimit: (title, link, review, characterLimit) => {
    const placeholderText = "{{REVIEW_PLACEHOLDER}}";

    let output = `${title}<br /><br />${placeholderText}<br /><br />${link}`;

    review = review.replace("<p>", "").replace("</p>", "");

    const cleanedOutputForLength = output.replace(placeholderText, "");
    const remainingCharacters = characterLimit - cleanedOutputForLength.length;

    if (remainingCharacters <= 3) {
      review = ""; // no room for the review
    } else if (review.length > remainingCharacters) {
      review = review.substring(0, remainingCharacters - 3).trim() + "...";
    }

    if (review.endsWith("...")) {
      const lastSpaceIndex = review.lastIndexOf(" ");
      if (lastSpaceIndex > 0) {
        review = review.substring(0, lastSpaceIndex).trim() + "...";
      }
    }

    if (review.length > 0) {
      review = `"${review.trim()}"`; //only put quotes if there's a review
    }

    //output = output.replace(placeholderText, review);
    return review;
  },
};
