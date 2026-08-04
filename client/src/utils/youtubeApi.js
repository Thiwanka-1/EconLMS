let youtubeApiPromise = null;

const YOUTUBE_API_SCRIPT_URL =
  "https://www.youtube.com/iframe_api";

const isYouTubeApiReady = () => {
  return Boolean(
    window.YT?.Player &&
      window.YT?.PlayerState
  );
};

export const loadYouTubeIframeApi = () => {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined"
  ) {
    return Promise.reject(
      new Error(
        "The YouTube player requires a browser."
      )
    );
  }

  if (isYouTubeApiReady()) {
    return Promise.resolve(
      window.YT
    );
  }

  if (youtubeApiPromise) {
    return youtubeApiPromise;
  }

  youtubeApiPromise = new Promise(
    (resolve, reject) => {
      let completed = false;
      let readinessInterval = null;
      let timeout = null;

      const previousCallback =
        window.onYouTubeIframeAPIReady;

      const cleanUp = () => {
        if (readinessInterval) {
          window.clearInterval(
            readinessInterval
          );
        }

        if (timeout) {
          window.clearTimeout(
            timeout
          );
        }
      };

      const completeSuccessfully = () => {
        if (
          completed ||
          !isYouTubeApiReady()
        ) {
          return;
        }

        completed = true;
        cleanUp();

        resolve(window.YT);
      };

      const completeWithError = (
        error
      ) => {
        if (completed) {
          return;
        }

        completed = true;
        cleanUp();

        youtubeApiPromise = null;

        reject(error);
      };

      window.onYouTubeIframeAPIReady =
        () => {
          try {
            if (
              typeof previousCallback ===
              "function"
            ) {
              previousCallback();
            }
          } finally {
            completeSuccessfully();
          }
        };

      readinessInterval =
        window.setInterval(
          completeSuccessfully,
          100
        );

      timeout =
        window.setTimeout(
          () => {
            completeWithError(
              new Error(
                "The YouTube player could not be loaded."
              )
            );
          },
          15_000
        );

      let script =
        document.querySelector(
          `script[src="${YOUTUBE_API_SCRIPT_URL}"]`
        );

      if (!script) {
        script =
          document.createElement(
            "script"
          );

        script.src =
          YOUTUBE_API_SCRIPT_URL;

        script.async = true;

        script.addEventListener(
          "error",
          () => {
            completeWithError(
              new Error(
                "The YouTube player script could not be downloaded."
              )
            );
          },
          {
            once: true,
          }
        );

        document.head.appendChild(
          script
        );
      }
    }
  );

  return youtubeApiPromise;
};