import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { getPlaylists, getPlaylistTracks } from "./spotify.controller.js";

const router = Router();

router.get("/playlists", authenticate, getPlaylists);
router.get("/playlists/:playlistId/tracks", authenticate, getPlaylistTracks);

export default router;
