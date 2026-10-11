(function() {
  const HISTORY_KEY = "mangaHistory";
  const FLUSH_INTERVAL = 5000;
  let syncQueue = Promise.resolve();

  function readHistory() {
    const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  }

  window.startReadingTracker = function(options) {
    if (!options || !options.type || !options.title) return;

    const sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const startedAt = new Date().toISOString();
    let ownerUserId = null;
    let elapsedMilliseconds = 0;
    let activeSince = document.visibilityState === "visible" ? performance.now() : null;

    function currentDuration() {
      const activeMilliseconds = activeSince === null ? 0 : performance.now() - activeSince;
      return Math.floor((elapsedMilliseconds + activeMilliseconds) / 1000);
    }

    async function saveProgress() {
      const durationSeconds = currentDuration();
      if (durationSeconds < 1) return;

      const progress = typeof options.getProgress === "function" ? options.getProgress() : {};
      const record = {
        sessionId: sessionId,
        type: options.type,
        title: options.title,
        mangaId: options.mangaId || "",
        chapter: progress.chapter || "",
        page: progress.page || 0,
        totalPages: progress.totalPages || 0,
        durationSeconds: durationSeconds,
        date: startedAt
      };

      if (window.userDataStore) {
        try {
          if (ownerUserId === null) {
            const user = await window.userDataStore.getCurrentUser();
            ownerUserId = user ? user.id : "";
          }
          if (ownerUserId) record.userId = ownerUserId;
        } catch (error) {
          console.error("Could not identify the signed-in user for reading history:", error);
        }
      }

      const history = readHistory();
      const index = history.findIndex(function(item) { return item.sessionId === sessionId; });
      if (index === -1) history.unshift(record);
      else history[index] = record;
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));

      if (window.userDataStore) {
        syncQueue = syncQueue
          .then(function() {
            return window.userDataStore.saveReadingHistoryRecord(record);
          })
          .then(function(synced) {
            if (synced) {
              window.dispatchEvent(new CustomEvent("reading-history-sync", {
                detail: { status: "success", sessionId: sessionId }
              }));
            }
          })
          .catch(function(error) {
            console.error("Could not sync reading history to Supabase:", error);
            window.dispatchEvent(new CustomEvent("reading-history-sync", {
              detail: { status: "error", error: error }
            }));
          });
      }
    }

    function pause() {
      if (activeSince === null) return;
      elapsedMilliseconds += performance.now() - activeSince;
      activeSince = null;
      saveProgress();
    }

    function resume() {
      if (activeSince !== null) return;
      activeSince = performance.now();
    }

    document.addEventListener("visibilitychange", function() {
      if (document.visibilityState === "hidden") pause();
      else resume();
    });
    window.addEventListener("pagehide", pause);
    window.addEventListener("pageshow", resume);
    window.setInterval(saveProgress, FLUSH_INTERVAL);
  };
})();
