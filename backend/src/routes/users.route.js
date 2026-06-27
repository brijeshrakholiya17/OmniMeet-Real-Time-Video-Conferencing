import { Router } from "express";
import { login, register, addToActivity, getUserHistory } from "../controllers/user.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/login").post(login);
router.route("/register").post(register);

// Secured activity endpoints:
router.route("/add_to_activity").post(authMiddleware, addToActivity);
router.route("/get_all_activity").get(authMiddleware, getUserHistory);

export default router;