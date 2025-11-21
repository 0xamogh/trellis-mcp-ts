// src/scripts/clean_up_workflow.js
require("dotenv").config();
const axios = require("axios");

async function main() {
  const WORKFLOW_ID = "wflow_35dnKymVmk4W8wtlu0MWa5PeiOj";

  const BASE_URL = process.env.TRELLIS_API_BASE;
  const API_KEY = process.env.TRELLIS_API_KEY;

  if (!BASE_URL || !API_KEY) {
    console.error("Please set TRELLIS_API_BASE and TRELLIS_API_KEY env vars.");
    process.exit(1);
  }

  const client = axios.create({
    baseURL: BASE_URL,
    headers: {
      Authorization: API_KEY,
      "Content-Type": "application/json",
    },
  });

  try {
    console.log(`→ Fetching workflow ${WORKFLOW_ID}...`);
    const wfRes = await client.get(`/workflows/${WORKFLOW_ID}`);
    const wf = wfRes.data?.data || wfRes.data;

    const allNodes = wf.nodes || [];
    const allEdges = wf.edges || [];

    console.log(
      `Current nodes: ${allNodes.length}, edges: ${allEdges.length}`
    );

    console.log("→ Deleting ALL blocks from workflow...");

    const patchBody = {
      // /v1/workflows/{id}/blocks expects blocks to be a LIST
      blocks: [],
    };

    const patchRes = await client.patch(
      `/workflows/${WORKFLOW_ID}/blocks`,
      patchBody
    );

    const updated = patchRes.data?.data || patchRes.data;

    console.log(
      `← Done. Updated nodes: ${updated.nodes?.length || 0}, edges: ${
        updated.edges?.length || 0
      }`
    );
    console.log(
      `Workflow ${WORKFLOW_ID} is now empty. Recreate your 'Row Created' trigger and rerun the create_run_transform test.`
    );
  } catch (err) {
    console.error("❌ Error cleaning up workflow blocks:");
    if (err.response) {
      console.error(
        JSON.stringify(
          {
            status: err.response.status,
            data: err.response.data,
          },
          null,
          2
        )
      );
    } else {
      console.error(err.message);
    }
    process.exit(1);
  }
}

main();