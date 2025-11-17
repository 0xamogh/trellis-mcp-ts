export enum WorkflowActionType {
  RUN_TRANSFORM = "run_transform",
  CREATE_RECORD = "create_record",
  DELAY = "delay",
  RUN_IF = "run_if",
  EVAL_CODE = "eval_code",
  AI_BLOCK = "ai_block",
  GET_RECORD = "get_record",
  UPDATE_RECORD = "update_record",
  GET_RECORD_ASSETS = "get_record_assets",
  MAKE_CALL = "make_call",
  GET_CALL = "get_call",
  DELETE_RECORD = "delete_record",
  UPLOAD_ASSET = "upload_asset",
  ASSIGN_VARIABLES = "assign_variables",
  API_REQUEST = "api_request",
  UPDATE_ASSET = "update_asset",
  RUN_PA = "run_pa",
  RUN_BENEFITS = "run_benefits",
  WAIT_FOR_PARENTS = "wait_for_parents",
  FIRE_EVENT = "fire_event",
  COMPUTER_USE = "computer_use",
  GET_PATIENT = "get_patient",
  CREATE_PATIENT = "create_patient",
  START_LOOP = "start_loop",
  END_LOOP = "end_loop",
  GET_WORKFLOW_OUTPUT = "get_workflow_output",
  POPULATE_ROW = "populate_row",
  POPULATE_CHILD_ENTITY = "populate_child_entity",
  CHAT_MESSAGE = "chat_message"
}

/**
 * Get all available action types (WorkflowActionType values)
 * @returns Array of action type values
 */
export function getAvailableActionTypes(): string[] {
  return Object.values(WorkflowActionType);
}