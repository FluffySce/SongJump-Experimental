import { Router } from "express";
import { oauthStart, oauthCallback } from "./spotify.controller";

const router = Router();

router.get("/auth/spotify/start", oauthStart("spotify"));
router.get("/auth/spotify/callback", oauthCallback("spotify"));

//other services etc

export default router;
