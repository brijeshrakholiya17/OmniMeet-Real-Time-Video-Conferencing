import { Router } from "express";
// Import the new functions here
import { login, register, addToActivity, getUserHistory } from "../controllers/user.controller.js";

const router = Router();

router.route("/login").post(login);
router.route("/register").post(register);

// Connect the missing dots:
router.route("/add_to_activity").post(addToActivity);
router.route("/get_all_activity").get(getUserHistory);

export default router;