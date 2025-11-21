// scripts/test_create_trigger.js
const axios = require("axios");

async function test() {
  const MCP_URL = "http://localhost:3000/mcp";

  const entityNameToTest = "Referral";

  const requestBody = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "create_row_created_trigger_for_entity",
      arguments: {
        entity_name: entityNameToTest,
        position_x: 200,
        position_y: 100
      }
    }
  };

  try {
    console.log("→ Sending request to MCP...\n");
    console.log(JSON.stringify(requestBody, null, 2));

    const response = await axios.post(MCP_URL, requestBody, {
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream"
      }
    });

    console.log("\n← MCP Response:\n");
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data?.result?.content) {
      console.log("\n→ Tool Output:\n");
      response.data.result.content.forEach((c) =>
        console.log(c.text || JSON.stringify(c))
      );
    }
  } catch (err) {
    console.error("\n❌ Error calling MCP tool:");
    if (err.response) {
      console.error(JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err.message);
    }
  }
}

test();