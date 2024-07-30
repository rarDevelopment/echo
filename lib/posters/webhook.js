export default async (config, formatted, site) => {
  const postWebhook = async () => {
    const res = await fetch(config.webhook_url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formatted),
    });

    if (res.status === 429) {
      // Rate limited
      const retryAfter = res.headers.get("retry-after");
      const retryAfterMs = retryAfter ? parseFloat(retryAfter) * 1000 : 1000; // Convert to milliseconds
      console.log(`Rate limited. Retrying after ${retryAfterMs} ms`);
      await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
      return postWebhook(); // Retry
    }

    if (!res.ok) {
      throw new Error(`Failed to post webhook: ${res.statusText}`);
    }

    console.log("🗣️ Webhook posted!");
  };

  try {
    await postWebhook();
  } catch (error) {
    console.error("Error posting webhook:", error);
  }
};
