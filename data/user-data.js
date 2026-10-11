(function () {
  const HISTORY_TABLE = "reading_history";

  function getClient() {
    if (typeof window.getSupabaseClient !== "function") {
      throw new Error("Supabase client is not configured.");
    }
    return window.getSupabaseClient();
  }

  async function getContext() {
    const client = getClient();
    const { data, error } = await client.auth.getSession();
    if (error) {
      throw new Error(`Could not read the Supabase session: ${error.message}`);
    }
    return { client, user: data.session ? data.session.user : null };
  }

  function toDatabaseRecord(record, userId) {
    if (!record || !record.sessionId || !record.title || !record.date) {
      throw new Error("Reading history record is missing a session ID, title, or date.");
    }
    const date = new Date(record.date);
    if (!Number.isFinite(date.getTime())) {
      throw new Error("Reading history record has an invalid date.");
    }

    return {
      user_id: userId,
      session_id: String(record.sessionId),
      type: record.type === "vocabulary" ? "vocabulary" : "manga",
      title: String(record.title),
      manga_id: record.mangaId ? String(record.mangaId) : null,
      chapter: record.chapter ? String(record.chapter) : "",
      page_number: Number.isFinite(Number(record.page)) ? Math.max(0, Number(record.page)) : 0,
      total_pages: Number.isFinite(Number(record.totalPages)) ? Math.max(0, Number(record.totalPages)) : 0,
      duration_seconds: Number.isFinite(Number(record.durationSeconds))
        ? Math.max(0, Math.floor(Number(record.durationSeconds)))
        : 0,
      read_at: date.toISOString()
    };
  }

  function fromDatabaseRecord(record) {
    return {
      userId: record.user_id,
      sessionId: record.session_id,
      type: record.type,
      title: record.title,
      mangaId: record.manga_id || "",
      chapter: record.chapter || "",
      page: record.page_number || 0,
      totalPages: record.total_pages || 0,
      durationSeconds: record.duration_seconds || 0,
      date: record.read_at
    };
  }

  async function saveRecords(client, records, userId) {
    const validRecords = records.filter(function (record) {
      return record && record.sessionId && record.title && record.date;
    });
    if (validRecords.length === 0) return;

    const rows = validRecords.map(function (record) {
      return toDatabaseRecord(record, userId);
    });
    const batchSize = 100;
    for (let start = 0; start < rows.length; start += batchSize) {
      const { error } = await client
        .from(HISTORY_TABLE)
        .upsert(rows.slice(start, start + batchSize), { onConflict: "user_id,session_id" });
      if (error) {
        throw new Error(`Could not sync reading history: ${error.message}`);
      }
    }
  }

  window.userDataStore = {
    async getCurrentUser() {
      const { user } = await getContext();
      return user;
    },

    async loadSettings() {
      const { user } = await getContext();
      return user
        ? { user, settings: user.user_metadata || {} }
        : { user: null, settings: {} };
    },

    async saveSettings(updates) {
      const { client, user } = await getContext();
      if (!user) return false;

      const { data, error } = await client.auth.updateUser({
        data: { ...(user.user_metadata || {}), ...updates }
      });
      if (error) {
        throw new Error(`Could not save account settings: ${error.message}`);
      }
      return data.user;
    },

    async saveReadingHistoryRecord(record) {
      const { client, user } = await getContext();
      if (!user || record.userId !== user.id) return false;
      await saveRecords(client, [record], user.id);
      return true;
    },

    async loadReadingHistory(localRecords) {
      const { client, user } = await getContext();
      if (!user) {
        return {
          user: null,
          records: (Array.isArray(localRecords) ? localRecords : []).filter(function (record) {
            return !record.userId;
          })
        };
      }

      const accountRecords = (Array.isArray(localRecords) ? localRecords : []).filter(function (record) {
        return record.userId === user.id;
      });
      await saveRecords(client, accountRecords, user.id);

      const records = [];
      const pageSize = 1000;
      for (let start = 0; ; start += pageSize) {
        const { data, error } = await client
          .from(HISTORY_TABLE)
          .select("user_id,session_id,type,title,manga_id,chapter,page_number,total_pages,duration_seconds,read_at")
          .eq("user_id", user.id)
          .order("read_at", { ascending: false })
          .order("id", { ascending: false })
          .range(start, start + pageSize - 1);
        if (error) {
          throw new Error(`Could not load reading history: ${error.message}`);
        }
        records.push(...data.map(fromDatabaseRecord));
        if (data.length < pageSize) break;
      }
      return { user, records };
    },

    async importLocalReadingHistory(localRecords) {
      const { client, user } = await getContext();
      if (!user) {
        throw new Error("Sign in before importing local reading history.");
      }

      const ownedRecords = (Array.isArray(localRecords) ? localRecords : [])
        .filter(function (record) { return !record.userId || record.userId === user.id; })
        .map(function (record) { return { ...record, userId: user.id }; });
      await saveRecords(client, ownedRecords, user.id);
      return this.loadReadingHistory(ownedRecords);
    },

    async deleteReadingHistoryRecord(sessionId) {
      const { client, user } = await getContext();
      if (!user) return false;
      const { error } = await client
        .from(HISTORY_TABLE)
        .delete()
        .eq("user_id", user.id)
        .eq("session_id", sessionId);
      if (error) {
        throw new Error(`Could not delete reading history: ${error.message}`);
      }
      return true;
    },

    async clearReadingHistory() {
      const { client, user } = await getContext();
      if (!user) return null;
      const { error } = await client
        .from(HISTORY_TABLE)
        .delete()
        .eq("user_id", user.id);
      if (error) {
        throw new Error(`Could not clear reading history: ${error.message}`);
      }
      return user.id;
    }
  };
})();
