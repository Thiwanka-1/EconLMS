const youtubeIdPattern =
  /^[A-Za-z0-9_-]{11}$/;

const validateVideoId = (videoId) => {
  if (
    !videoId ||
    !youtubeIdPattern.test(videoId)
  ) {
    return null;
  }

  return videoId;
};

export const extractYouTubeVideoId = (
  value
) => {
  const input = String(value || "").trim();

  if (!input) {
    return null;
  }

  /*
   * Already a video ID.
   */
  if (youtubeIdPattern.test(input)) {
    return input;
  }

  let url;

  try {
    url = new URL(input);
  } catch {
    try {
      url = new URL(`https://${input}`);
    } catch {
      return null;
    }
  }

  const hostname = url.hostname
    .replace(/^www\./, "")
    .toLowerCase();

  /*
   * https://youtu.be/VIDEO_ID
   */
  if (hostname === "youtu.be") {
    return validateVideoId(
      url.pathname.split("/")[1]
    );
  }

  const youtubeHosts = new Set([
    "youtube.com",
    "m.youtube.com",
    "music.youtube.com",
  ]);

  if (!youtubeHosts.has(hostname)) {
    return null;
  }

  /*
   * https://youtube.com/watch?v=VIDEO_ID
   */
  const queryVideoId =
    url.searchParams.get("v");

  if (queryVideoId) {
    return validateVideoId(queryVideoId);
  }

  /*
   * /embed/VIDEO_ID
   * /shorts/VIDEO_ID
   * /live/VIDEO_ID
   */
  const pathParts = url.pathname
    .split("/")
    .filter(Boolean);

  if (
    ["embed", "shorts", "live"].includes(
      pathParts[0]
    )
  ) {
    return validateVideoId(pathParts[1]);
  }

  return null;
};