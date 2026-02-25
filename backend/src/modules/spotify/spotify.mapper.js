// normalization layer - tracks

export const mapPlaylist = (playlist) => ({
  spotifyId: playlist.id,
  name: playlist.name,
  totalTracks: playlist.items?.total ?? playlist.tracks?.total ?? 0,
  image: playlist.images?.[0]?.url || null,
  ownerId: playlist.owner?.id,
  isPublic: playlist.public ?? false,
  isCollaborative: playlist.collaborative ?? false,
});

export const mapTrack = (item) => {
  const entity = item.item;

  if (!entity || entity.type !== "track") return null;

  return {
    spotifyTrackId: entity.id,
    title: entity.name,
    artists: entity.artists.map((a) => a.name),
    album: entity.album.name,
    durationMs: entity.duration_ms,
    isrc: entity.external_ids?.isrc || null,
    addedAt: item.added_at,
    isLocal: item.is_local,
  };
};
