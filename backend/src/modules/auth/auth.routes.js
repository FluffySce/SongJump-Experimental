import { Router } from "express";
import { oauthStart, oauthCallback } from "./spotify.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";

const router = Router();

router.get("/spotify/start", oauthStart("spotify"));
router.get("/spotify/callback", oauthCallback("spotify"));

// test route
router.get("/me", authenticate, (req, res) => {
  res.json({ user: req.user });
});

//other services etc

export default router;
