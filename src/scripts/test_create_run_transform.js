#!/usr/bin/env node
const axios = require("axios");

async function test() {
  const MCP_URL = "http://localhost:3000/mcp";

  // ---- CHANGE THESE FOR YOUR WORKFLOW ----
  const TRIGGER_BLOCK_ID = "wblock_35dnuvbBPMKXpVfoiQq33vJzQ62";        // <-- put a real block ID
  const TRANSFORM_NAME = "Referral Transform";              // e.g., "Processed Referrals Transform"
  const ASSET_SOURCE_BLOCK_ID = null;             // or a real block ID (e.g. Get Record Assets)
  const WORKFLOW_ID = "wflow_35dnKymVmk4W8wtlu0MWa5PeiOj";
  // -----------------------------------------

  const requestBody = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "create_run_transform_block",
      arguments: {
        workflow_id: WORKFLOW_ID,
        trigger_block_id: TRIGGER_BLOCK_ID,
        transform_name: TRANSFORM_NAME,
        position_x: 300,
        position_y: 400,
        asset_reference_block_id: ASSET_SOURCE_BLOCK_ID
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
      response.data.result.content.forEach((c) => {
        if (c.type === "text") console.log(c.text);
        else console.log(JSON.stringify(c));
      });
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