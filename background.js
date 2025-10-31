chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeNetRequest.updateDynamicRules(
    {
      removeRuleIds: [1], // Remove old rule if it exists
      addRules: [
        {
          id: 1, // Unique integer ID for this rule.
          priority: 1,
          action: { type: "block" },
          condition: {
            urlFilter: "example.com", // Change to your target domain
            resourceTypes: ["main_frame"],
          },
        },
      ],
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error(
          "❌ Error updating dynamic rules:",
          chrome.runtime.lastError.message
        );
      } else {
        console.log("✅ Dynamic rule added successfully.");
      }
    }
  );
});
