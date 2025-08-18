import { Request, Response, NextFunction } from "express";
import { body, validationResult, param, query } from "express-validator";
import { AppError } from "./errorHandler";

export const handleValidationErrors = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new AppError(
      `Validation failed: ${errors
        .array()
        .map((err) => err.msg)
        .join(", ")}`,
      400,
    );
    return next(error);
  }
  next();
};

// Workflow validation rules
export const validateWorkflowCreation = [
  body("name")
    .isString()
    .isLength({ min: 1, max: 255 })
    .trim()
    .escape()
    .withMessage("Name must be a string between 1 and 255 characters"),
  body("description")
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .trim()
    .escape()
    .withMessage("Description must be a string with maximum 1000 characters"),
  body("nodes").isArray().withMessage("Nodes must be an array"),
  body("nodes.*.id").isString().trim().withMessage("Node ID must be a string"),
  body("nodes.*.type")
    .isIn(["agent", "tool", "input", "output", "decision"])
    .withMessage(
      "Node type must be one of: agent, tool, input, output, decision",
    ),
  body("nodes.*.position")
    .isObject()
    .withMessage("Node position must be an object"),
  body("nodes.*.position.x")
    .isNumeric()
    .withMessage("Node position x must be a number"),
  body("nodes.*.position.y")
    .isNumeric()
    .withMessage("Node position y must be a number"),
  body("edges").isArray().withMessage("Edges must be an array"),
  body("edges.*.id").isString().trim().withMessage("Edge ID must be a string"),
  body("edges.*.source")
    .isString()
    .trim()
    .withMessage("Edge source must be a string"),
  body("edges.*.target")
    .isString()
    .trim()
    .withMessage("Edge target must be a string"),
  handleValidationErrors,
];

export const validateWorkflowUpdate = [
  param("id").isUUID().withMessage("Workflow ID must be a valid UUID"),
  body("name")
    .optional()
    .isString()
    .isLength({ min: 1, max: 255 })
    .trim()
    .escape()
    .withMessage("Name must be a string between 1 and 255 characters"),
  body("description")
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .trim()
    .escape()
    .withMessage("Description must be a string with maximum 1000 characters"),
  body("nodes").optional().isArray().withMessage("Nodes must be an array"),
  body("edges").optional().isArray().withMessage("Edges must be an array"),
  handleValidationErrors,
];

export const validateWorkflowExecution = [
  param("id").isUUID().withMessage("Workflow ID must be a valid UUID"),
  body("input")
    .optional()
    .isString()
    .isLength({ max: 10000 })
    .trim()
    .withMessage("Input must be a string with maximum 10000 characters"),
  handleValidationErrors,
];

export const validateDeployment = [
  body("workflow_id").isUUID().withMessage("Workflow ID must be a valid UUID"),
  handleValidationErrors,
];

export const validateMonitoringLogs = [
  param("workflowId").isUUID().withMessage("Workflow ID must be a valid UUID"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage("Limit must be an integer between 1 and 1000"),
  query("level")
    .optional()
    .isIn(["info", "warn", "error"])
    .withMessage("Level must be one of: info, warn, error"),
  handleValidationErrors,
];

// Sanitize JSON input to prevent injection
export const sanitizeJSONInput = (jsonString: string): any => {
  try {
    const parsed = JSON.parse(jsonString);
    return sanitizeObject(parsed);
  } catch (error) {
    throw new AppError("Invalid JSON format", 400);
  }
};

function sanitizeObject(obj: any): any {
  if (typeof obj === "string") {
    return obj.replace(/[<>\"'&]/g, "");
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (obj && typeof obj === "object") {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  return obj;
}
