import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { signupSchema } from "../schemas/auth.schemas.js";
import * as authController from "../controllers/auth.controller.js";

const router = Router();

router.post("/signup", validate(signupSchema), authController.signup);

export default router;
